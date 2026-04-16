import mongoose, { Schema, model } from 'mongoose'


const designSchema = new mongoose.Schema({
  
    data: mongoose.Schema.Types.Mixed,

  projectId: {
    type: mongoose.Schema.Types.ObjectId, 
    index: true
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true }
});



designSchema.virtual('layers').get(function() {
  return this.data?.layers;
});

designSchema.index({ projectId: 1, updatedAt: -1 });