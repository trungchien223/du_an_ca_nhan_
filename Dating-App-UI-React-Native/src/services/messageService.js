import { apiFetchWithAuth } from "./authService";

export const getMessagesByMatch = async (matchId) => {
  if (!matchId) {
    throw new Error("Không tìm thấy mã cuộc trò chuyện.");
  }
  return apiFetchWithAuth(`/api/messages/${matchId}`, {
    method: "GET",
  });
};

export const sendMessage = async ({ matchId, senderId, receiverId, content }) => {
  if (!matchId || !senderId || !receiverId || !content?.trim()) {
    throw new Error("Thiếu thông tin để gửi tin nhắn.");
  }
  return apiFetchWithAuth("/api/messages", {
    method: "POST",
    params: {
      matchId,
      senderId,
      receiverId,
      content,
    },
  });
};
