import React, { useMemo } from "react";
import {
  Dimensions,
  Image,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { CheckBadgeIcon } from "react-native-heroicons/solid";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");
const fallbackAvatar = require("../../assets/images/profile.jpg");

const calculateAge = (birthDate) => {
  if (!birthDate) return null;
  try {
    const dob = new Date(birthDate);
    if (Number.isNaN(dob.getTime())) return null;
    const diff = Date.now() - dob.getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)));
  } catch {
    return null;
  }
};

export default function DatesCard({ item, handleClick }) {
  const displayName = item?.fullName ?? item?.name ?? "Người dùng";

  const age = useMemo(() => {
    if (typeof item?.age === "number") return item.age;
    return calculateAge(item?.birthDate);
  }, [item?.age, item?.birthDate]);

  const avatarSource = item?.avatarUrl ? { uri: item.avatarUrl } : fallbackAvatar;
  const badgeVisible = item?.isVerified ?? false;

  return (
    <TouchableWithoutFeedback onPress={() => handleClick?.(item)}>
      <View
        style={{
          width: width * 0.9,
          height: height * 0.65,
          borderRadius: 24,
          overflow: "hidden",
          alignSelf: "center",
          backgroundColor: "#000",
          shadowColor: "#000",
          shadowOpacity: 0.3,
          shadowRadius: 10,
          elevation: 6,
        }}
      >
        {/* Ảnh */}
        <Image
          source={avatarSource}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />

        {/* Gradient phủ phần dưới */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.8)"]}
          style={{
            position: "absolute",
            bottom: 0,
            width: "100%",
            height: "45%", // chỉ phủ nửa dưới, không che toàn bộ
          }}
        />

        {/* Nội dung overlay */}
        <View
          style={{
            position: "absolute",
            bottom: 20,
            left: 16,
            right: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text
              style={{
                color: "white",
                fontSize: 24,
                fontWeight: "700",
              }}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            {age !== null && (
              <Text
                style={{
                  color: "white",
                  fontSize: 22,
                  fontWeight: "600",
                  marginLeft: 6,
                }}
              >
                {age}
              </Text>
            )}
            {badgeVisible && (
              <CheckBadgeIcon size={24} color="#3B82F6" style={{ marginLeft: 8 }} />
            )}
          </View>

          {item?.job ? (
            <Text
              style={{
                color: "white",
                opacity: 0.85,
                fontSize: 16,
                fontWeight: "500",
                marginTop: 2,
              }}
              numberOfLines={1}
            >
              {item.job}
            </Text>
          ) : null}

          {item?.bio ? (
            <Text
              style={{
                color: "white",
                opacity: 0.8,
                fontSize: 14,
                marginTop: 6,
                lineHeight: 20,
              }}
              numberOfLines={3}
            >
              {item.bio}
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}
