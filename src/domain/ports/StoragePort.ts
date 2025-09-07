/**
 * StoragePort - ストレージアクセスの抽象化
 * 
 * Clean Architecture: 外部依存を抽象化するポート
 * テスト可能性とモック可能性を提供
 */

export interface StoragePort {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
  getAllKeys(): Promise<string[]>;
}

/**
 * LocalStorage実装
 */
export class LocalStorageAdapter implements StoragePort {
  async getItem(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      const err = new Error(`Failed to get item: ${key}`);
      (err as any).cause = error;
      throw err;
    }
  }
  
  async setItem(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        const err = new Error('Storage quota exceeded');
        (err as any).cause = error;
        throw err;
      }
      const err = new Error(`Failed to set item: ${key}`);
      (err as any).cause = error;
      throw err;
    }
  }
  
  async removeItem(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      const err = new Error(`Failed to remove item: ${key}`);
      (err as any).cause = error;
      throw err;
    }
  }
  
  async clear(): Promise<void> {
    try {
      localStorage.clear();
    } catch (error) {
      const err = new Error('Failed to clear storage');
      (err as any).cause = error;
      throw err;
    }
  }
  
  async getAllKeys(): Promise<string[]> {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) keys.push(key);
      }
      return keys;
    } catch (error) {
      const err = new Error('Failed to get all keys');
      (err as any).cause = error;
      throw err;
    }
  }
}

/**
 * In-memory実装（テスト用）
 */
export class InMemoryStorageAdapter implements StoragePort {
  private storage = new Map<string, string>();
  
  async getItem(key: string): Promise<string | null> {
    return this.storage.get(key) ?? null;
  }
  
  async setItem(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
  }
  
  async removeItem(key: string): Promise<void> {
    this.storage.delete(key);
  }
  
  async clear(): Promise<void> {
    this.storage.clear();
  }
  
  async getAllKeys(): Promise<string[]> {
    return Array.from(this.storage.keys());
  }
}