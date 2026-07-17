import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryCache } from '../src/cache.js';

test('MemoryCache retorna valores antes do TTL expirar', () => {
  const cache = new MemoryCache(30);

  cache.set('prs', [{ id: 1 }]);

  assert.deepEqual(cache.get('prs'), [{ id: 1 }]);
});

test('MemoryCache remove valores expirados', () => {
  const originalNow = Date.now;
  let now = 1_000;
  Date.now = () => now;

  try {
    const cache = new MemoryCache(1);
    cache.set('prs', 'valor');

    now = 2_001;

    assert.equal(cache.get('prs'), null);
    assert.equal(cache.items.has('prs'), false);
  } finally {
    Date.now = originalNow;
  }
});

test('MemoryCache limpa uma chave especifica ou o cache completo', () => {
  const cache = new MemoryCache(30);

  cache.set('a', 1);
  cache.set('b', 2);
  cache.clear('a');

  assert.equal(cache.get('a'), null);
  assert.equal(cache.get('b'), 2);

  cache.clear();

  assert.equal(cache.get('b'), null);
});
