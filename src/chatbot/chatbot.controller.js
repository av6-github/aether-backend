import { chatbotService } from './chatbot.service.js';

export const chatbotController = {
  async sendMessage(req, res, next) {
    try {
      // Pass full user context so tools can access departmentId, etc.
      const result = await chatbotService.chat(req.user, req.body.query);
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  },

  async getHistory(req, res, next) {
    try {
      const logs = await chatbotService.getHistory(req.user.userId);
      res.status(200).json({ success: true, data: logs });
    } catch (err) { next(err); }
  }
};
