import axios from '../config/axios.config';

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

export async function submitRenderCapture({ imageDataUrl,  inputPrompt = ''/*, quality = '2k'*/ } = {}) {

  if (!imageDataUrl) {
    console.error('[RenderCaptureService] Missing capture image payload');
    throw new Error('Failed to capture current frame');
  }

  if (window.__RENDER_DEBUG__) {
    console.debug('[RenderCaptureService] Submitting capture', {
      hasPrompt: Boolean(inputPrompt),
    });
  }

  try {
    const captureFile = dataUrlToFile(imageDataUrl, `3d-render-${Date.now()}.png`);
    const formData = new FormData();
    formData.append('image', captureFile);
    formData.append('inputPrompt', String(inputPrompt || '').trim());

    const uploadResponse = await axios.post('/uploadImage', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      withCredentials: true,
    });
    const responsePayload = uploadResponse?.data || {};
    const renderedImageUrl =
      responsePayload.enhancedImageUrl ||
      responsePayload.generatedImageUrl ||
      responsePayload.renderedImageUrl ||
      responsePayload.result?.renderedImageUrl ||
      null;

    if (window.__RENDER_DEBUG__) {
      console.debug('[RenderCaptureService] Capture render completed', {
        status: responsePayload?.status || 'completed',
        hasRenderedImageUrl: Boolean(renderedImageUrl)
      });
    }

    return {
      ...responsePayload,
      status: responsePayload?.status || 'completed',
      sourceImageUrl: responsePayload.originalImage || null,
      renderedImageUrl,
      result: {
        ...(responsePayload.result || {}),
        renderedImageUrl,
      },
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
