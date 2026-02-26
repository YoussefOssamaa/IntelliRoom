import express from "express";
import Post from "../../models/communityModels/postModel.js";

export const createPostController = async (req, res) => {
    // Implementation for creating a post
    try {
        // Extract post data from request body
        const { post_id, user_id, title, description, room_type, tags, coverImageUrl } = req.body;

        // Create a new post document
        const newPost = new Post({                                  //ask 3m badr about the post_id generation method
            post_id,
            user_id,
            title,
            description,
            room_type,
            tags,
            coverImageUrl
        });

        // Save the post to the database
        await newPost.save();

        res.status(201).json({ message: "Post created successfully", data: newPost });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}
export const getAllPostsController = async (req, res) => {
    // Implementation for retrieving all posts with optional filtering
    try {
            const { room_type, tags } = req.query;     //ask 3m badr about the filtering method and parameters (e.g. pagination, sorting)
        let filter = {};

        if (room_type) {
            filter.room_type = room_type;
        }

        if (tags) {
            filter.tags = { $in: tags.split(",") };
        }

        const posts = await Post.find(filter).sort({ createdAt: -1 });
        res.status(200).json({ message: "Posts retrieved successfully", data: posts });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}
export const getPostByIdController = async (req, res) => {
    // Implementation for retrieving a single post by ID    
    try {
        const { id } = req.params;
        const post = await Post.findOne({ post_id: id });

        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        res.status(200).json({ message: "Post retrieved successfully", data: post });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export const updatePostController = async (req, res) => {
    // Implementation for updating a post by ID
    try {
        const { id } = req.params;                      //ask 3m badr about id generation
        const { title, description, room_type, tags, coverImageUrl } = req.body;

        const updatedPost = await Post.findOneAndUpdate(
            { post_id: id },
            { title, description, room_type, tags, coverImageUrl },
            { new: true, runValidators: true }
        );

        if (!updatedPost) {
            return res.status(404).json({ message: "Post not found" });
        }

        res.status(200).json({ message: "Post updated successfully", data: updatedPost });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export const deletePostController = async (req, res) => {
    // Implementation for deleting a post by ID
    try {
        const { id } = req.params;
        const deletedPost = await Post.findOneAndDelete({ post_id: id });

        if (!deletedPost) {
            return res.status(404).json({ message: "Post not found" });
        }

        res.status(200).json({ message: "Post deleted successfully", data: deletedPost });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}   


export const addReactionController = async (req, res) => {
    // Implementation for adding a reaction to a post
    try{
        const { post_id } = req.params;
        const { user_id } = req.body;

        const post = await Post.findOne({ post_id: id });

        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        if (post.usersLiked.includes(user_id)) {
            return res.status(400).json({ message: "User has already reacted to this post" });
        }

        post.usersLiked.push(user_id);
        post.reactsNumber = post.reactsNumber + 1;
        await post.save();
        res.status(200).json({ message: "Reaction added successfully", data: post });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}



export const removeReactionController = async (req, res) => {
    // Implementation for removing a reaction from a post
    try {
        const { post_id } = req.params;
        const { user_id } = req.body;   //ask 3m badr about the method of passing user_id (e.g. in body, query, or headers)

        const post = await Post.findOne({ post_id: id });

        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        if (!post.usersLiked.includes(user_id)) {
            return res.status(400).json({ message: "User has not reacted to this post" });
        }

        post.usersLiked = post.usersLiked.filter(userId => userId !== user_id);
        post.reactsNumber = post.reactsNumber - 1;
        await post.save();
        res.status(200).json({ message: "Reaction removed successfully", data: post });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}
export const getReactionsController = async (req, res) => {
    // Implementation for retrieving reactions of a post
    try {
        const { post_id } = req.params;

        const post = await Post.findOne({ post_id: id });

        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        res.status(200).json({ message: "Reactions retrieved successfully", data: { reactsNumber: post.reactsNumber, usersLiked: post.usersLiked } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }    
}

export const addCommentController = async (req, res) => {
    // Implementation for adding a comment to a post
}
export const getCommentsController = async (req, res) => {
    // Implementation for retrieving comments of a post
}
export const deleteCommentController = async (req, res) => {
    // Implementation for deleting a comment from a post
}


export const downloadPostController = async (req, res) => {
    // Implementation for downloading post content
}
export const importPostController = async (req, res) => {
    // Implementation for importing post content
}   


// Additional controllers for reactions, comments, downloading, and importing posts would go here    

/*
export const putUpdateProfileController = async(req,res) =>{
    try {
        const {id} = req.params;
        const {firstName , lastName , user_name } = req.body
        const updatedUser = await User.findByIdAndUpdate(
            id,
            { firstName, lastName, user_name },
            { new: true, runValidators: true }
        );

                if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }


                res.status(200).json({
            message: "Profile updated successfully",
            data: updatedUser
        });


    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}*/