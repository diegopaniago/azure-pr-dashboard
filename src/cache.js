export class MemoryCache {
  constructor(defaultTtlSeconds = 300) {
    this.defaultTtlMs = Number(defaultTtlSeconds) * 1000;
    this.items = new Map();
  }

  get(key) {
    const item = this.items.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.items.delete(key);
      return null;
    }

    return item.value;
  }

  set(key, value, ttlSeconds) {
    const ttlMs = ttlSeconds ? Number(ttlSeconds) * 1000 : this.defaultTtlMs;
    this.items.set(key, {
      value,
      expiresAt: Date.now() + ttlMs
    });
  }

  clear(key) {
    if (key) {
      this.items.delete(key);
      return;
    }

    this.items.clear();
  }
}
