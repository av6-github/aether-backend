import { issueService } from './issue.service.js';

export const issueController = {
  async createOne(req, res, next) {
    try {
      const mediaURLs = req.files ? req.files.map(f => f.path) : [];
      const issueData = { ...req.body, mediaURLs };
      const issue = await issueService.raiseIssue(req.user.userId, issueData);
      res.status(201).json({ success: true, message: 'Issue reported to authorities.', data: issue });
    } catch(err) { next(err); }
  },

  async fetchMine(req, res, next) {
    try {
      const docs = await issueService.getMyIssues(req.user.userId);
      res.status(200).json({ success: true, data: docs });
    } catch(err) { next(err); }
  },

  async fetchAll(req, res, next) {
    try {
      const catQuery = req.query.categories ? req.query.categories.split(',') : [];
      const docs = await issueService.getAllIssues(req.user.role, catQuery);
      res.status(200).json({ success: true, data: docs });
    } catch(err) { next(err); }
  },

  async fetchHeatmap(req, res, next) {
    try {
      const data = await issueService.getHeatmap();
      res.status(200).json({ success: true, data });
    } catch(err) { next(err); }
  },

  async patchIssue(req, res, next) {
    try {
      const updated = await issueService.processIssue(req.params.id, req.user.userId, req.body);
      res.status(200).json({ success: true, data: updated });
    } catch(err) { next(err); }
  }
};
