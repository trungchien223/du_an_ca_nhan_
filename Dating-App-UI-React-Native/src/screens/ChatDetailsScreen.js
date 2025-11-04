import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ChevronLeftIcon, PaperAirplaneIcon } from "react-native-heroicons/outline";
import { EllipsisHorizontalIcon } from "react-native-heroicons/solid";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bubble, GiftedChat, InputToolbar, Send } from "react-native-gifted-chat";
import { getStoredAuth } from "../services/authService";
import { getProfileByAccountId } from "../services/profileService";
import { getMessagesByMatch, sendMessage } from "../services/messageService";
import { useWebSocket } from "../context/WebSocketContext";

const android = Platform.OS === "android";
const fallbackAvatar = require("../../assets/images/profile.jpg");

const STATUS_LABEL = {
  SENT: "Đã gửi",
  DELIVERED: "Đã nhận",
  READ: "Đã xem",
  DELETED: "Đã thu hồi",
};

const formatTimeLabel = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const mapMessage = (message, extras = {}) => ({
  messageId: message.messageId ?? null,
  matchId: message.matchId,
  senderId: message.senderId,
  receiverId: message.receiverId,
  content: message.content ?? "",
  messageType: message.messageType ?? "TEXT",
  isRead: Boolean(message.isRead),
  isDeleted: Boolean(message.isDeleted),
  deletedAt: message.deletedAt ?? null,
  createdAt: message.createdAt ?? new Date().toISOString(),
  clientMessageId: extras.clientMessageId ?? message.clientMessageId ?? null,
  pending: Boolean(extras.pending),
  failed: Boolean(extras.failed),
  lastStatus:
    extras.status ??
    message.lastStatus ??
    (message.isRead ? "READ" : undefined),
});

const upsertMessage = (messages, incoming, meta = {}) => {
  const formatted = mapMessage(incoming, {
    ...meta,
    pending: false,
    failed: false,
  });
  const next = [...messages];
  if (formatted.messageId) {
    const index = next.findIndex(
      (item) => item.messageId === formatted.messageId
    );
    if (index >= 0) {
      next[index] = { ...next[index], ...formatted };
    } else {
      next.push(formatted);
    }
  } else if (formatted.clientMessageId) {
    const index = next.findIndex(
      (item) => item.clientMessageId === formatted.clientMessageId
    );
    if (index >= 0) {
      next[index] = { ...next[index], ...formatted };
    } else {
      next.push(formatted);
    }
  } else {
    next.push(formatted);
  }
  next.sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  return next;
};

const applyStatus = (messages, payload) =>
  messages.map((item) => {
    if (item.messageId !== payload.messageId) {
      return item;
    }
    return {
      ...item,
      lastStatus: payload.status ?? item.lastStatus,
      isRead: payload.status === "READ" ? true : item.isRead,
      isDeleted: payload.status === "DELETED" ? true : item.isDeleted,
    };
  });

const getStatusLabel = (message) => {
  if (message.isDeleted) return STATUS_LABEL.DELETED;
  if (message.failed) return "Không gửi được";
  if (message.pending) return "Đang gửi...";
  if (message.lastStatus && STATUS_LABEL[message.lastStatus]) {
    return STATUS_LABEL[message.lastStatus];
  }
  return STATUS_LABEL.SENT;
};

const getStatusKey = (message) => {
  if (message.isDeleted) return "DELETED";
  if (message.failed) return "FAILED";
  if (message.pending) return "PENDING";
  if (message.lastStatus) return message.lastStatus;
  if (message.isRead) return "READ";
  return "SENT";
};

export default function ChatDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { matchId, partner } = route.params ?? {};
  const partnerId = partner?.id;

  const {
    connected,
    connect,
    sendChatMessage,
    sendTyping,
    sendStatus,
    recallMessage,
    typingState,
    presence,
    subscribe,
  } = useWebSocket();

  const [currentUser, setCurrentUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  const chatRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const typingActiveRef = useRef(false);
  const readAckRef = useRef(new Set());

  const scrollToBottom = (animated = true) => {
    requestAnimationFrame(() => {
    chatRef.current?.scrollToBottom?.(animated);
  });
};

  useEffect(() => {
    readAckRef.current = new Set();
  }, [matchId]);

  useEffect(() => {
    let isMounted = true;

    const loadConversation = async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        const stored = await getStoredAuth();
        const accountId = stored.account?.accountId;
        if (!accountId) {
          throw new Error("Phiên đăng nhập không còn tồn tại.");
        }

        const profile = await getProfileByAccountId(accountId);
        if (!isMounted) return;
        setCurrentUser(profile);

        if (!matchId) {
          throw new Error("Không tìm thấy cuộc trò chuyện.");
        }

        const history = await getMessagesByMatch(matchId);
        if (!isMounted) return;

        const prepared = (history ?? []).map((message) =>
          mapMessage(message, { pending: false, failed: false })
        );
        prepared.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        setMessages(prepared);
        setTimeout(() => scrollToBottom(false), 160);
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(
          error?.message || "Không thể tải cuộc trò chuyện. Vui lòng thử lại."
        );
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadConversation();

    return () => {
      isMounted = false;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [matchId]);

  useEffect(() => {
    if (!subscribe || !matchId) return undefined;

    const offMessage = subscribe("chat.message", (payload) => {
      const incoming = payload?.message;
      if (!incoming || incoming.matchId !== matchId) return;

      setMessages((prev) =>
        upsertMessage(prev, incoming, {
          clientMessageId: payload?.clientMessageId,
          status: payload?.status,
        })
      );

      if (
        currentUser?.userId &&
        incoming.receiverId === currentUser.userId &&
        incoming.messageId
      ) {
        sendStatus({
          messageId: incoming.messageId,
          matchId,
          partnerId: incoming.senderId,
          status: "DELIVERED",
        });
      }
    });

    const offStatus = subscribe("chat.status", (payload) => {
      if (!payload || payload.matchId !== matchId) return;
      setMessages((prev) => applyStatus(prev, payload));
    });

    return () => {
      offMessage?.();
      offStatus?.();
    };
  }, [subscribe, matchId, currentUser?.userId, sendStatus]);

  useEffect(() => {
    if (!currentUser?.userId || !partnerId) return;
    const unreadIds = [];

    messages.forEach((message) => {
      if (
        message.senderId === partnerId &&
        message.messageId &&
        !message.isDeleted &&
        !readAckRef.current.has(message.messageId)
      ) {
        readAckRef.current.add(message.messageId);
        unreadIds.push(message.messageId);
        sendStatus({
          messageId: message.messageId,
          matchId,
          partnerId,
          status: "READ",
        });
      }
    });

    if (unreadIds.length) {
      setMessages((prev) =>
        prev.map((message) =>
          unreadIds.includes(message.messageId)
            ? { ...message, isRead: true, lastStatus: "READ" }
            : message
        )
      );
    }
  }, [messages, currentUser?.userId, partnerId, matchId, sendStatus]);

  useEffect(() => {
    if (messages.length) {
      scrollToBottom(true);
    }
  }, [messages.length]);

  const typingIndicator = useMemo(
    () => Boolean(matchId && partnerId && typingState?.[matchId]?.[partnerId]),
    [typingState, matchId, partnerId]
  );
  const partnerOnline = Boolean(partnerId && presence?.[partnerId]);

  const currentGiftedUser = useMemo(() => {
    if (!currentUser?.userId) return null;
    return {
      _id: String(currentUser.userId),
      name:
        currentUser.fullName ??
        currentUser.displayName ??
        currentUser.username ??
        "Bạn",
      avatar: currentUser.avatarUrl || undefined,
    };
  }, [currentUser]);

  const partnerGiftedUser = useMemo(() => {
    if (!partnerId) return null;
    return {
      _id: String(partnerId),
      name: partner?.name ?? "Người dùng",
      avatar: partner?.avatarUrl || undefined,
    };
  }, [partnerId, partner?.name, partner?.avatarUrl]);

  const giftedMessages = useMemo(() => {
    if (!messages?.length) return [];
    return [...messages]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .map((message) => {
        const isMine =
          currentUser?.userId &&
          Number(message.senderId) === Number(currentUser.userId);
        const createdAt = message.createdAt
          ? new Date(message.createdAt)
          : new Date();
        const safeCreatedAt = Number.isNaN(createdAt.getTime())
          ? new Date()
          : createdAt;

        const statusKey = getStatusKey(message);
        const statusLabel = getStatusLabel(message);
        const messageKey =
          message.messageId ?? message.clientMessageId ?? message.createdAt;
        return {
          _id:
            message.messageId ??
            message.clientMessageId ??
            `${message.matchId}-${message.createdAt}`,
          text: message.isDeleted
            ? "Tin nhắn đã được thu hồi."
            : message.content,
          createdAt: safeCreatedAt,
          user: isMine
            ? currentGiftedUser ?? { _id: String(message.senderId ?? "me") }
            : partnerGiftedUser ??
              { _id: String(message.senderId ?? "partner") },
          isMine,
          isDeleted: message.isDeleted,
          pending: message.pending,
          failed: message.failed,
          statusLabel,
          statusKey,
          messageKey,
          raw: message,
        };
      });
  }, [
    messages,
    currentUser?.userId,
    currentGiftedUser,
    partnerGiftedUser,
  ]);

  const lastReadMessageKey = useMemo(() => {
    if (!messages?.length || !currentUser?.userId) return null;
    let latest = null;
    messages.forEach((message) => {
      if (
        Number(message.senderId) === Number(currentUser.userId) &&
        getStatusKey(message) === "READ"
      ) {
        if (
          !latest ||
          new Date(message.createdAt).getTime() >
            new Date(latest.createdAt).getTime()
        ) {
          latest = message;
        }
      }
    });
    if (!latest) return null;
    return latest.messageId ?? latest.clientMessageId ?? latest.createdAt;
  }, [messages, currentUser?.userId]);

  const avatarSource = partner?.avatarUrl
    ? { uri: partner.avatarUrl }
    : fallbackAvatar;

  const conversationTitle = partner?.name ?? "Người dùng";

  const headerStatus = useMemo(() => {
    if (typingIndicator) return "Đang nhập...";
    if (partnerOnline) return "Đang hoạt động";
    if (partner?.matchedAt) {
      return `Đã ghép vào ${new Date(
        partner.matchedAt
      ).toLocaleDateString("vi-VN")}`;
    }
    return "Hãy bắt đầu trò chuyện";
  }, [typingIndicator, partnerOnline, partner?.matchedAt]);

  const handleTypingStart = () => {
    if (!connected || !partnerId || !matchId) return;
    if (!typingActiveRef.current) {
      sendTyping({ matchId, receiverId: partnerId, typing: true });
      typingActiveRef.current = true;
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      if (typingActiveRef.current) {
        sendTyping({ matchId, receiverId: partnerId, typing: false });
        typingActiveRef.current = false;
      }
    }, 1500);
  };

  const handleInputChange = (value = "") => {
    setInputValue(value);
    if (value.trim().length) {
      handleTypingStart();
    } else if (typingActiveRef.current) {
      sendTyping({ matchId, receiverId: partnerId, typing: false });
      typingActiveRef.current = false;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const handleSend = useCallback(
    async (outgoing = []) => {
      const candidate = outgoing[0]?.text ?? inputValue;
      const trimmed = candidate?.trim();

      if (!trimmed || sending || loading) return;
      if (!currentUser?.userId || !partnerId || !matchId) {
        setErrorMessage("Thiếu thông tin để gửi tin nhắn.");
        return;
      }

      try {
        setSending(true);
        setErrorMessage("");
        setInfoMessage("");

        const fallbackToRest = async () => {
          const response = await sendMessage({
            matchId,
            senderId: currentUser.userId,
            receiverId: partnerId,
            content: trimmed,
          });
          const persisted = mapMessage(response, { status: "SENT" });
          setMessages((prev) => upsertMessage(prev, persisted));
          setInputValue("");
        };

        const dispatchViaSocket = () => {
          const { clientMessageId, ack } = sendChatMessage({
            matchId,
            receiverId: partnerId,
            content: trimmed,
          });

          const optimistic = mapMessage(
            {
              messageId: null,
              matchId,
              senderId: currentUser.userId,
              receiverId: partnerId,
              content: trimmed,
              createdAt: new Date().toISOString(),
              isDeleted: false,
              isRead: true,
              messageType: "TEXT",
            },
            {
              clientMessageId,
              status: "SENT",
              pending: true,
            }
          );

          setMessages((prev) => [...prev, optimistic]);
          setInputValue("");

          ack?.then((result) => {
            if (result?.timeout) {
              setMessages((prev) =>
                prev.map((message) =>
                  message.clientMessageId === clientMessageId
                    ? { ...message, pending: false, failed: true }
                    : message
                )
              );
            }
          });
        };

        if (!connected) {
          setInfoMessage("Đang kết nối lại... vui lòng chờ trong giây lát.");
          connect?.({ force: true });

          const connectedInTime = await new Promise((resolve) => {
            if (connected) {
              resolve(true);
              return;
            }
            let unsubscribe;
            const timeoutId = setTimeout(() => {
              if (unsubscribe) {
                unsubscribe();
              }
              resolve(false);
            }, 1500);

            unsubscribe = subscribe?.("connection.change", (state) => {
              if (state) {
                if (unsubscribe) {
                  unsubscribe();
                  unsubscribe = null;
                }
                clearTimeout(timeoutId);
                resolve(true);
              }
            });
          });

          if (connectedInTime) {
            try {
              dispatchViaSocket();
            } catch (socketError) {
              console.warn("Falling back to REST send:", socketError);
              await fallbackToRest();
            }
          } else {
            await fallbackToRest();
          }
        } else {
          try {
            dispatchViaSocket();
          } catch (socketError) {
            console.warn("Falling back to REST send:", socketError);
            await fallbackToRest();
          }
        }

        if (typingActiveRef.current) {
          sendTyping({ matchId, receiverId: partnerId, typing: false });
        }
        typingActiveRef.current = false;
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        setInfoMessage("");
      } catch (error) {
        setErrorMessage(
          error?.message || "Gửi tin nhắn thất bại, vui lòng thử lại."
        );
      } finally {
        setSending(false);
      }
    },
    [
      inputValue,
      sending,
      loading,
      currentUser?.userId,
      partnerId,
      matchId,
      sendMessage,
      sendChatMessage,
      connected,
      connect,
      subscribe,
      sendTyping,
    ]
  );

  const handleRecall = useCallback(
    (message) => {
      if (!message?.messageId || message.isDeleted || !partnerId) {
        return;
      }
      if (!connected) {
        setInfoMessage("Không thể thu hồi khi mất kết nối. Vui lòng thử lại.");
        return;
      }
      Alert.alert(
        "Thu hồi tin nhắn",
        "Tin nhắn sẽ bị xóa ở cả hai phía. Bạn có chắc chắn?",
        [
          { text: "Hủy", style: "cancel" },
          {
            text: "Thu hồi",
            style: "destructive",
            onPress: () => {
              try {
                recallMessage({
                  messageId: message.messageId,
                  matchId,
                  partnerId,
                });
                setMessages((prev) =>
                  prev.map((item) =>
                    item.messageId === message.messageId
                      ? { ...item, isDeleted: true, lastStatus: "DELETED" }
                      : item
                  )
                );
              } catch (error) {
                setInfoMessage(
                  error?.message || "Không thể thu hồi tin nhắn lúc này."
                );
              }
            },
          },
        ]
      );
    },
    [partnerId, connected, recallMessage, matchId]
  );

  const renderMessageBubble = useCallback(
    (bubbleProps) => {
      const { currentMessage } = bubbleProps;
      if (!currentMessage) {
        return <Bubble {...bubbleProps} />;
      }

      const isMine = Boolean(currentMessage.isMine);
      const isDeleted = Boolean(currentMessage.isDeleted);
      const statusKey = currentMessage.statusKey;
      const canRecall =
        Boolean(currentMessage.raw?.messageId) &&
        !currentMessage.raw?.isDeleted &&
        isMine;
      const timeLabel = formatTimeLabel(currentMessage.raw?.createdAt);
      const isLastRead =
        isMine &&
        statusKey === "READ" &&
        lastReadMessageKey &&
        currentMessage.messageKey === lastReadMessageKey;

      const bubble = (
        <Bubble
          {...bubbleProps}
          wrapperStyle={{
            right: {
              backgroundColor: isDeleted ? "#6B7280" : "#0084FF",
              borderRadius: 18,
              borderBottomRightRadius: 6,
              borderBottomLeftRadius: 18,
              paddingHorizontal: 0,
              paddingVertical: 0,
            },
            left: {
              backgroundColor: isDeleted ? "#E5E7EB" : "#F0F2F5",
              borderRadius: 18,
              borderBottomRightRadius: 18,
              borderBottomLeftRadius: 6,
              paddingHorizontal: 0,
              paddingVertical: 0,
            },
          }}
          textStyle={{
            right: {
              color: isDeleted ? "#E5E7EB" : "#FFFFFF",
              fontStyle: isDeleted ? "italic" : "normal",
              fontSize: 15,
              lineHeight: 20,
            },
            left: {
              color: isDeleted ? "#6B7280" : "#050505",
              fontStyle: isDeleted ? "italic" : "normal",
              fontSize: 15,
              lineHeight: 20,
            },
          }}
        />
      );

      let statusIndicator = null;
      if (isMine && !isDeleted) {
        if (currentMessage.failed) {
          statusIndicator = (
            <Text
              style={{
                color: "#ef4444",
                fontSize: 13,
                fontWeight: "700",
                marginLeft: 6,
              }}
            >
              !
            </Text>
          );
        } else if (statusKey === "PENDING") {
          statusIndicator = (
            <ActivityIndicator
              size="small"
              color="#9CA3AF"
              style={{ marginLeft: 6 }}
            />
          );
        } else if (isLastRead) {
          statusIndicator = (
            <Image
              source={avatarSource}
              style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                marginLeft: 6,
              }}
            />
          );
        } else {
          const checks =
            statusKey === "DELIVERED" || statusKey === "READ" ? "✓✓" : "✓";
          const color = statusKey === "READ" ? "#0B84FF" : "#9CA3AF";
          statusIndicator = (
            <Text
              style={{
                color,
                fontSize: 12,
                fontWeight: "600",
                marginLeft: 6,
              }}
            >
              {checks}
            </Text>
          );
        }
      }

      const metaColor = isMine ? "#DBEAFE" : "#6B7280";
      const metaStyle = {
        fontSize: 11,
        color: isDeleted ? "#9CA3AF" : metaColor,
        fontStyle: isDeleted ? "italic" : "normal",
      };

      const failedCaption =
        isMine && currentMessage.failed ? (
          <Text
            style={{
              fontSize: 11,
              color: "#ef4444",
              marginTop: 2,
              textAlign: "right",
            }}
          >
            {currentMessage.statusLabel}
          </Text>
        ) : null;

      const content = (
        <View style={{ marginBottom: 6 }}>
          {bubble}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: isMine ? "flex-end" : "flex-start",
              marginTop: 4,
            }}
          >
            <Text style={metaStyle}>{timeLabel}</Text>
            {statusIndicator}
          </View>
          {failedCaption}
        </View>
      );

      if (canRecall) {
        return (
          <TouchableOpacity
            activeOpacity={0.85}
            delayLongPress={200}
            onLongPress={() => handleRecall(currentMessage.raw)}
          >
            {content}
          </TouchableOpacity>
        );
      }

      return content;
    },
    [avatarSource, handleRecall, lastReadMessageKey]
  );

  const renderInput = useCallback(
    (toolbarProps) => (
      <InputToolbar
        {...toolbarProps}
        containerStyle={{
          borderTopWidth: 0,
          paddingHorizontal: 12,
          paddingVertical: 4,
          backgroundColor: "#ffffff",
        }}
        primaryStyle={{ alignItems: "center" }}
      />
    ),
    []
  );

  const renderSendButton = useCallback(
    (sendProps) => {
      const currentText = sendProps.text ?? inputValue;
      const hasText = Boolean(currentText?.trim()?.length);
      const disabled = sending || loading || !hasText;

      return (
        <Send
          {...sendProps}
          disabled={disabled}
          containerStyle={{
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 6,
            paddingBottom: 4,
          }}
        >
          <View
            style={{
              backgroundColor: disabled ? "#C7CED6" : "#0084FF",
              borderRadius: 18,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <PaperAirplaneIcon color="#FFFFFF" />
            )}
          </View>
        </Send>
      );
    },
    [sending, loading, inputValue]
  );

  const renderFooter = useCallback(() => {
    if (!typingIndicator && !infoMessage) return null;
    return (
      <View style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
        {typingIndicator ? (
          <Text style={{ fontSize: 12, color: "#9ca3af", fontStyle: "italic" }}>
            {conversationTitle} đang nhập...
          </Text>
        ) : null}
        {infoMessage ? (
          <Text
            style={{
              fontSize: 12,
              color: "#b45309",
              textAlign: "center",
              marginTop: typingIndicator ? 4 : 0,
            }}
          >
            {infoMessage}
          </Text>
        ) : null}
      </View>
    );
  }, [typingIndicator, conversationTitle, infoMessage]);

  const renderEmptyChat = useCallback(
    () => (
      <View style={{ paddingTop: 24 }}>
        <Text style={{ textAlign: "center", color: "#737373" }}>
          Hãy gửi lời chào để bắt đầu cuộc trò chuyện này!
        </Text>
      </View>
    ),
    []
  );

  return (
    <SafeAreaView
      className="flex-1 bg-white"
      style={{
        paddingTop: android ? hp(3) : 0,
      }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={hp(10)}
      >
        <View className="flex-row items-center w-full px-4 pb-2 border-b border-neutral-200">
          <TouchableOpacity
            activeOpacity={0.8}
            className="pr-2"
            onPress={() => navigation.goBack()}
          >
            <ChevronLeftIcon size={hp(3)} color="black" strokeWidth={2.2} />
          </TouchableOpacity>

          <View className="flex-1 flex-row items-center">
            <View
              style={{
                width: hp(4.5),
                height: hp(4.5),
                borderRadius: hp(2.25),
                overflow: "hidden",
                marginRight: 12,
              }}
            >
              <Image
                source={avatarSource}
                style={{ width: hp(4.5), height: hp(4.5) }}
              />
            </View>
            <View>
              <Text className="font-bold text-base">{conversationTitle}</Text>
              <Text className="text-xs text-neutral-400">{headerStatus}</Text>
            </View>
          </View>

          <TouchableOpacity className="p-2">
            <EllipsisHorizontalIcon size={hp(3)} color="black" />
          </TouchableOpacity>
        </View>

        {errorMessage ? (
          <View className="px-4 py-2 bg-red-50 border-b border-red-100">
            <Text className="text-sm text-red-600 text-center">
              {errorMessage}
            </Text>
          </View>
        ) : null}

        <View style={{ flex: 1 }}>
          <GiftedChat
            ref={chatRef}
            messages={giftedMessages}
            onSend={handleSend}
            user={currentGiftedUser ?? { _id: "local-user" }}
            renderBubble={renderMessageBubble}
            renderInputToolbar={renderInput}
            renderSend={renderSendButton}
            renderFooter={renderFooter}
            renderChatEmpty={renderEmptyChat}
            onInputTextChanged={handleInputChange}
            placeholder="Viết tin nhắn..."
            alwaysShowSend
            scrollToBottom
            renderAvatar={() => null}
            messagesContainerStyle={{ paddingBottom: hp(2) }}
            listViewProps={{
              contentContainerStyle: { paddingBottom: hp(2) },
              keyboardShouldPersistTaps: "handled",
            }}
            textInputStyle={{
              fontSize: hp(1.7),
              backgroundColor: "#F0F2F5",
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingTop: 8,
              paddingBottom: 8,
              color: "#050505",
            }}
            textInputProps={{
              editable: !loading && !sending,
              multiline: true,
              placeholderTextColor: "#6B7280",
            }}
            keyboardShouldPersistTaps="never"
          />

          {loading ? (
            <View
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(255,255,255,0.6)",
              }}
            >
              <ActivityIndicator size="large" color="#3B82F6" />
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
