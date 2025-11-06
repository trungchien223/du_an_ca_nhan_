import { apiFetchWithAuth } from "./authService";

export const getMessagesByMatch = async (matchId) => {
  if (!matchId) {
    throw new Error("Không tìm thấy mã cuộc trò chuyện.");
  }
  return apiFetchWithAuth(`/api/messages/${matchId}`, {
    method: "GET",
  });
};

export const sendMessage = async ({
  matchId,
  senderId,
  receiverId,
  content,
}) => {
  const trimmedContent = content?.trim();
  if (!matchId || !senderId || !receiverId || !trimmedContent) {
    throw new Error("Thiếu thông tin để gửi tin nhắn.");
  }
  const payload = {
    matchId,
    senderId,
    receiverId,
    content: trimmedContent,
  };
  return apiFetchWithAuth("/api/messages", {
    method: "POST",
    data: payload,
    params: payload,
  });
};

export const markConversationAsRead = async (matchId, userId) => {
  if (!matchId || !userId) {
    throw new Error("Thiếu thông tin để đánh dấu đã đọc.");
  }
  return apiFetchWithAuth(`/api/messages/${matchId}/read`, {
    method: "POST",
    data: { userId },
    params: { userId },
  });
};
