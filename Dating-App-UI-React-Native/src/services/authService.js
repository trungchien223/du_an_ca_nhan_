import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Platform } from "react-native";
import Constants from "expo-constants";

// 🌍 Các key lưu trong AsyncStorage
const TOKEN_KEY = "@datingapp/token";
const REFRESH_TOKEN_KEY = "@datingapp/refreshToken";
const TOKEN_EXPIRES_KEY = "@datingapp/tokenExpiresAt";
const REFRESH_EXPIRES_KEY = "@datingapp/refreshExpiresAt";
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

let refreshPromise = null;

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
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = extractAxiosError(error);
      const wrapped = new Error(message);
      wrapped.status = status;
      wrapped.isAxiosError = true;
      wrapped.originalError = error;
      throw wrapped;
    }
    throw new Error(error?.message || "Có lỗi xảy ra khi gửi yêu cầu.");
  }
};

const storeAuthSession = async (data) => {
  if (!data?.token) {
    throw new Error("Không nhận được mã đăng nhập từ máy chủ.");
  }
  if (!data?.refreshToken) {
    throw new Error("Không nhận được refresh token từ máy chủ.");
  }

  const now = Date.now();
  const entries = [
    [TOKEN_KEY, data.token],
    [REFRESH_TOKEN_KEY, data.refreshToken],
    [
      TOKEN_EXPIRES_KEY,
      data.expiresIn ? String(now + Number(data.expiresIn)) : "",
    ],
    [
      REFRESH_EXPIRES_KEY,
      data.refreshExpiresIn ? String(now + Number(data.refreshExpiresIn)) : "",
    ],
  ];

  const storagePairs = [...entries];

  let accountPayload = data.account ?? null;
  if (!accountPayload) {
    const existingAccount = await AsyncStorage.getItem(ACCOUNT_KEY);
    if (existingAccount) {
      try {
        accountPayload = JSON.parse(existingAccount);
      } catch {
        accountPayload = null;
      }
    }
  }

  if (accountPayload) {
    storagePairs.push([ACCOUNT_KEY, JSON.stringify(accountPayload)]);
  } else {
    await AsyncStorage.removeItem(ACCOUNT_KEY);
  }

  await AsyncStorage.multiSet(storagePairs);
};

const clearAuthSession = async () => {
  await AsyncStorage.multiRemove([
    TOKEN_KEY,
    REFRESH_TOKEN_KEY,
    TOKEN_EXPIRES_KEY,
    REFRESH_EXPIRES_KEY,
    ACCOUNT_KEY,
  ]);
};

const refreshAccessToken = async () => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const { refreshToken } = await getStoredAuth();
    if (!refreshToken) {
      throw new Error("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.");
    }

    try {
      const data = await apiPost("/api/accounts/refresh", {
        refreshToken,
      });
      await storeAuthSession(data);
      return data.token;
    } catch (error) {
      await clearAuthSession();
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(
        "Không thể làm mới phiên đăng nhập. Vui lòng đăng nhập lại."
      );
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

export const getValidAccessToken = async () => {
  const auth = await getStoredAuth();

  if (!auth.token) {
    throw new Error("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.");
  }

  if (!auth.refreshToken) {
    throw new Error("Phiên làm việc không còn hợp lệ, vui lòng đăng nhập lại.");
  }

  if (
    auth.tokenExpiresAt &&
    Number.isFinite(auth.tokenExpiresAt) &&
    auth.tokenExpiresAt - Date.now() < 5000
  ) {
    return refreshAccessToken();
  }

  return auth.token;
};

// 🧩 API helpers
export const apiPost = (path, body, options = {}) =>
  performRequest(path, { method: "POST", data: body, ...options });

export const apiGet = (path, options = {}) =>
  performRequest(path, { method: "GET", ...options });

export const apiFetchWithAuth = async (path, options = {}) => {
  let accessToken;

  try {
    accessToken = await getValidAccessToken();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.");
  }

  const attemptRequest = async (token) =>
    performRequest(path, {
      ...options,
      headers: {
        ...(options.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
    });

  try {
    return await attemptRequest(accessToken);
  } catch (error) {
    if (error?.status === 401) {
      const newToken = await refreshAccessToken();
      return attemptRequest(newToken);
    }
    throw error;
  }
};

// 🔐 Login
export const login = async ({ phone, password }) => {
  const payload = { phone, password };
  const data = await apiPost("/api/accounts/login", payload);
  await storeAuthSession(data);
  return data;
};

// 🔐 Đăng nhập bằng Google
export const googleLogin = async (idToken) => {
  const data = await apiPost("/api/accounts/google-login", { idToken });
  await storeAuthSession(data);
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
  await storeAuthSession(data);
  return data;
};

// 🔓 Logout
export const logout = async () => {
  await clearAuthSession();
};

// 📦 Lấy token/account từ local
export const getStoredAuth = async () => {
  const entries = await AsyncStorage.multiGet([
    TOKEN_KEY,
    REFRESH_TOKEN_KEY,
    TOKEN_EXPIRES_KEY,
    REFRESH_EXPIRES_KEY,
    ACCOUNT_KEY,
  ]);
  const map = Object.fromEntries(entries);

  let account = null;
  if (map[ACCOUNT_KEY]) {
    try {
      account = JSON.parse(map[ACCOUNT_KEY]);
    } catch {
      account = null;
    }
  }

  return {
    token: map[TOKEN_KEY] ?? null,
    refreshToken: map[REFRESH_TOKEN_KEY] ?? null,
    tokenExpiresAt: map[TOKEN_EXPIRES_KEY]
      ? Number(map[TOKEN_EXPIRES_KEY])
      : null,
    refreshExpiresAt: map[REFRESH_EXPIRES_KEY]
      ? Number(map[REFRESH_EXPIRES_KEY])
      : null,
    account,
  };
};
