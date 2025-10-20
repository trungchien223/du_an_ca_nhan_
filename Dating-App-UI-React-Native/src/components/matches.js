import React from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";

const fallbackAvatar = require("../../assets/images/profile.jpg");

export default function Matches({ profiles = [], loading = false, onPress }) {
  if (loading) {
    return (
      <View
        className="mt-4 items-center justify-center"
        style={{ height: hp(8) }}
      >
        <ActivityIndicator size="small" color="#F26322" />
      </View>
    );
  }

  if (!profiles.length) {
    return null;
  }

  return (
    <View className="mt-4">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: hp(2),
        }}
      >
        {profiles.map((profile) => {
          const name =
            profile?.displayName ?? profile?.fullName ?? profile?.name ?? "";
          const age = profile?.age ?? null;
          const avatar = profile?.avatarUrl
            ? { uri: profile.avatarUrl }
            : fallbackAvatar;

          return (
            <TouchableOpacity
              key={profile?.id ?? name}
              className="flex items-center mr-4"
              onPress={() => onPress?.(profile)}
            >
              <View className="rounded-full overflow-hidden">
                <Image
                  source={avatar}
                  style={{
                    width: hp(6),
                    height: hp(6),
                  }}
                  resizeMode="cover"
                />
              </View>
              {!!name && (
                <Text
                  className="text-neutral-800 font-bold mt-2"
                  style={{
                    fontSize: hp(1.6),
                  }}
                  numberOfLines={1}
                >
                  {name}
                </Text>
              )}
              {age ? (
                <Text
                  className="text-neutral-500 font-semibold"
                  style={{ fontSize: hp(1.5) }}
                >
                  {age}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
