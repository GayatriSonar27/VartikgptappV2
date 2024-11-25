// src/apiService.js
import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export const fetchSessionByUserId = (userId) => {
  return axios.get(`${API_BASE_URL}/Sessions/GetSessionByUserId/${userId}`);
};

export const fetchCategoryByName = (name) => {
  return axios.get(`${API_BASE_URL}/Category/search?name=${encodeURIComponent(name)}`);
};

export const createCategory = (categoryData) => {
  return axios.post(`${API_BASE_URL}/Category`, categoryData);
};

export const fetchDepartmentByCategoryId = (categoryId) => {
  return axios.get(`${API_BASE_URL}/Department/DepartmentIdByCategoryId/${categoryId}`);
};

export const createDepartment = (departmentData) => {
  return axios.post(`${API_BASE_URL}/Department`, departmentData);
};

export const fetchDepartmentById = (departmentId) => {
  return axios.get(`${API_BASE_URL}/Department/${departmentId}`);
};

export const fetchUserByUniqueId = (uniqueId) => {
  return axios.get(`${API_BASE_URL}/User/unique/${uniqueId}`);
};

export const createUser = (userData) => {
  return axios.post(`${API_BASE_URL}/User`, userData);
};

export const fetchEmbLLMRef = () => {
  return axios.get(`${API_BASE_URL}/EmbLLMRef`);
};

export const fetchGraphMemberOf = (uniqueId, accessToken) => {
  return axios.get(`https://graph.microsoft.com/v1.0/users/${uniqueId}/memberOf`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
};

export const updateSessionByUserId = (userId, sessionData) => {
  return axios.put(`${API_BASE_URL}/Sessions/UpdateSessionByUserId/${userId}`, sessionData);
};

export const createSession = (sessionData) => {
  return axios.post(`${API_BASE_URL}/Sessions`, sessionData);
};
