import mongoose from 'mongoose';

const renderedImageSchema = new mongoose.Schema(
  {
    userID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    renderedImageURL: {
      type: String,
      required: true
    },
    inputPrompt: {
      type: String,
      default: ''
    },
    updatePrompts: {
      type: [String],
      default: []
    }
    // },
    // quality: {
    //   type: String,
    //   default: 'standard'
    // }
  },
  { timestamps: true }
);

const RenderedImage = mongoose.model('RenderedImage', renderedImageSchema);

export default RenderedImage;
