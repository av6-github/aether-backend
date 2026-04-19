import mongoose, { Schema } from 'mongoose';

const AdvisingNoteSchema = new Schema({
  // The faculty mentor authoring the note
  facultyId:  { type: Schema.Types.ObjectId, ref: 'User', required: true },

  // The student being advised
  studentId:  { type: Schema.Types.ObjectId, ref: 'User', required: true },

  // Note content
  title:      { type: String, required: true, trim: true, maxLength: 120 },
  note:       { type: String, required: true, trim: true, maxLength: 5000 },

  // Category helps organise notes in the UI (academic, personal, disciplinary, career)
  category: {
    type: String,
    enum: ['academic', 'personal', 'disciplinary', 'career', 'other'],
    default: 'academic'
  },

  // Follow-up flag — faculty can mark a note as needing a follow-up
  requiresFollowUp: { type: Boolean, default: false },
  followUpDate:     { type: Date },
  followUpDone:     { type: Boolean, default: false },

  // Visibility: 'private' means only the faculty author can see it; 'shared' means the student can also see it
  visibility: {
    type: String,
    enum: ['private', 'shared'],
    default: 'private'
  },
}, { timestamps: true });

AdvisingNoteSchema.index({ facultyId: 1, studentId: 1, createdAt: -1 });
AdvisingNoteSchema.index({ studentId: 1, visibility: 1 });

export const AdvisingNote = mongoose.model('AdvisingNote', AdvisingNoteSchema);
