export abstract class Storage {
    abstract getItem<T = unknown>(key: string): T | null;
    abstract setItem<T = unknown>(key: string, value: T): void;
    abstract removeItem(key: string): void;
    abstract clear(): void;
    abstract getAllKeys(): string[];
    abstract hasItem(key: string): boolean;
    abstract length(): number;
  }
  
  export class LocalStorage extends Storage {
    private storage: globalThis.Storage;
  
    constructor() {
      super();
      this.storage = window.localStorage;
    }
  
    getItem<T = unknown>(key: string): T | null {
      try {
        const item = this.storage.getItem(key);
        return item ? JSON.parse(item) : null;
      } catch (error) {
        console.error('Error getting item from localStorage:', error);
        return null;
      }
    }
  
    setItem<T = unknown>(key: string, value: T): void {
      try {
        this.storage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error('Error setting item in localStorage:', error);
      }
    }
  
    removeItem(key: string): void {
      try {
        this.storage.removeItem(key);
      } catch (error) {
        console.error('Error removing item from localStorage:', error);
      }
    }
  
    clear(): void {
      try {
        this.storage.clear();
      } catch (error) {
        console.error('Error clearing localStorage:', error);
      }
    }
  
    getAllKeys(): string[] {
      try {
        return Object.keys(this.storage);
      } catch (error) {
        console.error('Error getting keys from localStorage:', error);
        return [];
      }
    }
  
    hasItem(key: string): boolean {
      try {
        return this.storage.getItem(key) !== null;
      } catch (error) {
        console.error('Error checking item in localStorage:', error);
        return false;
      }
    }
  
    length(): number {
      try {
        return this.storage.length;
      } catch (error) {
        console.error('Error getting localStorage length:', error);
        return 0;
      }
    }
  }
  
  export class SessionStorage extends Storage {
    private storage: globalThis.Storage;
  
    constructor() {
      super();
      this.storage = window.sessionStorage;
    }
  
    getItem<T = unknown>(key: string): T | null {
      try {
        const item = this.storage.getItem(key);
        return item ? JSON.parse(item) : null;
      } catch (error) {
        console.error('Error getting item from sessionStorage:', error);
        return null;
      }
    }
  
    setItem<T = unknown>(key: string, value: T): void {
      try {
        this.storage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error('Error setting item in sessionStorage:', error);
      }
    }
  
    removeItem(key: string): void {
      try {
        this.storage.removeItem(key);
      } catch (error) {
        console.error('Error removing item from sessionStorage:', error);
      }
    }
  
    clear(): void {
      try {
        this.storage.clear();
      } catch (error) {
        console.error('Error clearing sessionStorage:', error);
      }
    }
  
    getAllKeys(): string[] {
      try {
        return Object.keys(this.storage);
      } catch (error) {
        console.error('Error getting keys from sessionStorage:', error);
        return [];
      }
    }
  
    hasItem(key: string): boolean {
      try {
        return this.storage.getItem(key) !== null;
      } catch (error) {
        console.error('Error checking item in sessionStorage:', error);
        return false;
      }
    }
  
    length(): number {
      try {
        return this.storage.length;
      } catch (error) {
        console.error('Error getting sessionStorage length:', error);
        return 0;
      }
    }
  }
  
  /**
   * MemoryStorage implementation of the Storage interface
   * Useful for testing or server-side rendering
   */
  export class MemoryStorage extends Storage {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private storage: Map<string, any>;
  
    constructor() {
      super();
      this.storage = new Map();
    }
  
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getItem<T = any>(key: string): T | null {
      return this.storage.get(key) || null;
    }
  
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setItem<T = any>(key: string, value: T): void {
      this.storage.set(key, value);
    }
  
    removeItem(key: string): void {
      this.storage.delete(key);
    }
  
    clear(): void {
      this.storage.clear();
    }
  
    getAllKeys(): string[] {
      return Array.from(this.storage.keys());
    }
  
    hasItem(key: string): boolean {
      return this.storage.has(key);
    }
  
    length(): number {
      return this.storage.size;
    }
  }