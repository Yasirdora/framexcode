# framecode

[![CI](https://github.com/Yasirdora/framexcode/actions/workflows/ci.yml/badge.svg)](https://github.com/Yasirdora/framexcode/actions/workflows/ci.yml)

Frame-indexed timestamps for fixed-rate media. [Try the live demo](https://yasirdora.github.io/framexcode/).

`framecode` converts frame numbers to integer microseconds. It accepts rational
frame rates, calculates each boundary independently, and lets an export loop
advance or seek without relying on elapsed wall time. No runtime dependencies.

## Why

A 29.97 fps video runs at exactly 30000/1001 fps, so each frame lasts
33,366.67 µs. A common shortcut is to round that once to 33,367 µs and keep
adding it. Each frame then comes out 1/3 µs too long. An hour of video holds
about 107,900 frames, so by the end of the hour the timestamps are 36 ms
ahead, more than a whole frame.

`framecode` computes every frame's start directly from its index instead. Each
timestamp is within half a microsecond of the exact value, however long the
export runs.

## Browser demo

**Live:** [yasirdora.github.io/framexcode](https://yasirdora.github.io/framexcode/)

[`examples/webcodecs/`](examples/webcodecs/) draws 10 seconds of canvas animation
at 30000/1001 fps and encodes it with the WebCodecs `VideoEncoder`. Each
`VideoFrame` takes its `timestamp` and `duration` from `FrameClock.next()`. The
page then writes the encoded chunks to a downloadable WebM without any
dependencies. The file's timestamp scale is one microsecond, so it stores
framecode's values unchanged.

To run it locally:

```sh
npm run demo
```

Then open http://localhost:8080/examples/webcodecs/ in a Chromium-based browser.
The page compares framecode with the rounded-duration shortcut described in
[Why](#why). The shortcut drifts 100 µs over the 300-frame clip and 35,964 µs
(1.08 frames) over an hour.

## Example

```js
import { FrameClock, frameRate } from '@yasirdora/framecode';

const clock = new FrameClock(frameRate(30000, 1001));

clock.next(); // { frame: 0, timestamp: 0, duration: 33367 }
clock.next(); // { frame: 1, timestamp: 33367, duration: 33366 }

clock.seek(30000);
clock.next(); // { frame: 30000, timestamp: 1001000000, duration: 33367 }
```

The package is currently local and unpublished. To build and run the example:

```sh
npm ci
npm test
npm run example
```

## Timing model

Frame `n` starts at `n × denominator × 1,000,000 / numerator` microseconds,
rounded to the nearest integer. Exact half values round up. Intermediate
arithmetic uses `bigint`; public inputs and outputs are numbers.

A frame's duration is the difference between its rounded start and the next
frame's rounded start. At fractional microsecond intervals, durations vary by
one microsecond. Adding these durations reaches the same boundary as a direct
lookup; rounding a fixed duration and repeatedly adding it would accumulate error.

Use `frameRate(30000, 1001)` for that exact ratio. `frameRate(2997, 100)` represents
29.97 exactly, which is a different rate. Decimal arguments such as
`frameRate(29.97)` are rejected.

## API

| API | Result |
| --- | --- |
| `frameRate(numerator, denominator = 1)` | Frozen, reduced frames-per-second ratio. |
| `new FrameClock(rate)` | Clock positioned at frame zero. Copies the supplied ratio. |
| `clock.rate` | Reduced frame rate. Read-only. |
| `clock.position` | Index that the next `next()` call will return. |
| `clock.timestampAt(frame)` | Rounded start timestamp, in microseconds. |
| `clock.at(frame)` | Frozen `{ frame, timestamp, duration }`, without moving the clock. |
| `clock.frameAt(timestamp)` | Index whose interval contains the timestamp: start inclusive, end exclusive. |
| `clock.next()` | Current frame timing, then advances one frame. |
| `clock.seek(frame)` | Sets the next frame index. Validates the entire frame interval first. |
| `clock.reset()` | Returns the clock to frame zero. |

All indices and timestamps must be nonnegative safe integers; `-0` is treated as
`0`. Rate components must be positive safe integers. Rates above 1,000,000 fps
are rejected because microsecond intervals would collapse, and so are rates too
slow for frame zero to end at a safe timestamp. Invalid numeric inputs and
unrepresentable boundaries throw `RangeError`. `at`, `seek`, and `next` require
the following boundary to be representable too. `frameAt` does not, so for the
last timestamps in range it can return an index that `seek` rejects. A failed
seek or advance leaves position intact.

## Scope

This is a fixed-rate timing utility. It does not schedule callbacks, measure
elapsed time, parse SMPTE timecodes, implement drop-frame labels, resample media,
or synchronize audio. Drop-frame labeling is distinct from fractional frame rates.

The build is ESM with TypeScript declarations and requires BigInt support.
Node.js versions that can `require()` ES modules (22.12 and later) can also load
it with `require`. Unit tests run on Node.js. The browser demo has been run in
Chromium.

## Local package check

```sh
npm pack
```

Packing builds the package first. `private: true` intentionally prevents npm
publication while the project is under review.

## License

MIT
