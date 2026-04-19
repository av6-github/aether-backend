import { Router } from 'express';
import { authController } from './auth.controller.js';
import { authRateLimiter } from '../middleware/rateLimiter.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { loginSchema, registerSchema, refreshTokenSchema, updateSubRoleSchema } from '../validators/auth.validator.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireRoles } from '../middleware/rbac.middleware.js';

const router = Router();

// Public
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', authRateLimiter, validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshTokenSchema), authController.refresh);

// Protected
router.get('/me', authMiddleware, authController.me);
router.put(
  '/subrole',
  authMiddleware,
  requireRoles('council', 'hod', 'dean'),
  validate(updateSubRoleSchema),
  authController.updateSubRole
);
router.post('/push-token', authMiddleware, authController.registerPushToken);

// Any authenticated user can list other users by role (for dropdowns)
router.get('/users', authMiddleware, authController.listUsers);

export { router as authRouter };
