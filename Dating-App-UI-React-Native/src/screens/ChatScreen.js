import React, { useCallback, useMemo, useRef, useState } from "react";
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
import { getMessagesByMatch } from "../services/messageService";

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

export default function ChatScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const refreshFlag = route.params?.refresh ?? false;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [matches, setMatches] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
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

        if (!profile?.userId) {
          throw new Error("Không xác định được hồ sơ người dùng hiện tại.");
        }

        const rawMatches = await getMatchesByUser(profile.userId);
        if (!isActive) {
          return;
        }

        const enriched = await Promise.all(
          (rawMatches ?? []).map(async (match) => {
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

            try {
              const messages = await getMessagesByMatch(match.matchId);
              const lastMessage = messages?.length
                ? messages[messages.length - 1]
                : null;

              return {
                ...match,
                partner,
                lastMessage,
              };
            } catch {
              return {
                ...match,
                partner,
                lastMessage: null,
              };
            }
          })
        );

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
        }))}
        loading={(!hasLoaded && loading) || refreshing}
        onPress={(match) => {
          const target = matches.find((item) => item.matchId === match.id);
          if (target) {
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
              const lastMessageText =
                item.lastMessage?.content ?? "Chưa có tin nhắn nào.";
              const lastMessageTime =
                item.lastMessage?.createdAt ?? item.matchedAt;
              const avatarSource = item.partner?.avatarUrl
                ? { uri: item.partner.avatarUrl }
                : fallbackAvatar;

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
                    className="mr-3 rounded-full overflow-hidden"
                    style={{
                      width: hp(6.5),
                      height: hp(6.5),
                    }}
                  >
                    <Image
                      source={avatarSource}
                      style={{
                        width: "100%",
                        height: "100%",
                      }}
                    />
                  </View>

                  <View className="flex-1 justify-center">
                    <View className="flex-row justify-between items-center mb-1">
                      <Text className="font-bold text-base">
                        {item.partner?.name ?? "Người dùng"}
                      </Text>
                      <Text className="text-xs text-neutral-400">
                        {formatTime(lastMessageTime)}
                      </Text>
                    </View>
                    <Text
                      className="font-semibold text-xs text-neutral-500"
                      numberOfLines={1}
                    >
                      {lastMessageText}
                    </Text>
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
