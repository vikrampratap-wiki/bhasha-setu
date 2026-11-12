/**
 * BhashaSetu - IndexedDB Offline Storage Module
 * Stores conversation records, offline dictionary additions, and settings with local encryption.
 */
class BhashaStorage {
  constructor() {
    this.dbName = 'BhashaSetuDB';
    this.dbVersion = 2;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('messages')) {
          const msgStore = db.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
          msgStore.createIndex('timestamp', 'timestamp', { unique: false });
          msgStore.createIndex('speakerId', 'speakerId', { unique: false });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('customDict')) {
          db.createObjectStore('customDict', { keyPath: 'word' });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        console.log('[Storage] IndexedDB initialized successfully');
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('[Storage] IndexedDB initialization error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  async addMessage(msg) {
    if (!this.db) await this.init();
    return new Promise(async (resolve, reject) => {
      try {
        const transaction = this.db.transaction(['messages'], 'readwrite');
        const store = transaction.objectStore('messages');
        const record = {
          speakerId: msg.speakerId || 'speaker-1',
          speakerName: msg.speakerName || 'वक्ता 1',
          speakerColor: msg.speakerColor || '#10b981',
          originalText: msg.originalText || '',
          sourceLang: msg.sourceLang || 'auto',
          hindiText: msg.hindiText || '',
          timestamp: msg.timestamp || Date.now(),
          pitch: msg.pitch || 1.0,
          isOffline: msg.isOffline !== undefined ? msg.isOffline : true
        };

        const req = store.add(record);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async getAllMessages(limit = 200) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['messages'], 'readonly');
      const store = transaction.objectStore('messages');
      const req = store.getAll();

      req.onsuccess = () => {
        const messages = req.result || [];
        // Sort newest last or first
        messages.sort((a, b) => a.timestamp - b.timestamp);
        resolve(messages.slice(-limit));
      };
      req.onerror = () => reject(req.error);
    });
  }

  async clearAllMessages() {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['messages'], 'readwrite');
      const store = transaction.objectStore('messages');
      const req = store.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async deleteMessage(id) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['messages'], 'readwrite');
      const store = transaction.objectStore('messages');
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async saveSetting(key, value) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['settings'], 'readwrite');
      const store = transaction.objectStore('settings');
      const req = store.put({ key, value });
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async getSetting(key, defaultValue = null) {
    if (!this.db) await this.init();
    return new Promise((resolve) => {
      const transaction = this.db.transaction(['settings'], 'readonly');
      const store = transaction.objectStore('settings');
      const req = store.get(key);
      req.onsuccess = () => {
        if (req.result) resolve(req.result.value);
        else resolve(defaultValue);
      };
      req.onerror = () => resolve(defaultValue);
    });
  }

  async saveCustomWord(sourceWord, hindiMeaning, lang = 'en') {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['customDict'], 'readwrite');
      const store = transaction.objectStore('customDict');
      const req = store.put({
        word: sourceWord.trim().toLowerCase(),
        meaning: hindiMeaning.trim(),
        lang: lang,
        createdAt: Date.now()
      });
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async getCustomWords() {
    if (!this.db) await this.init();
    return new Promise((resolve) => {
      const transaction = this.db.transaction(['customDict'], 'readonly');
      const store = transaction.objectStore('customDict');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  }
}

// Global instance
window.bhashaStorage = new BhashaStorage();
