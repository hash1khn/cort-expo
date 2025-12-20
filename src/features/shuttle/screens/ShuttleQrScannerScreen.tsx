import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

import { colors, radii, shadows, typography } from '../../../core/theme';

type Props = {
  onClose?: () => void;
};

export function ShuttleQrScannerScreen({ onClose }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [lastScan, setLastScan] = useState<string | null>(null);

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted && permission.canAskAgain) requestPermission();
  }, [permission, requestPermission]);

  const onScanned = useCallback((data: string) => {
    setLastScan(data);
  }, []);

  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <Text style={styles.title}>Camera access required</Text>
          <Text style={styles.sub}>Enable camera permission to scan employee badges.</Text>
          <Pressable style={styles.action} onPress={requestPermission}>
            <Text style={styles.actionText}>Grant Permission</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={(evt) => onScanned(evt.data)}
      />

      <View pointerEvents="none" style={styles.overlay} />

      <SafeAreaView style={styles.safe}>
        <View style={styles.topBar}>
          <Pressable onPress={onClose} accessibilityRole="button" style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>Scan Badge</Text>
          <View style={{ width: 42 }} />
        </View>

        <View style={styles.frameWrap}>
          <View style={styles.frame} />
          <Text style={styles.hint}>Align the QR code inside the frame</Text>
        </View>

        {lastScan ? (
          <View style={styles.toast}>
            <Text style={styles.toastTitle}>Scanned</Text>
            <Text style={styles.toastValue} numberOfLines={1}>
              {lastScan}
            </Text>
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.text },
  safe: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.22)' },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeBtn: {
    width: 42,
    height: 42,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(12, 34, 94, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.floating,
  },
  headerTitle: { fontFamily: typography.family.semibold, fontSize: 16, color: colors.white },
  frameWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  frame: {
    width: 260,
    height: 260,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  hint: { fontFamily: typography.family.regular, fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  toast: {
    marginHorizontal: 16,
    marginBottom: 18,
    padding: 14,
    borderRadius: radii.md,
    backgroundColor: 'rgba(12, 34, 94, 0.75)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  toastTitle: { fontFamily: typography.family.semibold, fontSize: 12, color: colors.white },
  toastValue: { marginTop: 6, fontFamily: typography.family.regular, fontSize: 12, color: 'rgba(255,255,255,0.9)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, gap: 10 },
  title: { fontFamily: typography.family.semibold, fontSize: 18, color: colors.white },
  sub: { fontFamily: typography.family.regular, fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
  action: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radii.md,
    backgroundColor: colors.navy,
  },
  actionText: { fontFamily: typography.family.semibold, fontSize: 13, color: colors.white },
});


