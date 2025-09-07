/**
 * Result型 - エラーハンドリングのための関数型パターン
 * 
 * 例外の代わりにResult型を使用することで：
 * - 型安全なエラーハンドリング
 * - エラーの明示的な伝播
 * - パターンマッチングによる処理分岐
 */

export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

export const Result = {
  /**
   * 成功結果を作成
   */
  ok<T>(data: T): Result<T> {
    return { success: true, data };
  },
  
  /**
   * エラー結果を作成
   */
  error<E = Error>(error: E): Result<never, E> {
    return { success: false, error };
  },
  
  /**
   * Result型かどうかを判定
   */
  isResult(value: unknown): value is Result<unknown, unknown> {
    return (
      typeof value === 'object' &&
      value !== null &&
      'success' in value &&
      typeof value.success === 'boolean'
    );
  },
  
  /**
   * 成功結果かどうかを判定
   */
  isOk<T, E>(result: Result<T, E>): result is { success: true; data: T } {
    return result.success === true;
  },
  
  /**
   * エラー結果かどうかを判定
   */
  isError<T, E>(result: Result<T, E>): result is { success: false; error: E } {
    return result.success === false;
  },
  
  /**
   * Result型の値を取得（エラーの場合は例外を投げる）
   */
  unwrap<T, E>(result: Result<T, E>): T {
    if (result.success) {
      return result.data;
    }
    throw result.error;
  },
  
  /**
   * Result型の値を取得（エラーの場合はデフォルト値を返す）
   */
  unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
    if (result.success) {
      return result.data;
    }
    return defaultValue;
  },
  
  /**
   * Result型をmap変換
   */
  map<T, U, E>(
    result: Result<T, E>,
    fn: (value: T) => U
  ): Result<U, E> {
    if (result.success) {
      return { success: true, data: fn(result.data) } as Result<U, E>;
    }
    return { success: false, error: result.error } as Result<U, E>;
  },
  
  /**
   * Result型をflatMap変換
   */
  flatMap<T, U, E>(
    result: Result<T, E>,
    fn: (value: T) => Result<U, E>
  ): Result<U, E> {
    if (result.success) {
      return fn(result.data);
    }
    return result;
  },
  
  /**
   * エラーをmap変換
   */
  mapError<T, E, F>(
    result: Result<T, E>,
    fn: (error: E) => F
  ): Result<T, F> {
    if (!result.success) {
      return Result.error(fn(result.error));
    }
    return result;
  },
  
  /**
   * Promise<Result>用のヘルパー
   */
  async fromPromise<T>(
    promise: Promise<T>
  ): Promise<Result<T>> {
    try {
      const data = await promise;
      return Result.ok(data);
    } catch (error) {
      return Result.error(error as Error);
    }
  },
  
  /**
   * 複数のResultを結合
   */
  all<T extends readonly Result<any, any>[]>(
    results: T
  ): Result<{
    [K in keyof T]: T[K] extends Result<infer U, any> ? U : never
  }, T[number] extends Result<any, infer E> ? E : never> {
    const values: any[] = [];
    
    for (const result of results) {
      if (!result.success) {
        return { success: false, error: result.error } as Result<{
          [K in keyof T]: T[K] extends Result<infer U, any> ? U : never
        }, T[number] extends Result<any, infer E> ? E : never>;
      }
      values.push(result.data);
    }
    
    return { success: true, data: values } as Result<{
      [K in keyof T]: T[K] extends Result<infer U, any> ? U : never
    }, T[number] extends Result<any, infer E> ? E : never>;
  }
};