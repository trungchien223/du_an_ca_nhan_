import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  ChevronLeftIcon,
  FaceSmileIcon,
  PaperAirplaneIcon,
  PhotoIcon,
} from "react-native-heroicons/outline";
import { EllipsisHorizontalIcon } from "react-native-heroicons/solid";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import { getStoredAuth } from "../services/authService";
import { getProfileByAccountId } from "../services/profileService";
import {
  getMessagesByMatch,
  sendMessage,
} from "../services/messageService";

const android = Platform.OS === "android";
const fallbackAvatar = require("../../assets/images/profile.jpg");

const formatTime = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function ChatDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { matchId, partner } = route.params ?? {};

  const [currentUser, setCurrentUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const flatListRef = useRef(null); // ✅ Dùng để auto scroll

  useEffect(() => {
    let isMounted = true;

    const loadConversation = async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        const stored = await getStoredAuth();
        const accountId = stored.account?.accountId;
        if (!accountId) throw new Error("Phiên đăng nhập không còn tồn tại.");

        const profile = await getProfileByAccountId(accountId);
        if (!isMounted) return;
        setCurrentUser(profile);

        if (!matchId) throw new Error("Không tìm thấy cuộc trò chuyện.");

        const history = await getMessagesByMatch(matchId);
        if (!isMounted) return;

        setMessages(history ?? []);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }, 200);
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
    };
  }, [matchId]);

  const handleSend = async () => {
    if (!inputValue.trim() || sending || loading) return;
    if (!currentUser?.userId || !partner?.id || !matchId) {
      setErrorMessage("Thiếu thông tin để gửi tin nhắn.");
      return;
    }

    try {
      setSending(true);
      const response = await sendMessage({
        matchId,
        senderId: currentUser.userId,
        receiverId: partner.id,
        content: inputValue.trim(),
      });

      setMessages((prev) => [...prev, response]);
      setInputValue("");

      // ✅ Cuộn xuống cuối sau khi gửi
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      setErrorMessage(
        error?.message || "Gửi tin nhắn thất bại, vui lòng thử lại."
      );
    } finally {
      setSending(false);
    }
  };

  const avatarSource = partner?.avatarUrl
    ? { uri: partner.avatarUrl }
    : fallbackAvatar;

  const conversationTitle = useMemo(
    () => partner?.name ?? "Cuộc trò chuyện",
    [partner?.name]
  );

  return (
    <SafeAreaView
      className="flex-1 bg-white"
      style={{
        paddingTop: android ? hp(4) : 0,
      }}
    >
      {/* ✅ Tự động đẩy nội dung lên khi bàn phím mở */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={hp(10)} // tránh header đè lên input
      >
        {/* Header */}
        <View className="flex-row items-center w-full px-4 pb-2 border-b border-neutral-200">
          <TouchableOpacity
            className="flex-row items-center flex-1"
            onPress={() => navigation.goBack()}
          >
            <ChevronLeftIcon size={hp(2.5)} color="black" strokeWidth={2} />
            <View className="rounded-full overflow-hidden mx-3">
              <Image
                source={avatarSource}
                style={{ width: hp(4.5), height: hp(4.5) }}
              />
            </View>
            <View>
              <Text className="font-bold text-base">{conversationTitle}</Text>
              <Text className="text-xs text-neutral-400">
                {partner?.matchedAt
                  ? `Đã ghép vào ${new Date(
                    partner.matchedAt
                  ).toLocaleDateString("vi-VN")}`
                  : "Hãy bắt đầu trò chuyện"}
              </Text>
            </View>
          </TouchableOpacity>

          <View className="items-end">
            <View className="bg-black/5 rounded-full p-1">
              <EllipsisHorizontalIcon size={hp(3)} color="black" strokeWidth={2} />
            </View>
          </View>
        </View>

        {/* Danh sách tin nhắn */}
        <View className="flex-1 w-full px-4">
          {loading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="#F26322" />
            </View>
          ) : errorMessage ? (
            <View className="flex-1 justify-center items-center px-6">
              <Text className="text-center text-neutral-500">{errorMessage}</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => String(item.messageId ?? item.createdAt)}
              contentContainerStyle={{ paddingBottom: hp(2) }}
              renderItem={({ item }) => {
                const isMine = item.senderId === currentUser?.userId;
                return (
                  <View
                    style={{
                      flexDirection: isMine ? "row-reverse" : "row",
                      paddingVertical: 8,
                    }}
                  >
                    <View
                      style={{
                        maxWidth: "75%",
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        borderRadius: 16,
                        borderBottomRightRadius: isMine ? 2 : 16,
                        borderBottomLeftRadius: isMine ? 16 : 2,
                        backgroundColor: isMine ? "#171717" : "#3B82F6",
                      }}
                    >
                      <Text className="text-white text-base leading-5">
                        {item.content}
                      </Text>
                      <Text className="text-xs text-white/60 text-right mt-1">
                        {formatTime(item.createdAt)}
                      </Text>
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View className="pt-6">
                  <Text className="text-center text-neutral-500">
                    Hãy gửi lời chào để bắt đầu cuộc trò chuyện này!
                  </Text>
                </View>
              }
            />
          )}
        </View>

        {/* ✅ Input bar nằm trên bàn phím, không absolute */}
        <View className="flex-row items-center w-full px-4 py-2 bg-white border-t border-neutral-200">
          <View className="flex-row items-center rounded-2xl bg-neutral-200 px-3 py-3 flex-1 mr-3">
            <TextInput
              placeholder="Viết tin nhắn..."
              placeholderTextColor="gray"
              style={{ fontSize: hp(1.7) }}
              value={inputValue}
              onChangeText={setInputValue}
              editable={!loading && !sending}
              className="flex-1 text-base mb-1 pl-1 tracking-wider"
              onSubmitEditing={handleSend}
            />
            <View className="flex-row justify-center items-center space-x-1">
              <PhotoIcon color="gray" strokeWidth={2} />
              <FaceSmileIcon size={hp(2.5)} color="gray" strokeWidth={2} />
            </View>
          </View>

          <TouchableOpacity
            className="bg-blue-500 rounded-2xl py-3 px-4 justify-center items-center"
            onPress={handleSend}
            disabled={sending || loading}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <PaperAirplaneIcon color="white" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
