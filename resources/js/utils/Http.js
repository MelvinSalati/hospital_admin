import axios from "axios";

const Http = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "/api/v1",
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
    },
});


export default Http;