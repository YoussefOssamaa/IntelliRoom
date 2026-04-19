import axios from '../config/axios.config';

async function ensureAuthenticated() {
  try {
    const meRes = await axios.get('/auth/me');
    return !!meRes?.data?.success;
  } catch (error) {
    try {
      const refreshRes = await axios.post('/auth/refreshToken');
      if (!refreshRes?.data?.success) return false;
      const meRes = await axios.get('/auth/me');
      return !!meRes?.data?.success;
    } catch (refreshError) {
      return false;
    }
  }
}

export async function getPlannerUserProfile() {
  const authenticated = await ensureAuthenticated();
  if (!authenticated) return null;

  try {
    const response = await axios.get('/dashboard');
    const user = response?.data;

    if (!user) return null;

    return {
      id: user._id,
      name: user.user_name || user.firstName || 'User',
      plan: user.plan ? `${user.plan.charAt(0).toUpperCase()}${user.plan.slice(1)}` : 'Free',
      profilePictureUrl: user.profile_picture_url || null,
      credits: user.credits || 0,
    };
  } catch (error) {
    return null;
  }
}

export async function savePlannerProject({
  projectId,
  title = 'Untitled Project',
  sceneData,
  thumbnailUrl
}) {
  const payload = {
    title,
    sceneData,
    thumbnailUrl
  };

  if (projectId) {
    const response = await axios.put(`/design2D3D/${projectId}`, payload);
    return response?.data || null;
  }

  const response = await axios.post('/design2D3D', payload);
  return response?.data || null;
}

export async function getProjectById(projectId) {
  const response = await axios.get(`/design2D3D/${projectId}`);
  return response?.data || null;
}

export async function getProjects() {
  try {
    const response = await axios.get('/design2D3D');
    const projects = Array.isArray(response?.data) ? response.data : [];
    return projects;
  } catch (error) {
    if (error?.response?.status === 404) {
      return [];
    }
    throw error;
  }
}

export async function getLatestProject() {
  const projects = await getProjects();
  if (!projects.length) return null;
  return projects[0];
}
