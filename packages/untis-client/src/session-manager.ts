import type { RequestOptions } from './domain.js';

export interface SessionLifecycle {
  authenticate(options?: RequestOptions): Promise<void>;
  hasAuthentication(): boolean;
  invalidateAuthentication(): void;
  isAuthenticationRejection(error: unknown): boolean;
  close(options?: RequestOptions): Promise<void>;
}

/** Serializes access to one in-memory WebUntis session. */
export class SessionManager {
  private tail: Promise<void> = Promise.resolve();
  private closed = false;

  constructor(private readonly lifecycle: SessionLifecycle) {}

  execute<T>(
    operation: () => Promise<T>,
    options?: RequestOptions,
  ): Promise<T> {
    if (this.closed) return Promise.reject(new Error('WebUntis client closed'));
    const result = this.tail.then(() => this.run(operation, options));
    this.tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  async close(options?: RequestOptions): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    await this.tail;
    await this.lifecycle.close(options);
  }

  private async ensureAuthenticated(options?: RequestOptions): Promise<void> {
    if (!this.lifecycle.hasAuthentication())
      await this.lifecycle.authenticate(options);
  }

  private async run<T>(
    operation: () => Promise<T>,
    options?: RequestOptions,
  ): Promise<T> {
    await this.ensureAuthenticated(options);
    try {
      return await operation();
    } catch (error) {
      if (!this.lifecycle.isAuthenticationRejection(error)) throw error;
      this.lifecycle.invalidateAuthentication();
      await this.ensureAuthenticated(options);
      try {
        return await operation();
      } catch (retryError) {
        if (this.lifecycle.isAuthenticationRejection(retryError))
          this.lifecycle.invalidateAuthentication();
        throw retryError;
      }
    }
  }
}
