import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface LocationDisclosureModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * Prominent disclosure modal required by Google Play policy (and recommended
 * by Apple) before requesting background location permission.
 *
 * Per Google's policy the modal must:
 *  - Use the word "location"
 *  - Use the phrase "background", "when the app is closed", or equivalent
 *  - Describe the feature that uses background location
 *  - Appear BEFORE the OS permission dialog
 */
export function LocationDisclosureModal({
  visible,
  onAccept,
  onDecline,
}: LocationDisclosureModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Location Tracking</Text>

          <Text style={styles.body}>
            Cort collects your{' '}
            <Text style={styles.bold}>precise location</Text> during active
            rides, even{' '}
            <Text style={styles.bold}>when the app is in the background</Text>{' '}
            or minimised.
          </Text>

          <Text style={styles.body}>
            Your location is shared with dispatch only while a ride is in
            progress. You can stop sharing at any time by ending the ride.
          </Text>

          <Text style={styles.note}>
            You will be asked to grant &quot;Always&quot; location permission on
            the next screen.
          </Text>

          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={onAccept}
            activeOpacity={0.85}
          >
            <Text style={styles.acceptText}>Allow Location Access</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.declineBtn}
            onPress={onDecline}
            activeOpacity={0.75}
          >
            <Text style={styles.declineText}>Not Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 36,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 14,
    color: '#111',
  },
  body: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
    marginBottom: 10,
  },
  bold: {
    fontWeight: '600',
    color: '#111',
  },
  note: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 18,
  },
  acceptBtn: {
    backgroundColor: '#F4593B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  acceptText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  declineBtn: {
    alignItems: 'center',
    padding: 10,
  },
  declineText: {
    color: '#888',
    fontSize: 15,
  },
});
