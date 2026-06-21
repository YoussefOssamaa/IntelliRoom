import axios from '../config/axios.config';

const API_URL = '/plans';

export const getAllPlans = async () => {
  const response = await axios.get(API_URL, { withCredentials: true });
  return response.data;
};

export const createPlan = async (planData) => {
  const response = await axios.post(API_URL, planData, { withCredentials: true });
  return response.data;
};

export const updatePlan = async (id, planData) => {
  const response = await axios.put(`${API_URL}/${id}`, planData, { withCredentials: true });
  return response.data;
};

export const deletePlan = async (id) => {
  const response = await axios.delete(`${API_URL}/${id}`, { withCredentials: true });
  return response.data;
};