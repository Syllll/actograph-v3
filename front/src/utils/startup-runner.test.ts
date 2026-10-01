import { createStartupRunner } from './startup-runner';

test('recovers after an initialization error and serializes duplicate ready events', async () => {
  const task = jest
    .fn()
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(true);
  const runner = createStartupRunner(task);
  await runner.run();
  await Promise.all([runner.run(), runner.run()]);
  await runner.run();
  expect(task).toHaveBeenCalledTimes(2);
});
test('keeps a ready event arriving while a failed initialization is still in flight', async () => {
  let fail!: (success: boolean) => void;
  const task = jest
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          fail = resolve;
        })
    )
    .mockResolvedValueOnce(true);
  const runner = createStartupRunner(task);
  const first = runner.run();
  expect(runner.run()).toBe(first);
  fail(false);
  await first;
  expect(task).toHaveBeenCalledTimes(2);
});
test('does not retry after the loading page unmounts', async () => {
  let fail!: (success: boolean) => void;
  const task = jest.fn(
    () =>
      new Promise<boolean>((resolve) => {
        fail = resolve;
      })
  );
  const runner = createStartupRunner(task);
  const pending = runner.run();
  void runner.run();
  runner.dispose();
  fail(false);
  await pending;
  await runner.run();
  expect(task).toHaveBeenCalledTimes(1);
});
