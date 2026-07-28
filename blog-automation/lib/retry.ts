export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown): boolean {
  const status =
    (error as { status?: number })?.status ??
    (error as { error?: { code?: number } })?.error?.code;
  return status === 503 || status === 429;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const retryable = isRetryableError(error);
      if (attempt < maxRetries && retryable) {
        const delay = 1000 * Math.pow(2, attempt) + Math.random() * 500;
        console.warn(
          `[withRetry] 시도 ${attempt + 1}/${maxRetries + 1} 실패, ${Math.round(delay)}ms 후 재시도`,
          error,
        );
        await sleep(delay);
        continue;
      }
      throw lastError;
    }
  }
  throw lastError;
}
