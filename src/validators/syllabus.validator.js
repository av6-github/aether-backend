import { z } from 'zod';

export const topicSchema = z.object({
  name: z.string().min(2),
  status: z.enum(['pending', 'done']).default('pending'),
  notes: z.string().optional(),
});

export const initSyllabusSchema = z.object({
  subjectId: z.string().min(1),
  semester: z.number().min(1).max(8),
  academicYear: z.string().regex(/^\d{4}-\d{4}$/),
  topics: z.array(topicSchema).min(1),
});

export const updateTopicSchema = z.object({
  topicId: z.string().min(1),
  status: z.enum(['pending', 'done']),
  notes: z.string().optional(),
});
