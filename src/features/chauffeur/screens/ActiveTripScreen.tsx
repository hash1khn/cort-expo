import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { CortButton, CortCard } from '../../../components';
import { colors, radii, typography } from '../../../core/theme';

export function ActiveTripScreen() {
    const navigation = useNavigation();

    return (
        <View style={styles.root}>
            {/* Map Background */}
            <MapView
                style={StyleSheet.absoluteFill}
                initialRegion={{
                    latitude: 37.618, // SFO roughly
                    longitude: -122.375,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }}
                showsUserLocation
            />

            {/* Back Button */}
            <SafeAreaView style={styles.topContainer} edges={['top', 'left', 'right']}>
                <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={colors.white} />
                </Pressable>
            </SafeAreaView>

            {/* Bottom Sheet Details */}
            <View style={styles.bottomSheet}>
                <View style={styles.grabber} />

                <View style={styles.header}>
                    <Text style={styles.status}>ON THE WAY TO PICKUP</Text>
                    <Text style={styles.time}>2:30 PM</Text>
                </View>

                <CortCard style={styles.card}>
                    <View style={styles.passengerRow}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>S</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.name}>Sarah Jenkins</Text>
                            <Text style={styles.rating}>★ 4.9 • Corporate</Text>
                        </View>
                        <View style={styles.icons}>
                            <View style={styles.iconCircle}><Ionicons name="call" size={20} color={colors.navy} /></View>
                            <View style={styles.iconCircle}><Ionicons name="chatbubble" size={20} color={colors.navy} /></View>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.locationRow}>
                        <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
                        <Text style={styles.address}>SFO Terminal 2</Text>
                    </View>
                </CortCard>

                <CortButton
                    title="Arrived at Pickup"
                    variant="primary"
                    onPress={() => alert('Arrived!')}
                    
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.white },
    topContainer: { paddingHorizontal: 16 },
    backBtn: {
        width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.4)',
        alignItems: 'center', justifyContent: 'center',
    },
    bottomSheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: colors.white,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 20, paddingTop: 10,
        shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 10,
    },
    grabber: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' },
    status: { fontFamily: typography.family.semibold, fontSize: 11, color: '#0EA5E9', letterSpacing: 0.5 },
    time: { fontFamily: typography.family.semibold, fontSize: 16, color: colors.text },
    card: { padding: 16, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
    passengerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontFamily: typography.family.semibold, fontSize: 18, color: colors.navy },
    name: { fontFamily: typography.family.semibold, fontSize: 16, color: colors.text },
    rating: { fontFamily: typography.family.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
    icons: { flexDirection: 'row', gap: 10, marginLeft: 10 },
    iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
    divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 16 },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    address: { fontFamily: typography.family.medium, fontSize: 15, color: colors.text },
    mainBtn: { height: 50 },
});
