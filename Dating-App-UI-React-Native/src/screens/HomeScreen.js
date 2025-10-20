import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Carousel from "react-native-snap-carousel";
import { useNavigation } from "@react-navigation/native";
import { BellIcon } from "react-native-heroicons/outline";
import { HeartIcon, XMarkIcon } from "react-native-heroicons/solid";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";
import DatesCard from "../components/DatesCard";
import { getStoredAuth } from "../services/authService";
import {
  getCompatibleProfiles,
  getProfileByAccountId,
  getNearbyProfiles,
} from "../services/profileService";
import { updateUserLocation } from "../services/locationService";
import * as Location from "expo-location";
import {
  MATCH_ACTIONS,
  getMatchesByUser,
  sendMatchDecision,
} from "../services/matchService";

const android = Platform.OS === "android";
const { width } = Dimensions.get("window");
const fallbackAvatar = require("../../assets/images/profile.jpg");

const calculateAge = (birthDate) => {
  if (!birthDate) return null;
  try {
    const dob = new Date(birthDate);
    if (Number.isNaN(dob.getTime())) {
      return null;
    }
    const diff = Date.now() - dob.getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)));
  } catch {
    return null;
  }
};

export default function HomeScreen() {
  const navigation = useNavigation();
  const [currentProfile, setCurrentProfile] = useState(null);
  const [suggestedProfiles, setSuggestedProfiles] = useState([]);
  const [usingNearby, setUsingNearby] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [processingDecision, setProcessingDecision] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [matchResult, setMatchResult] = useState(null);
  const [existingMatches, setExistingMatches] = useState([]);
  const locationSyncedRef = useRef(false);
  const carouselRef = useRef(null);

  const ensureLocationSynced = useCallback(
    async (userId) => {
      if (locationSyncedRef.current) {
        return true;
      }

      try {
        const { status } =
          await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setInfoMessage((prev) =>
            prev ||
            "Bạn cần cho phép quyền vị trí để tìm người ở gần."
          );
          return false;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        let address = null;
        try {
          const geocoded = await Location.reverseGeocodeAsync({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          if (geocoded && geocoded.length) {
            const first = geocoded[0];
            const parts = [
              first.streetNumber,
              first.street,
              first.subregion ?? first.district,
              first.city ?? first.region,
              first.country,
            ]
              .filter(Boolean)
              .join(", ");
            address = parts || null;
          }
        } catch {
          address = null;
        }

        await updateUserLocation(userId, {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          address,
        });

        locationSyncedRef.current = true;
        return true;
      } catch (error) {
        setInfoMessage((prev) =>
          prev ||
          error?.message ||
          "Không thể cập nhật vị trí của bạn."
        );
        return false;
      }
    },
    []
  );

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        setLoading(true);
        setErrorMessage("");
        setInfoMessage("");

        const stored = await getStoredAuth();
        const accountId = stored.account?.accountId;
        if (!accountId) {
          throw new Error("Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại.");
        }

        const profile = await getProfileByAccountId(accountId);
        if (!isMounted) return;
        setCurrentProfile(profile);

        if (!profile?.userId) {
          throw new Error("Không thể xác định hồ sơ của bạn.");
        }

        const matches = await getMatchesByUser(profile.userId);
        if (!isMounted) return;
        setExistingMatches(matches ?? []);

        const matchedIdSet = new Set();
        (matches ?? []).forEach((match) => {
          if (!match) return;
          if (match.user1Id) matchedIdSet.add(match.user1Id);
          if (match.user2Id) matchedIdSet.add(match.user2Id);
        });

        const filterProfiles = (list = []) =>
          (list ?? []).filter((candidate) => {
            const candidateId = candidate?.userId ?? candidate?.id;
            if (!candidateId) {
              return true;
            }
            if (candidateId === profile.userId) {
              return false;
            }
            return !matchedIdSet.has(candidateId);
          });

        const locationSynced = await ensureLocationSynced(profile.userId);
        if (!isMounted) return;

        let nearby = [];
        if (locationSynced) {
          try {
            nearby = (await getNearbyProfiles(profile.userId, 10)) ?? [];
          } catch (nearbyError) {
            if (!isMounted) return;
            const message =
              nearbyError?.message ??
              "Không thể xác định vị trí của bạn để tìm người gần.";
            setInfoMessage((prev) => prev || message);
          }
        }
        if (!isMounted) return;

        const filteredNearby = filterProfiles(nearby);
        if (filteredNearby.length) {
          setSuggestedProfiles(filteredNearby);
          setActiveIndex(0);
          setUsingNearby(true);
          setInfoMessage("");
          return;
        }

        const recommendations =
          (await getCompatibleProfiles(profile.userId)) ?? [];
        if (!isMounted) return;
        const filteredRecommendations = filterProfiles(recommendations);
        setSuggestedProfiles(filteredRecommendations);
        setActiveIndex(0);
        setUsingNearby(false);
        if (!filteredRecommendations.length) {
          const message =
            recommendations?.length && matchedIdSet.size
              ? "Bạn đã ghép đôi với tất cả gợi ý hiện có. Hãy quay lại sau để xem thêm người mới nhé!"
              : "Chưa có gợi ý mới, chúng tôi sẽ tiếp tục tìm kiếm cho bạn.";
          setInfoMessage((prev) => prev || message);
        } else {
          setInfoMessage("");
        }
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(
          error?.message ||
            "Không thể tải dữ liệu đề xuất. Vui lòng thử lại sau."
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [ensureLocationSynced]);

  const carouselData = useMemo(() => {
    return suggestedProfiles.map((profile) => ({
      id: profile.userId,
      fullName: profile.fullName ?? "Người dùng",
      birthDate: profile.birthDate,
      age: calculateAge(profile.birthDate),
      bio: profile.bio,
      job: profile.job,
      avatarUrl: profile.avatarUrl,
      isVerified: true,
    }));
  }, [suggestedProfiles]);

  const currentSuggestion = useMemo(() => {
    if (!suggestedProfiles.length) {
      return null;
    }
    return suggestedProfiles[Math.min(activeIndex, suggestedProfiles.length - 1)] ?? null;
  }, [suggestedProfiles, activeIndex]);

  const handleMatchDecision = useCallback(
    async (actionType = MATCH_ACTIONS.LIKE) => {
      if (processingDecision) {
        return;
      }

      const targetProfile = currentSuggestion;
      if (!targetProfile) {
        setInfoMessage(
          usingNearby
            ? "Bạn đã xem hết danh sách người ở gần. Hãy thử cập nhật lại vị trí nhé!"
            : "Bạn đã duyệt hết gợi ý hiện có. Chúng tôi sẽ cập nhật thêm trong thời gian sớm nhất."
        );
        return;
      }

      if (!currentProfile?.userId) {
        setErrorMessage("Không xác định được hồ sơ của bạn để gửi yêu cầu ghép đôi.");
        return;
      }

      try {
        setProcessingDecision(true);
        setPendingAction(actionType);
        setErrorMessage("");
        setInfoMessage("");

        const response = await sendMatchDecision({
          sourceUserId: currentProfile.userId,
          targetUserId: targetProfile.userId,
          action: actionType,
        });

        const updatedList = suggestedProfiles.filter(
          (profile) => profile.userId !== targetProfile.userId
        );
        setSuggestedProfiles(updatedList);
        setActiveIndex((prevIndex) =>
          updatedList.length ? Math.min(prevIndex, updatedList.length - 1) : 0
        );

        if (!updatedList.length) {
          setInfoMessage(
            usingNearby
              ? "Bạn đã xem hết những người ở gần. Hãy thử mở rộng phạm vi hoặc quay lại sau nhé!"
              : "Bạn đã duyệt hết gợi ý hiện tại. Chúng tôi sẽ gửi thêm khi có hồ sơ mới."
          );
        }

        let matchedPair = null;
        if (actionType !== MATCH_ACTIONS.PASS) {
          try {
            const matches = await getMatchesByUser(currentProfile.userId);
            setExistingMatches(matches ?? []);
            matchedPair = matches?.find((match) => {
              if (!match) return false;
              const isCurrentUser1 = match.user1Id === currentProfile.userId;
              const partnerId = isCurrentUser1
                ? match.user2Id
                : match.user1Id;
              return partnerId === targetProfile.userId;
            });
          } catch {
            matchedPair = null;
          }
        }

        if (matchedPair) {
          const isCurrentUser1 = matchedPair.user1Id === currentProfile.userId;
          const partnerId = isCurrentUser1
            ? matchedPair.user2Id
            : matchedPair.user1Id;
          const partnerName = isCurrentUser1
            ? matchedPair.user2Name
            : matchedPair.user1Name;

          const matchedAt = matchedPair.matchedAt
            ? new Date(matchedPair.matchedAt).toISOString()
            : new Date().toISOString();

          setMatchResult({
            matchId: matchedPair.matchId,
            matchedAt,
            partner: {
              id: partnerId,
              userId: partnerId,
              fullName: partnerName,
              name: partnerName,
              avatarUrl: targetProfile.avatarUrl,
              matchedAt,
              bio: targetProfile.bio,
            },
            raw: {
              likeResponse: response,
              match: matchedPair,
            },
          });
          setInfoMessage("");
        } else if (actionType === MATCH_ACTIONS.LIKE) {
          setInfoMessage("Đã gửi lượt thích. Hãy chờ phản hồi từ đối phương nhé!");
        } else {
          setInfoMessage("Đã bỏ qua hồ sơ này.");
        }

        if (carouselRef.current && updatedList.length) {
          const nextIndex = Math.min(activeIndex, updatedList.length - 1);
          setTimeout(() => {
            carouselRef.current?.snapToItem(nextIndex, false);
          }, 16);
        }
      } catch (error) {
        setErrorMessage(
          error?.message ||
            "Không thể xử lý ghép đôi. Vui lòng kiểm tra kết nối và thử lại."
        );
      } finally {
        setProcessingDecision(false);
        setPendingAction(null);
      }
    },
    [
      processingDecision,
      currentSuggestion,
      currentProfile?.userId,
      suggestedProfiles,
      usingNearby,
      activeIndex,
    ]
  );

  const handleCloseMatchModal = useCallback(() => {
    setMatchResult(null);
  }, []);

  const handleNavigateToChat = useCallback(() => {
    if (!matchResult) {
      return;
    }

    const { matchId, partner, matchedAt } = matchResult;
    setMatchResult(null);

    if (matchId) {
      navigation.navigate("ChatDetails", {
        matchId,
        partner: {
          id: partner?.id ?? partner?.userId,
          name: partner?.name ?? partner?.fullName ?? "Người dùng",
          avatarUrl: partner?.avatarUrl,
          matchedAt: partner?.matchedAt ?? matchedAt ?? new Date().toISOString(),
        },
      });
    } else {
      navigation.navigate("Chat");
    }
  }, [matchResult, navigation]);

  const partnerAvatarSource = useMemo(() => {
    if (matchResult?.partner?.avatarUrl) {
      return { uri: matchResult.partner.avatarUrl };
    }
    return fallbackAvatar;
  }, [matchResult?.partner?.avatarUrl]);

  const partnerDisplayName =
    matchResult?.partner?.name ??
    matchResult?.partner?.fullName ??
    "đối phương";

  const matchTimestampLabel = useMemo(() => {
    if (!matchResult?.matchedAt) {
      return null;
    }
    const date = new Date(matchResult.matchedAt);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }, [matchResult?.matchedAt]);

  const headerAvatar = currentProfile?.avatarUrl
    ? { uri: currentProfile.avatarUrl }
    : fallbackAvatar;

  return (
    <SafeAreaView
      className="bg-white flex-1"
      style={{
        paddingTop: android ? hp(2) : 0,
      }}
    >
      <Modal
        animationType="fade"
        transparent
        visible={!!matchResult}
        onRequestClose={handleCloseMatchModal}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 24,
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 380,
              backgroundColor: "#fff",
              borderRadius: 24,
              paddingVertical: 28,
              paddingHorizontal: 24,
              alignItems: "center",
            }}
          >
            <Text className="text-2xl font-bold text-neutral-900 mb-2">
              Đã ghép đôi!
            </Text>
            <Text className="text-sm text-neutral-500 mb-4 text-center">
              Bạn và {partnerDisplayName} đã kết nối với nhau.
            </Text>

            <View
              style={{
                width: hp(14),
                height: hp(14),
                borderRadius: hp(7),
                overflow: "hidden",
                marginBottom: 16,
              }}
            >
              <Image
                source={partnerAvatarSource}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            </View>

            {matchTimestampLabel ? (
              <Text className="text-xs text-neutral-400 mb-6">
                {`Khớp vào ${matchTimestampLabel}`}
              </Text>
            ) : null}

            <View className="w-full">
              <TouchableOpacity
                className="bg-blue-500 rounded-2xl py-3 px-4 mb-3"
                onPress={handleNavigateToChat}
              >
                <Text className="text-white text-center font-semibold text-base">
                  Bắt đầu trò chuyện
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="border border-neutral-300 rounded-2xl py-3 px-4"
                onPress={handleCloseMatchModal}
              >
                <Text className="text-neutral-700 text-center font-semibold text-base">
                  Tiếp tục khám phá
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View className="w-full flex-row justify-between items-center px-4 mb-8">
        <View className="rounded-full overflow-hidden">
          <Image
            source={headerAvatar}
            style={{
              width: hp(4.5),
              height: hp(4.5),
              resizeMode: "cover",
            }}
          />
        </View>

        <View>
          <Text className="text-xl font-semibold text-center uppercase">
            STACKS Dates
          </Text>
        </View>

        <View className="bg-black/10 p-2 rounded-full items-center justify-center">
          <TouchableOpacity>
            <BellIcon size={25} strokeWidth={2} color="black" />
          </TouchableOpacity>
        </View>
      </View>

      <View className="pb-4 flex-1">
        <View className="mx-4 mb-4">
          <Text className="capitalize text-2xl font-semibold">
            {usingNearby ? "Gặp gỡ người gần bạn" : "Khám phá người phù hợp"}
          </Text>
          {currentProfile?.fullName ? (
            <Text className="text-neutral-500 mt-1">
              {usingNearby
                ? "Hiển thị những hồ sơ trong bán kính 10km quanh bạn"
                : `Dựa trên hồ sơ của ${currentProfile.fullName}`}
            </Text>
          ) : null}
          {infoMessage ? (
            <Text className="text-xs text-[#ef4444] mt-1">{infoMessage}</Text>
          ) : null}
        </View>

        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#F26322" />
          </View>
        ) : errorMessage ? (
          <View className="flex-1 justify-center items-center px-6">
            <Text className="text-center text-neutral-500">{errorMessage}</Text>
          </View>
        ) : carouselData.length ? (
          <>
            <Carousel
              ref={carouselRef}
              data={carouselData}
              renderItem={({ item }) => <DatesCard item={item} />}
              firstItem={0}
              inactiveSlideScale={0.86}
              inactiveSlideOpacity={0.6}
              sliderWidth={width}
              itemWidth={width * 0.8}
              slideStyle={{ display: "flex", alignItems: "center" }}
              containerCustomStyle={{ flexGrow: 0 }}
              onSnapToItem={(index) => setActiveIndex(index)}
            />

            <View className="flex-row justify-center items-center mt-8 space-x-6">
              <TouchableOpacity
                className="rounded-full bg-white border border-neutral-200"
                style={{
                  padding: hp(2.3),
                  opacity: processingDecision ? 0.7 : 1,
                  shadowColor: "#000",
                  shadowOpacity: 0.15,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 8,
                }}
                disabled={processingDecision}
                onPress={() => handleMatchDecision(MATCH_ACTIONS.PASS)}
              >
                {pendingAction === MATCH_ACTIONS.PASS ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <XMarkIcon size={hp(4)} color="#ef4444" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                className="rounded-full bg-white border border-neutral-200"
                style={{
                  padding: hp(2.3),
                  opacity: processingDecision ? 0.7 : 1,
                  shadowColor: "#000",
                  shadowOpacity: 0.15,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 8,
                }}
                disabled={processingDecision}
                onPress={() => handleMatchDecision(MATCH_ACTIONS.LIKE)}
              >
                {pendingAction === MATCH_ACTIONS.LIKE ? (
                  <ActivityIndicator size="small" color="#22c55e" />
                ) : (
                  <HeartIcon size={hp(4)} color="#22c55e" />
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View className="flex-1 justify-center items-center px-6">
            <Text className="text-center text-neutral-500">
              Chưa có gợi ý mới. Hãy cập nhật hồ sơ hoặc thử lại sau nhé!
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
