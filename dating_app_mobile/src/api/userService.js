import axios from "axios";
import { API_BASE_URL } from "./config";

export const getProfile = async (userId) => {
  const res = await axios.get(`${API_BASE_URL}/users/${userId}`);
  return res.data;
};

export const updateProfile = async (userId, data) => {
  const res = await axios.put(`${API_BASE_URL}/users/${userId}`, data);
  return res.data;
};
