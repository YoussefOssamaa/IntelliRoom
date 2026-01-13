import Plugin from '../../models/pluginModels/plugins.js';
import mongoose from 'mongoose';
import User from '../../models/user.js';
const TEST_USER_ID = "64f3a5e6a3c9b7f1a1234567"; // this is a test user ID for development purposes


export const getPluginsController = async (req, res) => {
    try {
        const search = req.query.search?.trim();
        const sort = req.query.sort || 'recent';

        const filter = {};
        if (search) {
            filter.$or = [
                { plugin_name: { $regex: search, $options: 'i' } },
                { plugin_description: { $regex: search, $options: 'i' } }
            ];
        }

        const sortOptions = {
            recent: { createdAt: -1 },
            rating: { plugin_rating: -1 },
            downloads: { number_of_downloads: -1 },
            price: { plugin_price: -1 }
        };

        const plugins = await Plugin.find(filter)
            .populate('plugin_author' , 'user_name email')
            .sort(sortOptions[sort] || sortOptions.recent);

        res.status(200).json(plugins);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export const getPluginByIdController = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid plugin ID' });
        }

        const plugin = await Plugin.findById(id).populate('plugin_author' , 'user_name email');
        if (!plugin) {
            return res.status(404).json({ message: 'Plugin not found' });
        }

        res.status(200).json(plugin);
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
