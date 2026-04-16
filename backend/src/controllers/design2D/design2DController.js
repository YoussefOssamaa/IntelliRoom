import express from 'express';
import Project from '../../models/design2D-3DModels/project.js';
import mongoose from 'mongoose';




export const postProjectController = async (req, res) => {

    try {

        const userId = req.userId;
        
        /// authentication check
        if (!userId) {
            return res.status(401).json({ success: false, message: "not authenticated" });
        }


        const {  title, sceneData, area, coverImageUrl, thumbnailUrl } = req.body;

        //VALIDATION FOR SCENE DATA
            if (!sceneData || typeof sceneData !== "object") {
            return res.status(400).json({ message: "sceneData must be an object" });
            }


        const newProject = new Project({owner, title: title || "Untitled Project", sceneData, area, coverImageUrl, thumbnailUrl , version: 1.0});

        await newProject.save();
        await newProject.populate('owner');

        console.log(newProject);

        res.status(201).json(newProject);
    }catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error creating project",
      error: error.message
    });
  }
}



export const getProjectByIDController = async (req, res) => {
   
   try {
   

        const userId = req.userId;
        
        /// authentication check
        if (!userId) {
            return res.status(401).json({ success: false, message: "not authenticated" });
        }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid project ID" });
    }
    const owner = TEST_USER_ID; // should be replaced with req.user.id after authentication is implemented


    const project = await Project.findById(id);
    if (!project) {
    return res.status(404).json({ message: "Project not found" });
    }

    if (project.owner.toString() !== owner) {
        return res.status(403).json({ message: "Unauthorized access" });
    }

    


    await project.populate('owner');
    res.status(200).json(project);

    } catch (error) {
        console.error(error);
        res.status(500).json({
          message: "Error fetching project",
          error: error.message
        });
      }
}






export const getProjectsController = async (req, res) => {
   
   try {


   


    const owner = req.userId;
     
        /// authentication check
        if (!userId) {
            return res.status(401).json({ success: false, message: "not authenticated" });
        }


    const projects = await Project.find({ owner : owner }).populate('owner').sort({ createdAt: -1 });
    if (!projects || projects.length === 0) {
    return res.status(404).json({ message: "No projects found for this user" });
    }

    res.status(200).json(projects);

   } catch (error) {
       console.error(error);
       res.status(500).json({
         message: "Error fetching projects",
         error: error.message
       });
     }
}





export const updateProjectController = async (req, res) => {

    try {
   

        const owner = req.userId;
        /// authentication check
        if (!owner) {
            return res.status(401).json({ success: false, message: "not authenticated" });
        }


        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid project ID" });
        }

        const { title, sceneData, area, coverImageUrl, thumbnailUrl } = req.body;
        
        //VALIDATION FOR SCENE DATA
         if (sceneData && typeof sceneData !== "object") {
            return res.status(400).json({ message: "sceneData must be an object" });
            }

        const project = await Project.findById(id);
        if (!project) {
        return res.status(404).json({ message: "Project not found" });
        }

        if (project.owner.toString() !== owner) {
            return res.status(403).json({ message: "Unauthorized access" });
        }



        project.title = title || project.title;
        project.sceneData = (sceneData !== undefined) ? sceneData : project.sceneData;
        project.area = (area !== undefined) ? area : project.area;
        project.coverImageUrl = (coverImageUrl !== undefined) ? coverImageUrl : project.coverImageUrl;
        project.thumbnailUrl = (thumbnailUrl !== undefined) ? thumbnailUrl : project.thumbnailUrl;


        await project.save();
        await project.populate('owner');

        console.log("Updated Project: ", project);
        res.status(200).json(project);

    } catch (error) {
        console.error(error);
        res.status(500).json({
          message: "Error updating project",
          error: error.message
        });
      }
}



export const deleteProjectController = async (req, res) => {

    try {


        const owner = req.userId;
        /// authentication check
        if (!owner) {
            return res.status(401).json({ success: false, message: "not authenticated" });
        }

   
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid project ID" });
        }

        const project = await Project.findById(id);
        if (!project) {
        return res.status(404).json({ message: "Project not found" });
        }

        if (project.owner.toString() !== owner) {
        return res.status(403).json({ message: "Unauthorized access" });
        }

        await project.deleteOne();
        res.status(204).send();

    } catch (error) {
        console.error(error);
        res.status(500).json({
          message: "Error deleting project",
          error: error.message
        });
      }
}