/**
 * Type-safe EventBus implementation
 * 
 * 型安全なイベントバスの実装
 * イベント名とペイロードの型を保証する
 */

import { EventPayloads } from '../constants/events';

type EventHandler<T = any> = (payload: T) => void | Promise<void>;
type UnsubscribeFn = () => void;

/**
 * 型安全なイベントバス
 * 
 * @example
 * ```typescript
 * const eventBus = new TypedEventBus<EventPayloads>();
 * 
 * // 購読（型安全）
 * const unsubscribe = eventBus.on('translation-complete', (payload) => {
 *   console.log(payload.original); // 型が推論される
 * });
 * 
 * // 発行（型安全）
 * eventBus.emit('translation-complete', {
 *   id: '123',
 *   original: 'Hello',
 *   japanese: 'こんにちは',
 *   timestamp: Date.now()
 * });
 * 
 * // 購読解除
 * unsubscribe();
 * ```
 */
export class TypedEventBus<TEvents extends Record<string, any>> {
  private handlers = new Map<keyof TEvents, Set<EventHandler>>();
  private onceHandlers = new Map<keyof TEvents, Set<EventHandler>>();
  
  /**
   * イベントを購読
   */
  on<K extends keyof TEvents>(
    event: K,
    handler: EventHandler<TEvents[K]>
  ): UnsubscribeFn {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    
    this.handlers.get(event)!.add(handler);
    
    // 購読解除関数を返す
    return () => {
      const handlers = this.handlers.get(event);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.handlers.delete(event);
        }
      }
    };
  }
  
  /**
   * イベントを一度だけ購読
   */
  once<K extends keyof TEvents>(
    event: K,
    handler: EventHandler<TEvents[K]>
  ): UnsubscribeFn {
    if (!this.onceHandlers.has(event)) {
      this.onceHandlers.set(event, new Set());
    }
    
    this.onceHandlers.get(event)!.add(handler);
    
    // 購読解除関数を返す
    return () => {
      const handlers = this.onceHandlers.get(event);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.onceHandlers.delete(event);
        }
      }
    };
  }
  
  /**
   * イベントを発行
   */
  async emit<K extends keyof TEvents>(
    event: K,
    payload: TEvents[K]
  ): Promise<void> {
    // 通常のハンドラを実行
    const handlers = this.handlers.get(event);
    if (handlers) {
      const promises: Promise<void>[] = [];
      
      for (const handler of handlers) {
        try {
          const result = handler(payload);
          if (result instanceof Promise) {
            promises.push(result);
          }
        } catch (error) {
          console.error(`Error in event handler for ${String(event)}:`, error);
        }
      }
      
      // 非同期ハンドラを待つ
      if (promises.length > 0) {
        await Promise.allSettled(promises);
      }
    }
    
    // onceハンドラを実行して削除
    const onceHandlers = this.onceHandlers.get(event);
    if (onceHandlers) {
      const promises: Promise<void>[] = [];
      
      for (const handler of onceHandlers) {
        try {
          const result = handler(payload);
          if (result instanceof Promise) {
            promises.push(result);
          }
        } catch (error) {
          console.error(`Error in once handler for ${String(event)}:`, error);
        }
      }
      
      // onceハンドラをクリア
      this.onceHandlers.delete(event);
      
      // 非同期ハンドラを待つ
      if (promises.length > 0) {
        await Promise.allSettled(promises);
      }
    }
  }
  
  /**
   * イベントを同期的に発行（非推奨）
   */
  emitSync<K extends keyof TEvents>(
    event: K,
    payload: TEvents[K]
  ): void {
    // 通常のハンドラを実行
    const handlers = this.handlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(payload);
        } catch (error) {
          console.error(`Error in event handler for ${String(event)}:`, error);
        }
      }
    }
    
    // onceハンドラを実行して削除
    const onceHandlers = this.onceHandlers.get(event);
    if (onceHandlers) {
      for (const handler of onceHandlers) {
        try {
          handler(payload);
        } catch (error) {
          console.error(`Error in once handler for ${String(event)}:`, error);
        }
      }
      
      // onceハンドラをクリア
      this.onceHandlers.delete(event);
    }
  }
  
  /**
   * 特定のイベントの購読を全て解除
   */
  off<K extends keyof TEvents>(event: K): void {
    this.handlers.delete(event);
    this.onceHandlers.delete(event);
  }
  
  /**
   * 全てのイベント購読を解除
   */
  offAll(): void {
    this.handlers.clear();
    this.onceHandlers.clear();
  }
  
  /**
   * イベントハンドラの数を取得
   */
  listenerCount<K extends keyof TEvents>(event: K): number {
    const normalCount = this.handlers.get(event)?.size || 0;
    const onceCount = this.onceHandlers.get(event)?.size || 0;
    return normalCount + onceCount;
  }
  
  /**
   * イベント名の一覧を取得
   */
  eventNames(): (keyof TEvents)[] {
    const names = new Set<keyof TEvents>();
    
    for (const key of this.handlers.keys()) {
      names.add(key);
    }
    
    for (const key of this.onceHandlers.keys()) {
      names.add(key);
    }
    
    return Array.from(names);
  }
}

/**
 * グローバルイベントバスのシングルトンインスタンス
 */
export const globalEventBus = new TypedEventBus<EventPayloads>();