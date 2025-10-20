import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { CameraIcon, PencilIcon, BriefcaseIcon, HeartIcon } from "react-native-heroicons/outline";
import { useNavigation } from "@react-navigation/native";
import { getStoredAuth, logout as logoutService } from "../services/authService";
import { getProfileByAccountId, updateProfile } from "../services/profileService";
import * as ImagePicker from "expo-image-picker";

const fallbackAvatar = require("../../assets/images/profile.jpg");

export default function ProfileScreen() {
  const navigation = useNavigation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingAvatar, setUpdatingAvatar] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [inlineError, setInlineError] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { account } = await getStoredAuth();
        const result = await getProfileByAccountId(account.accountId);
        setProfile(result);
        setAvatarPreview(result?.avatarUrl ?? null);
      } catch (err) {
        setInlineError(err.message || "Không thể tải hồ sơ.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pickAndUploadAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      return Alert.alert("Cần quyền truy cập ảnh để đổi ảnh đại diện.");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.IMAGE,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets?.length) return;
    const file = result.assets[0];
    const dataUrl = `data:${file.mimeType ?? "image/jpeg"};base64,${file.base64}`;

    try {
      setUpdatingAvatar(true);
      const payload = { ...profile, avatarUrl: dataUrl };
      const updated = await updateProfile(profile.userId, payload);
      setProfile(updated);
      setAvatarPreview(updated.avatarUrl);
      setSuccessMessage("🎉 Cập nhật ảnh đại diện thành công!");
    } catch (err) {
      setInlineError(err.message || "Không thể cập nhật ảnh.");
    } finally {
      setUpdatingAvatar(false);
    }
  };

  const handleLogout = async () => {
    await logoutService();
    navigation.reset({ index: 0, routes: [{ name: "Welcome" }] });
  };

  const avatarSrc = avatarPreview ? { uri: avatarPreview } : fallbackAvatar;

  return (
    <ScrollView
      className="bg-white flex-1"
      contentContainerStyle={{ paddingBottom: hp(6) }}
    >
      {loading ? (
        <View className="h-[70%] justify-center items-center">
          <ActivityIndicator color="#F26322" size="large" />
        </View>
      ) : (
        <>
          {/* Avatar Section */}
          <View className="relative items-center mt-6">
            <Image
              source={avatarSrc}
              style={{
                width: wp(45),
                height: wp(45),
                borderRadius: wp(22.5),
              }}
              resizeMode="cover"
              className="shadow-lg"
            />
            {/* Overlay Button */}
            <TouchableOpacity
              onPress={pickAndUploadAvatar}
              className="absolute bottom-1 right-[33%] bg-[#F26322] p-2 rounded-full shadow-md"
              disabled={updatingAvatar}
            >
              {updatingAvatar ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <CameraIcon size={20} color="white" />
              )}
            </TouchableOpacity>
          </View>

          {/* Name + Age + Edit */}
          <View className="items-center mt-5">
            <Text className="text-xl font-bold text-gray-900">
              {profile?.fullName ?? "Chưa cập nhật"}
            </Text>
            {profile?.birthDate && (
              <Text className="text-gray-600 mt-1">
                Tuổi: {Math.floor((Date.now() - new Date(profile.birthDate)) / (31557600000))}
              </Text>
            )}

            <TouchableOpacity
              className="mt-2 flex-row items-center space-x-1"
              onPress={() => Alert.alert("Tính năng chỉnh sửa đang phát triển")}
            >
              <PencilIcon size={18} color="#F26322" />
              <Text className="text-[#F26322] font-semibold">Chỉnh sửa hồ sơ</Text>
            </TouchableOpacity>
          </View>

          {/* Info Card */}
          <View className="mt-6 mx-6 bg-neutral-100 p-5 rounded-2xl shadow-sm space-y-4">
            {/* Bio */}
            <View>
              <Text className="text-neutral-500 uppercase font-semibold mb-2">
                Giới thiệu
              </Text>
              <Text className="text-black text-sm leading-5">
                {profile?.bio || "Hãy chia sẻ đôi điều về bản thân 💬"}
              </Text>
            </View>

            {/* Job */}
            {profile?.job && (
              <View className="flex-row items-center space-x-2">
                <BriefcaseIcon size={18} color="#F26322" />
                <Text className="text-gray-800 text-sm">{profile.job}</Text>
              </View>
            )}

            {/* Interests */}
            <View>
              <Text className="text-neutral-500 uppercase font-semibold mb-2">
                Sở thích
              </Text>
              <View className="flex-row flex-wrap">
                {profile?.interests && JSON.parse(profile.interests).length ? (
                  JSON.parse(profile.interests).map((hobby, idx) => (
                    <View
                      key={idx}
                      className="bg-[#FEE2E2] px-3 py-1.5 rounded-full mr-2 mb-2 flex-row items-center"
                    >
                      <HeartIcon size={14} color="#EF4444" />
                      <Text className="text-[#EF4444] text-sm ml-1">{hobby}</Text>
                    </View>
                  ))
                ) : (
                  <Text className="text-gray-500">Bạn chưa thêm sở thích nào.</Text>
                )}
              </View>
            </View>
          </View>

          {/* Logout Button */}
          <TouchableOpacity
            onPress={handleLogout}
            className="mt-8 mx-6 bg-[#ef4444] py-3 rounded-2xl flex-row items-center justify-center shadow-md"
          >
            <Text className="text-white font-bold text-base">Đăng xuất</Text>
          </TouchableOpacity>

          {/* Inline messages */}
          {successMessage ? (
            <Text className="text-center text-green-600 mt-3 font-semibold">
              {successMessage}
            </Text>
          ) : null}
          {inlineError ? (
            <Text className="text-center text-red-500 mt-3 font-semibold">
              {inlineError}
            </Text>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}
