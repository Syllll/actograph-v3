import { createChronicleGeneration } from './chronicle-generation';

test('an asynchronous task remains stale after returning to the original chronicle', () => {
  const guard = createChronicleGeneration();
  const taskForA = guard.capture();
  expect(guard.isCurrent(taskForA)).toBe(true);
  guard.invalidate(); // A -> B
  guard.invalidate(); // B -> A
  expect(guard.isCurrent(taskForA)).toBe(false);
  expect(guard.isCurrent(guard.capture())).toBe(true);
});
