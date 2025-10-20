import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Platform } from "react-native";
import Constants from "expo-constants";


// 🌍 Các key lưu trong AsyncStorage
const TOKEN_KEY = "@datingapp/token";
const ACCOUNT_KEY = "@datingapp/account";

const getDefaultBaseUrl = () => {
  if (Platform.OS === "android") {
    return "http://10.0.2.2:8080"; // ✅ Android Emulator (Windows)
  }
  if (Platform.OS === "ios") {
    return "http://10.10.8.165:8080";
  }
  return "http://localhost:8080"; // ✅ Web dev
};

// 🔧 Base URL — ưu tiên dùng biến môi trường nếu có
export const API_BASE_URL =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL ?? getDefaultBaseUrl();


console.log("🌐 API base URL đang dùng:", API_BASE_URL);

// 🧩 Tạo axios instance
const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

// 🔍 Chuẩn hoá lỗi axios
const extractAxiosError = (error) => {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      const { data, status } = error.response;
      return (
        data?.message ||
        data?.error ||
        (typeof data === "string" ? data : null) ||
        `Máy chủ trả về mã lỗi ${status}.`
      );
    }
    if (error.request) {
      return "Không thể kết nối đến máy chủ, vui lòng kiểm tra lại mạng.";
    }
  }
  return error?.message || "Có lỗi xảy ra khi gửi yêu cầu.";
};

// 🔧 Request chung
const performRequest = async (path, config = {}) => {
  try {
    const response = await axiosClient({ url: path, ...config });
    return response?.data ?? null;
  } catch (error) {
    throw new Error(extractAxiosError(error));
  }
};

// 🧩 API helpers
export const apiPost = (path, body, options = {}) =>
  performRequest(path, { method: "POST", data: body, ...options });

export const apiGet = (path, options = {}) =>
  performRequest(path, { method: "GET", ...options });

export const apiFetchWithAuth = async (path, options = {}) => {
  const { token } = await getStoredAuth();
  if (!token) {
    throw new Error("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.");
  }
  return performRequest(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
};

// 🔐 Login
export const login = async ({ phone, password }) => {
  const payload = { phone, password };
  const data = await apiPost("/api/accounts/login", payload);
  if (!data?.token) throw new Error("Không nhận được mã đăng nhập từ máy chủ.");
  await AsyncStorage.multiSet([
    [TOKEN_KEY, data.token],
    [ACCOUNT_KEY, JSON.stringify(data.account ?? {})],
  ]);
  return data;
};

// 🔐 Đăng nhập bằng Google
export const googleLogin = async (idToken) => {
  const data = await apiPost("/api/accounts/google-login", { idToken });
  if (!data?.token) {
    throw new Error("Không nhận được mã đăng nhập Google từ máy chủ.");
  }

  await AsyncStorage.multiSet([
    [TOKEN_KEY, data.token],
    [ACCOUNT_KEY, JSON.stringify(data.account ?? {})],
  ]);

  return data;
};

// 🆕 Register
export const register = async ({ phone, email, password }) => {
  const trimmedPhone = phone?.trim();
  const trimmedEmail = email?.trim();
  const payload = {
    phone: trimmedPhone,
    password,
    ...(trimmedEmail ? { email: trimmedEmail } : {}),
  };
  const data = await apiPost("/api/accounts/register", payload);
  if (!data?.token)
    throw new Error("Không nhận được mã đăng ký từ máy chủ.");
  await AsyncStorage.multiSet([
    [TOKEN_KEY, data.token],
    [ACCOUNT_KEY, JSON.stringify(data.account ?? {})],
  ]);
  return data;
};

// 🔓 Logout
export const logout = async () => {
  await AsyncStorage.multiRemove([TOKEN_KEY, ACCOUNT_KEY]);
};

// 📦 Lấy token/account từ local
export const getStoredAuth = async () => {
  const entries = await AsyncStorage.multiGet([TOKEN_KEY, ACCOUNT_KEY]);
  const map = Object.fromEntries(entries);
  return {
    token: map[TOKEN_KEY] ?? null,
    account: map[ACCOUNT_KEY] ? JSON.parse(map[ACCOUNT_KEY]) : null,
  };
};
