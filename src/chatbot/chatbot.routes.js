import { Router } from 'express';
import { chatbotController } from './chatbot.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { chatQuerySchema } from '../validators/chatbot.validator.js';

const router = Router();

// Send a message to the AI assistant
router.post('/message', validate(chatQuerySchema), chatbotController.sendMessage);

// Get conversation history
router.get('/history', chatbotController.getHistory);

export { router as chatbotRouter };
