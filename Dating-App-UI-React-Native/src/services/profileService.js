import { apiFetchWithAuth } from "./authService";

export const getProfileByAccountId = async (accountId) => {
  if (!accountId) {
    throw new Error("Không tìm thấy tài khoản để tải hồ sơ.");
  }
  return apiFetchWithAuth(`/api/profiles/account/${accountId}`, {
    method: "GET",
  });
};

export const updateProfile = async (userId, payload) => {
  if (!userId) {
    throw new Error("Không tìm thấy mã hồ sơ người dùng.");
  }
  return apiFetchWithAuth(`/api/profiles/${userId}`, {
    method: "PUT",
    data: payload,
  });
};

export const getCompatibleProfiles = async (userId) => {
  if (!userId) {
    throw new Error("Không tìm thấy hồ sơ người dùng.");
  }
  return apiFetchWithAuth(`/api/profiles/${userId}/compatible`, {
    method: "GET",
  });
};

export const getNearbyProfiles = async (userId, distanceKm = 10) => {
  if (!userId) {
    throw new Error("Không tìm thấy hồ sơ người dùng.");
  }
  return apiFetchWithAuth(`/api/profiles/${userId}/nearby`, {
    method: "GET",
    params: {
      distanceKm,
    },
  });
};
