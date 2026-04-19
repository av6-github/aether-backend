import Redis from 'ioredis';

let redisClient = null;

export function getRedisClient() {
  if (!redisClient) {
    const url = process.env.REDIS_URL;
    if (!url) {
      console.warn('[Redis] No REDIS_URL provided, caching and pub/sub might fail.');
      // Optional fallback or throw
      // throw new Error('REDIS_URL not set');
    }
    
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 3,
      enableAutoPipelining: true,
      lazyConnect: false, // Eager connect
    });
    
    redisClient.on('connect', () => console.log('[Redis] Connected successfully'));
    redisClient.on('error', (err) => console.error('[Redis] Error:', err.message));
  }
  return redisClient;
}

export async function cacheGet(key) {
  const client = getRedisClient();
  const val = await client.get(key);
  return val ? JSON.parse(val) : null;
}

export async function cacheSet(key, value, ttlSeconds = 300) {
  const client = getRedisClient();
  await client.setex(key, ttlSeconds, JSON.stringify(value));
}

export async function cacheDel(key) {
  const client = getRedisClient();
  await client.del(key);
}

export function getPublisher() {
  return getRedisClient().duplicate();
}

export function getSubscriber() {
  return getRedisClient().duplicate();
}
