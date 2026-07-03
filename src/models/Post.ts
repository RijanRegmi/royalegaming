import mongoose, { Schema, model, models } from 'mongoose';

const CommentSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  userAvatar: { type: String },
  text: { type: String, required: true },
}, { timestamps: true });

const PostSchema = new Schema({
  adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  content: { type: String, required: true },
  image: { type: String }, // path/URL to post image
  likes: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }], // array of user IDs who liked
  comments: [CommentSchema], // array of comment subdocuments
}, { timestamps: true });

const Post = models.Post || model('Post', PostSchema);
export default Post;
