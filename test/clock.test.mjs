import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FrameClock, frameRate } from '../dist/index.js';

test('rates are reduced, read-only, and detached from caller-owned objects', () => {
  assert.deepEqual(frameRate(60000, 2002), { numerator: 30000, denominator: 1001 });
  assert.ok(Object.isFrozen(frameRate(24)));
  const input = { numerator: 24, denominator: 1 };
  const clock = new FrameClock(input);
  input.numerator = 60;
  assert.equal(clock.timestampAt(24), 1000000);
  assert.deepEqual(new FrameClock({ numerator: 60000, denominator: 2002 }).rate, { numerator: 30000, denominator: 1001 });
  assert.ok(Object.isFrozen(clock.rate));
  assert.throws(() => { clock.rate = frameRate(60); }, TypeError);
  assert.deepEqual(clock.rate, { numerator: 24, denominator: 1 });
});

test('invalid rates and indices fail explicitly', () => {
  for (const value of [-1, 0, 29.97, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => frameRate(value), RangeError);
    assert.throws(() => frameRate(30, value), RangeError);
  }
  assert.throws(() => new FrameClock(frameRate(1000001)), RangeError);
  assert.throws(() => new FrameClock(frameRate(1, 9007199255)), RangeError);
  const clock = new FrameClock(frameRate(30));
  for (const value of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    for (const method of ['at', 'timestampAt', 'frameAt', 'seek']) {
      assert.throws(() => clock[method](value), RangeError);
    }
  }
});

test('known rational timestamps and half-microsecond ties', () => {
  const clock = new FrameClock(frameRate(30000, 1001));
  assert.deepEqual(clock.at(0), { frame: 0, timestamp: 0, duration: 33367 });
  assert.deepEqual(clock.at(1), { frame: 1, timestamp: 33367, duration: 33366 });
  assert.equal(clock.timestampAt(30000), 1001000000);
  assert.equal(new FrameClock(frameRate(128)).timestampAt(1), 7813);
});

for (const [n, d] of [[24, 1], [25, 1], [30, 1], [128, 1], [24000, 1001], [30000, 1001], [60000, 1001], [1000000, 1], [1, 3]]) {
  test(`interval lookup and durations agree at ${n}/${d} fps`, () => {
    const clock = new FrameClock(frameRate(n, d));
    let total = 0;
    for (let i = 0; i < 10000; i++) {
      const { timestamp, duration } = clock.at(i);
      assert.equal(clock.frameAt(timestamp), i);
      assert.equal(clock.frameAt(timestamp + duration - 1), i);
      assert.equal(clock.frameAt(timestamp + duration), i + 1);
      assert.ok(duration > 0);
      total += duration;
    }
    assert.equal(total, clock.timestampAt(10000));
  });
}

test('a long export ends at its independently calculated boundary', () => {
  const clock = new FrameClock(frameRate(30000, 1001));
  let duration = 0;
  for (let i = 0; i < 300000; i++) duration += clock.next().duration;
  assert.equal(duration, 10010000000);
  assert.equal(clock.position, 300000);
});

test('reads do not advance; seeking reproduces the same sequence', () => {
  const clock = new FrameClock(frameRate(24));
  clock.at(100);
  clock.timestampAt(100);
  clock.frameAt(100);
  assert.equal(clock.position, 0);
  const first = clock.next();
  assert.equal(clock.position, 1);
  clock.seek(0);
  assert.deepEqual(clock.next(), first);
  assert.throws(() => clock.seek(-1), RangeError);
  assert.equal(clock.position, 1);
  clock.reset();
  assert.equal(clock.position, 0);
});

test('negative zero is treated as frame zero', () => {
  // assert/strict compares with Object.is, so a leaked -0 would not equal 0.
  const clock = new FrameClock(frameRate(24));
  assert.deepEqual(clock.at(-0), { frame: 0, timestamp: 0, duration: 41667 });
  clock.seek(-0);
  assert.equal(clock.position, 0);
  assert.equal(clock.next().frame, 0);
});

test('safe-integer limits fail without advancing the clock', () => {
  const max = Number.MAX_SAFE_INTEGER;
  const clock = new FrameClock(frameRate(1000000));
  assert.equal(clock.timestampAt(max), max);
  assert.equal(clock.frameAt(max), max);
  assert.throws(() => clock.seek(clock.frameAt(max)), RangeError);
  clock.seek(max - 1);
  assert.equal(clock.next().timestamp, max - 1);
  assert.throws(() => clock.next(), RangeError);
  assert.equal(clock.position, max);
  assert.throws(() => new FrameClock(frameRate(1)).timestampAt(max), RangeError);
  assert.equal(new FrameClock(frameRate(1, 9007199254)).at(0).duration, 9007199254000000);
});
