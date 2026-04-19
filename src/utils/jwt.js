import jwt from 'jsonwebtoken';

export function signAccessToken(payload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not set');
  const options = { expiresIn: process.env.JWT_EXPIRES_IN || '7d' };
  return jwt.sign(payload, secret, options);
}

export function signRefreshToken(payload) {
  const secret = process.env.REFRESH_TOKEN_SECRET;
  if (!secret) throw new Error('REFRESH_TOKEN_SECRET not set');
  const options = { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d' };
  return jwt.sign(payload, secret, options);
}

export function verifyAccessToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not set');
  return jwt.verify(token, secret);
}

export function verifyRefreshToken(token) {
  const secret = process.env.REFRESH_TOKEN_SECRET;
  if (!secret) throw new Error('REFRESH_TOKEN_SECRET not set');
  return jwt.verify(token, secret);
}
