import { z } from 'zod';

export const chatQuerySchema = z.object({
  query: z.string().min(2).max(500)
});
