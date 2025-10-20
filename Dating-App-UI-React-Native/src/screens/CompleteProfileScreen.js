import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useColorScheme } from "nativewind";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import {
  UserIcon,
  BriefcaseIcon,
  PencilSquareIcon,
  PhotoIcon,
} from "react-native-heroicons/outline";
import * as ImagePicker from "expo-image-picker";
import { getStoredAuth } from "../services/authService";
import {
  getProfileByAccountId,
  updateProfile,
} from "../services/profileService";
import * as yup from "yup";
import { completeProfileSchema } from "../utils/validationSchemas";

const fallbackAvatar = require("../../assets/images/profile.jpg");

const GENDERS = [
  { label: "Nam", value: "Male" },
  { label: "Nữ", value: "Female" },
  { label: "Khác", value: "Other" },
];

const toInterestsDisplay = (raw) => {
  if (!raw) return "";
  try {
    const source = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(source)) {
      return source.join(", ");
    }
  } catch {
    // ignore parse errors
  }
  return typeof raw === "string" ? raw : "";
};

const toInterestsPayload = (input) => {
  if (!input) return null;
  const items = input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? JSON.stringify(items) : null;
};

const initialForm = {
  fullName: "",
  gender: "Male",
  birthDate: "",
  job: "",
  bio: "",
  interests: "",
  avatarUrl: "",
};

const initialFieldErrors = {
  fullName: "",
  birthDate: "",
};

export default function CompleteProfileScreen() {
  const navigation = useNavigation();
  const { colorScheme } = useColorScheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState(initialFieldErrors);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [fontsLoaded, fontError] = useFonts({
    SpaceGroteskSemiBold: require("../font/SpaceGrotesk-SemiBold.ttf"),
    SpaceGroteskBold: require("../font/SpaceGrotesk-Bold.ttf"),
    SpaceGroteskMedium: require("../font/SpaceGrotesk-Medium.ttf"),
  });

  useEffect(() => {
    let mounted = true;
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const stored = await getStoredAuth();
        const accountId = stored.account?.accountId;
        if (!accountId) {
          throw new Error("Phiên đăng nhập không hợp lệ.");
        }
        const data = await getProfileByAccountId(accountId);
        if (!mounted) return;
        setProfile(data);
        setForm({
          fullName: data?.fullName ?? "",
          gender: data?.gender ?? "Male",
          birthDate: data?.birthDate ?? "",
          job: data?.job ?? "",
          bio: data?.bio ?? "",
          interests: toInterestsDisplay(data?.interests),
          avatarUrl: data?.avatarUrl ?? "",
        });
      } catch (error) {
        if (mounted) {
          setErrorMessage(error?.message || "Không thể tải thông tin hồ sơ.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchProfile();
    return () => {
      mounted = false;
    };
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  const themed = useMemo(() => {
    const dark = colorScheme === "dark";
    return {
      background: dark ? "#0f172a" : "#ffffff",
      surface: dark ? "rgba(148,163,184,0.1)" : "rgba(15,23,42,0.06)",
      text: dark ? "#f8fafc" : "#0f172a",
      muted: dark ? "#94a3b8" : "#64748b",
      border: dark ? "rgba(148,163,184,0.18)" : "rgba(15,23,42,0.12)",
      danger: dark ? "#fca5a5" : "#ef4444",
      success: dark ? "#4ade80" : "#22c55e",
    };
  }, [colorScheme]);

  const handleFieldChange = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => ({
        ...prev,
        [key]: "",
      }));
    }
    if (errorMessage) {
      setErrorMessage("");
    }
    if (successMessage) {
      setSuccessMessage("");
    }
  };

  const handlePickAvatar = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setErrorMessage("Bạn cần cấp quyền thư viện ảnh để chọn ảnh đại diện.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });
      if (!result.canceled && result.assets?.length) {
        handleFieldChange("avatarUrl", result.assets[0].uri);
      }
    } catch (error) {
      setErrorMessage(error?.message || "Không thể chọn ảnh.");
    }
  };

  const validateField = async (field) => {
    try {
      await completeProfileSchema.validateAt(field, {
        fullName: form.fullName,
        birthDate: form.birthDate,
      });
      setFieldErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        setFieldErrors((prev) => ({
          ...prev,
          [field]: error.message,
        }));
      }
    }
  };

  const validateForm = async () => {
    try {
      await completeProfileSchema.validate(
        { fullName: form.fullName, birthDate: form.birthDate },
        { abortEarly: false }
      );
      setFieldErrors(initialFieldErrors);
      return true;
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        const nextErrors = { ...initialFieldErrors };
        error.inner.forEach((issue) => {
          if (issue.path && nextErrors[issue.path] === "") {
            nextErrors[issue.path] = issue.message;
          }
        });
        setFieldErrors(nextErrors);
      } else {
        setErrorMessage("Thông tin không hợp lệ, vui lòng kiểm tra lại.");
      }
      return false;
    }
  };

  const handleSave = async () => {
    if (saving) return;
    const valid = await validateForm();
    if (!valid) return;

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const stored = await getStoredAuth();
      const accountId = stored.account?.accountId;
      if (!accountId) {
        throw new Error("Phiên đăng nhập không hợp lệ.");
      }
      if (!profile?.userId) {
        throw new Error("Không xác định được mã hồ sơ người dùng.");
      }

      const payload = {
        fullName: form.fullName.trim(),
        gender: form.gender,
        birthDate: form.birthDate || null,
        job: form.job.trim() || null,
        bio: form.bio.trim() || null,
        interests: toInterestsPayload(form.interests),
        avatarUrl: form.avatarUrl,
      };

      await updateProfile(profile.userId, payload);
      setSuccessMessage("Cập nhật hồ sơ thành công!");
    } catch (error) {
      setErrorMessage(
        error?.message || "Không thể lưu hồ sơ, vui lòng thử lại."
      );
    } finally {
      setSaving(false);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  if (loading) {
    return (
      <SafeAreaView
        className="flex-1"
        style={{ backgroundColor: themed.background }}
        onLayout={onLayoutRootView}
      >
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#F26322" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: themed.background }}
      onLayout={onLayoutRootView}
    >
      <StatusBar
        barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="flex-1 px-6 pt-4">
          <TouchableOpacity
            className="self-start p-2 rounded-full"
            style={{ backgroundColor: themed.surface }}
            onPress={() => navigation.goBack()}
          >
            <Text
              style={{
                color: themed.text,
                fontFamily: "SpaceGroteskSemiBold",
                fontSize: wp(4),
              }}
            >
              ←
            </Text>
          </TouchableOpacity>

          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: hp(8), gap: hp(2) }}
          >
            <View className="items-center mt-4">
              <Image
                source={form.avatarUrl ? { uri: form.avatarUrl } : fallbackAvatar}
                style={{
                  width: hp(18),
                  height: hp(18),
                  borderRadius: hp(9),
                  marginBottom: hp(1.5),
                }}
                resizeMode="cover"
              />

              <TouchableOpacity
                className="flex-row items-center px-4 py-2 rounded-full"
                style={{ backgroundColor: "#F26322" }}
                onPress={handlePickAvatar}
              >
                <PhotoIcon color="#fff" />
                <Text
                  style={{
                    marginLeft: 8,
                    color: "#fff",
                    fontFamily: "SpaceGroteskSemiBold",
                    fontSize: wp(3.4),
                  }}
                >
                  Chọn ảnh đại diện
                </Text>
              </TouchableOpacity>
            </View>

            <View>
              <Text
                style={{
                  fontSize: wp(3.4),
                  fontFamily: "SpaceGroteskMedium",
                  color: themed.muted,
                  marginBottom: hp(0.8),
                }}
              >
                Họ và tên
              </Text>
              <View
                className="flex-row items-center rounded-2xl px-4"
                style={{
                  backgroundColor: themed.surface,
                  height: hp(6.5),
                }}
              >
                <UserIcon color={themed.muted} />
                <TextInput
                  placeholder="Ví dụ: Nguyễn Minh Anh"
                  placeholderTextColor={themed.muted}
                  value={form.fullName}
                  onChangeText={(value) => handleFieldChange("fullName", value)}
                  onBlur={() => validateField("fullName")}
                  style={{
                    flex: 1,
                    marginLeft: 12,
                    color: themed.text,
                    fontFamily: "SpaceGroteskMedium",
                    fontSize: wp(3.6),
                  }}
                />
              </View>
              {fieldErrors.fullName ? (
                <Text
                  style={{
                    marginTop: hp(0.5),
                    fontSize: wp(3),
                    color: themed.danger,
                    fontFamily: "SpaceGroteskSemiBold",
                  }}
                >
                  {fieldErrors.fullName}
                </Text>
              ) : null}
            </View>

            <View>
              <Text
                style={{
                  fontSize: wp(3.4),
                  fontFamily: "SpaceGroteskMedium",
                  color: themed.muted,
                  marginBottom: hp(0.8),
                }}
              >
                Giới tính
              </Text>
              <View className="flex-row gap-3">
                {GENDERS.map(({ label, value }) => {
                  const selected = form.gender === value;
                  return (
                    <TouchableOpacity
                      key={value}
                      className="flex-row items-center px-4 py-2 rounded-full"
                      style={{
                        backgroundColor: selected
                          ? "#F26322"
                          : themed.surface,
                        borderWidth: selected ? 0 : 1,
                        borderColor: themed.border,
                      }}
                      onPress={() => handleFieldChange("gender", value)}
                    >
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          marginRight: 8,
                          backgroundColor: selected ? "#fff" : themed.muted,
                        }}
                      />
                      <Text
                        style={{
                          color: selected ? "#fff" : themed.text,
                          fontFamily: "SpaceGroteskSemiBold",
                          fontSize: wp(3.2),
                        }}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View>
              <Text
                style={{
                  fontSize: wp(3.4),
                  fontFamily: "SpaceGroteskMedium",
                  color: themed.muted,
                  marginBottom: hp(0.8),
                }}
              >
                Ngày sinh (YYYY-MM-DD)
              </Text>
              <View
                className="flex-row items-center rounded-2xl px-4"
                style={{
                  backgroundColor: themed.surface,
                  height: hp(6.5),
                }}
              >
                <PencilSquareIcon color={themed.muted} />
                <TextInput
                  placeholder="Ví dụ: 1995-08-19"
                  placeholderTextColor={themed.muted}
                  value={form.birthDate}
                  onChangeText={(value) => handleFieldChange("birthDate", value)}
                  onBlur={() => validateField("birthDate")}
                  style={{
                    flex: 1,
                    marginLeft: 12,
                    color: themed.text,
                    fontFamily: "SpaceGroteskMedium",
                    fontSize: wp(3.6),
                  }}
                />
              </View>
              {fieldErrors.birthDate ? (
                <Text
                  style={{
                    marginTop: hp(0.5),
                    fontSize: wp(3),
                    color: themed.danger,
                    fontFamily: "SpaceGroteskSemiBold",
                  }}
                >
                  {fieldErrors.birthDate}
                </Text>
              ) : null}
            </View>

            <View>
              <Text
                style={{
                  fontSize: wp(3.4),
                  fontFamily: "SpaceGroteskMedium",
                  color: themed.muted,
                  marginBottom: hp(0.8),
                }}
              >
                Nghề nghiệp
              </Text>
              <View
                className="flex-row items-center rounded-2xl px-4"
                style={{
                  backgroundColor: themed.surface,
                  height: hp(6.5),
                }}
              >
                <BriefcaseIcon color={themed.muted} />
                <TextInput
                  placeholder="Ví dụ: Nhà thiết kế UI/UX"
                  placeholderTextColor={themed.muted}
                  value={form.job}
                  onChangeText={(value) => handleFieldChange("job", value)}
                  style={{
                    flex: 1,
                    marginLeft: 12,
                    color: themed.text,
                    fontFamily: "SpaceGroteskMedium",
                    fontSize: wp(3.6),
                  }}
                />
              </View>
            </View>

            <View>
              <Text
                style={{
                  fontSize: wp(3.4),
                  fontFamily: "SpaceGroteskMedium",
                  color: themed.muted,
                  marginBottom: hp(0.8),
                }}
              >
                Tiểu sử
              </Text>
              <View
                className="rounded-2xl px-4 py-3"
                style={{ backgroundColor: themed.surface }}
              >
                <TextInput
                  placeholder="Chia sẻ đôi chút về bạn..."
                  placeholderTextColor={themed.muted}
                  value={form.bio}
                  onChangeText={(value) => handleFieldChange("bio", value)}
                  style={{
                    color: themed.text,
                    fontFamily: "SpaceGroteskMedium",
                    fontSize: wp(3.6),
                  }}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>

            <View>
              <Text
                style={{
                  fontSize: wp(3.4),
                  fontFamily: "SpaceGroteskMedium",
                  color: themed.muted,
                  marginBottom: hp(0.8),
                }}
              >
                Sở thích (mỗi mục cách nhau bằng dấu phẩy)
              </Text>
              <View
                className="rounded-2xl px-4 py-3"
                style={{ backgroundColor: themed.surface }}
              >
                <TextInput
                  placeholder="Ví dụ: Du lịch, Cafe, Phim ảnh"
                  placeholderTextColor={themed.muted}
                  value={form.interests}
                  onChangeText={(value) => handleFieldChange("interests", value)}
                  style={{
                    color: themed.text,
                    fontFamily: "SpaceGroteskMedium",
                    fontSize: wp(3.6),
                  }}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>

            {errorMessage ? (
              <Text
                style={{
                  marginTop: hp(1),
                  fontSize: wp(3.2),
                  color: themed.danger,
                  fontFamily: "SpaceGroteskSemiBold",
                  textAlign: "center",
                }}
              >
                {errorMessage}
              </Text>
            ) : null}

            {successMessage ? (
              <Text
                style={{
                  marginTop: hp(1),
                  fontSize: wp(3.2),
                  color: themed.success,
                  fontFamily: "SpaceGroteskSemiBold",
                  textAlign: "center",
                }}
              >
                {successMessage}
              </Text>
            ) : null}

            <TouchableOpacity
              className="items-center justify-center rounded-2xl"
              style={{
                backgroundColor: "#F26322",
                paddingVertical: hp(1.9),
                opacity: saving ? 0.7 : 1,
              }}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text
                  style={{
                    fontSize: wp(4),
                    color: "#ffffff",
                    fontFamily: "SpaceGroteskSemiBold",
                  }}
                >
                  Lưu hồ sơ
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
