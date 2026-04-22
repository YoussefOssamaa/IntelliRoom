import axios from "axios";

export default axios.create({
<<<<<<< HEAD
    baseURL: '/api',
=======
    baseURL: import.meta.env.VITE_API_URL,
>>>>>>> origin/main
    withCredentials: true,
});

