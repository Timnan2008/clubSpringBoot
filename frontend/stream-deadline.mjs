// Bound each network/approval wait, including after a suspended tab wakes up.
export function waitForStreamStep(promise, { signal, timeoutMs = 180000, onTimeout } = {}) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      globalThis.document?.removeEventListener("visibilitychange", check);
      globalThis.window?.removeEventListener("pageshow", check);
      callback(value);
    };
    const abort = () => finish(reject, signal.reason || new DOMException("Aborted", "AbortError"));
    const check = () => {
      if (Date.now() < deadline || settled) return;
      const error = new Error("stream-timeout");
      finish(reject, error);
      onTimeout?.(error);
    };
    const timer = setTimeout(check, timeoutMs);
    signal?.addEventListener("abort", abort, { once: true });
    globalThis.document?.addEventListener("visibilitychange", check);
    globalThis.window?.addEventListener("pageshow", check);
    if (signal?.aborted) abort();
    Promise.resolve(promise).then(
      (value) => {
        check();
        finish(resolve, value);
      },
      (error) => finish(reject, error),
    );
  });
}
