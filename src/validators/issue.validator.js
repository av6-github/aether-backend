import { z } from 'zod';

export const createIssueSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().min(10),
  category: z.enum(['maintenance', 'it', 'disciplinary', 'general']),
  locationDesc: z.string().optional(),
  latitude: z.union([z.string(), z.number()]).optional(),
  longitude: z.union([z.string(), z.number()]).optional(),
});

export const updateIssueSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved']),
  adminResponse: z.string().optional()
});
