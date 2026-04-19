import { batchService } from './batch.service.js';

export const batchController = {
  async create(req, res, next) {
    try {
      const batch = await batchService.create(req.user, req.body);
      res.status(201).json({ success: true, message: 'Batch created', data: batch });
    } catch (err) { next(err); }
  },

  async myBatches(req, res, next) {
    try {
      const batches = await batchService.getMyBatches(req.user.userId);
      res.json({ success: true, count: batches.length, data: batches });
    } catch (err) { next(err); }
  },

  async studentBatches(req, res, next) {
    try {
      const batches = await batchService.getStudentBatches(req.user.userId);
      res.json({ success: true, count: batches.length, data: batches });
    } catch (err) { next(err); }
  },

  async getById(req, res, next) {
    try {
      const batch = await batchService.getById(req.params.id, req.user.userId, req.user.role);
      res.json({ success: true, data: batch });
    } catch (err) { next(err); }
  },

  async updateStudents(req, res, next) {
    try {
      const batch = await batchService.updateStudents(req.params.id, req.body.studentIds);
      res.json({ success: true, message: 'Batch students updated', data: batch });
    } catch (err) { next(err); }
  },

  async sendBatchNotice(req, res, next) {
    try {
      const notice = await batchService.sendBatchNotice(req.params.id, req.user.userId, req.body);
      res.status(201).json({ success: true, message: 'Notice sent to batch', data: notice });
    } catch (err) { next(err); }
  },

  async listByDepartment(req, res, next) {
    try {
      const batches = await batchService.listByDepartment(
        req.user.departmentId, req.query.academicYear
      );
      res.json({ success: true, count: batches.length, data: batches });
    } catch (err) { next(err); }
  },
};
