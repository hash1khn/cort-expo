import React, { useMemo, useRef, useState } from 'react';
import { StyleSheet, Text as RNText, View, Pressable, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { router } from 'expo-router';
import { fontFamily } from '@/core/theme';

const Text = (props: React.ComponentProps<typeof RNText>) => {
    return <RNText {...props} style={[{ fontFamily }, props.style]} />;
};

export function ActiveTripScreen() {
    const bottomSheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ['35%'], []);
    const [isModalVisible, setIsModalVisible] = useState(false);

    // Placeholder data (will come from store/props later)
    const initials = 'SJ';
    const passengerName = 'Sarah Jenkins';

    return (
        <View style={styles.root}>
            {/* Map View */}
            <MapView
                style={StyleSheet.absoluteFillObject}
                initialRegion={{
                    latitude: 37.618,
                    longitude: -122.375,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }}
                showsUserLocation
            />

            {/* Header Strip */}
            <SafeAreaView style={styles.headerContainer} edges={['top']}>
                <View style={styles.headerContent}>
                    <Pressable style={styles.backButton} onPress={() => router.back()}>

                        <Ionicons name="chevron-back" size={24} color="#000" />

                    </Pressable>
                    <Text style={styles.headerTitle}>Ride In Progress</Text>
                    <View style={{ width: 40 }} />
                </View>
            </SafeAreaView>

            {/* Bottom Sheet Details */}
            <BottomSheet
                ref={bottomSheetRef}
                index={0}
                snapPoints={snapPoints}
                enablePanDownToClose={false}
                handleIndicatorStyle={styles.sheetHandle}
                backgroundStyle={styles.sheetBackground}
            >
                <BottomSheetView style={styles.sheetContent}>
                    <View style={styles.passengerRow}>
                        <View style={styles.avatarCircle}>
                            <Text style={styles.avatarInitials}>{initials}</Text>
                        </View>
                        <View style={styles.passengerInfoBox}>
                            <Text style={styles.passengerRole}>PASSENGER</Text>
                            <Text style={styles.passengerName}>{passengerName}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <Pressable
                        style={styles.primaryButton}
                        onPress={() => setIsModalVisible(true)}
                    >
                        <Text style={styles.primaryButtonText}>Mark as dropped off</Text>
                    </Pressable>
                </BottomSheetView>
            </BottomSheet>
            {/* Confirmation Modal */}
            <Modal
                transparent
                visible={isModalVisible}
                animationType="fade"
                onRequestClose={() => setIsModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Ionicons name="alert-circle-sharp" size={36} color="#FF5A00" style={{ marginBottom: 16 }} />
                        <Text style={styles.modalTitle}>Are you sure?</Text>
                        <Text style={styles.modalSubtitle}>You want to mark this ride as dropped off.</Text>

                        <Pressable
                            style={[styles.modalButton, styles.modalButtonPrimary]}
                            onPress={() => {
                                setIsModalVisible(false);
                                router.push('/chauffeur/end-ride');
                            }}
                        >
                            <Text style={styles.modalButtonPrimaryText}>Yes, Mark</Text>
                        </Pressable>

                        <Pressable
                            style={[styles.modalButton, styles.modalButtonSecondary]}
                            onPress={() => setIsModalVisible(false)}
                        >
                            <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#FFFFFF' },
    headerContainer: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
        zIndex: 10,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 16,
        paddingTop: 8,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F3F4F6',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#000',
        textAlign: 'center',
    },
    sheetBackground: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
    },
    sheetHandle: {
        backgroundColor: '#D1D5DB',
        width: 48,
        height: 5,
        borderRadius: 3,
    },
    sheetContent: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 10,
        paddingBottom: 30,
    },
    passengerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginVertical: 10,
    },
    avatarCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitials: {
        fontSize: 22,
        fontWeight: '800',
        color: '#F1F443',
    },
    passengerInfoBox: {
        justifyContent: 'center',
    },
    passengerRole: {
        fontSize: 12,
        fontWeight: '700',
        color: '#6B7280',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 2,
    },
    passengerName: {
        fontSize: 20,
        fontWeight: '800',
        color: '#000',
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 20,
    },
    primaryButton: {
        backgroundColor: '#FF5A00',
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderRadius: 28,
        padding: 24,
        alignItems: 'center',
        width: '100%',
        maxWidth: 320,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#000',
        marginBottom: 8,
    },
    modalSubtitle: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 24,
    },
    modalButton: {
        width: '100%',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    modalButtonPrimary: {
        backgroundColor: '#FF5A00',
    },
    modalButtonPrimaryText: {
        color: '#FFF',
        fontSize: 17,
        fontWeight: '700',
    },
    modalButtonSecondary: {
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 0,
    },
    modalButtonSecondaryText: {
        color: '#374151',
        fontSize: 17,
        fontWeight: '700',
    },
});
