export const snooze = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export const rejectAfterDelay = (ms, msg): Promise<Error> =>
  new Promise((_, reject) => {
    setTimeout(reject, ms, new Error(msg));
  });

export function runWithTimeout<T>(
  promise: Promise<T>,
  timeout = 60000,
  message: string = undefined,
): Promise<Awaited<T> | Error> {
  message = !message ? `[PROMISE TIMEOUT] Timeout after ${timeout}` : message;
  return Promise.race([promise, rejectAfterDelay(timeout, message)]);
}

export async function settledAll<T>(
  tasks: Array<Promise<T>>,
  batchSize = 8,
  delayTime = 1000,
  batchCompleted: (data: { success: Array<T>; error: Array<Error> }, end?: boolean) => any = undefined,
): Promise<{ success: Array<T>; error: Array<Error> }> {
  batchSize = batchSize < 1 ? 8 : batchSize;
  const taskResults = [];
  const runTasks: Promise<T>[] = [];

  let counter = 0;
  for (let i = 0; i < tasks.length; i++) {
    runTasks.push(tasks[i]);
    counter++;

    if (counter === batchSize || i === tasks.length - 1) {
      const settledResults = settledResult(await Promise.allSettled(runTasks));
      await snooze(delayTime < 0 ? 0 : delayTime);

      if (batchCompleted) batchCompleted(settledResults, i === tasks.length - 1);

      counter = 0;
      runTasks.length = 0;
    }
  }

  return !taskResults.length
    ? []
    : taskResults.reduce((prev, curr) => ({
      success: [...prev.success, ...curr.success],
      error: [...prev.error, ...curr.error],
    }));
}

function settledResult(tasks: Array<{ status: string; value?: any; reason?: any }>): {
  success: Array<any>;
  error: Array<any>;
} {
  const successTasks = [];
  const errorTasks = [];
  for (const task of tasks) {
    if (task.status === 'fulfilled') successTasks.push(task.value);
    else errorTasks.push(task.reason);
  }

  return { success: successTasks, error: errorTasks };
}
