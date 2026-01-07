import mongoose, { Schema, model } from 'mongoose'

const pluginSchema = new mongoose.Schema({
    plugin_name: {type: String, required: true},
    plugin_description: {type: String, required: true},

    plugin_author: {type: mongoose.Schema.Types.ObjectId, required: true , ref: 'User'},  /// the public id of the user


    plugin_rating: {type: Number, default: 0},
    plugin_reviews: {type: [String] , default: []} , 
    what_is_included: {type: [String] , default: []} , 
    number_of_downloads: {type: Number, default: 0},

    plugin_price: {type: Number, required: true , default: 0},

}, {timestamps: true});

const Plugin = mongoose.model("Plugin", pluginSchema);

export default Plugin;


