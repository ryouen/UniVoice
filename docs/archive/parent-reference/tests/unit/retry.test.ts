import { 
  retryAsync, 
  retryWithTimeout, 
  withTimeout, 
  wait, 
  batchRetry,
  CircuitBreaker,
  retryStrategies,
  getRetryStrategy 
} from '../../electron/utils/retry';

describe('retry utilities', () => {
  describe('retryAsync', () => {
    test('should succeed on first attempt', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      
      const result = await retryAsync(fn);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('should retry on failure and succeed', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');
      
      const result = await retryAsync(fn, { maxRetries: 3 });
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    test('should throw after max retries', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('always fails'));
      
      await expect(
        retryAsync(fn, { maxRetries: 2 })
      ).rejects.toThrow('always fails');
      
      expect(fn).toHaveBeenCalledTimes(2);
    });

    test('should apply exponential backoff', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');
      
      const startTime = Date.now();
      
      await retryAsync(fn, {
        maxRetries: 2,
        baseDelayMs: 100,
        jitterFactor: 0 // No jitter for predictable timing
      });
      
      const elapsed = Date.now() - startTime;
      
      // Should wait ~100ms between attempts
      expect(elapsed).toBeGreaterThanOrEqual(100);
      expect(elapsed).toBeLessThan(300);
    });

    test('should apply jitter to backoff', async () => {
      const delays: number[] = [];
      const fn = jest.fn().mockRejectedValue(new Error('fail'));
      
      const onRetry = jest.fn((attempt, error, delay) => {
        delays.push(delay);
      });
      
      try {
        await retryAsync(fn, {
          maxRetries: 3,
          baseDelayMs: 100,
          jitterFactor: 0.5,
          onRetry
        });
      } catch {}
      
      // Check that delays are different due to jitter
      expect(delays.length).toBe(2);
      expect(delays[0]).not.toBe(delays[1]);
      
      // But within expected range
      delays.forEach(delay => {
        expect(delay).toBeGreaterThan(50); // Min with jitter
        expect(delay).toBeLessThan(400); // Max with jitter and exponential
      });
    });

    test('should respect shouldRetry callback', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('retryable'))
        .mockRejectedValueOnce(new Error('not retryable'))
        .mockResolvedValue('success');
      
      const shouldRetry = (error: any) => !error.message.includes('not retryable');
      
      await expect(
        retryAsync(fn, { maxRetries: 3, shouldRetry })
      ).rejects.toThrow('not retryable');
      
      expect(fn).toHaveBeenCalledTimes(2);
    });

    test('should call onRetry callback', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');
      
      const onRetry = jest.fn();
      
      await retryAsync(fn, {
        maxRetries: 3,
        baseDelayMs: 10,
        onRetry
      });
      
      expect(onRetry).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error), expect.any(Number));
      expect(onRetry).toHaveBeenCalledWith(2, expect.any(Error), expect.any(Number));
    });

    test('should respect maxDelayMs', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('fail'));
      const delays: number[] = [];
      
      const onRetry = jest.fn((attempt, error, delay) => {
        delays.push(delay);
      });
      
      try {
        await retryAsync(fn, {
          maxRetries: 5,
          baseDelayMs: 100,
          maxDelayMs: 500,
          jitterFactor: 0,
          onRetry
        });
      } catch {}
      
      // Later delays should be capped at maxDelayMs
      expect(Math.max(...delays)).toBeLessThanOrEqual(500);
    });
  });

  describe('withTimeout', () => {
    test('should resolve before timeout', async () => {
      const promise = Promise.resolve('success');
      
      const result = await withTimeout(promise, 1000);
      
      expect(result).toBe('success');
    });

    test('should reject on timeout', async () => {
      const promise = new Promise(resolve => {
        setTimeout(() => resolve('too late'), 200);
      });
      
      await expect(
        withTimeout(promise, 50)
      ).rejects.toThrow('Operation timed out after 50ms');
    });

    test('should preserve rejection', async () => {
      const promise = Promise.reject(new Error('original error'));
      
      await expect(
        withTimeout(promise, 1000)
      ).rejects.toThrow('original error');
    });
  });

  describe('retryWithTimeout', () => {
    test('should retry with timeout per attempt', async () => {
      const fn = jest.fn()
        .mockImplementation(() => new Promise(resolve => {
          setTimeout(() => resolve('success'), 50);
        }));
      
      const result = await retryWithTimeout(fn, 100, { maxRetries: 2 });
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('should timeout and retry', async () => {
      let attempt = 0;
      const fn = jest.fn().mockImplementation(() => {
        attempt++;
        return new Promise(resolve => {
          // First attempt times out, second succeeds
          const delay = attempt === 1 ? 200 : 10;
          setTimeout(() => resolve('success'), delay);
        });
      });
      
      const result = await retryWithTimeout(fn, 100, {
        maxRetries: 2,
        baseDelayMs: 10
      });
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('wait', () => {
    test('should wait for specified time', async () => {
      const startTime = Date.now();
      
      await wait(100);
      
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(95); // Allow small variance
      expect(elapsed).toBeLessThan(150);
    });
  });

  describe('batchRetry', () => {
    test('should retry multiple operations independently', async () => {
      const op1 = jest.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('result1');
      
      const op2 = jest.fn()
        .mockResolvedValue('result2');
      
      const op3 = jest.fn()
        .mockRejectedValue(new Error('always fails'));
      
      const results = await batchRetry([op1, op2, op3], {
        maxRetries: 2,
        baseDelayMs: 10
      });
      
      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ success: true, result: 'result1' });
      expect(results[1]).toEqual({ success: true, result: 'result2' });
      expect(results[2]).toEqual({ 
        success: false, 
        error: expect.objectContaining({ message: 'always fails' })
      });
      
      expect(op1).toHaveBeenCalledTimes(2);
      expect(op2).toHaveBeenCalledTimes(1);
      expect(op3).toHaveBeenCalledTimes(2);
    });
  });

  describe('CircuitBreaker', () => {
    test('should allow calls when closed', async () => {
      const breaker = new CircuitBreaker(3, 1000);
      const fn = jest.fn().mockResolvedValue('success');
      
      const result = await breaker.execute(fn);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalled();
      expect(breaker.getState()).toBe('closed');
    });

    test('should open after threshold failures', async () => {
      const breaker = new CircuitBreaker(3, 1000);
      const fn = jest.fn().mockRejectedValue(new Error('fail'));
      
      // Fail 3 times to open circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(fn);
        } catch {}
      }
      
      expect(breaker.getState()).toBe('open');
      
      // Should reject immediately when open
      await expect(
        breaker.execute(fn)
      ).rejects.toThrow('Circuit breaker is open');
      
      // Function should not be called when circuit is open
      expect(fn).toHaveBeenCalledTimes(3);
    });

    test('should transition to half-open after timeout', async () => {
      const breaker = new CircuitBreaker(2, 100); // 100ms timeout
      const fn = jest.fn()
        .mockRejectedValue(new Error('fail'))
        .mockRejectedValue(new Error('fail'))
        .mockResolvedValue('success');
      
      // Open the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(fn);
        } catch {}
      }
      
      expect(breaker.getState()).toBe('open');
      
      // Wait for timeout
      await wait(150);
      
      // Should attempt in half-open state
      const result = await breaker.execute(fn);
      
      expect(result).toBe('success');
      expect(breaker.getState()).toBe('closed'); // Successful, so closes
    });

    test('should reopen on failure in half-open state', async () => {
      const breaker = new CircuitBreaker(2, 100);
      const fn = jest.fn().mockRejectedValue(new Error('always fails'));
      
      // Open the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(fn);
        } catch {}
      }
      
      // Wait for timeout to transition to half-open
      await wait(150);
      
      // Fail in half-open state
      try {
        await breaker.execute(fn);
      } catch {}
      
      expect(breaker.getState()).toBe('open');
    });

    test('should reset state', () => {
      const breaker = new CircuitBreaker(2, 100);
      
      // Simulate some failures
      breaker['failures'] = 5;
      breaker['state'] = 'open';
      
      breaker.reset();
      
      expect(breaker.getState()).toBe('closed');
      expect(breaker['failures']).toBe(0);
    });
  });

  describe('retryStrategies', () => {
    test('network strategy should retry on network errors', () => {
      const strategy = retryStrategies.network;
      
      expect(strategy.shouldRetry({ code: 'ECONNRESET' })).toBe(true);
      expect(strategy.shouldRetry({ code: 'ETIMEDOUT' })).toBe(true);
      expect(strategy.shouldRetry({ message: 'network error' })).toBe(true);
      expect(strategy.shouldRetry({ message: 'other error' })).toBe(false);
      
      expect(strategy.maxRetries).toBe(5);
      expect(strategy.baseDelayMs).toBe(1000);
    });

    test('rateLimit strategy should handle rate limit errors', () => {
      const strategy = retryStrategies.rateLimit;
      
      expect(strategy.shouldRetry({ status: 429 })).toBe(true);
      expect(strategy.shouldRetry({ code: 8 })).toBe(true);
      expect(strategy.shouldRetry({ message: 'rate limit exceeded' })).toBe(true);
      expect(strategy.shouldRetry({ message: 'RESOURCE_EXHAUSTED' })).toBe(true);
      
      expect(strategy.maxRetries).toBe(3);
      expect(strategy.baseDelayMs).toBe(5000);
    });

    test('auth strategy should retry on auth errors', () => {
      const strategy = retryStrategies.auth;
      
      expect(strategy.shouldRetry({ status: 401 })).toBe(true);
      expect(strategy.shouldRetry({ status: 403 })).toBe(true);
      expect(strategy.shouldRetry({ message: 'authentication failed' })).toBe(true);
      expect(strategy.shouldRetry({ message: 'unauthorized' })).toBe(true);
      
      expect(strategy.maxRetries).toBe(2);
    });

    test('server strategy should retry on server errors', () => {
      const strategy = retryStrategies.server;
      
      expect(strategy.shouldRetry({ status: 500 })).toBe(true);
      expect(strategy.shouldRetry({ status: 502 })).toBe(true);
      expect(strategy.shouldRetry({ status: 503 })).toBe(true);
      expect(strategy.shouldRetry({ message: 'internal server error' })).toBe(true);
      expect(strategy.shouldRetry({ status: 400 })).toBe(false);
      
      expect(strategy.maxRetries).toBe(3);
    });
  });

  describe('getRetryStrategy', () => {
    test('should return rate limit strategy for 429 errors', () => {
      const strategy = getRetryStrategy({ status: 429 });
      expect(strategy).toEqual(retryStrategies.rateLimit);
    });

    test('should return auth strategy for 401/403 errors', () => {
      expect(getRetryStrategy({ status: 401 })).toEqual(retryStrategies.auth);
      expect(getRetryStrategy({ status: 403 })).toEqual(retryStrategies.auth);
    });

    test('should return server strategy for 5xx errors', () => {
      expect(getRetryStrategy({ status: 500 })).toEqual(retryStrategies.server);
      expect(getRetryStrategy({ status: 503 })).toEqual(retryStrategies.server);
    });

    test('should return network strategy for network errors', () => {
      expect(getRetryStrategy({ code: 'ECONNRESET' })).toEqual(retryStrategies.network);
      expect(getRetryStrategy({ message: 'network timeout' })).toEqual(retryStrategies.network);
    });

    test('should return default strategy for unknown errors', () => {
      const strategy = getRetryStrategy({ message: 'unknown error' });
      
      expect(strategy.maxRetries).toBe(3);
      expect(strategy.baseDelayMs).toBe(1000);
    });
  });
});