import rateLimit from 'express-rate-limit';

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later' },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,  // max 10 login attempts per 15 min
  message: { success: false, message: 'Too many login attempts, please try again in 15 minutes' },
});

export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 20,
  message: { success: false, message: 'AI rate limit reached' },
});
