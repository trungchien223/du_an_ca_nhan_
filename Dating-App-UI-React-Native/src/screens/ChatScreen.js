import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MagnifyingGlassIcon } from "react-native-heroicons/outline";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";
import Matches from "../components/matches";
import { getStoredAuth } from "../services/authService";
import { getProfileByAccountId } from "../services/profileService";
import { getMatchesByUser } from "../services/matchService";
import { useWebSocket } from "../context/WebSocketContext";

const android = Platform.OS === "android";
const fallbackAvatar = require("../../assets/images/profile.jpg");

const formatTime = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleDateString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const STATUS_LABEL = {
  SENT: "Đã gửi",
  DELIVERED: "Đã nhận",
  READ: "Đã xem",
  DELETED: "Đã thu hồi",
};

const mapLastMessage = (message) => ({
  messageId: message?.messageId ?? null,
  matchId: message?.matchId ?? null,
  senderId: message?.senderId ?? null,
  receiverId: message?.receiverId ?? null,
  content: message?.content ?? "",
  createdAt: message?.createdAt ?? null,
  isDeleted: Boolean(message?.isDeleted),
  lastStatus:
    message?.lastStatus ?? (message?.isRead ? "READ" : undefined),
});

const getStatusLabel = (message) => {
  if (!message) return null;
  if (message.isDeleted) return STATUS_LABEL.DELETED;
  if (message.lastStatus && STATUS_LABEL[message.lastStatus]) {
    return STATUS_LABEL[message.lastStatus];
  }
  return null;
};

export default function ChatScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const refreshFlag = route.params?.refresh ?? false;
  const { subscribe, typingState, presence } = useWebSocket();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [matches, setMatches] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const lastFetchedRef = useRef(0);
  const DATA_STALE_AFTER_MS = 60000;

  const loadMatches = useCallback(({ silent = false } = {}) => {
    let isActive = true;

    const fetchMatches = async () => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setErrorMessage("");

        const stored = await getStoredAuth();
        const accountId = stored.account?.accountId;
        if (!accountId) {
          throw new Error("Phiên đăng nhập không còn hợp lệ, vui lòng đăng nhập lại.");
        }

        const profile = await getProfileByAccountId(accountId);
        if (!isActive) {
          return;
        }
        setCurrentUser(profile);

        if (!profile?.userId) {
          throw new Error("Không xác định được hồ sơ người dùng hiện tại.");
        }

        const rawMatches = await getMatchesByUser(profile.userId);
        if (!isActive) {
          return;
        }

        const enriched = (rawMatches ?? []).map((match) => {
          const isUser1 = match.user1Id === profile.userId;
          const partner = isUser1
            ? {
                id: match.user2Id,
                name: match.user2Name,
                avatarUrl: match.user2AvatarUrl,
                matchedAt: match.matchedAt,
              }
            : {
                id: match.user1Id,
                name: match.user1Name,
                avatarUrl: match.user1AvatarUrl,
                matchedAt: match.matchedAt,
              };

          const lastMessage = match.lastMessage
            ? mapLastMessage(match.lastMessage)
            : null;

          if (lastMessage) {
            lastMessage.matchId = match.matchId;
          }

          return {
            ...match,
            partner,
            lastMessage,
            unreadCount: Number(match.unreadCount ?? 0),
          };
        });

        if (!isActive) {
          return;
        }
        setMatches(enriched);
        lastFetchedRef.current = Date.now();
      } catch (error) {
        if (!isActive) {
          return;
        }
        setErrorMessage(
          error?.message || "Không thể tải danh sách trò chuyện, vui lòng thử lại."
        );
      } finally {
        if (isActive) {
          if (silent) {
            setRefreshing(false);
          } else {
            setLoading(false);
          }
          setHasLoaded(true);
        }
      }
    };

    fetchMatches();

    return () => {
      isActive = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      const forceRefresh = refreshFlag === true;
      const isStale =
        !lastFetchedRef.current ||
        Date.now() - lastFetchedRef.current > DATA_STALE_AFTER_MS;
      let cleanup;
      if (!hasLoaded || forceRefresh || isStale) {
        cleanup = loadMatches({
          silent: hasLoaded && !forceRefresh,
        });
      }

      if (forceRefresh) {
        navigation.setParams({ refresh: false });
      }

      return () => {
        cleanup?.();
      };
    }, [loadMatches, hasLoaded, navigation, refreshFlag])
  );

  useEffect(() => {
    if (!subscribe) return undefined;

    const offMessage = subscribe("chat.message", (payload) => {
      const incoming = payload?.message;
      if (!incoming) return;
      setMatches((prev) => {
        const index = prev.findIndex(
          (item) => item.matchId === incoming.matchId
        );
        if (index === -1) {
          return prev;
        }
        const next = [...prev];
        const previous = next[index];
        const lastMessage = mapLastMessage({
          ...incoming,
          lastStatus: payload?.status,
        });
        lastMessage.matchId = incoming.matchId;

        const isMine =
          currentUser?.userId &&
          Number(incoming.senderId) === Number(currentUser.userId);
        const unreadCount = isMine
          ? previous.unreadCount ?? 0
          : (previous.unreadCount ?? 0) + 1;

        const updated = {
          ...previous,
          lastMessage,
          unreadCount,
        };

        next.splice(index, 1);
        next.unshift(updated);
        return next;
      });
    });

    const offStatus = subscribe("chat.status", (payload) => {
      if (!payload) return;
      setMatches((prev) =>
        prev.map((match) => {
          if (match.matchId !== payload.matchId) {
            return match;
          }

          const actorId =
            payload.actorId ?? payload.userId ?? payload.partnerId ?? null;

          const lastMessageMatches =
            match.lastMessage &&
            match.lastMessage.messageId === payload.messageId;

          const updated = lastMessageMatches
            ? {
                ...match,
                lastMessage: {
                  ...match.lastMessage,
                  lastStatus: payload.status,
                  isDeleted:
                    payload.status === "DELETED"
                      ? true
                      : match.lastMessage.isDeleted,
                },
              }
            : { ...match };

          if (
            payload.status === "READ" &&
            currentUser?.userId &&
            actorId !== null &&
            Number(actorId) === Number(currentUser.userId)
          ) {
            updated.unreadCount = 0;
          }

          return updated;
        })
      );
    });

    const offMatch = subscribe("match.new", () => {
      loadMatches({ silent: true });
    });

    return () => {
      offMessage?.();
      offStatus?.();
      offMatch?.();
    };
  }, [subscribe, loadMatches, currentUser?.userId]);

  useEffect(() => {
    if (!subscribe) return;
    const offUnread = subscribe("chat.unread", ({ total, matchId }) => {
      setMatches((prev) =>
        prev.map((item) =>
          item.matchId === matchId
            ? { ...item, unreadCount: total }
            : item
        )
      );
    });
    return () => offUnread?.();
  }, [subscribe]);




  const filteredMatches = useMemo(() => {
    if (!searchTerm.trim()) {
      return matches;
    }
    const normalized = searchTerm.trim().toLowerCase();
    return matches.filter((item) =>
      item.partner?.name?.toLowerCase().includes(normalized)
    );
  }, [matches, searchTerm]);

  return (
    <SafeAreaView
      className="flex-1 bg-white"
      style={{
        paddingTop: android ? hp(3) : 0,
      }}
    >
      <View className="px-4">
        <Text className="uppercase font-semibold text-neutral-500 tracking-wider">
          Matches
        </Text>
      </View>

      <Matches
        profiles={matches.map((match) => ({
          id: match.matchId,
          displayName: match.partner?.name,
          avatarUrl: match.partner?.avatarUrl,
          matchedAt: match.partner?.matchedAt ?? match.matchedAt,
          online: match.partner?.id
            ? Boolean(presence?.[match.partner.id])
            : false,
        }))}
        loading={(!hasLoaded && loading) || refreshing}
        onPress={(match) => {
          const target = matches.find((item) => item.matchId === match.id);
          if (target) {
            setMatches((prev) =>
              prev.map((item) =>
                item.matchId === target.matchId
                  ? { ...item, unreadCount: 0 }
                  : item
              )
            );
            navigation.navigate("ChatDetails", {
              matchId: target.matchId,
              partner: {
                ...target.partner,
                matchedAt: target.matchedAt,
              },
            });
          }
        }}
      />

      <View className="mx-4 mt-6 flex-row items-center rounded-2xl bg-neutral-200 px-3 py-4">
        <TextInput
          placeholder="Tìm kiếm"
          placeholderTextColor={"gray"}
          style={{
            fontSize: hp(1.7),
          }}
          value={searchTerm}
          onChangeText={setSearchTerm}
          className="flex-1 text-base mb-1 pl-1 tracking-widest"
        />

        <View>
          <MagnifyingGlassIcon size={hp(2.5)} color={"gray"} strokeWidth={3} />
        </View>
      </View>

      <View className="px-4 flex-1">
        <View className="border-b border-neutral-300 py-4">
          <Text className="uppercase font-semibold text-neutral-500 tracking-wider ">
            CHAT
          </Text>
        </View>

        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#F26322" />
          </View>
        ) : errorMessage ? (
          <View className="flex-1 justify-center items-center px-6">
            <Text className="text-center text-neutral-500">{errorMessage}</Text>
          </View>
        ) : filteredMatches.length ? (
          <FlatList
            data={filteredMatches}
            keyExtractor={(item) => String(item.matchId)}
            renderItem={({ item }) => {
              const partnerId = item.partner?.id;
              const partnerOnline = partnerId
                ? Boolean(presence?.[partnerId])
                : false;
              const isTyping = partnerId
                ? Boolean(typingState?.[item.matchId]?.[partnerId])
                : false;
              const unreadCount = Number(item.unreadCount ?? 0);
              const avatarSource = item.partner?.avatarUrl
                ? { uri: item.partner.avatarUrl }
                : fallbackAvatar;
              const lastMessageTime =
                item.lastMessage?.createdAt ?? item.matchedAt;

              let previewText = "Chưa có tin nhắn nào.";
              if (isTyping) {
                previewText = "Đang nhập...";
              } else if (item.lastMessage?.isDeleted) {
                previewText = "Tin nhắn đã được thu hồi.";
              } else if (item.lastMessage?.content) {
                previewText = item.lastMessage.content;
              }

              const hasUnread = unreadCount > 0 && !isTyping;
              const previewColor = hasUnread
                ? "#111827"
                : isTyping
                ? "#3B82F6"
                : item.lastMessage?.isDeleted
                ? "#9CA3AF"
                : "#6B7280";

              const statusLabel =
                item.lastMessage &&
                currentUser?.userId &&
                item.lastMessage.senderId === currentUser.userId
                  ? getStatusLabel(item.lastMessage)
                  : null;

              return (
                <TouchableOpacity
                  className="w-full py-3 flex-row border-b border-neutral-200"
                  onPress={() =>
                    navigation.navigate("ChatDetails", {
                      matchId: item.matchId,
                      partner: {
                        ...item.partner,
                        matchedAt: item.matchedAt,
                      },
                    })
                  }
                >
                  <View
                    style={{
                      marginRight: 12,
                      width: hp(6.5),
                      height: hp(6.5),
                      borderRadius: hp(3.25),
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
                    <Image
                      source={avatarSource}
                      style={{
                        width: "100%",
                        height: "100%",
                      }}
                    />
                    {partnerOnline ? (
                      <View
                        style={{
                          position: "absolute",
                          bottom: 6,
                          right: 6,
                          width: hp(1.1),
                          height: hp(1.1),
                          borderRadius: hp(0.55),
                          backgroundColor: "#22c55e",
                          borderWidth: 1.5,
                          borderColor: "#ffffff",
                        }}
                      />
                    ) : null}
                  </View>

                  <View className="flex-1 justify-center">
                    <View className="flex-row justify-between items-center mb-1">
                      <Text className="font-bold text-base" numberOfLines={1}>
                        {item.partner?.name ?? "Người dùng"}
                      </Text>
                      <View className="flex-row items-center">
                        {hasUnread ? (
                          <View
                            style={{
                              backgroundColor: "#F26322",
                              borderRadius: hp(1),
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              marginRight: 6,
                            }}
                          >
                            <Text
                              style={{
                                color: "#FFFFFF",
                                fontSize: 11,
                                fontWeight: "600",
                              }}
                            >
                              {unreadCount}
                            </Text>
                          </View>
                        ) : null}
                        <Text className="text-xs text-neutral-400">
                          {formatTime(lastMessageTime)}
                        </Text>
                      </View>
                    </View>
                    <Text
                      className="font-semibold text-xs"
                      numberOfLines={1}
                      style={{
                        color: previewColor,
                        fontWeight: hasUnread ? "700" : "600",
                      }}
                    >
                      {previewText}
                    </Text>
                    {statusLabel && !isTyping ? (
                      <Text className="text-[11px] text-neutral-400 mt-0.5">
                        {statusLabel}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            }}
            ListFooterComponent={<View style={{ height: hp(2) }} />}
            refreshing={refreshing}
            onRefresh={() => loadMatches({ silent: true })}
          />
        ) : (
          <View className="flex-1 justify-center items-center px-6">
            <Text className="text-center text-neutral-500">
              Bạn chưa có cuộc trò chuyện nào. Hãy tiếp tục kết nối để bắt đầu
              trò chuyện nhé!
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
