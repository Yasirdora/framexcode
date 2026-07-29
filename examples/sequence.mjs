import { FrameClock, frameRate } from '../dist/index.js';

const clock = new FrameClock(frameRate(30000, 1001));
console.table(Array.from({ length: 6 }, () => clock.next()));

// Seeking computes a boundary directly, without replaying earlier frames.
clock.seek(30000);
console.log('Frame 30000:', clock.next());
