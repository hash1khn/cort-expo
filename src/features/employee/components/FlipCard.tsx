import React from "react";
import { FlipCard } from "@/shared/ui/base/flip-card";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View, Text } from "react-native";
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { fontFamily } from '@/core/theme';

// Bus station illustration


export default function CorporateShuttleCard() {
    return (
        <View style={styles.safeArea}>
            <View style={styles.cardWrapper}>
                <FlipCard
                    width={370}
                    height={420}
                    animationDuration={700}
                    borderRadius={28}
                    enableHaptics
                    scaleOnPress={true}
                >
                    {/* --- FRONT SIDE --- */}
                    <FlipCard.Front>
                        <View style={styles.frontContainer}>
                            {/* Top brand row */}
                            <View style={styles.brandRow}>
                                {/* <View style={styles.brandIconContainer}>
                                    <MaterialCommunityIcons name="bus" size={18} color="#FFF" />
                                </View> */}
                                <Text style={styles.brandName}>Daily Shuttle</Text>
                            </View>

                            {/* Center illustration */}
                            <View style={styles.illustrationContainer}>

                                <Image
                                    source={require('../../../../assets/city_bus_bro_2.png')}
                                    style={styles.illustration}
                                    contentFit="contain"
                                />
                            </View>

                            {/* Headline text */}
                            <View style={styles.headlineContainer}>
                                <Text style={styles.headlineText}>
                                    {"North Nazimbad,\nTower"}
                                    {/* <Text style={styles.asterisk}>*</Text> */}
                                </Text>
                            </View>

                            {/* Divider */}
                            <View style={styles.divider} />

                            {/* Stat footer row */}
                            <View style={styles.statRow}>
                                <View style={styles.statLeft}>
                                    <Text style={styles.statNumber}>08:00 AM</Text>
                                </View>
                                <View style={styles.arrowContainer}>
                                    <Text style={styles.flipHintText}>Tap for details</Text>
                                    <MaterialCommunityIcons name="rotate-3d-variant" size={20} color="black" />
                                </View>
                            </View>
                        </View>
                    </FlipCard.Front>

                    {/* --- BACK SIDE --- */}
                    <FlipCard.Back>
                        <LinearGradient
                            style={styles.gradient}
                            colors={["#F1F443", "#F1F443"]}
                        />
                        <View style={styles.backContent}>

                            {/* Header */}
                            <Text style={styles.backTitle}>Ride Details</Text>

                            {/* Captain avatar + info grid — grouped close together */}
                            <View style={styles.captainBlock}>

                                {/* Captain avatar */}
                                <View style={styles.captainSection}>
                                    <View style={styles.avatarCircle}>
                                        <Text style={styles.avatarInitials}>SJ</Text>
                                    </View>
                                    <Text style={styles.captainRole}>Your Captain</Text>
                                    <Text style={styles.captainName}>Sajjad Hussain</Text>
                                </View>

                                {/* Divider between avatar and grid */}
                                <View style={styles.backDivider} />

                                {/* 3-column info grid */}
                                <View style={styles.infoGrid}>
                                    {/* Vehicle */}
                                    <View style={styles.infoCell}>
                                        <View style={styles.infoIconBox}>
                                            <MaterialCommunityIcons name="bus" size={16} color="#000" />
                                        </View>
                                        <Text style={styles.infoCellLabel}>Vehicle</Text>
                                        <Text style={styles.infoCellValue}>ABC-1234</Text>
                                        <Text style={styles.infoCellSub}>Hiace • White</Text>
                                    </View>

                                    <View style={styles.gridSeparator} />

                                    {/* Pickup Time */}
                                    <View style={styles.infoCell}>
                                        <View style={styles.infoIconBox}>
                                            <Ionicons name="time-outline" size={16} color="#000" />
                                        </View>
                                        <Text style={styles.infoCellLabel}>Pickup Time</Text>
                                        <Text style={styles.infoCellValue}>08:00 AM</Text>
                                        <Text style={styles.infoCellSub}>Today</Text>
                                    </View>

                                    <View style={styles.gridSeparator} />

                                    {/* Stop */}
                                    <View style={styles.infoCell}>
                                        <View style={styles.infoIconBox}>
                                            <Ionicons name="location-outline" size={16} color="#000" />
                                        </View>
                                        <Text style={styles.infoCellLabel}>Stop</Text>
                                        <Text style={styles.infoCellValue}>Main Gate</Text>
                                        <Text style={styles.infoCellSub}>Sector 4</Text>
                                    </View>
                                </View>

                            </View>

                            {/* Divider below grid, same distance as the one above */}
                            <View style={styles.backDivider} />

                            {/* Call Captain button */}
                            <View style={styles.actionButton}>
                                <Text style={styles.buttonText}>Call Captain</Text>
                            </View>

                        </View>
                    </FlipCard.Back>
                    <FlipCard.Trigger asChild={false} />
                </FlipCard>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 8,
    },
    cardWrapper: {
        overflow: "visible",
    },

    // ── Front ──────────────────────────────────────────────
    frontContainer: {
        flex: 1,
        backgroundColor: "#F4593B",
        borderRadius: 28,
        padding: 24,
        overflow: "hidden",
        justifyContent: "space-between",
    },

    // Brand / logo row at the top
    brandRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    brandIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: "rgba(255,255,255,0.25)",
        alignItems: "center",
        justifyContent: "center",
    },
    brandName: {
        fontSize: 15,
        fontWeight: "800",
        color: "#FFF",
        letterSpacing: 2,
        fontFamily,
    },

    // Illustration
    illustrationContainer: {
        alignItems: "center",
        flex: 1,
        justifyContent: "center",
        paddingVertical: 8,
    },
    illustration: {
        width: 300,
        height: 250,
        marginBottom: -10,
        marginLeft: -10,
        // makes the PNG render white over the orange background
    },

    // Headline
    headlineContainer: {
        marginBottom: 16,
    },
    headlineText: {
        fontSize: 30,
        fontWeight: "900",
        color: "#FFFF",
        letterSpacing: -0.8,
        lineHeight: 36,
        fontFamily
      
    },
    asterisk: {
        fontSize: 18,
        fontWeight: "900",
        color: "#FFF",
        verticalAlign: "top",
    },

    // Divider
    divider: {
        height: 1,
        backgroundColor: "rgba(255,255,255,0.35)",
        marginBottom: 16,
    },

    // Stat footer
    statRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
    },
    statLeft: {
        gap: 2,
    },
    statNumber: {
        fontSize: 28,
        fontWeight: "900",
        color: "#FFF",
        letterSpacing: -1,
        fontFamily,
    },
    statLabel: {
        fontSize: 12,
        fontWeight: "500",
        color: "rgba(255,255,255,0.75)",
        fontFamily,
    },
    arrowContainer: {
        flexDirection: "row",
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: "rgba(255,255,255,0.45)",
        backgroundColor: "#FFF",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 10,
        paddingVertical: 5,
        gap: 4,
    },
    flipHintText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#000",
        fontFamily,
    },

    // ── Back ──────────────────────────────────────────────
    gradient: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 28,
    },
    backContent: {
        flex: 1,
        padding: 22,
        justifyContent: "space-between",
    },
    backTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: "#000",
        letterSpacing: -0.3,
        fontFamily,
    },

    // Captain section
    captainSection: {
        alignItems: "center",
        gap: 4,
    },
    avatarCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: "#000",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 4,
    },
    avatarInitials: {
        fontSize: 22,
        fontWeight: "800",
        color: "#F1F443",
        fontFamily,
    },
    captainRole: {
        fontSize: 11,
        fontWeight: "600",
        color: "rgba(0,0,0,0.45)",
        textTransform: "uppercase",
        letterSpacing: 1.2,
        fontFamily,
    },
    captainName: {
        fontSize: 18,
        fontWeight: "800",
        color: "#000",
        letterSpacing: -0.3,
        fontFamily,
    },

    // Divider
    backDivider: {
        height: 1,
        backgroundColor: "rgba(0,0,0,0.12)",
    },

    // 3-column info grid
    infoGrid: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    infoCell: {
        flex: 1,
        alignItems: "center",
        gap: 3,
    },
    infoIconBox: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: "rgba(0,0,0,0.08)",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 2,
    },
    infoCellLabel: {
        fontSize: 10,
        fontWeight: "600",
        color: "rgba(0,0,0,0.45)",
        textTransform: "uppercase",
        letterSpacing: 0.8,
        fontFamily,
    },
    infoCellValue: {
        fontSize: 13,
        fontWeight: "800",
        color: "#000",
        letterSpacing: -0.2,
        fontFamily,
    },
    infoCellSub: {
        fontSize: 11,
        fontWeight: "500",
        color: "rgba(0,0,0,0.5)",
        fontFamily,
    },
    gridSeparator: {
        width: 1,
        height: "80%",
        alignSelf: "center",
        backgroundColor: "rgba(0,0,0,0.12)",
    },

    // wrapper that groups avatar + divider + grid so they sit close together
    captainBlock: {
        gap: 14,
    },

    // Call Captain button
    actionButton: {
        backgroundColor: "#000",
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: "center",
    },
    buttonText: {
        color: "#F1F443",
        fontWeight: "800",
        fontSize: 14,
        letterSpacing: 0.2,
        fontFamily,
    },
});