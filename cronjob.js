// File: cronjob.js

const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_CONNECTION_STRING); // Use the Redis connection string from environment variables

const EXPIRATION_SET_KEY = 'reservations_expirations';

// Function to clean up expired entries
async function cleanUpExpiredEntries() {
  const now = Date.now(); // Current time in milliseconds

  console.log('Current time (milliseconds):', now);

  // Determine the expiration time based on the mode
  const mode = process.env.MODE || 'production';
  const expirationTime = mode === 'test' ? now - 30 * 60 * 1000 : now - 5 * 7 * 24 * 60 * 60 * 1000; // 30 minutes for test, 5 weeks for production

  console.log(`Mode: ${mode}`);
  console.log(`Expiration time (milliseconds):`, expirationTime);

  // Get all expired entries
  const expiredEntries = await redis.zrangebyscore(EXPIRATION_SET_KEY, 0, expirationTime);

  console.log('Expired entries: ', JSON.stringify(expiredEntries));

  if (expiredEntries.length > 0) {
    const pipeline = redis.pipeline();

    expiredEntries.forEach(entry => {
      const key = entry.split('-').pop(); // Extract the postfix after the "-"
      if (key) {
        // Remove from the hash and the sorted set
        pipeline.hdel(key, entry);
        pipeline.zrem(EXPIRATION_SET_KEY, entry);
      }
    });

    await pipeline.exec();
    console.log(`Cleaned up ${expiredEntries.length} expired entries.`);
  } else {
    console.log('No expired entries to clean up.');
  }
}

// Execute the cleanup function
cleanUpExpiredEntries().catch(err => console.error('Error cleaning up expired entries:', err));