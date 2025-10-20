import { apiFetchWithAuth } from "./authService";

export const MATCH_ACTIONS = Object.freeze({
  LIKE: "LIKE",
  PASS: "PASS",
  SUPER_LIKE: "SUPER_LIKE",
});

export const getMatchesByUser = async (userId) => {
  if (!userId) {
    throw new Error(
      "Không tìm thấy hồ sơ người dùng để tải danh sách ghép đôi."
    );
  }
  return apiFetchWithAuth(`/api/matches/user/${userId}`, {
    method: "GET",
  });
};

export const sendMatchDecision = async ({
  sourceUserId,
  targetUserId,
  action = MATCH_ACTIONS.LIKE,
  metadata,
}) => {
  if (!sourceUserId || !targetUserId) {
    throw new Error("Thiếu thông tin người dùng để xử lý ghép đôi.");
  }

  const normalizedAction =
    typeof action === "string"
      ? action.trim().toUpperCase()
      : MATCH_ACTIONS.LIKE;

  if (!Object.values(MATCH_ACTIONS).includes(normalizedAction)) {
    throw new Error("Loại hành động ghép đôi không hợp lệ.");
  }

  const isPass = normalizedAction === MATCH_ACTIONS.PASS;
  const path = isPass
    ? `/api/likes/${sourceUserId}/pass/${targetUserId}`
    : `/api/likes/${sourceUserId}/to/${targetUserId}`;

  const requestConfig = { method: "POST" };
  if (metadata && !isPass) {
    requestConfig.data = metadata;
  }

  return apiFetchWithAuth(path, requestConfig);
};
