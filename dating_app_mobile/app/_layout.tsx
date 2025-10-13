import AsyncStorage from '@react-native-async-storage/async-storage';
import { Slot, useRouter, useSegments } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function RootLayout() {
    const [ready, setReady] = useState(false);
    const [loggedIn, setLoggedIn] = useState(false);

    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        const init = async () => {
            const token = await AsyncStorage.getItem('token');
            setLoggedIn(!!token);
            setReady(true);
        };
        init();
    }, []);

    useEffect(() => {
        if (!ready) return; // chưa load xong token thì không điều hướng
        const inAuthGroup = segments[0] === '(auth)';

        if (!loggedIn && !inAuthGroup) {
            router.replace('/(auth)/login');
        } else if (loggedIn && inAuthGroup) {
            router.replace('/');
        }
    }, [ready, loggedIn, segments]);

    if (!ready) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#e91e63" />
            </View>
        );
    }

    return <Slot />;
}
