import express from 'express';
import Plugin from '../../models/pluginModels/plugins.js';
import User from '../../models/user.js';
const TEST_USER_ID = "64f3a5e6a3c9b7f1a1234567"; // this is a test user ID for development purposes


export const getPluginsController = async (req, res) => {
    try {

        const plugins = await Plugin.find().populate('plugin_author' , 'user_name email');
        console.log(plugins);
        if (plugins.length === 0) {
            return res.status(404).json({ message: 'No plugins found' });
        }

        res.status(200).json(plugins);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export const getPluginByIdController = async (req, res) => {
    try {
        const plugin = await Plugin.findById(req.params.id).populate('plugin_author' , 'user_name email');
        console.log(plugin);
        if (!plugin) {
            return res.status(404).json({ message: 'Plugin not found' });
        }

        const plugin_data = {
            plugin_name: plugin.plugin_name,
            plugin_description: plugin.plugin_description,
            plugin_author: plugin.plugin_author,
            plugin_rating: plugin.plugin_rating,
            plugin_reviews: plugin.plugin_reviews,
            what_is_included: plugin.what_is_included, 
            plugin_price: plugin.plugin_price,
            number_of_downloads: plugin.number_of_downloads, 
        }

        res.status(200).json(plugin_data);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
}   

export const postPluginController = async (req, res) => { 
    try {

        req.user = {}; ////////////////to be removed in production (test user assignment)
        req.user.id = TEST_USER_ID ////////////////to be removed in production (test user assignment) 


        const plugin_author = await User.findById(req.user.id)
        if (!plugin_author) {
            return res.status(404).json({ message: 'Plugin author not found' });
        }

        const plugin = req.body;
        plugin.plugin_author = plugin_author._id;
        
        const new_plugin = await Plugin.create(plugin);

        console.log(new_plugin);
        res.status(201).json(new_plugin);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
}

export const putPluginController = async (req, res) => {
    try {
        req.user = {}; ////////////////to be removed in production (test user assignment)
        req.user.id = TEST_USER_ID ////////////////to be removed in production (test user assignment)
        
        const {id} = req.params;
        let plugin = await Plugin.findById(id);

        if (!plugin) {
            return res.status(404).json({ error: "Plugin not found" });
        }

        //Security check
        if (plugin.plugin_author.toString() !== req.user.id   ) {
            return  res.status(403).json({ error: "Unauthorized action" });
          }
        
        Object.assign(plugin, req.body);

        await plugin.save();
        console.log(plugin)

        res.status(200).json({ message: 'Plugin updated successfully', updated_plugin: plugin });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export const deletePluginController = async (req, res) => {
    try {

        req.user = {}; ////////////////to be removed in production (test user assignment)
        req.user.id = TEST_USER_ID ////////////////to be removed in production (test user assignment)
        
        const {id} = req.params;


        let plugin = await Plugin.findById(id);

        if (!plugin) {
            return res.status(404).json({ error: "Plugin not found" });
        }
        //Security check
        if (plugin.plugin_author.toString() !== req.user.id   ) {
            return  res.status(403).json({ error: "Unauthorized action" });
          }

        await plugin.deleteOne()

        res.status(200).json({ message: 'Plugin deleted successfully', deleted_plugin: plugin });


    } catch (error) {
        res.status(500).json({ message: error.message });
    }   
}
