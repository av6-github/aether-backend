import mongoose from 'mongoose';

let isConnected = false;
let isConnecting = null;

/**
 * Connect to MongoDB safely (handles race conditions + retries)
 */
export async function connectDB(uri) {
  if (isConnected) return;

  // Prevent multiple parallel connections
  if (isConnecting) {
    await isConnecting;
    return;
  }

  try {
    isConnecting = mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    await isConnecting;

    isConnected = true;
    console.log('[DB] MongoDB connected');

    // 🔁 Connection event listeners
    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      console.warn('[DB] MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      isConnected = true;
      console.log('[DB] MongoDB reconnected');
    });

    mongoose.connection.on('error', (err) => {
      console.error('[DB] MongoDB error:', err.message);
    });

  } catch (error) {
    console.error('[DB] Initial connection failed:', error);

    // Retry after delay (important for cloud like Render)
    setTimeout(() => {
      console.log('[DB] Retrying connection...');
      connectDB(uri);
    }, 5000);
  } finally {
    isConnecting = null;
  }
}

/**
 * Get active DB connection
 */
export function getDB() {
  if (!isConnected) {
    throw new Error('Database not connected');
  }
  return mongoose.connection;
}

/**
 * Graceful shutdown (prevents crashes & memory leaks)
 */
process.on('SIGINT', async () => {
  console.log('[DB] Closing MongoDB connection...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[DB] SIGTERM received. Closing MongoDB connection...');
  await mongoose.connection.close();
  process.exit(0);
});