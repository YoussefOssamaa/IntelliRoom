import axios from '../config/axios.config';

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const CLOUDINARY_UPLOAD_FOLDER = import.meta.env.VITE_CLOUDINARY_UPLOAD_FOLDER ;

const RENDER_POLL_INTERVAL_MS = Number(import.meta.env.VITE_RENDER3D_POLL_INTERVAL_MS);
const RENDER_POLL_TIMEOUT_MS = Number(import.meta.env.VITE_RENDER3D_POLL_TIMEOUT_MS);

const wait = (milliseconds) => new Promise((resolve) => {
  window.setTimeout(resolve, milliseconds);
});

export const resolveRenderCaptureImageUrl = (imageUrl) => {
  const normalizedUrl = String(imageUrl).trim();
  if (!normalizedUrl) return '';

  if (/^(data:|https?:\/\/)/i.test(normalizedUrl)) {
    return normalizedUrl;
  }
//حتة تحنيك كدا عشان لو الصورة رجعت من كلودنري منغير بروتوكول يعني 
  if (normalizedUrl.startsWith('//')) {
    return `${window.location.protocol}${normalizedUrl}`;
  }

  const apiBaseUrl = axios.defaults?.baseURL;
  try {
    return new URL(normalizedUrl, apiBaseUrl).toString();
  } catch (error) {
    return normalizedUrl;
  }
};

const dataUrlToFile = (dataUrl, fileName = '3Drender-capture.png') => {
  const parts = String(dataUrl).split(',');
  if (parts.length !== 2) {
    throw new Error('Invalid capture image data');
  }

  const mimeMatch = parts[0].match(/data:(.*?);base64/);
  const mimeType = mimeMatch && mimeMatch[1] ? mimeMatch[1] : 'image/png';
  const binaryString = atob(parts[1]);
  const byteArray = new Uint8Array(binaryString.length);

  for (let index = 0; index < binaryString.length; index += 1) {
    byteArray[index] = binaryString.charCodeAt(index);
  }

  return new File([byteArray], fileName, { type: mimeType });
};

const getCloudinaryUploadUrl = () => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Cloudinary frontend upload is not configured');
  }

  return `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
};

const uploadCaptureToCloudinary = async (imageDataUrl) => {
  const captureFile = dataUrlToFile(imageDataUrl);
  const uploadFormData = new FormData();

  uploadFormData.append('file', captureFile);
  uploadFormData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  uploadFormData.append('folder', CLOUDINARY_UPLOAD_FOLDER);


  if (window.__RENDER_DEBUG__) {
    console.debug('[RenderCaptureService] Uploading capture to Cloudinary', {
      bytes: captureFile.size,
      type: captureFile.type,
      folderConfigured: Boolean(CLOUDINARY_UPLOAD_FOLDER)
    });
  }

  const uploadResponse = await fetch(getCloudinaryUploadUrl(), {
    method: 'POST',
    body: uploadFormData
  });

  let uploadPayload = null;
  try {
    uploadPayload = await uploadResponse.json();
  } catch {
    uploadPayload = null;
  }

  if (!uploadResponse.ok || !uploadPayload?.secure_url) {
    const cloudinaryError = uploadPayload?.error?.message || 'Cloudinary upload failed';
    throw new Error(cloudinaryError);
  }

  return uploadPayload.secure_url;
};

const enqueueRenderJob = async ({ imageUrl, inputPrompt }) => {
  const enqueueResponse = await axios.post('/render3d/capture', {
    imageUrl,
    inputPrompt
  });

  const jobId = enqueueResponse?.data?.jobId;
  if (!jobId) {
    throw new Error('Backend did not return a render job id');
  }

  return jobId;
};

const pollRenderJobStatus = async (jobId) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < RENDER_POLL_TIMEOUT_MS) {
    const statusResponse = await axios.get(`/render3d/${jobId}`);
    const statusPayload = statusResponse?.data || {};
    const status = String(statusPayload.status || '').toLowerCase();

    if (window.__RENDER_DEBUG__) {
      console.debug('[RenderCaptureService] Polled render job status', {
        jobId,
        status,
        progress: statusPayload?.progress
      });
    }

    if (status === 'completed') {
      return statusPayload;
    }

    if (status === 'failed') {
      throw new Error(statusPayload.error || 'Render job failed');
    }

    await wait(RENDER_POLL_INTERVAL_MS);
  }

  throw new Error('Render job timed out');
};

export async function submitRenderCapture({ imageDataUrl,  inputPrompt = ''/*, quality = '2k'*/ } = {}) {

  if (!imageDataUrl) {
    console.error('[RenderCaptureService] Missing capture image payload', {
      hasImageDataUrl: Boolean(normalizedImageDataUrl),
    });
    throw new Error('Failed to capture current frame');
  }

  if (window.__RENDER_DEBUG__) {
    console.debug('[RenderCaptureService] Submitting capture', {
      hasPrompt: Boolean(inputPrompt),
    });
  }

  try {
    const sourceImageUrl = await uploadCaptureToCloudinary(imageDataUrl);
    const jobId = await enqueueRenderJob({
      imageUrl: sourceImageUrl,
      inputPrompt
    });
    const finalStatus = await pollRenderJobStatus(jobId);

    if (window.__RENDER_DEBUG__) {
      console.debug('[RenderCaptureService] Capture render completed', {
        jobId,
        status: finalStatus?.status,
        hasRenderedImageUrl: Boolean(finalStatus?.result?.renderedImageUrl)
      });
    }

    return {
      ...finalStatus,
      jobId,
      sourceImageUrl,
      renderedImageUrl: finalStatus?.result?.renderedImageUrl || null
    };
  } catch (error) {
    const backendMessage = error?.response?.data?.message || error?.response?.data?.error;
    console.error('[RenderCaptureService] Capture request failed', {
      status: error?.response?.status,
      backendMessage,
      responseData: error?.response?.data,
      errorMessage: error?.message,
    });
    throw new Error(backendMessage || error?.message || 'Failed to send render request');
  }
}
