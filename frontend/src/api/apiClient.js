import axios from "axios";
import { useNotification } from "../context/NotificationContext";

/**
 * Create an API client with global error handling
 * This should be called in a React context to access useNotification
 */
export const createApiClient = (showNotification) => {
  const client = axios.create({
    baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000",
  });

  // Response interceptor for error handling
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      let errorMessage = "An unexpected error occurred";

      if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const data = error.response.data;

        if (status === 401) {
          errorMessage = "❌ Unauthorized: Please login again";
        } else if (status === 403) {
          errorMessage = "❌ Access Denied: You don't have permission for this action";
        } else if (status === 404) {
          errorMessage = data?.message || data?.error || "❌ Resource not found";
        } else if (status === 409) {
          errorMessage = data?.message || "❌ Conflict: This resource already exists";
        } else if (status === 500) {
          errorMessage = "❌ Server error: Please try again later";
        } else {
          errorMessage = data?.message || data?.error || `❌ Error: ${status}`;
        }
      } else if (error.request) {
        errorMessage = "❌ Network error: Cannot reach the server";
      } else {
        errorMessage = error.message || "❌ Error: Something went wrong";
      }

      // Show error toast notification
      if (showNotification) {
        showNotification(errorMessage, "error");
      }

      return Promise.reject(error);
    }
  );

  return client;
};

/**
 * Hook for using API client with error handling
 */
export const useApiClient = () => {
  const { error: showError } = useNotification();
  return createApiClient(showError);
};
