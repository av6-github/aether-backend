import { z } from 'zod';

export const markAttendanceSchema = z.object({
  timetableId: z.string().min(1),
  day: z.string().min(1),
  startTime: z.string().min(1),
  status: z.enum(['present', 'absent', 'late']).optional().default('present'),
  studentCoord: z.object({
    x: z.number(),
    y: z.number()
  }).optional(),
  date: z.string().min(1),  // Accept any non-empty date string, no strict regex
});

export const facultyOverrideSchema = z.object({
  // Accept any of: subjectId+division OR timetableId+day+startTime
  subjectId: z.string().optional(),
  division: z.string().optional(),
  timetableId: z.string().optional(),
  day: z.string().optional(),
  startTime: z.string().optional(),
  date: z.string().min(1),
  updates: z.array(z.object({
    studentId: z.string().min(1),
    status: z.enum(['present', 'absent', 'late']),
    remarks: z.string().optional(),
  }))
});
