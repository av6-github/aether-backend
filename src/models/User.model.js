import mongoose, { Schema } from 'mongoose';

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String, required: true, unique: true,
      lowercase: true, trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email']
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['student', 'faculty', 'council', 'hod', 'dean', 'superadmin', 'committee'],
      required: true
    },
    subRole: {
      type: String,
      enum: [
        // Faculty sub-roles
        'committee_head', 'class_rep', 'timetable_coord',
        // Dean specialisations (from SPIT directory)
        'dean_admin', 'dean_academics', 'dean_students',
        // Student Council 2025-26 positions
        'general_secretary', 'finance_secretary', 'sports_secretary',
        'technical_secretary', 'cultural_secretary', 'ladies_representative',
        'vice_finance_secretary', 'vice_sports_secretary',
        'vice_technical_secretary', 'vice_cultural_secretary',
        'social_media_manager',
        null
      ],
      default: null
    },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    semester: { type: Number },
    division: { type: String },
    enrollmentNo: { type: String },
    employeeId: { type: String },
    pushTokens: [{ type: String }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

UserSchema.index({ role: 1, departmentId: 1 });
UserSchema.index({ departmentId: 1, division: 1 });

export const User = mongoose.model('User', UserSchema);
