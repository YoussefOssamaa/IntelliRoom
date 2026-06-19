import Project from '../../models/design2D-3DModels/project.js';
import mongoose from 'mongoose';

const getAuthenticatedUserId = (req, res) => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ success: false, message: "not authenticated" });
    return null;
  }

  return userId;
};

const getProjectIdParam = (req) => req.params.projectId || req.params.id;

const isValidProjectId = (projectId) =>
  mongoose.Types.ObjectId.isValid(String(projectId || ""));

const normalizeProjectPayload = (body = {}) => {
  const hasProjectJson =
    Object.prototype.hasOwnProperty.call(body, "projectJson") ||
    Object.prototype.hasOwnProperty.call(body, "sceneData") ||
    Object.prototype.hasOwnProperty.call(body, "data");
  const projectJson =
    body.projectJson ??
    body.sceneData ??
    body.data ??
    {};

  return {
    title: String(body.title || "").trim() || "Untitled Project",
    hasProjectJson,
    data: projectJson,
    coverImageUrl:
      body.coverImageUrl !== undefined ? body.coverImageUrl : body.coverUrl,
    thumbnailUrl: body.thumbnailUrl,
  };
};

const toProjectResponse = (project) => ({
  _id: project._id,
  projectId: project._id,
  owner: project.owner,
  title: project.title,
  version: project.version,
  data: project.data,
  projectJson: project.data,
  isArchived: project.isArchived,
  coverImageUrl: project.coverImageUrl,
  thumbnailUrl: project.thumbnailUrl,
  createdAt: project.createdAt,
  updatedAt: project.updatedAt,
  lastSavedAt: project.lastSavedAt,
});

const findOwnedProject = async (projectId, owner) => {
  const project = await Project.findById(projectId);
  if (!project) {
    return { status: 404, body: { message: "Project not found" } };
  }

  if (project.owner.toString() !== owner) {
    return { status: 403, body: { message: "Unauthorized access" } };
  }

  return { project };
};

export const postProjectController = async (req, res) => {
  try {
    const owner = getAuthenticatedUserId(req, res);
    if (!owner) return;

    const payload = normalizeProjectPayload(req.body);
    const newProject = new Project({
      owner,
      title: payload.title,
      data: payload.data,
      coverImageUrl: payload.coverImageUrl,
      thumbnailUrl: payload.thumbnailUrl,
      version: 1.0,
      lastSavedAt: new Date(),
    });

    await newProject.save();

    res.status(201).json(toProjectResponse(newProject));
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error creating project",
      error: error.message
    });
  }
}

export const getProjectByIDController = async (req, res) => {
  try {
    const owner = getAuthenticatedUserId(req, res);
    if (!owner) return;

    const projectId = getProjectIdParam(req);
    if (!isValidProjectId(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    const result = await findOwnedProject(projectId, owner);
    if (!result.project) {
      return res.status(result.status).json(result.body);
    }

    res.status(200).json(toProjectResponse(result.project));
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
    const owner = getAuthenticatedUserId(req, res);
    if (!owner) return;

    const projects = await Project.find({ owner, isArchived: { $ne: true } })
      .sort({ updatedAt: -1 })
      .lean();

    res.status(200).json(projects.map((project) => ({
      ...project,
      projectId: project._id,
      projectJson: project.data,
    })));
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
    const owner = getAuthenticatedUserId(req, res);
    if (!owner) return;

    const projectId = getProjectIdParam(req);
    if (!isValidProjectId(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    const result = await findOwnedProject(projectId, owner);
    if (!result.project) {
      return res.status(result.status).json(result.body);
    }

    const payload = normalizeProjectPayload(req.body);
    const { isArchived } = req.body;
    const { project } = result;

    project.title = payload.title || project.title;
    project.data = payload.hasProjectJson ? payload.data : project.data;
    project.isArchived = isArchived !== undefined ? isArchived : project.isArchived;
    project.coverImageUrl =
      payload.coverImageUrl !== undefined ? payload.coverImageUrl : project.coverImageUrl;
    project.thumbnailUrl =
      payload.thumbnailUrl !== undefined ? payload.thumbnailUrl : project.thumbnailUrl;
    project.lastSavedAt = new Date();

    await project.save();

    res.status(200).json(toProjectResponse(project));
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
    const owner = getAuthenticatedUserId(req, res);
    if (!owner) return;

    const projectId = getProjectIdParam(req);
    if (!isValidProjectId(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    const result = await findOwnedProject(projectId, owner);
    if (!result.project) {
      return res.status(result.status).json(result.body);
    }

    await result.project.deleteOne();
    res.status(200).json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error deleting project",
      error: error.message
    });
  }
}
