
import React, { useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, radii, shadows, typography } from '../../../core/theme';
import { activeRide, shuttleCoordinates, mockShuttlePolyline } from '../../../data/mockData';

export function EmployeeChauffeurDetailsScreen() {
    const navigation = useNavigation();
    const ride = activeRide;

    // Use the same mock polyline for demo visual
    const routePoints = useMemo(
        () => mockShuttlePolyline.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
        []
    );

    return (
        <View style={styles.root}>
            {/* Map Header */}
            <View style={styles.mapContainer}>
                <MapView
                    style={StyleSheet.absoluteFill}
                    initialRegion={{
                        latitude: shuttleCoordinates.latitude,
                        longitude: shuttleCoordinates.longitude,
                        latitudeDelta: 0.015,
                        longitudeDelta: 0.015,
                    }}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    pitchEnabled={false}
                    rotateEnabled={false}
                    toolbarEnabled={false}
                >
                    <Polyline coordinates={routePoints} strokeWidth={4} strokeColor={colors.navy} />
                    <Marker coordinate={routePoints[routePoints.length - 1]} anchor={{ x: 0.5, y: 0.5 }}>
                        <View style={styles.carMarker}>
                            <MaterialCommunityIcons name="car-side" size={20} color={colors.white} />
                        </View>
                    </Marker>
                    <Marker coordinate={routePoints[0]} anchor={{ x: 0.5, y: 0.5 }}>
                        <View style={styles.pinMarker} />
                    </Marker>
                </MapView>
                <LinearGradient
                    colors={['transparent', 'rgba(255,255,255,1)']}
                    style={styles.mapFade}
                    pointerEvents="none"
                />

                <SafeAreaView style={styles.backButtonSafe}>
                    <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.navy} />
                    </Pressable>
                </SafeAreaView>
            </View>

            {/* Content Body */}
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Status Header */}
                <View style={styles.header}>
                    <Text style={styles.statusLabel}>RIDE IN PROGRESS</Text>
                    <Text style={styles.etaTitle}>Arriving in {ride.etaMinutes} min</Text>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: '60%' }]} />
                    </View>
                </View>

                {/* Driver Card */}
                <View style={styles.card}>
                    <View style={styles.driverRow}>
                        <View style={styles.driverAvatar}>
                            <Text style={styles.driverInitial}>{(ride.driver.name || 'D').charAt(0)}</Text>
                        </View>
                        <View style={styles.driverInfo}>
                            <Text style={styles.driverName}>{ride.driver.name}</Text>
                            <View style={styles.ratingRow}>
                                <Ionicons name="star" size={14} color={colors.orange} />
                                <Text style={styles.ratingText}>{ride.driver.rating}</Text>
                            </View>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={styles.contactBtn}>
                                <Ionicons name="chatbubble" size={20} color={colors.white} />
                            </View>
                            <View style={styles.contactBtn}>
                                <Ionicons name="call" size={20} color={colors.white} />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Vehicle Card */}
                <View style={styles.card}>
                    <Text style={styles.cardLabel}>VEHICLE</Text>
                    <View style={styles.vehicleRow}>
                        <View style={styles.vehicleIcon}>
                            <MaterialCommunityIcons name="car-sports" size={32} color={colors.navy} />
                        </View>
                        <View style={styles.vehicleInfo}>
                            <Text style={styles.vehicleModel}>{ride.car.color} {ride.car.model}</Text>
                            <Text style={styles.plateNumber}>{ride.car.plate}</Text>
                        </View>
                    </View>
                </View>

                {/* Trip Details */}
                <View style={styles.card}>
                    <Text style={styles.cardLabel}>TRIP DETAILS</Text>

                    <View style={styles.locationRow}>
                        <View style={styles.timelineContainer}>
                            <View style={[styles.dot, { backgroundColor: colors.navy }]} />
                            <View style={styles.line} />
                            <View style={[styles.dot, { backgroundColor: colors.orange }]} />
                        </View>
                        <View style={styles.addresses}>
                            <View style={styles.addressBlock}>
                                <Text style={styles.addressLabel}>PICKUP</Text>
                                <Text style={styles.addressText}>{ride.origin.label}</Text>
                            </View>
                            <View style={styles.addressBlockEnd}>
                                <Text style={styles.addressLabel}>DROPOFF</Text>
                                <Text style={styles.addressText}>{ride.destination.label}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Support Link */}
                <Pressable style={styles.supportBtn}>
                    <Text style={styles.supportText}>Report an issue</Text>
                </Pressable>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: colors.bgGrey,
    },
    mapContainer: {
        height: 300,
        width: '100%',
        position: 'relative',
        backgroundColor: colors.white,
    },
    mapFade: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 60,
    },
    backButtonSafe: {
        position: 'absolute',
        left: 16,
        top: 0,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: radii.pill,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.floating,
    },
    carMarker: {
        width: 36,
        height: 36,
        borderRadius: radii.pill,
        backgroundColor: colors.navy,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.white,
        ...shadows.floating,
    },
    pinMarker: {
        width: 16,
        height: 16,
        borderRadius: radii.pill,
        backgroundColor: colors.orange,
        borderWidth: 3,
        borderColor: colors.white,
        ...shadows.floating,
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        marginTop: 20, // overlap map
    },
    header: {
        marginBottom: 20,
        backgroundColor: colors.white,
        padding: 20,
        borderRadius: radii.xl,
        ...shadows.floating,
    },
    statusLabel: {
        fontFamily: typography.family.medium,
        fontSize: 12,
        color: colors.orange,
        letterSpacing: 1,
        marginBottom: 4,
    },
    etaTitle: {
        fontFamily: typography.family.semibold,
        fontSize: 22,
        color: colors.navy,
        marginBottom: 12,
    },
    progressBar: {
        height: 6,
        borderRadius: radii.pill,
        backgroundColor: colors.bgGrey,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.orange,
        borderRadius: radii.pill,
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: radii.xl,
        padding: 20,
        marginBottom: 16,
        ...shadows.floating,
    },
    cardLabel: {
        fontFamily: typography.family.medium,
        fontSize: 11,
        color: colors.muted,
        marginBottom: 16,
        letterSpacing: 0.5,
    },
    driverRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    driverAvatar: {
        width: 56,
        height: 56,
        borderRadius: radii.pill,
        backgroundColor: colors.navy,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    driverInitial: {
        fontFamily: typography.family.semibold,
        fontSize: 20,
        color: colors.white,
    },
    driverInfo: {
        flex: 1,
    },
    driverName: {
        fontFamily: typography.family.semibold,
        fontSize: 18,
        color: colors.text,
        marginBottom: 4,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingText: {
        fontFamily: typography.family.medium,
        fontSize: 13,
        color: colors.muted,
    },
    contactBtn: {
        width: 44,
        height: 44,
        borderRadius: radii.pill,
        backgroundColor: colors.navy,
        alignItems: 'center',
        justifyContent: 'center',
    },
    vehicleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    vehicleIcon: {
        width: 48,
        height: 48,
        borderRadius: radii.lg,
        backgroundColor: colors.bgGrey,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    vehicleInfo: {
        flex: 1,
    },
    vehicleModel: {
        fontFamily: typography.family.semibold,
        fontSize: 16,
        color: colors.text,
        marginBottom: 2,
    },
    plateNumber: {
        fontFamily: typography.family.medium,
        fontSize: 14,
        color: colors.muted,
        textTransform: 'uppercase',
    },
    locationRow: {
        flexDirection: 'row',
    },
    timelineContainer: {
        alignItems: 'center',
        marginRight: 16,
        paddingVertical: 4,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: radii.pill,
    },
    line: {
        flex: 1,
        width: 2,
        backgroundColor: colors.border,
        marginVertical: 4,
    },
    addresses: {
        flex: 1,
        paddingVertical: 2,
    },
    addressBlock: {
        marginBottom: 24,
    },
    addressBlockEnd: {
    },
    addressLabel: {
        fontFamily: typography.family.medium,
        fontSize: 10,
        color: colors.muted,
        marginBottom: 4,
    },
    addressText: {
        fontFamily: typography.family.medium,
        fontSize: 15,
        color: colors.text,
    },
    supportBtn: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    supportText: {
        fontFamily: typography.family.medium,
        fontSize: 14,
        color: colors.muted,
        textDecorationLine: 'underline',
    },
});
