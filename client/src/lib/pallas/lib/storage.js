/**
 * Base Storage class that defines the interface for all storage implementations
 */
class Storage {
    /**
     * Get an item from storage
     * @param {string} key - The key to retrieve
     * @returns {any} The parsed value or null if not found
     */
    getItem(key) {
      throw new Error('getItem method must be implemented');
    }
  
    /**
     * Set an item in storage
     * @param {string} key - The key to store under
     * @param {any} value - The value to store (will be JSON stringified)
     * @returns {void}
     */
    setItem(key, value) {
      throw new Error('setItem method must be implemented');
    }
  
    /**
     * Remove an item from storage
     * @param {string} key - The key to remove
     * @returns {void}
     */
    removeItem(key) {
      throw new Error('removeItem method must be implemented');
    }
  
    /**
     * Clear all items from storage
     * @returns {void}
     */
    clear() {
      throw new Error('clear method must be implemented');
    }
  
    /**
     * Get all keys in storage
     * @returns {string[]} Array of all keys
     */
    getAllKeys() {
      throw new Error('getAllKeys method must be implemented');
    }
  
    /**
     * Check if a key exists in storage
     * @param {string} key - The key to check
     * @returns {boolean} True if key exists
     */
    hasItem(key) {
      throw new Error('hasItem method must be implemented');
    }
  
    /**
     * Get the number of items in storage
     * @returns {number} Number of items
     */
    length() {
      throw new Error('length method must be implemented');
    }
  }
  
  /**
   * LocalStorage implementation of the Storage interface
   */
  class LocalStorage extends Storage {
    constructor() {
      super();
      this.storage = window.localStorage;
    }
  
    getItem(key) {
      try {
        const item = this.storage.getItem(key);
        return item ? JSON.parse(item) : null;
      } catch (error) {
        console.error('Error getting item from localStorage:', error);
        return null;
      }
    }
  
    setItem(key, value) {
      try {
        this.storage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error('Error setting item in localStorage:', error);
      }
    }
  
    removeItem(key) {
      try {
        this.storage.removeItem(key);
      } catch (error) {
        console.error('Error removing item from localStorage:', error);
      }
    }
  
    clear() {
      try {
        this.storage.clear();
      } catch (error) {
        console.error('Error clearing localStorage:', error);
      }
    }
  
    getAllKeys() {
      try {
        return Object.keys(this.storage);
      } catch (error) {
        console.error('Error getting keys from localStorage:', error);
        return [];
      }
    }
  
    hasItem(key) {
      try {
        return this.storage.getItem(key) !== null;
      } catch (error) {
        console.error('Error checking item in localStorage:', error);
        return false;
      }
    }
  
    length() {
      try {
        return this.storage.length;
      } catch (error) {
        console.error('Error getting localStorage length:', error);
        return 0;
      }
    }
  }
  
  /**
   * SessionStorage implementation of the Storage interface
   */
  class SessionStorage extends Storage {
    constructor() {
      super();
      this.storage = window.sessionStorage;
    }
  
    getItem(key) {
      try {
        const item = this.storage.getItem(key);
        return item ? JSON.parse(item) : null;
      } catch (error) {
        console.error('Error getting item from sessionStorage:', error);
        return null;
      }
    }
  
    setItem(key, value) {
      try {
        this.storage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error('Error setting item in sessionStorage:', error);
      }
    }
  
    removeItem(key) {
      try {
        this.storage.removeItem(key);
      } catch (error) {
        console.error('Error removing item from sessionStorage:', error);
      }
    }
  
    clear() {
      try {
        this.storage.clear();
      } catch (error) {
        console.error('Error clearing sessionStorage:', error);
      }
    }
  
    getAllKeys() {
      try {
        return Object.keys(this.storage);
      } catch (error) {
        console.error('Error getting keys from sessionStorage:', error);
        return [];
      }
    }
  
    hasItem(key) {
      try {
        return this.storage.getItem(key) !== null;
      } catch (error) {
        console.error('Error checking item in sessionStorage:', error);
        return false;
      }
    }
  
    length() {
      try {
        return this.storage.length;
      } catch (error) {
        console.error('Error getting sessionStorage length:', error);
        return 0;
      }
    }
  }
  
  /**
   * In-memory storage implementation (useful for testing or SSR)
   */
  class MemoryStorage extends Storage {
    constructor() {
      super();
      this.storage = new Map();
    }
  
    getItem(key) {
      return this.storage.get(key) || null;
    }
  
    setItem(key, value) {
      this.storage.set(key, value);
    }
  
    removeItem(key) {
      this.storage.delete(key);
    }
  
    clear() {
      this.storage.clear();
    }
  
    getAllKeys() {
      return Array.from(this.storage.keys());
    }
  
    hasItem(key) {
      return this.storage.has(key);
    }
  
    length() {
      return this.storage.size;
    }
  }
  
  export { Storage, LocalStorage, SessionStorage, MemoryStorage };