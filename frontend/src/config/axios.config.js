import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true,
});

// Flag to prevent multiple token refresh requests
let isRefreshing = false;
// Queue for requests that failed due to expired token
let failedQueue = [];

const processQueue = (error) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            // When token is refreshed, we resolve the promise,
            // which will trigger the original request to be sent again.
            prom.resolve();
        }
    });

    failedQueue = [];
};

api.interceptors.response.use(
    response => {
        // If the request succeeds, we just return the response.
        return response;
    },
    async (error) => {
        const originalRequest = error.config;
        const refreshTokenUrl = '/auth/refresh'; // Adjust if your refresh endpoint is different

        // We only want to handle 401 errors that are not for the refresh token endpoint itself, and not a retry.
        if (error.response?.status === 401 && originalRequest.url !== refreshTokenUrl && !originalRequest._retry) {
            
            if (isRefreshing) {
                // If a token refresh is already in progress, we'll add the request to a queue.
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                .then(() => api(originalRequest)) // Once the token is refreshed, retry the original request.
                .catch(err => Promise.reject(err)); // If the queued request fails, we reject it.
            }

            // This is the first 401 for this request, so we'll start the token refresh.
            originalRequest._retry = true; // Mark the request as a retry
            isRefreshing = true;

            return new Promise((resolve, reject) => {
                // Use the base axios to avoid interceptor loop
                axios.post(`${import.meta.env.VITE_API_URL || ''}${refreshTokenUrl}`, {}, { withCredentials: true })
                    .then(() => {
                        processQueue(null);
                        resolve(api(originalRequest));
                    })
                    .catch((err) => {
                        processQueue(err);
                        reject(err);
                    })
                    .finally(() => { isRefreshing = false; });
            });
        }

        // For any other errors, we just reject the promise.
        return Promise.reject(error);
    }
);

export default api;
