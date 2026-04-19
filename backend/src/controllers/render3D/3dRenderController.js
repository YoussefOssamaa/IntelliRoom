import { isCloudinaryConfigured } from '../../config/cloudinary.js';
import RenderedImage from '../../models/render3DModels/renderedImage.js';
import render3DQueue from '../../queues/render3DQueue.js';

const isValidHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const toStatus = (jobState) => {
  if (jobState === 'active') {
    return 'processing';
  }

  if (jobState === 'completed') {
    return 'completed';
  }

  if (jobState === 'failed') {
    return 'failed';
  }

  return 'pending';
};

export const get3dRendersController = async (req, res) => {
  try {
    const userID = req.userId;

    if (!userID) {
      return res.status(401).json({ success: false, message: 'not authenticated' });
    }

    const renders = await RenderedImage.find({ userID }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      renders
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch 3D renders.',
      error: error.message
    });
  }
};

export const post3dRenderController = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'not authenticated' });
    }

    if (!isCloudinaryConfigured()) {
      return res.status(500).json({
        success: false,
        message: 'Cloudinary is not configured.'
      });
    }

    const { imageUrl, inputPrompt = '' } = req.body || {};

    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'imageUrl is required'
      });
    }

    if (!isValidHttpUrl(imageUrl)) {
      return res.status(400).json({
        success: false,
        message: 'imageUrl must be a valid http/https URL'
      });
    }

    const job = await render3DQueue.add('render', {
      imageUrl,
      inputPrompt,
      userId: String(userId)
    });

    return res.status(202).json({
      success: true,
      jobId: String(job.id)
    });
  } catch (error) {
    console.error('Error in post3dRenderController:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to enqueue render job.',
      error: error.message
    });
  }
};

export const getRender3DJobStatusController = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'not authenticated' });
    }

    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({ success: false, message: 'jobId is required' });
    }

    const job = await render3DQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (String(job.data?.userId) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'forbidden' });
    }

    const state = await job.getState();
    const status = toStatus(state);
    const response = {
      success: true,
      status,
      progress: typeof job.progress === 'number' ? job.progress : 0
    };

    if (status === 'completed') {
      response.result = {
        renderedImageUrl: job.returnvalue?.renderedImageUrl || null,
        renderId: job.returnvalue?.renderId || null
      };
    }

    if (status === 'failed') {
      response.error = job.failedReason || 'Render failed';
    }

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch render job status.',
      error: error.message
    });
  }
};