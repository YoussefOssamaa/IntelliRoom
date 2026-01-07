import mongoose, { Schema, model } from 'mongoose'

const plugin = new mongoose.Schema({
    plugin_id: {type: mongoose.Schema.Types.ObjectId, required: true, unique: true},
    plugin_name: {type: String, required: true},
    plugin_description: {type: String, required: true},
    plugin_author: {type: String, required: true},
    plugin_author_email: {type: String, required: true},
    plugin_rating: {type: Number, required: true},
    plugin_reviews: {type: [String] } , 
    what_is_included: {type: [String] } , 
    plugin_price: {type: Number, required: true},
    number_of_downloads: {type: Number, required: true},
    plugin_created_at: {type: Date, default: Date.now},
    plugin_updated_at: {type: Date, default: Date.now},
}, {timestamps: true});

const Plugin = mongoose.model("Plugin", pluginSchema);

export default Plugin;


