import React from 'react';
import { StyleSheet, Text as RNText, View } from 'react-native';
import Ionicons from "@react-native-vector-icons/ionicons/static";
import { fontFamily } from '@/core/theme';

export interface CustomToastProps {
    message: string;
    subMessage?: string;
    type: 'success' | 'error';
}

export const CustomToast = ({ message, subMessage, type }: CustomToastProps) => {
    const icon = type === 'success' ? 'checkmark-circle' : 'close-circle';

    return (
        <View style={styles.container}>
            <View style={styles.iconBox}>
                <Ionicons name={icon} size={20} color="#fff" />
            </View>
            <View style={styles.content}>
                <RNText style={styles.title}>{message}</RNText>
                {subMessage && <RNText style={styles.message}>{subMessage}</RNText>}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconBox: {
        width: 30,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: { flex: 1, gap: 2 },
    title: { fontSize: 14, fontWeight: '600', color: '#fff', fontFamily },
    message: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily },
});
