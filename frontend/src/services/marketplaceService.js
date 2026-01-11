import axios from 'axios';

//  backend URL or a local one only for testing
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const marketplaceAPI = axios.create({
  baseURL: `${API_BASE_URL}/plugins`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// mock request interceptor for authentication (if needed later)
// marketplaceAPI.interceptors.request.use(
//   (config) => {
//     // Add auth token if available
//     const token = localStorage.getItem('authToken');
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
//   },
//   (error) => {
//     return Promise.reject(error);
//   }
// );

// Add response interceptor for error handling
marketplaceAPI.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorMessage = error.response?.data?.message || error.message ;
    console.error('API Error:', errorMessage);
    return Promise.reject(error);
  }
);

/*
get all plugins 

 */
export const getAllPlugins = async () => {
  try {
    const response = await marketplaceAPI.get('/');
    return response;
  } catch (error) {
    console.error('Error fetching plugins:', error);
    throw error;
  }
};


export const getPluginById = async (id) => {
  try {
    const response = await marketplaceAPI.get(`/${id}`);
    return response;
  } catch (error) {
    console.error('Error fetching plugin:', error);
    throw error;
  }
};


export const createPlugin = async (pluginData) => {
  try {
    const response = await marketplaceAPI.post('/', pluginData);
    return response;
  } catch (error) {
    console.error('Error creating plugin:', error);
    throw error;
  }
};

/*
 update plugin ( will be added later)
 */
export const updatePlugin = async (id, updates) => {
  try {
    const response = await marketplaceAPI.put(`/${id}`, updates);
    return response;
  } catch (error) {
    console.error('Error updating plugin:', error);
    throw error;
  }
};

/*
 delete plugin ( will be added later)

 */
export const deletePlugin = async (id) => {
  try {
    const response = await marketplaceAPI.delete(`/${id}`);
    return response;
  } catch (error) {
    console.error('Error deleting plugin:', error);
    throw error;
  }
};

export default {
  getAllPlugins,
  getPluginById,
  createPlugin,
  updatePlugin,
  deletePlugin,
};
