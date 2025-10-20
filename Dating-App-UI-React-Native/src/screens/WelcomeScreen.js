import { View, Text, StatusBar, Image, TouchableOpacity } from "react-native";
import React, { useCallback } from "react";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useColorScheme } from "nativewind";
import { ArrowUpRightIcon } from "react-native-heroicons/outline";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { useNavigation } from "@react-navigation/native";

export default function WelcomeScreen() {
  const { colorScheme } = useColorScheme();
  const navigation = useNavigation();

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

  return (
    <View
      onLayout={onLayoutRootView}
      className="flex-1"
      style={{ width: wp(100) }}
    >
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />

      <View
        className="justify-center items-center"
        style={{
          width: wp(100),
          height: hp(100),
        }}
      >
        {/* Icon trái tim */}
        <View
          className="pt-1 justify-center items-center my-4"
          style={{ width: wp(100) }}
        >
          <Image
            source={require("../../assets/HeartIcon.png")}
            style={{
              width: wp(100),
              height: hp(40),
              resizeMode: "cover",
            }}
          />
        </View>

        {/* Tiêu đề và mô tả */}
        <View className="w-full p-6 px-10">
          <Text
            className="font-semibold tracking-widest leading-none"
            style={{ fontSize: wp(10) }}
          >
            Kết nối
          </Text>

          <Text
            className="font-semibold tracking-widest w-[80%] leading-none"
            style={{ fontSize: wp(10) }}
          >
            Những trái tim đồng điệu
          </Text>

          <Text
            className="text-gray-800 leading-6 tracking-wider w-[70%] mt-3"
            style={{ fontSize: wp(3.5) }}
          >
            Khám phá, trò chuyện và bắt đầu hành trình tình yêu theo cách riêng của bạn.
          </Text>
        </View>

        {/* Nút bắt đầu */}
        <View className="w-full px-10 mt-2">
          <TouchableOpacity
            className="bg-[#F26322] px-4 py-4 rounded-xl flex-row justify-center items-center w-[55%]"
            onPress={() => navigation.navigate("Login")}
          >
            <Text
              className="text-white font-bold mr-2"
              style={{ fontSize: wp(3.5) }}
            >
              Bắt đầu hành trình
            </Text>
            <ArrowUpRightIcon color={"white"} size={20} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* Tagline nhỏ (tùy chọn) */}
        <View className="mt-5">
          <Text
            className="text-neutral-500 italic"
            style={{ fontSize: wp(3.2) }}
          >
            “Tình yêu bắt đầu từ một kết nối nhỏ.”
          </Text>
        </View>
      </View>
    </View>
  );
}
