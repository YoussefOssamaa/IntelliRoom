import axios from '../config/axios.config';

/**
 * Helper to get the auth token from localStorage if it exists.
 * The project primarily relies on httpOnly cookies (withCredentials: true in axios config),
 * but we include this to explicitly attach the Bearer token if stored locally as requested.
 */
const getAuthHeaders = () => {
    // Check common local storage keys
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (token) {
        return { Authorization: `Bearer ${token}` };
    }
    return {};
};

/**
 * Fetch the current user's subscription details
 */
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

/**
 * Subscribe to a specific plan
 * @param {string} planId - The ID of the plan
 * @param {string} billingCycle - e.g., 'monthly' or 'annual'
 */
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

/**
 * Change the user's current plan
 * @param {string} newPlanId - The ID of the new plan
 */
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

export default {
    getMySubscription,
    subscribeToPlan,
    changePlan
};
