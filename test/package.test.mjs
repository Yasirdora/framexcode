import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

// Self-referencing the package name resolves through package.json "exports".
test('the package entry point loads with import', async () => {
  const { FrameClock, frameRate } = await import('@yasirdora/framecode');
  assert.equal(new FrameClock(frameRate(24)).timestampAt(24), 1000000);
});

test('the package entry point loads with require', { skip: !process.features.require_module }, () => {
  const { FrameClock, frameRate } = createRequire(import.meta.url)('@yasirdora/framecode');
  assert.equal(new FrameClock(frameRate(24)).timestampAt(24), 1000000);
});
