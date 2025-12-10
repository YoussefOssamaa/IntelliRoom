const mongoose = require('mongoose');

const objectSchema = new mongoose.Schema({
  object_id: {
    type: Number,
    required: true,
    unique: true, // Corresponds to the unique index in the metadata
    validate: {
      validator: Number.isInteger,
      message: '{VALUE} is not an integer value'
    }
  },
  object_name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    description: "Must be a string defining the object category (e.g., 'furniture', 'device')."
  },
  preview_img_url: {
    type: String,
    required: true,
    description: "Must be a string in URL format for the image preview."
  },
  object_model_url: {
    type: String,
    required: true,
    description: "Must be a string in URL format for the 3D model data."
  },
  default_color: {
    type: String,
    required: true,
    description: "Must be a string representing the default color."
  },
  config_data: {
    type: String,
    required: true,
    description: "Must be a string, storing serialized JSON data."
  },
  E_commerce_provider: {
    type: String,
    required: true,
    description: "Must be a string identifying the e-commerce platform/source."
  }
}, {
  // CRITICAL: This ensures Mongoose uses the exact existing collection name
  collection: 'object', 
  timestamps: true // Set to true if you want createdAt/updatedAt automatically
});

module.exports = mongoose.model('Object', objectSchema);