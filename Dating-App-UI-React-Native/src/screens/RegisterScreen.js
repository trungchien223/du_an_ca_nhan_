import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
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
  ArrowLeftIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  PhoneIcon,
  EnvelopeIcon,
} from "react-native-heroicons/outline";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { register } from "../services/authService";
import { registerSchema } from "../utils/validationSchemas";
import { ValidationError } from "yup";

export default function RegisterScreen() {
  const navigation = useNavigation();
  const { colorScheme } = useColorScheme();
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [fontsLoaded, fontError] = useFonts({
    SpaceGroteskSemiBold: require("../font/SpaceGrotesk-SemiBold.ttf"),
    SpaceGroteskBold: require("../font/SpaceGrotesk-Bold.ttf"),
    SpaceGroteskMedium: require("../font/SpaceGrotesk-Medium.ttf"),
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded) {
    return null;
  }

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

  const validateForm = async () => {
    try {
      const result = await registerSchema.validate(
        { phone, email, password, confirmPassword },
        { abortEarly: false }
      );
      setFieldErrors({
        phone: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
      return result;
    } catch (error) {
      if (error instanceof ValidationError) {
        const nextErrors = {
          phone: "",
          email: "",
          password: "",
          confirmPassword: "",
        };
        error.inner.forEach((issue) => {
          if (issue.path && nextErrors[issue.path] === "") {
            nextErrors[issue.path] = issue.message;
          }
        });
        setFieldErrors(nextErrors);
      } else {
        setErrorMessage("Thông tin không hợp lệ, vui lòng kiểm tra lại.");
      }
      return null;
    }
  };

  const handleFieldBlur = async (field) => {
    try {
      await registerSchema.validateAt(field, {
        phone,
        email,
        password,
        confirmPassword,
      });
      setFieldError(field, "");
    } catch (error) {
      if (error instanceof ValidationError) {
        setFieldError(field, error.message);
      }
    }
  };

  const handleRegister = async () => {
    if (loading) {
      return;
    }

    setErrorMessage("");

    const result = await validateForm();
    if (!result) {
      return;
    }

    try {
      setLoading(true);
      const response = await register({
        phone: result.phone,
        email: result.email ?? undefined,
        password: result.password,
      });
      navigation.reset({
        index: 0,
        routes: [
          {
            name: "CompleteProfile",
            params: {
              accountId: response?.account?.accountId,
            },
          },
        ],
      });
    } catch (error) {
      setErrorMessage(error.message || "Đăng ký thất bại, vui lòng thử lại.");
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
        <View className="flex-1 px-6 pt-4">
          <TouchableOpacity
            className="self-start p-2 rounded-full"
            style={{ backgroundColor: surfaceColor }}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeftIcon color={textColor} />
          </TouchableOpacity>

          <View className="items-center mt-6">
            <Image
              source={require("../../assets/HeartIcon.png")}
              style={{
                width: wp(40),
                height: hp(18),
                resizeMode: "contain",
              }}
            />
            <Text
              style={{
                marginTop: hp(1.5),
                fontSize: wp(6.2),
                color: textColor,
                fontFamily: "SpaceGroteskBold",
              }}
            >
              Tạo tài khoản mới
            </Text>
            <Text
              style={{
                marginTop: hp(0.8),
                fontSize: wp(3.5),
                color: mutedColor,
                fontFamily: "SpaceGroteskMedium",
                textAlign: "center",
              }}
            >
              Nhập thông tin của bạn để bắt đầu trải nghiệm hẹn hò.
            </Text>
          </View>

          <View className="mt-8">
            <View style={{ marginBottom: hp(2) }}>
              <Text
                style={{
                  fontSize: wp(3.2),
                  color: mutedColor,
                  fontFamily: "SpaceGroteskMedium",
                  marginBottom: hp(0.8),
                }}
              >
                Số điện thoại
              </Text>
              <View
                className="flex-row items-center rounded-2xl px-4"
                style={{
                  backgroundColor: surfaceColor,
                  height: hp(6.5),
                }}
              >
                <PhoneIcon color={mutedColor} />
                <TextInput
                  placeholder="Nhập số điện thoại"
                  placeholderTextColor={mutedColor}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={(value) => {
                    clearFieldError("phone");
                    setPhone(value);
                  }}
                  onBlur={() => handleFieldBlur("phone")}
                  style={{
                    flex: 1,
                    marginLeft: 12,
                    color: textColor,
                    fontFamily: "SpaceGroteskMedium",
                    fontSize: wp(3.6),
                  }}
                />
              </View>
              {fieldErrors.phone ? (
                <Text
                  style={{
                    marginTop: hp(0.5),
                    fontSize: wp(3),
                    color: dangerColor,
                    fontFamily: "SpaceGroteskSemiBold",
                  }}
                >
                  {fieldErrors.phone}
                </Text>
              ) : null}
            </View>

            <View style={{ marginBottom: hp(2) }}>
              <Text
                style={{
                  fontSize: wp(3.2),
                  color: mutedColor,
                  fontFamily: "SpaceGroteskMedium",
                  marginBottom: hp(0.8),
                }}
              >
                Email (không bắt buộc)
              </Text>
              <View
                className="flex-row items-center rounded-2xl px-4"
                style={{
                  backgroundColor: surfaceColor,
                  height: hp(6.5),
                }}
              >
                <EnvelopeIcon color={mutedColor} />
                <TextInput
                  placeholder="Nhập email"
                  placeholderTextColor={mutedColor}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={(value) => {
                    clearFieldError("email");
                    setEmail(value);
                  }}
                  onBlur={() => handleFieldBlur("email")}
                  style={{
                    flex: 1,
                    marginLeft: 12,
                    color: textColor,
                    fontFamily: "SpaceGroteskMedium",
                    fontSize: wp(3.6),
                  }}
                />
              </View>
              {fieldErrors.email ? (
                <Text
                  style={{
                    marginTop: hp(0.5),
                    fontSize: wp(3),
                    color: dangerColor,
                    fontFamily: "SpaceGroteskSemiBold",
                  }}
                >
                  {fieldErrors.email}
                </Text>
              ) : null}
            </View>

            <View style={{ marginBottom: hp(2) }}>
              <Text
                style={{
                  fontSize: wp(3.2),
                  color: mutedColor,
                  fontFamily: "SpaceGroteskMedium",
                  marginBottom: hp(0.8),
                }}
              >
                Mật khẩu
              </Text>
              <View
                className="flex-row items-center rounded-2xl px-4"
                style={{
                  backgroundColor: surfaceColor,
                  height: hp(6.5),
                }}
              >
                <LockClosedIcon color={mutedColor} />
                <TextInput
                  placeholder="Nhập mật khẩu"
                  placeholderTextColor={mutedColor}
                  autoCapitalize="none"
                  secureTextEntry={!passwordVisible}
                  value={password}
                  onChangeText={(value) => {
                    clearFieldError("password");
                    setPassword(value);
                  }}
                  onBlur={() => handleFieldBlur("password")}
                  style={{
                    flex: 1,
                    marginLeft: 12,
                    color: textColor,
                    fontFamily: "SpaceGroteskMedium",
                    fontSize: wp(3.6),
                  }}
                />
                <TouchableOpacity
                  onPress={() => setPasswordVisible((prev) => !prev)}
                  hitSlop={10}
                >
                  {passwordVisible ? (
                    <EyeSlashIcon color={mutedColor} />
                  ) : (
                    <EyeIcon color={mutedColor} />
                  )}
                </TouchableOpacity>
              </View>
              {fieldErrors.password ? (
                <Text
                  style={{
                    marginTop: hp(0.5),
                    fontSize: wp(3),
                    color: dangerColor,
                    fontFamily: "SpaceGroteskSemiBold",
                  }}
                >
                  {fieldErrors.password}
                </Text>
              ) : null}
            </View>

            <View style={{ marginBottom: hp(2) }}>
              <Text
                style={{
                  fontSize: wp(3.2),
                  color: mutedColor,
                  fontFamily: "SpaceGroteskMedium",
                  marginBottom: hp(0.8),
                }}
              >
                Xác nhận mật khẩu
              </Text>
              <View
                className="flex-row items-center rounded-2xl px-4"
                style={{
                  backgroundColor: surfaceColor,
                  height: hp(6.5),
                }}
              >
                <LockClosedIcon color={mutedColor} />
                <TextInput
                  placeholder="Nhập lại mật khẩu"
                  placeholderTextColor={mutedColor}
                  autoCapitalize="none"
                  secureTextEntry={!confirmVisible}
                  value={confirmPassword}
                  onChangeText={(value) => {
                    clearFieldError("confirmPassword");
                    setConfirmPassword(value);
                  }}
                  onBlur={() => handleFieldBlur("confirmPassword")}
                  style={{
                    flex: 1,
                    marginLeft: 12,
                    color: textColor,
                    fontFamily: "SpaceGroteskMedium",
                    fontSize: wp(3.6),
                  }}
                />
                <TouchableOpacity
                  onPress={() => setConfirmVisible((prev) => !prev)}
                  hitSlop={10}
                >
                  {confirmVisible ? (
                    <EyeSlashIcon color={mutedColor} />
                  ) : (
                    <EyeIcon color={mutedColor} />
                  )}
                </TouchableOpacity>
              </View>
              {fieldErrors.confirmPassword ? (
                <Text
                  style={{
                    marginTop: hp(0.5),
                    fontSize: wp(3),
                    color: dangerColor,
                    fontFamily: "SpaceGroteskSemiBold",
                  }}
                >
                  {fieldErrors.confirmPassword}
                </Text>
              ) : null}
            </View>
          </View>

          {errorMessage ? (
            <Text
              style={{
                marginTop: hp(2),
                fontSize: wp(3.2),
                color: dangerColor,
                fontFamily: "SpaceGroteskSemiBold",
              }}
            >
              {errorMessage}
            </Text>
          ) : null}

          <View className="mt-auto mb-6">
            <TouchableOpacity
              className="items-center justify-center rounded-2xl"
              style={{
                backgroundColor: "#F26322",
                paddingVertical: hp(1.9),
                opacity: loading ? 0.7 : 1,
              }}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text
                  style={{
                    fontSize: wp(4),
                    color: "#ffffff",
                    fontFamily: "SpaceGroteskSemiBold",
                  }}
                >
                  Đăng ký
                </Text>
              )}
            </TouchableOpacity>

            <View className="mt-6 flex-row justify-center">
              <Text
                style={{
                  fontSize: wp(3.2),
                  color: mutedColor,
                  fontFamily: "SpaceGroteskMedium",
                }}
              >
                Đã có tài khoản?
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                <Text
                  style={{
                    marginLeft: 6,
                    fontSize: wp(3.2),
                    color: "#F26322",
                    fontFamily: "SpaceGroteskSemiBold",
                  }}
                >
                  Đăng nhập ngay
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
