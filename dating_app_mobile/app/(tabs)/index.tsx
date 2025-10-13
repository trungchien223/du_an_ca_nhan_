import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getProfile } from "../../src/api/userService";


export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🧠 Kiểm tra token + tải dữ liệu user
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        const userId = await AsyncStorage.getItem("userId"); // nếu bạn lưu userId khi login

        if (!token || !userId) {
          router.replace("/(auth)/login");
          return;
        }

        const data = await getProfile(userId, token);
        setUser(data);
      } catch (err) {
        console.error("❌ Lỗi khi tải thông tin người dùng:", err.message);
        Alert.alert("Lỗi", "Không thể tải thông tin người dùng.");
        router.replace("/(auth)/login");
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  if (loading)
    return (
        <View style={styles.container}>
          <ActivityIndicator size="large" color="#e91e63" />
        </View>
    );

  return (
      <View style={styles.container}>
        <Text style={styles.title}>💖 Welcome to My Dating App 💖</Text>
        <Text style={styles.subtitle}>Your journey to love starts here!</Text>

        {user && <Text style={styles.user}>Xin chào, {user.fullName}! ❤️</Text>}

        <TouchableOpacity
            style={[styles.button, { backgroundColor: "#e91e63" }]}
            onPress={() => Alert.alert("Tính năng đang phát triển!")}
        >
          <Text style={styles.buttonText}>Khám phá người mới</Text>
        </TouchableOpacity>

        <TouchableOpacity
            style={[styles.button, { marginTop: 15, backgroundColor: "#888" }]}
            onPress={async () => {
              await AsyncStorage.removeItem("token");
              await AsyncStorage.removeItem("userId");
              router.replace("/(auth)/login");
            }}
        >
          <Text style={styles.buttonText}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", padding: 20 },
  title: { fontSize: 22, fontWeight: "bold", color: "#e91e63", marginBottom: 10 },
  subtitle: { fontSize: 16, color: "#555", marginBottom: 20 },
  user: { fontSize: 18, color: "#333", marginBottom: 20 },
  button: { paddingVertical: 12, paddingHorizontal: 25, borderRadius: 10 },
  buttonText: { color: "#fff", fontWeight: "bold" },
});
