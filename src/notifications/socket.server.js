import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { verifyAccessToken } from '../utils/jwt.js';

let io = null;

// Map userId -> Set of socketIds (user can be connected from multiple devices)
const userSockets = new Map();

export function initSocketServer(httpServer) {
  const pubClient = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
  const subClient = pubClient.duplicate();

  pubClient.on('error', (err) => console.error('[Redis Pub] Error:', err.message));
  subClient.on('error', (err) => console.error('[Redis Sub] Error:', err.message));

  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins.length ? allowedOrigins : false,
      methods: ['GET', 'POST']
    },
    adapter: createAdapter(pubClient, subClient)
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = verifyAccessToken(token);
      socket.user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.userId;
    console.log(`[Socket.io] User ${userId} connected (${socket.id})`);

    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId).add(socket.id);

    // Join a personal room for targeted pushes
    socket.join(`user:${userId}`);

    socket.on('disconnect', () => {
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) userSockets.delete(userId);
      }
      console.log(`[Socket.io] User ${userId} disconnected`);
    });
  });

  console.log('[Socket.io] Server initialized');
  return io;
}

/**
 * Push a real-time notification event to a specific user.
 * Called from any service (events, timetable, issues, etc.)
 */
export function pushToUser(userId, event, payload) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
}

export function getIO() {
  return io;
}
