import { z } from 'zod';

export const createEventSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().min(1, "Description is required"),
  venue: z.string().min(1, "Venue is required"),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  expectedAttendance: z.coerce.number().min(1).default(50),
  templateType: z.enum(['hackathon', 'case_study', 'plain']).default('plain'),
});

export const eventApprovalSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  comment: z.string().max(300).optional(),
});
