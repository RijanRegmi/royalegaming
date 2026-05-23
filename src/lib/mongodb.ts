import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
    
    // Seed default super admin once connection is ready
    if (!(global as any).superAdminSeeded) {
      (global as any).superAdminSeeded = true;
      import('./seed').then(({ seedSuperAdmin, seedGames }) => {
        seedSuperAdmin().catch((err) => console.error('Seeding error:', err));
        seedGames().catch((err) => console.error('Seeding error:', err));
      });
    }
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
