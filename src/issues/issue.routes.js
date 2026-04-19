import { Router } from 'express';
import { issueController } from './issue.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { requireRoles } from '../middleware/rbac.middleware.js';
import { createIssueSchema, updateIssueSchema } from '../validators/issue.validator.js';
import { upload } from '../middleware/upload.middleware.js';

const router = Router();

// Anyone can submit an issue
router.post(
  '/',
  upload.array('media', 3), // max 3 images
  validate(createIssueSchema),
  issueController.createOne
);

// Students fetching their own reports
router.get(
  '/me',
  issueController.fetchMine
);

// Admins fetching all campus issues
router.get(
  '/all',
  requireRoles('hod', 'dean', 'superadmin'),
  issueController.fetchAll
);

// Leadership fetching heatmap data
router.get(
  '/heatmap',
  requireRoles('hod', 'dean', 'superadmin'),
  issueController.fetchHeatmap
);

// Admin processing & resolving an issue
router.patch(
  '/:id',
  requireRoles('hod', 'dean', 'superadmin'),
  validate(updateIssueSchema),
  issueController.patchIssue
);

export { router as issueRouter };
