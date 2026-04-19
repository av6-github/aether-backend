import mongoose, { Schema } from 'mongoose';

const ChatbotLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    query: { type: String, required: true },
    response: { type: String, required: true },
    classification: { type: String, enum: ['basic', 'procedural', 'escalation'] },
    escalated: { type: Boolean, default: false },
    escalatedTo: { type: String, enum: ['council', 'hod'] },
    ticketId: { type: Schema.Types.ObjectId },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

ChatbotLogSchema.index({ userId: 1 });
ChatbotLogSchema.index({ escalated: 1 });

export const ChatbotLog = mongoose.model('ChatbotLog', ChatbotLogSchema);
