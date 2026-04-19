import mongoose, { Schema } from 'mongoose';

const ChatMessageSchema = new Schema(
  {
    roomId:     { type: String, required: true, index: true },
    senderId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    senderRole: { type: String, enum: ['student', 'faculty', 'hod', 'dean', 'council', 'committee', 'superadmin'], required: true },
    message:    { type: String, required: true },
  },
  { timestamps: true }
);

ChatMessageSchema.index({ roomId: 1, createdAt: 1 });

export const ChatMessage = mongoose.model('ChatMessage', ChatMessageSchema);
