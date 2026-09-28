import axios from "axios";
import { setupMockApi } from "@/mocks/setup-mock";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

if (process.env.NEXT_PUBLIC_MOCK_API === "true") {
  setupMockApi(apiClient);
}

// Helper for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || "Something went wrong";
    return Promise.reject(new Error(message));
  }
);

