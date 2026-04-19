import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['student', 'faculty', 'council', 'hod', 'dean']),
  departmentId: z.string().min(1, 'Department ID required'),
  division: z.string().optional(),
  enrollmentNo: z.string().optional(),
  employeeId: z.string().optional(),
  subRole: z.enum(['committee_head', 'class_rep', 'sports_secretary', 'timetable_coord']).optional().nullable(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const updateSubRoleSchema = z.object({
  userId: z.string().min(1),
  subRole: z.enum(['committee_head', 'class_rep', 'sports_secretary', 'timetable_coord']).nullable(),
});
