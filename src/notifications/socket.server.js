import { Server } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt.js';

let io = null;

// Map userId -> Set of socketIds (user can be connected from multiple devices)
const userSockets = new Map();

export function initSocketServer(httpServer) {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins.length ? allowedOrigins : '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // No Redis adapter — in-process map works for single-instance deployment
    transports: ['websocket', 'polling'],
  });

  // ── Optional Redis adapter (only attach if REDIS_URL is configured) ─────────
  if (process.env.REDIS_URL) {
    import('@socket.io/redis-adapter').then(async ({ createAdapter }) => {
      const { default: Redis } = await import('ioredis');
      try {
        const pubClient = new Redis(process.env.REDIS_URL);
        const subClient = pubClient.duplicate();
        pubClient.on('error', err => console.error('[Redis Pub]', err.message));
        subClient.on('error', err => console.error('[Redis Sub]', err.message));
        io.adapter(createAdapter(pubClient, subClient));
        console.log('[Socket.io] Redis adapter attached');
      } catch (err) {
        console.warn('[Socket.io] Redis adapter failed — using in-memory:', err.message);
      }
    }).catch(() => {
      console.warn('[Socket.io] @socket.io/redis-adapter not available, using in-memory');
    });
  } else {
    console.log('[Socket.io] No REDIS_URL — using in-memory adapter (single-instance mode)');
  }

  // ── Auth middleware ──────────────────────────────────────────────────────────
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

  // ── Connection handling ──────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const userId   = socket.user.userId;
    const deptId   = socket.user.departmentId;
    const division = socket.user.division;
    const role     = socket.user.role;

    // Personal room
    socket.join(`user:${userId}`);

    // Department-wide room (notices, events)
    if (deptId) socket.join(`dept:${deptId}`);

    // Division room (division-specific notices, attendance)
    if (deptId && division) socket.join(`dept:${deptId}:div:${division}`);

    // Role room (faculty, hod, dean broadcast channels)
    socket.join(`role:${role}`);

    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId).add(socket.id);

    console.log(`[Socket.io] ${role} ${userId} connected (socket: ${socket.id})`);

    socket.on('disconnect', () => {
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) userSockets.delete(userId);
      }
    });
  });

  console.log('[Socket.io] Server initialized');
  return io;
}

/** Push event to a specific user (all their devices) */
export function pushToUser(userId, event, payload) {
  if (!io) return;
  io.to(`user:${String(userId)}`).emit(event, payload);
}

/** Push event to all connected users in a department */
export function pushToDept(departmentId, event, payload) {
  if (!io) return;
  io.to(`dept:${String(departmentId)}`).emit(event, payload);
}

/** Push event to a specific division within a department */
export function pushToDivision(departmentId, division, event, payload) {
  if (!io) return;
  io.to(`dept:${String(departmentId)}:div:${division}`).emit(event, payload);
}

/** Push event to all connected sockets with a given role */
export function pushToRole(role, event, payload) {
  if (!io) return;
  io.to(`role:${role}`).emit(event, payload);
}

export function getIO() {
  return io;
}
