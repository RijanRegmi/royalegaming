import mongoose, { Schema, model, models } from 'mongoose';

const MessageSchema = new Schema({
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  chatUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }, // The regular user's ID whose inbox this is
  content: { type: String }, // Optional to allow sending only files
  isRead: { type: Boolean, default: false },
  fileUrl: { type: String }, // Path to local public folder file (e.g. /upload/chats/abc.ext)
  fileType: { type: String, enum: ['image', 'voice', 'document'] },
  fileName: { type: String }, // Original file name
  fileSize: { type: Number }, // In bytes
  duration: { type: Number }, // Dynamic duration for voice recordings in seconds
}, { timestamps: true });

const Message = models.Message || model('Message', MessageSchema);
export default Message;

