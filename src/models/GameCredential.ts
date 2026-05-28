import mongoose, { Schema, model, models } from 'mongoose';

export interface IGameCredential {
  adminId: mongoose.Types.ObjectId;
  gameName: string;
  gameId: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

const GameCredentialSchema = new Schema<IGameCredential>({
  adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  gameName: { type: String, required: true },
  gameId: { type: String, required: true },
  password: { type: String, required: true },
}, { timestamps: true });

const GameCredential = models.GameCredential || model<IGameCredential>('GameCredential', GameCredentialSchema);
export default GameCredential;
