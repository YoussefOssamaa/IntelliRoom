import mongoose, { Schema, model } from 'mongoose'

const commentSchema = new mongoose.Schema({
  comment_id: { type: String, required: true, unique: true }, // Primary Key
  user_id: { type: String, required: true },                  // Who wrote the comment
  post_id: { type: String, required: true },                  // Which post is commented on
  content: { type: String, required: true, maxLength: 300 },  // Comment text
  //createdAt: { type: Date, default: Date.now },               // Creation timestamp
  //updatedAt: { type: Date, default: Date.now }                // Last update timestamp
},{ timestamps: true });

const Comment = mongoose.model("Comment", commentSchema);

export default Comment;
