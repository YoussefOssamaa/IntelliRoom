import api from '../config/axios.config';

export const getTeamMembers = async () => {
  const { data } = await api.get('/team');
  return data.data || [];
};
