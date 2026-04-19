import { z } from 'zod';

const SlotSchema = z.object({
  day: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM'),
  subjectId: z.string().min(1),
  facultyId: z.string().min(1),
  roomId: z.string().min(1),
});

export const uploadTimetableSchema = z.object({
  division: z.string().min(1),
  semester: z.number().min(1).max(8),
  academicYear: z.string().regex(/^\d{4}-\d{4}$/, 'Format YYYY-YYYY'),
  slots: z.array(SlotSchema).min(1, 'At least one slot required').max(60),
});

export const approvalSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  comment: z.string().max(500).optional(),
});
