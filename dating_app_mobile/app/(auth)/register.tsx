import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function RegisterScreen() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        password: '',
        confirmPassword: '',
        age: '',
        gender: '',
        bio: ''
    });

    const [errors, setErrors] = useState<{[key: string]: string}>({});

    const validateForm = () => {
        const newErrors: {[key: string]: string} = {};

        // Validate name
        if (!formData.name.trim()) {
            newErrors.name = 'Vui lòng nhập họ tên';
        } else if (formData.name.trim().length < 2) {
            newErrors.name = 'Họ tên phải có ít nhất 2 ký tự';
        }

        // Validate phone
        if (!formData.phone.trim()) {
            newErrors.phone = 'Vui lòng nhập số điện thoại';
        } else if (!/^[0-9]{10,11}$/.test(formData.phone.replace(/\s/g, ''))) {
            newErrors.phone = 'Số điện thoại không hợp lệ';
        }

        // Validate email
        if (!formData.email.trim()) {
            newErrors.email = 'Vui lòng nhập email';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Email không hợp lệ';
        }

        // Validate password
        if (!formData.password) {
            newErrors.password = 'Vui lòng nhập mật khẩu';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
        }

        // Validate confirm password
        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu';
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
        }

        // Validate age
        if (!formData.age) {
            newErrors.age = 'Vui lòng nhập tuổi';
        } else {
            const age = parseInt(formData.age);
            if (isNaN(age) || age < 18 || age > 100) {
                newErrors.age = 'Tuổi phải từ 18 đến 100';
            }
        }

        // Validate gender
        if (!formData.gender) {
            newErrors.gender = 'Vui lòng chọn giới tính';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleRegister = async () => {
        if (!validateForm()) {
            return;
        }

        try {
            // Lưu thông tin user vào AsyncStorage (trong thực tế sẽ gửi lên server)
            const userData = {
                id: Date.now().toString(),
                name: formData.name.trim(),
                phone: formData.phone.trim(),
                email: formData.email.trim(),
                age: parseInt(formData.age),
                gender: formData.gender,
                bio: formData.bio.trim(),
                createdAt: new Date().toISOString()
            };

            // Lưu user data và token
            await AsyncStorage.setItem('userData', JSON.stringify(userData));
            await AsyncStorage.setItem('token', `token_${userData.id}`);

            Alert.alert(
                'Đăng ký thành công! 🎉',
                `Chào mừng ${formData.name} đến với Dating App!`,
                [
                    {
                        text: 'OK',
                        onPress: () => router.replace('/')
                    }
                ]
            );
        } catch (error) {
            Alert.alert('Lỗi', 'Có lỗi xảy ra khi đăng ký. Vui lòng thử lại!');
        }
    };

    const updateFormData = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>💘 Tạo tài khoản 💘</Text>
            <Text style={styles.subtitle}>Hãy điền thông tin để bắt đầu hành trình tìm kiếm tình yêu!</Text>

            <View style={styles.form}>
                {/* Name */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Họ và tên *</Text>
                    <TextInput
                        style={[styles.input, errors.name && styles.inputError]}
                        placeholder="Nhập họ và tên"
                        value={formData.name}
                        onChangeText={(value) => updateFormData('name', value)}
                    />
                    {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                </View>

                {/* Phone */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Số điện thoại *</Text>
                    <TextInput
                        style={[styles.input, errors.phone && styles.inputError]}
                        placeholder="Nhập số điện thoại"
                        keyboardType="phone-pad"
                        value={formData.phone}
                        onChangeText={(value) => updateFormData('phone', value)}
                    />
                    {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
                </View>

                {/* Email */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email *</Text>
                    <TextInput
                        style={[styles.input, errors.email && styles.inputError]}
                        placeholder="Nhập email"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={formData.email}
                        onChangeText={(value) => updateFormData('email', value)}
                    />
                    {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                </View>

                {/* Password */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Mật khẩu *</Text>
                    <TextInput
                        style={[styles.input, errors.password && styles.inputError]}
                        placeholder="Nhập mật khẩu"
                        secureTextEntry
                        value={formData.password}
                        onChangeText={(value) => updateFormData('password', value)}
                    />
                    {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                </View>

                {/* Confirm Password */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Xác nhận mật khẩu *</Text>
                    <TextInput
                        style={[styles.input, errors.confirmPassword && styles.inputError]}
                        placeholder="Nhập lại mật khẩu"
                        secureTextEntry
                        value={formData.confirmPassword}
                        onChangeText={(value) => updateFormData('confirmPassword', value)}
                    />
                    {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
                </View>

                {/* Age */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Tuổi *</Text>
                    <TextInput
                        style={[styles.input, errors.age && styles.inputError]}
                        placeholder="Nhập tuổi"
                        keyboardType="numeric"
                        value={formData.age}
                        onChangeText={(value) => updateFormData('age', value)}
                    />
                    {errors.age && <Text style={styles.errorText}>{errors.age}</Text>}
                </View>

                {/* Gender */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Giới tính *</Text>
                    <View style={styles.genderContainer}>
                        <TouchableOpacity
                            style={[
                                styles.genderButton,
                                formData.gender === 'Nam' && styles.genderButtonSelected
                            ]}
                            onPress={() => updateFormData('gender', 'Nam')}
                        >
                            <Text style={[
                                styles.genderText,
                                formData.gender === 'Nam' && styles.genderTextSelected
                            ]}>Nam</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.genderButton,
                                formData.gender === 'Nữ' && styles.genderButtonSelected
                            ]}
                            onPress={() => updateFormData('gender', 'Nữ')}
                        >
                            <Text style={[
                                styles.genderText,
                                formData.gender === 'Nữ' && styles.genderTextSelected
                            ]}>Nữ</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.genderButton,
                                formData.gender === 'Khác' && styles.genderButtonSelected
                            ]}
                            onPress={() => updateFormData('gender', 'Khác')}
                        >
                            <Text style={[
                                styles.genderText,
                                formData.gender === 'Khác' && styles.genderTextSelected
                            ]}>Khác</Text>
                        </TouchableOpacity>
                    </View>
                    {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}
                </View>

                {/* Bio */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Giới thiệu bản thân</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Hãy giới thiệu về bản thân..."
                        multiline
                        numberOfLines={3}
                        value={formData.bio}
                        onChangeText={(value) => updateFormData('bio', value)}
                    />
                </View>

                <TouchableOpacity style={styles.button} onPress={handleRegister}>
                    <Text style={styles.buttonText}>Tạo tài khoản</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.link}>Đã có tài khoản? Đăng nhập ngay</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#e91e63',
        textAlign: 'center',
        marginTop: 20,
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 30,
        paddingHorizontal: 10,
    },
    form: {
        paddingBottom: 20,
    },
    inputGroup: {
        marginBottom: 15,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 5,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#f9f9f9',
    },
    inputError: {
        borderColor: '#ff4444',
        backgroundColor: '#fff5f5',
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    errorText: {
        color: '#ff4444',
        fontSize: 12,
        marginTop: 5,
    },
    genderContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    genderButton: {
        flex: 1,
        padding: 12,
        marginHorizontal: 5,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
    },
    genderButtonSelected: {
        backgroundColor: '#e91e63',
        borderColor: '#e91e63',
    },
    genderText: {
        fontSize: 16,
        color: '#666',
    },
    genderTextSelected: {
        color: '#fff',
        fontWeight: '600',
    },
    button: {
        backgroundColor: '#e91e63',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 15,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    link: {
        color: '#e91e63',
        textAlign: 'center',
        fontSize: 14,
        marginBottom: 20,
    },
});
