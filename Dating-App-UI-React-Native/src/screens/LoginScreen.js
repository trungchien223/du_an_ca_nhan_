import React, { useCallback, useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StatusBar,
  Image,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useColorScheme } from "nativewind";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import {
  ArrowLeftIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  PhoneIcon,
} from "react-native-heroicons/outline";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
WebBrowser.maybeCompleteAuthSession();
import { login, googleLogin } from "../services/authService";
import { getProfileByAccountId } from "../services/profileService";
import { loginSchema } from "../utils/validationSchemas";
import { ValidationError } from "yup";

// ✅ ép cố định redirect URI cũ
const redirectUri = "https://auth.expo.io/@trungchien/datingapp";
console.log("🔁 Redirect URI (cố định):", redirectUri);


export default function LoginScreen() {
  const navigation = useNavigation();
  const { colorScheme } = useColorScheme();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({
    phone: "",
    password: "",
  });
  const passwordInputRef = useRef(null);

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: "402424218465-lsbblq7u0e68n8q1q5q2jo0olru85kpr.apps.googleusercontent.com",
    webClientId: "402424218465-dm02q0vkgakpd2a75as6506i77f1n4qc.apps.googleusercontent.com",
    expoClientId: "402424218465-dm02q0vkgakpd2a75as6506i77f1n4qc.apps.googleusercontent.com",
    androidClientId:"402424218465-dm02q0vkgakpd2a75as6506i77f1n4qc.apps.googleusercontent.com",
    scopes: ["openid", "profile", "email"],
    redirectUri,
  });



  useEffect(() => {
    if (response?.type === "success") {
      const idToken = response.authentication?.idToken; // 👈 dùng idToken, không phải accessToken
      if (idToken) {
        console.log("🎟️ Google ID token:", idToken);
        handleGoogleLogin(idToken);
      } else {
        console.warn("⚠️ Không nhận được idToken từ Google response:", response);
      }
    }
  }, [response]);


  // 🎨 Font
  const [fontsLoaded, fontError] = useFonts({
    SpaceGroteskSemiBold: require("../font/SpaceGrotesk-SemiBold.ttf"),
    SpaceGroteskBold: require("../font/SpaceGrotesk-Bold.ttf"),
    SpaceGroteskMedium: require("../font/SpaceGrotesk-Medium.ttf"),
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) await SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded) return null;

  const isDark = colorScheme === "dark";
  const backgroundColor = isDark ? "#0f172a" : "#ffffff";
  const surfaceColor = isDark
    ? "rgba(148,163,184,0.12)"
    : "rgba(15,23,42,0.06)";
  const textColor = isDark ? "#f8fafc" : "#0f172a";
  const mutedColor = isDark ? "#94a3b8" : "#64748b";
  const dangerColor = isDark ? "#fca5a5" : "#ef4444";

  const setFieldError = (field, message) => {
    setFieldErrors((prev) => ({
      ...prev,
      [field]: message,
    }));
  };

  const clearFieldError = (field) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
    if (errorMessage) {
      setErrorMessage("");
    }
  };

  const validateCredentials = async () => {
    try {
      const result = await loginSchema.validate(
        { phone, password },
        { abortEarly: false }
      );
      setFieldErrors({
        phone: "",
        password: "",
      });
      return result;
    } catch (error) {
      if (error instanceof ValidationError) {
        const nextErrors = {
          phone: "",
          password: "",
        };
        error.inner.forEach((issue) => {
          if (issue.path && nextErrors[issue.path] === "") {
            nextErrors[issue.path] = issue.message;
          }
        });
        setFieldErrors(nextErrors);
      } else {
        setErrorMessage("Thông tin đăng nhập không hợp lệ.");
      }
      return null;
    }
  };

  const handleFieldBlur = async (field) => {
    try {
      await loginSchema.validateAt(field, { phone, password });
      setFieldError(field, "");
    } catch (error) {
      if (error instanceof ValidationError) {
        setFieldError(field, error.message);
      }
    }
  };

  const handleGoogleLogin = async (accessToken) => {
    try {
      setLoading(true);
      setErrorMessage("");

      // 👇 Gửi token Google về backend
      const data = await googleLogin(accessToken);

      // ✅ Lưu tài khoản và điều hướng
      const accountId = data?.account?.accountId;
      if (!accountId) throw new Error("Không xác định được tài khoản.");

      const profile = await getProfileByAccountId(accountId);
      if (!profile?.profileCompleted) {
        navigation.reset({
          index: 0,
          routes: [{ name: "CompleteProfile", params: { accountId } }],
        });
        return;
      }

      navigation.reset({ index: 0, routes: [{ name: "HomeTabs" }] });
    } catch (error) {
      console.error("🚨 Lỗi login Google:", error.message);
      setErrorMessage(error.message || "Đăng nhập Google thất bại.");
    } finally {
      setLoading(false);
    }
  };

  // 🧩 Login thường
  const handleLogin = async () => {
    if (loading) return;
    setErrorMessage("");
    const validated = await validateCredentials();
    if (!validated) {
      return;
    }

    try {
      setLoading(true);
      const { phone: normalizedPhone, password: normalizedPassword } = validated;
      const authData = await login({
        phone: normalizedPhone,
        password: normalizedPassword,
      });
      const accountId = authData?.account?.accountId;
      if (!accountId) throw new Error("Không xác định được tài khoản.");
      const profile = await getProfileByAccountId(accountId);
      if (!profile?.profileCompleted) {
        navigation.reset({
          index: 0,
          routes: [{ name: "CompleteProfile", params: { accountId } }],
        });
        return;
      }
      navigation.reset({ index: 0, routes: [{ name: "HomeTabs" }] });
    } catch (error) {
      setErrorMessage(error.message || "Đăng nhập thất bại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor, width: wp(100) }}
      onLayout={onLayoutRootView}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="flex-1 justify-between px-8 pb-10">
          {/* Header */}
          <View>
            <TouchableOpacity
              className="mb-6 h-12 w-12 items-center justify-center rounded-full border"
              style={{
                borderColor: isDark
                  ? "rgba(148,163,184,0.3)"
                  : "rgba(15,23,42,0.1)",
              }}
              onPress={() => navigation.goBack()}
            >
              <ArrowLeftIcon
                size={24}
                strokeWidth={2}
                color={isDark ? "#f8fafc" : "#0f172a"}
              />
            </TouchableOpacity>

            <Image
              source={require("../../assets/HeartIcon.png")}
              style={{
                width: wp(32),
                height: hp(15),
                resizeMode: "contain",
              }}
            />

            <Text
              className="mt-2 font-bold"
              style={{
                fontSize: wp(7),
                color: textColor,
                fontFamily: "SpaceGroteskBold",
              }}
            >
              Đăng nhập để tiếp tục
            </Text>
          </View>

          {/* Inputs */}
          <View className="mt-8">
            <View className="mb-5">
              <Text className="mb-3" style={{ color: mutedColor }}>
                Số điện thoại
              </Text>
              <View
                className="flex-row items-center rounded-2xl px-4"
                style={{
                  backgroundColor: surfaceColor,
                  paddingVertical: hp(1.8),
                }}
              >
                <PhoneIcon size={22} color={mutedColor} />
                <TextInput
                  value={phone}
                  onChangeText={(value) => {
                    clearFieldError("phone");
                    setPhone(value);
                  }}
                  onBlur={() => handleFieldBlur("phone")}
                  placeholder="Nhập số điện thoại"
                  placeholderTextColor={mutedColor}
                  keyboardType="phone-pad"
                  style={{
                    flex: 1,
                    marginLeft: 12,
                    fontSize: wp(4),
                    color: textColor,
                  }}
                />
              </View>
              {fieldErrors.phone ? (
                <Text
                  style={{
                    marginTop: hp(0.8),
                    fontSize: wp(3.2),
                    color: dangerColor,
                    fontFamily: "SpaceGroteskSemiBold",
                  }}
                >
                  {fieldErrors.phone}
                </Text>
              ) : null}
            </View>

            <View>
              <Text className="mb-3" style={{ color: mutedColor }}>
                Mật khẩu
              </Text>
              <View
                className="flex-row items-center rounded-2xl px-4"
                style={{
                  backgroundColor: surfaceColor,
                  paddingVertical: hp(1.8),
                }}
              >
                <LockClosedIcon size={22} color={mutedColor} />
                <TextInput
                  ref={passwordInputRef}
                  value={password}
                  onChangeText={(value) => {
                    clearFieldError("password");
                    setPassword(value);
                  }}
                  onBlur={() => handleFieldBlur("password")}
                  placeholder="Nhập mật khẩu"
                  placeholderTextColor={mutedColor}
                  secureTextEntry={!passwordVisible}
                  style={{
                    flex: 1,
                    marginLeft: 12,
                    fontSize: wp(4),
                    color: textColor,
                  }}
                />
                <TouchableOpacity
                  onPress={() => setPasswordVisible(!passwordVisible)}
                >
                  {passwordVisible ? (
                    <EyeSlashIcon size={22} color={mutedColor} />
                  ) : (
                    <EyeIcon size={22} color={mutedColor} />
                  )}
                </TouchableOpacity>
              </View>
              {fieldErrors.password ? (
                <Text
                  style={{
                    marginTop: hp(0.8),
                    fontSize: wp(3.2),
                    color: dangerColor,
                    fontFamily: "SpaceGroteskSemiBold",
                  }}
                >
                  {fieldErrors.password}
                </Text>
              ) : null}
            </View>
          </View>

          {errorMessage ? (
            <Text
              style={{
                marginTop: hp(1.5),
                fontSize: wp(3.4),
                color: dangerColor,
                fontFamily: "SpaceGroteskSemiBold",
                textAlign: "center",
              }}
            >
              {errorMessage}
            </Text>
          ) : null}

          {/* Buttons */}
          <View>
            <TouchableOpacity
              className="items-center justify-center rounded-2xl"
              style={{
                backgroundColor: "#F26322",
                paddingVertical: hp(1.9),
                opacity: loading ? 0.7 : 1,
              }}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-semibold">Đăng nhập</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => promptAsync()}
              className="flex-row items-center justify-center mt-4 rounded-2xl border border-gray-300 py-3"
              style={{ backgroundColor: isDark ? "#1e293b" : "#ffffff" }}
            >
              <Image
                source={{
                  uri: "https://developers.google.com/identity/images/g-logo.png",
                }}
                style={{ width: 20, height: 20, marginRight: 10 }}
              />
              <Text
                style={{
                  color: textColor,
                  fontFamily: "SpaceGroteskSemiBold",
                  fontSize: wp(3.8),
                }}
              >
                Đăng nhập bằng Google
              </Text>
            </TouchableOpacity>


            {/* Register Link */}
            <View className="mt-6 flex-row justify-center">
              <Text
                style={{
                  fontSize: wp(3.4),
                  color: mutedColor,
                  fontFamily: "SpaceGroteskMedium",
                }}
              >
                Bạn chưa có tài khoản?
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Register")}>
                <Text
                  style={{
                    marginLeft: 6,
                    fontSize: wp(3.4),
                    color: "#F26322",
                    fontFamily: "SpaceGroteskSemiBold",
                  }}
                >
                  Đăng ký ngay
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
