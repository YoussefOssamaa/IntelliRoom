import mongoose, { Schema, model } from 'mongoose'

const reactionSchema = new mongoose.Schema({
  reaction_id: { type: String, required: true, unique: true }, 
  user_id: { type: String, required: true },                   
  type: {                                                      
    type: String,
    required: true,
    enum: ["like", "up", "down"]                            
  },
  target_id: { type: String, required: true },                 
  target_type: {                                              
    type: String,
    required: true,
    enum: ["post", "comment"]                                  
  },
  timestamp: { type: Date, default: Date.now }                 
});

const Reaction = mongoose.model("Reaction", reactionSchema);

export default Reaction;
