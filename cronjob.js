// File: cronjob.js

const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_CONNECTION_STRING); // Use the Redis connection string from environment variables

const EXPIRATION_SET_KEY = 'reservations_expirations';

// Function to clean up expired entries
async function cleanUpExpiredEntries() {
  const now = Date.now(); // Current time in milliseconds

  console.log('Current time (seconds):', now);

  // Get all entries with their scores
  const allEntriesWithScores = await redis.zrange(EXPIRATION_SET_KEY, 0, -1, 'WITHSCORES');

  console.log('All entries with scores: ', JSON.stringify(allEntriesWithScores));

  // Get all expired entries
  const expiredEntries = await redis.zrangebyscore(EXPIRATION_SET_KEY, 0, now);

  console.log('Expired entries: ', JSON.stringify(expiredEntries));

  if (expiredEntries.length > 0) {
    const pipeline = redis.pipeline();

    expiredEntries.forEach(entry => {
      // Remove from the hash and the sorted set
      pipeline.hdel(entry, entry);
      pipeline.zrem(EXPIRATION_SET_KEY, entry);
    });

    await pipeline.exec();
    console.log(`Cleaned up ${expiredEntries.length} expired entries.`);
  } else {
    console.log('No expired entries to clean up.');
  }
}

// Execute the cleanup function
cleanUpExpiredEntries().catch(err => console.error('Error cleaning up expired entries:', err));