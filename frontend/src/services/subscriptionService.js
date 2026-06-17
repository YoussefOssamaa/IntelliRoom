import axios from '../config/axios.config';

const getAuthHeaders = () => {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (token) {
        return { Authorization: `Bearer ${token}` };
    }
    return {};
};

export const getMySubscription = async () => {
    try {
        const response = await axios.get('/subscription/me', {
            headers: getAuthHeaders()
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching subscription:', error);
        throw error;
    }
};

export const subscribeToPlan = async (planId, billingCycle) => {
    try {
        const response = await axios.post('/subscription/subscribe', {
            planId,
            billingCycle
        }, {
            headers: getAuthHeaders()
        });
        return response.data;
    } catch (error) {
        console.error('Error subscribing to plan:', error);
        throw error;
    }
};

export const changePlan = async (newPlanId) => {
    try {
        const response = await axios.post('/subscription/changePlan', {
            newPlanId
        }, {
            headers: getAuthHeaders()
        });
        return response.data;
    } catch (error) {
        console.error('Error changing plan:', error);
        throw error;
    }
};

export const getPublicPlans = async () => {
    const response = await axios.get('/plans');
    return response.data;
};

export default {
    getMySubscription,
    subscribeToPlan,
    changePlan,
    getPublicPlans
};
