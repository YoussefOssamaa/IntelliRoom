import mongoose, { Schema, model } from 'mongoose'

const galleryPostSchema = new mongoose.Schema({
  post_id: { type: String, required: true, unique: true },
  user_id: { type: String, required: true },
  design_id: { type: String},
  post_text: { type: String, default: "", maxLength: 500 },
  likes: { type: Number, default: 0 },
  tags: [{ type: String, maxLength: 30 }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  comments: [
    {
      user_id: { type: String, required: true },
      comment_text: { type: String, required: true, maxLength: 300 },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    }
  ]
});

const GalleryPost = mongoose.model("GalleryPost", galleryPostSchema);

export default GalleryPost;