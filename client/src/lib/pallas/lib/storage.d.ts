/**
 * Base Storage interface that defines the contract for all storage implementations
 */
export declare abstract class Storage {
    /**
     * Get an item from storage
     * @param key - The key to retrieve
     * @returns The parsed value or null if not found
     */
    abstract getItem<T = any>(key: string): T | null;
  
    /**
     * Set an item in storage
     * @param key - The key to store under
     * @param value - The value to store (will be JSON stringified)
     */
    abstract setItem<T = any>(key: string, value: T): void;
  
    /**
     * Remove an item from storage
     * @param key - The key to remove
     */
    abstract removeItem(key: string): void;
  
    /**
     * Clear all items from storage
     */
    abstract clear(): void;
  
    /**
     * Get all keys in storage
     * @returns Array of all keys
     */
    abstract getAllKeys(): string[];
  
    /**
     * Check if a key exists in storage
     * @param key - The key to check
     * @returns True if key exists
     */
    abstract hasItem(key: string): boolean;
  
    /**
     * Get the number of items in storage
     * @returns Number of items
     */
    abstract length(): number;
  }
  
  /**
   * LocalStorage implementation of the Storage interface
   */
  export declare class LocalStorage extends Storage {
    private storage: globalThis.Storage;
    
    constructor();
    
    getItem<T = any>(key: string): T | null;
    setItem<T = any>(key: string, value: T): void;
    removeItem(key: string): void;
    clear(): void;
    getAllKeys(): string[];
    hasItem(key: string): boolean;
    length(): number;
  }
  
  /**
   * SessionStorage implementation of the Storage interface
   */
  export declare class SessionStorage extends Storage {
    private storage: globalThis.Storage;
    
    constructor();
    
    getItem<T = any>(key: string): T | null;
    setItem<T = any>(key: string, value: T): void;
    removeItem(key: string): void;
    clear(): void;
    getAllKeys(): string[];
    hasItem(key: string): boolean;
    length(): number;
  }
  
  /**
   * MemoryStorage implementation of the Storage interface
   * Useful for testing or server-side rendering
   */
  export declare class MemoryStorage extends Storage {
    private storage: Map<string, any>;
    
    constructor();
    
    getItem<T = any>(key: string): T | null;
    setItem<T = any>(key: string, value: T): void;
    removeItem(key: string): void;
    clear(): void;
    getAllKeys(): string[];
    hasItem(key: string): boolean;
    length(): number;
  }