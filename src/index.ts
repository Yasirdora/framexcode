export interface FrameRate {
  readonly numerator: number;
  readonly denominator: number;
}
export interface FrameTiming {
  readonly frame: number;
  readonly timestamp: number;
  readonly duration: number;
}
const MAX = BigInt(Number.MAX_SAFE_INTEGER);
function integer(value: number, name: string, minimum = 0): void {
  if (!Number.isSafeInteger(value) || value < minimum)
    throw new RangeError(`${name} must be a safe integer >= ${minimum}`);
}
function safeNumber(value: bigint): number {
  if (value > MAX) throw new RangeError('Timestamp exceeds the safe integer range');
  return Number(value);
}
/** Immutable reduced frames-per-second ratio. Decimal approximations are rejected. */
export function frameRate(numerator: number, denominator = 1): FrameRate {
  integer(numerator, 'numerator', 1);
  integer(denominator, 'denominator', 1);
  let a = BigInt(numerator), b = BigInt(denominator);
  while (b !== 0n) [a, b] = [b, a % b];
  return Object.freeze({ numerator: Number(BigInt(numerator) / a), denominator: Number(BigInt(denominator) / a) });
}
/** A clock advances only when next() is called. Timestamps are in microseconds. */
export class FrameClock {
  readonly rate: FrameRate;
  #frame = 0;
  #scale: bigint;
  #divisor: bigint;
  constructor(rate: FrameRate) {
    this.rate = frameRate(rate.numerator, rate.denominator);
    this.#scale = BigInt(this.rate.denominator) * 1_000_000n;
    this.#divisor = BigInt(this.rate.numerator);
    if (this.#divisor > this.#scale)
      throw new RangeError('Frame rate exceeds microsecond resolution');
  }
  get position(): number { return this.#frame; }
  /** Nearest microsecond, with exact half values rounded up. */
  timestampAt(frame: number): number {
    integer(frame, 'frame');
    const scaled = BigInt(frame) * this.#scale;
    return safeNumber((2n * scaled + this.#divisor) / (2n * this.#divisor));
  }
  /** Adjacent rounded boundaries define duration; durations need not be equal. */
  at(frame: number): FrameTiming {
    integer(frame, 'frame');
    integer(frame + 1, 'next frame');
    const timestamp = this.timestampAt(frame);
    return Object.freeze({ frame, timestamp, duration: this.timestampAt(frame + 1) - timestamp });
  }
  /** Frame whose quantized interval contains this timestamp. */
  frameAt(timestamp: number): number {
    integer(timestamp, 'timestamp');
    // Largest n for which round(n * scale / divisor) <= timestamp.
    const n = ((2n * BigInt(timestamp) + 1n) * this.#divisor - 1n) / (2n * this.#scale);
    return safeNumber(n);
  }
  seek(frame: number): void {
    this.at(frame); // Validate before changing state.
    this.#frame = frame;
  }
  reset(): void { this.#frame = 0; }
  next(): FrameTiming {
    const result = this.at(this.#frame);
    this.#frame++;
    return result;
  }
}
