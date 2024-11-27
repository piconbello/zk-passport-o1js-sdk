export interface AdvancedPromise<T> extends Promise<T> {
  readonly resolved: boolean;
  readonly rejected: boolean;
  readonly timedOut: boolean;
  readonly cancelled: boolean;
  readonly timeout: number;
  resolve(arg: T): void;
  reject(error: Error): void;
  cancel(reason?: string): void;
}

export const createAdvancedPromise = <T>(timeout: number = 0): AdvancedPromise<T> => {
  let resolve: any;
  let reject: any;
  const promise: any = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  promise.resolved = false;
  promise.rejected = false;
  promise.timedOut = false;
  promise.cancelled = false;
  promise.timeout = timeout;
  promise.resolve = (...args: any[]) => {
    if (!promise.resolved && !promise.rejected) {
      promise.resolved = true;
      resolve(...args);
    }
  };
  promise.reject = (...args: any[]) => {
    if (!promise.resolved && !promise.rejected) {
      promise.rejected = true;
      reject(...args);
    }
  };
  promise.cancel = (reason: any) => {
    if (!promise.resolved && !promise.rejected) {
      const error = new Error(`Promise cancelled.${reason ? ` Reason: ${reason}` : ''}`);
      // error.isCancelError = true;
      promise.cancelled = true;
      promise.reject(error);
    }
  };
  if (timeout) {
    setTimeout(() => {
      if (!promise.resolved && !promise.rejected) {
        const error = new Error(`Promise timed out after ${timeout}ms`);
        // error.isTimeoutError = true;
        promise.timedOut = true;
        promise.reject(error);
      }
    }, timeout);
  }
  return promise as AdvancedPromise<T>;
};