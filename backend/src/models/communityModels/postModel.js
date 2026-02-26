import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
  post_id: { type: String, required: true, unique: true },  // Primary Key
  user_id: { type: String, required: true },                // Who created the post
  title: { type: String, required: true, maxLength: 120 },
  coverImageUrl: { type: String, default: "" },
  description: { type: String, maxLength: 2000 },

  room_type: { type: String, default: "other" },
  tags: [{ type: String }],

  cover_image_url: { type: String, default: "" },

  //createdAt: { type: Date, default: Date.now },
  //updatedAt: { type: Date, default: Date.now },

  reactsNumber: { type: Number, default: 0 },
  commentsNumber: { type: Number, default: 0 },   //saved posts added to user schema

  usersLiked: [{ type: String }],

},
{ timestamps: true });

const Post = mongoose.model("Post", postSchema);
export default Post;