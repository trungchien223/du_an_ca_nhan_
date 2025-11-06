  import React, {
    useCallback,
    useEffect,
    useRef,
    useState,
  } from "react";
  import * as ImagePicker from "expo-image-picker";
  import { Alert } from "react-native";
  import { FaceSmileIcon, PhotoIcon } from "react-native-heroicons/outline";

  import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    Text,
    TouchableOpacity,
    View,
  } from "react-native";
  import { useNavigation, useRoute } from "@react-navigation/native";
  import {
    ChevronLeftIcon,
    PaperAirplaneIcon,
  } from "react-native-heroicons/outline";
  import { EllipsisHorizontalIcon } from "react-native-heroicons/solid";
  import { heightPercentageToDP as hp } from "react-native-responsive-screen";
  import { SafeAreaView, useSafeAreaInsets  } from "react-native-safe-area-context";
  import {
    Bubble,
    GiftedChat,
    InputToolbar,
    Send,
    Composer,
  } from "react-native-gifted-chat";
  import { getStoredAuth } from "../services/authService";
  import { getProfileByAccountId } from "../services/profileService";
  import { getMessagesByMatch } from "../services/messageService";
  import { websocketService, websocketEvents } from "../services/websocketService";

  import { useWebSocket } from "../context/WebSocketContext";

  const android = Platform.OS === "android";
  const fallbackAvatar = require("../../assets/images/profile.jpg");

  export default function ChatDetailsScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { matchId, partner } = route.params ?? {};
    const partnerId = partner?.id;

    const {
      connected,
      sendChatMessage,
      sendTyping,
    } = useWebSocket();

    const [currentUser, setCurrentUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const chatRef = useRef(null);
    const insets = useSafeAreaInsets();

    // --- Load messages ---
    useEffect(() => {
      let isMounted = true;
      const loadConversation = async () => {
        try {
          setLoading(true);
          const stored = await getStoredAuth();
          const accountId = stored.account?.accountId;
          if (!accountId) throw new Error("Phiên đăng nhập không còn tồn tại.");

          const profile = await getProfileByAccountId(accountId);
          if (!isMounted) return;
          setCurrentUser(profile);

          const history = await getMessagesByMatch(matchId);
          if (!isMounted) return;
          const prepared = (history ?? []).map((m) => ({
            _id: m.messageId
              ? `server-${m.messageId}`
              : `local-${m.createdAt}-${Math.random().toString(36).slice(2, 8)}`,
            text: m.isDeleted ? "Tin nhắn đã được thu hồi." : m.content,
            createdAt: new Date(m.createdAt),
            user: { _id: String(m.senderId) },
          }));

          setMessages(prepared.reverse());
        } catch (e) {
          console.error(e);
        } finally {
          if (isMounted) setLoading(false);
        }
      };
      loadConversation();
      return () => {
        isMounted = false;
      };
    }, [matchId]);

    useEffect(() => {
      if (!matchId || !currentUser) return;
      websocketService.sendStatus({
        messageId: null,
        matchId,
        partnerId: partner.id,
        status: "READ",
      });
    }, [matchId, currentUser?.userId]);

    useEffect(() => {
      if (!matchId || !currentUser) return;

      const handleIncomingMessage = (event) => {
        const msg = event.message ?? event;
        if (msg.matchId !== matchId) return;

        const newMsg = {
          _id: msg.messageId
            ? `server-${msg.messageId}`
            : `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          text: msg.isDeleted ? "Tin nhắn đã được thu hồi." : msg.content,
          createdAt: new Date(msg.createdAt ?? Date.now()),
          user: { _id: String(msg.senderId) },
          clientMessageId: msg.clientMessageId, // ✅ để map lại với pending
        };

        setMessages((prev) => {
          // ✅ Nếu đây là phản hồi cho tin mình vừa gửi — thay thế tin pending
          if (
            msg.clientMessageId &&
            prev.some((m) => m.clientMessageId === msg.clientMessageId)
          ) {
            const updated = prev.map((m) =>
              m.clientMessageId === msg.clientMessageId
                ? { ...newMsg, pending: false } // thay bản mới
                : m
            );
            return updated;
          }

          // ✅ Nếu đã tồn tại bản server rồi => bỏ qua
          const exists = prev.some((m) => m._id === newMsg._id);
          if (exists) return prev;

          // ✅ Nếu là tin của chính mình (senderId == currentUser) và chưa có clientMessageId
          // thì loại tin pending cuối cùng
          if (
            msg.senderId === currentUser?.userId &&
            !msg.clientMessageId
          ) {
            const filtered = prev.filter((m) => !m.pending);
            return GiftedChat.append(filtered, [newMsg]);
          }

          // ✅ Thêm mới cho tin người kia
          return GiftedChat.append(prev, [newMsg]);
        });
      };



      const offMessage = websocketEvents.on("chat.message", handleIncomingMessage);
      return () => offMessage?.();
    }, [matchId, currentUser]);




    // --- Handle send ---
    const handleSend = useCallback(
      async (outgoing = []) => {
        const text = outgoing[0]?.text?.trim();
        if (!text || sending) return;
        try {
          setSending(true);

          // 🟢 CHỜ WEBSOCKET SẴN SÀNG TRƯỚC KHI GỬI
          await websocketService.waitUntilConnected();

          // 🟢 GỬI TIN NHẮN SAU KHI ĐÃ ĐẢM BẢO KẾT NỐI
          const { clientMessageId } = sendChatMessage({
            matchId,
            receiverId: partnerId,
            content: text,
          });

          // 🟢 HIỂN THỊ OPTIMISTIC TIN NHẮN
          const optimistic = {
            _id: `temp-${clientMessageId}-${Date.now()}`,
            text,
            createdAt: new Date(),
            user: { _id: String(currentUser?.userId) },
            pending: true,
            clientMessageId, // ✅ giữ lại
          };



          setMessages((prev) => GiftedChat.append(prev, [optimistic]));
        } catch (err) {
          console.error("❌ Gửi tin nhắn thất bại:", err);
        } finally {
          setSending(false);
        }
      },
      [matchId, partnerId, currentUser, sending, sendChatMessage]
    );

    // --- Input change ---
    const handleInputChange = useCallback(
      (value = "") => {
        sendTyping?.({ matchId, receiverId: partnerId });
      },
      [matchId, partnerId, sendTyping]
    );

    // --- Bong bóng chat ---
    const renderBubble = useCallback(
      (props) => (
        <Bubble
          {...props}
          wrapperStyle={{
            left: {
              backgroundColor: "#E5E7EB",
              borderRadius: 18,
              marginRight: 50,
              marginVertical: 2,
              padding: 4,
            },
            right: {
              backgroundColor: "#0084FF",
              borderRadius: 18,
              marginLeft: 50,
              marginVertical: 2,
              padding: 4,
            },
          }}
          textStyle={{
            left: { color: "#111827", fontSize: 15 },
            right: { color: "#FFF", fontSize: 15 },
          }}
          timeTextStyle={{
            right: { color: "#E0E0E0", fontSize: 11 },
            left: { color: "#6B7280", fontSize: 11 },
          }}
        />
      ),
      []
    );

    // --- InputToolbar gọn gàng ---
    const renderInputToolbar = useCallback(
      (props) => (
        <InputToolbar
          {...props}
          containerStyle={{
            borderTopWidth: 0,
            backgroundColor: "transparent",
            marginHorizontal: 6,
            marginBottom: Platform.OS === "ios" ? 8 : 4,
            borderRadius: 25,
            paddingVertical: 0,
            minHeight: 40,
          }}
          primaryStyle={{ alignItems: "center" }}
        />
      ),
      []
    );

    // --- Ô nhập chat (Composer) kiểm soát chiều cao thực ---
    const renderComposer = useCallback(
      (props) => (
        <Composer
          {...props}
          textInputStyle={{
            fontSize: 15,
            backgroundColor: "#F3F4F6",
            borderRadius: 20,
            paddingHorizontal: 12,
            paddingTop: Platform.OS === "ios" ? 6 : 4,
            paddingBottom: Platform.OS === "ios" ? 6 : 4,
            minHeight: 34,   // ✨ thấp ban đầu
            maxHeight: 70,   // ✨ mở rộng 3 dòng
            lineHeight: 20,
            textAlignVertical: "center",
          }}
          multiline={true}
          placeholderTextColor="#9CA3AF"
          textInputProps={{
            blurOnSubmit: false,
          }}
        />
      ),
      []
    );

    // --- Nút gửi ---
    const renderSend = useCallback(
      (props) => {
        const currentText = props.text?.trim();
        const disabled = !currentText?.length || sending;
        return (
          <Send {...props} disabled={disabled}>
            <View
              style={{
                marginBottom: 6,
                marginRight: 4,
                backgroundColor: disabled ? "#9CA3AF" : "#0084FF",
                borderRadius: 20,
                padding: 8,
                alignSelf: "center",
              }}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <PaperAirplaneIcon color="white" size={18} />
              )}
            </View>
          </Send>
        );
      },
      [sending]
    );

    const renderActions = useCallback(
      () => (
        <View style={{ flexDirection: "row", alignItems: "center", marginLeft: 4 }}>
          {/* 😄 Nút emoji đẹp */}
          <TouchableOpacity
            onPress={() => Alert.alert("Emoji", "Mở emoji picker (sẽ thêm sau)")}
            style={{
              padding: 6,
              borderRadius: 20,
              marginRight: 2,
            }}
          >
            <FaceSmileIcon size={24} color="#6B7280" />
          </TouchableOpacity>

          {/* 📷 Nút gửi ảnh */}
          <TouchableOpacity
            onPress={async () => {
              try {
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  allowsEditing: true,
                  aspect: [1, 1],
                  quality: 0.8,
                });
                if (!result.canceled && result.assets?.length > 0) {
                  const image = result.assets[0];
                  console.log("📸 Selected:", image.uri);
                  // TODO: gọi hàm gửi ảnh qua WebSocket hoặc upload lên server
                }
              } catch (error) {
                console.error("❌ Lỗi chọn ảnh:", error);
              }
            }}
            style={{
              padding: 6,
              borderRadius: 20,
            }}
          >
            <PhotoIcon size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>
      ),
      []
    );



    const avatarSource = partner?.avatarUrl
      ? { uri: partner.avatarUrl }
      : fallbackAvatar;

    return (
      <SafeAreaView className="flex-1 bg-white">
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View className="flex-row items-center w-full px-4 pb-2 border-b border-neutral-200 bg-white shadow-sm">
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
                <Text className="font-bold text-base">
                  {partner?.name ?? "Người dùng"}
                </Text>
                <Text className="text-xs text-neutral-400">
                  {connected ? (
                    <Text style={{ color: "#22C55E" }}>● Đang hoạt động</Text>
                  ) : (
                    "Ngoại tuyến"
                  )}
                </Text>
              </View>
            </View>

            <TouchableOpacity className="p-2">
              <EllipsisHorizontalIcon size={hp(3)} color="black" />
            </TouchableOpacity>
          </View>

          <GiftedChat
            ref={chatRef}
            messages={messages}
            onInputTextChanged={handleInputChange}
            onSend={handleSend}
            user={{ _id: String(currentUser?.userId ?? "me") }}
            renderInputToolbar={renderInputToolbar}
            renderBubble={renderBubble}
            renderComposer={renderComposer}
            renderSend={renderSend}
            renderActions={renderActions}
            placeholder="Viết tin nhắn..."
            alwaysShowSend
            scrollToBottom
            keyboardShouldPersistTaps="handled"
            renderAvatar={() => null}
            minInputToolbarHeight={Platform.OS === "ios" ? 22 : 35} // nhỏ nhất ổn định
            bottomOffset={0} // ✨ ép sát tuyệt đối
          />

          {loading && (
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
          )}
        </View>
      </SafeAreaView>
    );
  }
