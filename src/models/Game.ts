import mongoose, { Schema, model, models } from 'mongoose';

export interface IGame {
  name: string;
  image: string;
  link: string;
  createdAt: Date;
  updatedAt: Date;
}

const GameSchema = new Schema<IGame>({
  name: { type: String, required: true },
  image: { type: String, required: true },
  link: { type: String, required: true },
}, { timestamps: true });

const Game = models.Game || model<IGame>('Game', GameSchema);
export default Game;
