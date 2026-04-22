import dotenv from 'dotenv';
import axios from 'axios';
import FormData from 'form-data';
import { setTimeout as wait } from 'node:timers/promises';
import { Worker } from 'bullmq';
import connectDB from '../config/db.js';
import cloudinary, { isCloudinaryConfigured } from '../config/cloudinary.js';
import RenderedImage from '../models/render3DModels/renderedImage.js';
import {
  RENDER3D_QUEUE_NAME,
  render3DQueueConnection
} from '../queues/render3DQueue.js';
import {
  buildComfyWorkflow,
  COMFYUI_OUTPUT_NODE
} from '../../../ai/ComfyUI_Workflows/API_Format/Final_workflow_API.mjs';

dotenv.config();

const isTruthyEnv = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
};

const isMockComfyEnabled = isTruthyEnv(process.env.RENDER3D_MOCK_COMFY);

const isZrokHost = (host) => host && host.includes('.shares.zrok.io');

const getComfyConfig = (host) => {
  const cleanHost = host.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const zrokEnabled = isZrokHost(cleanHost);

  return {
    isZrok: zrokEnabled,
    apiUrl: zrokEnabled ? `https://${cleanHost}` : `http://${cleanHost}`
  };
};

const comfyConfig = getComfyConfig(process.env.COMFYUI_HOST || 'localhost:8188');

const getComfyHeaders = (headers = {}) => {
  if (comfyConfig.isZrok) {
    return {
      ...headers,
      skip_zrok_interstitial: 'true'
    };
  }

  return headers;
};

const uploadImageBufferToComfy = async (imageBuffer, filename) => {
  const formData = new FormData();
  formData.append('image', imageBuffer, { filename });

  const response = await axios.post(
    `${comfyConfig.apiUrl}/upload/image`,
    formData,
    {
      headers: getComfyHeaders(formData.getHeaders())
    }
  );

  return response.data?.name;
};

const getComfyHistory = async (promptId) => {
  const response = await axios.get(`${comfyConfig.apiUrl}/history/${promptId}`, {
    headers: getComfyHeaders()
  });

  return response.data?.[promptId];
};

const pollForComfyCompletion = async (promptId) => {
  const maxRetries = Number(process.env.RENDER3D_COMFY_MAX_RETRIES || 300);

  await wait(2000);

  for (let retry = 0; retry < maxRetries; retry += 1) {
    const history = await getComfyHistory(promptId);

    if (history?.outputs) {
      return history;
    }

    await wait(1000);
  }

  throw new Error('Timeout: ComfyUI workflow did not finish in time.');
};

const runComfyWorkflow = async (workflow) => {
  const response = await axios.post(
    `${comfyConfig.apiUrl}/prompt`,
    { prompt: workflow },
    {
      headers: getComfyHeaders({ 'Content-Type': 'application/json' })
    }
  );

  const promptId = response.data?.prompt_id;

  if (!promptId) {
    throw new Error('ComfyUI did not return a prompt_id.');
  }

  return pollForComfyCompletion(promptId);
};

const getComfyImageBuffer = async (filename, subfolder = '', type = 'output') => {
  const params = new URLSearchParams({
    filename,
    type,
    ...(subfolder && { subfolder })
  });

  const response = await axios.get(`${comfyConfig.apiUrl}/view?${params.toString()}`, {
    responseType: 'arraybuffer',
    headers: getComfyHeaders()
  });

  return Buffer.from(response.data);
};

const getFilenameFromUrl = (imageUrl) => {
  try {
    const url = new URL(imageUrl);
    const pathname = url.pathname || '';
    const fallbackFilename = `capture-${Date.now()}.png`;
    const basename = pathname.split('/').pop();

    if (!basename) {
      return fallbackFilename;
    }

    return basename.includes('.') ? basename : `${basename}.png`;
  } catch {
    return `capture-${Date.now()}.png`;
  }
};

const uploadBufferToCloudinary = (imageBuffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: process.env.CLOUDINARY_RENDER_FOLDER,
        resource_type: 'image'
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      }
    );

    stream.end(imageBuffer);
  });

const resolveOutputImageInfo = (outputs) => {
  if (!outputs || typeof outputs !== 'object') {
    return null;
  }

  if (
    COMFYUI_OUTPUT_NODE &&
    outputs[COMFYUI_OUTPUT_NODE] &&
    Array.isArray(outputs[COMFYUI_OUTPUT_NODE].images) &&
    outputs[COMFYUI_OUTPUT_NODE].images.length
  ) {
    return outputs[COMFYUI_OUTPUT_NODE].images[0];
  }

  for (const output of Object.values(outputs)) {
    if (Array.isArray(output?.images) && output.images.length) {
      return output.images[0];
    }
  }

  return null;
};

const processRender3DJob = async (job) => {
  const { imageUrl, inputPrompt = '', userId } = job.data || {};

  if (!imageUrl || typeof imageUrl !== 'string') {
    throw new Error('imageUrl is required for render jobs.');
  }

  if (!userId || typeof userId !== 'string') {
    throw new Error('userId is required for render jobs.');
  }

  await job.updateProgress(10);

  const sourceImageResponse = await axios.get(imageUrl, {
    responseType: 'arraybuffer',
    timeout: Number(process.env.RENDER3D_FETCH_TIMEOUT_MS || 120000)
  });

  const sourceImageBuffer = Buffer.from(sourceImageResponse.data);
  await job.updateProgress(35);

  let outputBuffer;

  if (isMockComfyEnabled) {
    const mockDelayMs = Number(process.env.RENDER3D_MOCK_DELAY_MS || 1500);
    await wait(mockDelayMs);
    await job.updateProgress(75);

    // Temporary E2E mock: return the source image as the rendered output.
    outputBuffer = sourceImageBuffer;
  } else {
    const comfyInputFilename = await uploadImageBufferToComfy(
      sourceImageBuffer,
      getFilenameFromUrl(imageUrl)
    );

    if (!comfyInputFilename) {
      throw new Error('Failed to upload input image to ComfyUI.');
    }

    const workflow = buildComfyWorkflow(comfyInputFilename, null, inputPrompt);
    const workflowResult = await runComfyWorkflow(workflow);

    await job.updateProgress(75);

    const outputImageInfo = resolveOutputImageInfo(workflowResult?.outputs);

    if (!outputImageInfo?.filename) {
      throw new Error('ComfyUI did not return an output image.');
    }

    outputBuffer = await getComfyImageBuffer(
      outputImageInfo.filename,
      outputImageInfo.subfolder || '',
      outputImageInfo.type || 'output'
    );
  }

  await job.updateProgress(90);

  const cloudinaryUpload = await uploadBufferToCloudinary(outputBuffer);

  const savedRender = await RenderedImage.create({
    userID: userId,
    renderedImageURL: cloudinaryUpload.secure_url,
    inputPrompt
  });

  await job.updateProgress(100);

  return {
    renderedImageUrl: cloudinaryUpload.secure_url,
    renderId: savedRender._id.toString()
  };
};

const bootstrapWorker = async () => {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured. Worker cannot start.');
  }

  if (isMockComfyEnabled) {
    console.warn('RENDER3D_MOCK_COMFY is enabled. ComfyUI calls are bypassed for E2E testing.');
  }

  await connectDB();

  const worker = new Worker(RENDER3D_QUEUE_NAME, processRender3DJob, {
    connection: render3DQueueConnection,
    concurrency: Number(process.env.RENDER3D_WORKER_CONCURRENCY || 2)
  });

  worker.on('completed', (job) => {
    console.log(`render3D job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`render3D job ${job?.id || 'unknown'} failed:`, err.message);
  });

  const shutdown = async (signal) => {
    console.log(`Received ${signal}. Closing render3D worker...`);

    try {
      await worker.close();
      await render3DQueueConnection.quit();
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  console.log(`render3D worker listening on queue: ${RENDER3D_QUEUE_NAME}`);
};

bootstrapWorker().catch((error) => {
  console.error('Failed to start render3D worker:', error);
  process.exit(1);
});
