import mongoose, { Schema, model, models } from 'mongoose';

export interface IGameCredential {
  gameName: string;
  gameId: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

const GameCredentialSchema = new Schema<IGameCredential>({
  gameName: { type: String, required: true },
  gameId: { type: String, required: true },
  password: { type: String, required: true },
}, { timestamps: true });

const GameCredential = models.GameCredential || model<IGameCredential>('GameCredential', GameCredentialSchema);
export default GameCredential;
