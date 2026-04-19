import mongoose, { Schema } from 'mongoose';

const IssueSchema = new Schema(
  {
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    category: {
      type: String,
      enum: ['maintenance', 'it', 'disciplinary', 'general'],
      required: true
    },
    description: { type: String, required: true },
    mediaURLs: [{ type: String }],
    locationDesc: { type: String }, // e.g. "Library 2nd Floor"
    // GeoJSON point for the heatmap feature
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], index: '2dsphere' } // [longitude, latitude]
    },
    status: { type: String, enum: ['open', 'in_progress', 'resolved'], default: 'open' },
    // Assigned by admin after triage — optional on creation
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedDepartmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    adminResponse: { type: String },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

IssueSchema.index({ status: 1 });
IssueSchema.index({ assignedTo: 1 });
IssueSchema.index({ category: 1 });

export const Issue = mongoose.model('Issue', IssueSchema);
