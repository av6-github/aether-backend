import mongoose, { Schema } from 'mongoose';

const PluginSchema = new Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens']
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    iconUrl: { type: String, default: null },
    appUrl: { type: String, required: true },
    version: { type: String, default: '1.0.0' },
    allowedRoles: {
      type: [String],
      enum: ['student', 'faculty', 'council', 'hod', 'dean', 'superadmin', 'committee'],
      default: ['student']
    },
    requiresScopes: {
      type: [String],
      enum: ['profile.read', 'notifications.write', 'attendance.read', 'timetable.read'],
      default: ['profile.read']
    },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

PluginSchema.index({ isActive: 1 });


export const Plugin = mongoose.model('Plugin', PluginSchema);
