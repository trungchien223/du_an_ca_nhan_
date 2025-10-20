import { apiFetchWithAuth } from "./authService";

export const updateUserLocation = async (userId, { latitude, longitude, address = null }) => {
  if (!userId) {
    throw new Error("Không tìm thấy hồ sơ người dùng.");
  }
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    throw new Error("Thông tin vị trí không hợp lệ.");
  }

  return apiFetchWithAuth(`/api/locations/${userId}`, {
    method: "PUT",
    data: {
      latitude,
      longitude,
      address,
    },
  });
};

export const getUserLocation = async (userId) => {
  if (!userId) {
    throw new Error("Không tìm thấy hồ sơ người dùng.");
  }

  return apiFetchWithAuth(`/api/locations/${userId}`, {
    method: "GET",
  });
};
