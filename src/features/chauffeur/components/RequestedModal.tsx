import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fontFamily } from '@/core/theme';

interface RequestedModalProps {
  visible: boolean;
  employeeName: string;
  pickupLocation: string;
  onStart: () => void;
  onClose: () => void;
}

export function RequestedModal({
  visible,
  employeeName,
  pickupLocation,
  onStart,
  onClose,
}: RequestedModalProps) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Ionicons name="notifications" size={36} color="#FF5A00" style={{ marginBottom: 16 }} />
          <Text style={styles.modalTitle}>Passenger Request</Text>
          <Text style={styles.modalSubtitle}>
            <Text style={styles.employeeName}>{employeeName}</Text> has requested your presence
          </Text>
          <View style={styles.pickupSection}>
            <Text style={styles.pickupLabel}>PICKUP</Text>
            <Text style={styles.pickupAddress} numberOfLines={2}>{pickupLocation}</Text>
          </View>
          <Pressable
            style={[styles.modalButton, styles.modalButtonPrimary]}
            onPress={onStart}
          >
            <Text style={styles.modalButtonPrimaryText}>Start Trip</Text>
          </Pressable>
          {/* <Pressable
            style={[styles.modalButton, styles.modalButtonSecondary]}
            onPress={onClose}
          >
            <Text style={styles.modalButtonSecondaryText}>Later</Text>
          </Pressable> */}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    fontFamily,
  },
  modalSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily,
  },
  employeeName: {
    fontWeight: '700',
    color: '#000',
  },
  pickupSection: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  pickupLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
    fontFamily,
  },
  pickupAddress: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    lineHeight: 20,
    fontFamily,
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
    fontFamily,
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
    fontFamily,
  },
});
