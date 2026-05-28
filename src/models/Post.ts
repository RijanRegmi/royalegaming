import mongoose, { Schema, model, models } from 'mongoose';

const PostSchema = new Schema({
  adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  content: { type: String, required: true },
  image: { type: String }, // path/URL to post image
  likes: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }], // array of user IDs who liked
}, { timestamps: true });

const Post = models.Post || model('Post', PostSchema);
export default Post;
