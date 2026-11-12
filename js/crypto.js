/**
 * BhashaSetu - End-to-End Encryption (E2EE) Module
 * Uses Web Crypto API: AES-256-GCM + PBKDF2 (100,000 iterations SHA-256)
 */
class BhashaCrypto {
  constructor() {
    this.keyCache = new Map();
    this.salt = new TextEncoder().encode('bhasha-setu-salt-v1');
    this.activeKey = null;
    this.passphrase = 'bhasha-setu-secure-room-key';
    this.fingerprint = '';
  }

  /**
   * Derive a 256-bit AES-GCM CryptoKey from a user passphrase using PBKDF2
   */
  async deriveKey(passphrase) {
    if (!passphrase) passphrase = this.passphrase;
    if (this.keyCache.has(passphrase)) {
      return this.keyCache.get(passphrase);
    }

    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(passphrase),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    const derivedKey = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: this.salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    this.keyCache.set(passphrase, derivedKey);
    this.activeKey = derivedKey;
    this.passphrase = passphrase;
    this.fingerprint = await this.generateFingerprint(passphrase);
    return derivedKey;
  }

  /**
   * Generate a readable SHA-256 fingerprint for the current room key
   */
  async generateFingerprint(passphrase) {
    const enc = new TextEncoder();
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', enc.encode(passphrase + ':fingerprint'));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    // Return formatted 16-hex short visual fingerprint (e.g. 4A91-89F2-C10E-558B)
    const hex = hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join('');
    return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`;
  }

  /**
   * Encrypt arbitrary string/JSON data using AES-256-GCM
   * Returns base64 payload: { iv: base64, cipher: base64 }
   */
  async encrypt(data, passphrase = null) {
    try {
      const key = passphrase ? await this.deriveKey(passphrase) : (this.activeKey || await this.deriveKey(this.passphrase));
      const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit recommended IV for GCM
      const enc = new TextEncoder();
      const encodedData = enc.encode(typeof data === 'object' ? JSON.stringify(data) : String(data));

      const cipherBuffer = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        encodedData
      );

      const ivBase64 = this.arrayBufferToBase64(iv);
      const cipherBase64 = this.arrayBufferToBase64(cipherBuffer);

      return {
        encrypted: true,
        iv: ivBase64,
        data: cipherBase64,
        timestamp: Date.now()
      };
    } catch (err) {
      console.error('[E2EE] Encryption failed:', err);
      throw err;
    }
  }

  /**
   * Decrypt AES-256-GCM payload
   */
  async decrypt(encryptedPayload, passphrase = null) {
    try {
      if (!encryptedPayload || !encryptedPayload.encrypted) {
        return encryptedPayload; // Return raw data if not encrypted
      }

      const key = passphrase ? await this.deriveKey(passphrase) : (this.activeKey || await this.deriveKey(this.passphrase));
      const iv = this.base64ToArrayBuffer(encryptedPayload.iv);
      const cipherBuffer = this.base64ToArrayBuffer(encryptedPayload.data);

      const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: new Uint8Array(iv)
        },
        key,
        cipherBuffer
      );

      const dec = new TextDecoder();
      const decodedString = dec.decode(decryptedBuffer);

      try {
        return JSON.parse(decodedString);
      } catch {
        return decodedString;
      }
    } catch (err) {
      console.error('[E2EE] Decryption failed or invalid key:', err);
      throw new Error('डिक्रिप्शन विफल: रूम की (Key) गलत है या डेटा दूषित है।');
    }
  }

  arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

// Global instance
window.bhashaCrypto = new BhashaCrypto();
