import axios from "axios";
import { toast } from "react-toastify";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API error:", error);
    toast.error("An error occurred while fetching data.");
    return Promise.reject(error);
  }
);

export const fetchAPI = async (url, config = {}) => {
  const response = await api.get(url, config);
  return response.data;
};

export const getDepartmentById = async (deptId) => {
  return fetchAPI(`/Department/${deptId}`);
};

export const getUser = async (uniqueAzureId) =>
  fetchAPI(`/User/unique/${uniqueAzureId}`);

export const getSession = async (userId) =>
  fetchAPI(`/Sessions/GetSessionByUserId/${userId}`);

export const fetchAzureDepartmentDetails = async (
  uniqueAzureId,
  accessToken
) => {
  try {
    const graphResponse = await api.get(
      `https://graph.microsoft.com/v1.0/users/${uniqueAzureId}/memberOf`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const azureDepartmentName =
      graphResponse.data.value[1]?.displayName || "Unknown";

    const categoryResponse = await fetchAPI(
      `/Category/search?name=${encodeURIComponent(azureDepartmentName)}`
    );
    const categoryId = categoryResponse[0]?.id || "";

    const departmentResponse = await fetchAPI(
      `/Department/departmentIdByCategoryId/${categoryId}`
    );
    const departmentId = departmentResponse || "";

    const departmentData = await fetchAPI(`/Department/${departmentId}`);

    return {
      departmentId,
      departmentName: departmentData?.name || "Unknown",
      azureDepartmentName,
      categoryId,
    };
  } catch (error) {
    console.error("Error fetching Azure Department details:", error);
    toast.error("Error fetching department details.");
    throw error;
  }
};

export const createUser = async (userData) => {
  const response = await api.post("/User", userData);
  return response.data;
};

export const createSession = async (sessionData) => {
  const response = await api.post("/Sessions", sessionData);
  return response.data;
};
