import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View, Vibration } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

import { colors, radii, shadows, typography } from '../../../core/theme';
import { VALID_SHUTTLE_QR } from '../../../data/mockData';

type Props = {
  onClose?: () => void;
  onSuccess?: () => void;
};

export function EmployeeQrScannerScreen({ onClose, onSuccess }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [lastScan, setLastScan] = useState<string | null>(null);

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted && permission.canAskAgain) requestPermission();
  }, [permission, requestPermission]);

  const onScanned = useCallback(
    (data: string) => {
      if (lastScan) return;
      setLastScan(data);
      Vibration.vibrate();

      if (data === VALID_SHUTTLE_QR) {
        onSuccess?.();
      } else {
        setTimeout(() => setLastScan(null), 900);
      }
    },
    [lastScan, onSuccess]
  );

  const permissionState = useMemo(() => {
    if (!permission) return 'loading' as const;
    if (!permission.granted) return 'denied' as const;
    return 'granted' as const;
  }, [permission]);

  if (permissionState !== 'granted') {
    return (
      <SafeAreaView style={styles.permRoot}>
        <View style={styles.permCenter}>
          <Text style={styles.permTitle}>
            {permissionState === 'loading' ? 'Requesting Camera Permission...' : 'Camera access required'}
          </Text>
          {permissionState === 'denied' ? (
            <>
              <Text style={styles.permSub}>Enable camera permission to scan the driver QR code.</Text>
              <Pressable style={styles.permAction} onPress={requestPermission}>
                <Text style={styles.permActionText}>Grant Permission</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={(evt) => onScanned(evt.data)}
      />

      <View pointerEvents="none" style={styles.overlay}>
        <View style={styles.overlayRow} />
        <View style={styles.overlayMidRow}>
          <View style={styles.overlaySide} />
          <View style={styles.cutout}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <View style={styles.overlaySide} />
        </View>
        <View style={styles.overlayRow} />
      </View>

      <SafeAreaView style={styles.safe}>
        <Text style={styles.topText}>Scan Driver QR Code</Text>

        <Pressable onPress={onClose} accessibilityRole="button" style={styles.closeBtn}>
          <Ionicons name="close" size={18} color={colors.white} />
        </Pressable>

        <View style={{ flex: 1 }} />

        <Text style={styles.bottomText}>Align the code within the frame to validate your ride.</Text>

        <Pressable accessibilityRole="button" style={styles.flashBtn} onPress={() => {}}>
          <Ionicons name="flash" size={20} color={colors.white} />
        </Pressable>

        {lastScan ? (
          <View style={styles.toast}>
            <Text style={styles.toastTitle}>{lastScan === VALID_SHUTTLE_QR ? 'Valid ride' : 'Invalid code'}</Text>
            <Text style={styles.toastValue} numberOfLines={1}>
              {lastScan}
            </Text>
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

const CUTOUT = 250;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.text },
  safe: { flex: 1, paddingHorizontal: 16 },

  permRoot: { flex: 1, backgroundColor: colors.text },
  permCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, gap: 10 },
  permTitle: { fontFamily: typography.family.semibold, fontSize: 18, color: colors.white, textAlign: 'center' },
  permSub: { fontFamily: typography.family.regular, fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
  permAction: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radii.md,
    backgroundColor: colors.navy,
  },
  permActionText: { fontFamily: typography.family.semibold, fontSize: 13, color: colors.white },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.60)' },
  overlayRow: { flex: 1 },
  overlayMidRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  overlaySide: { flex: 1 },
  cutout: { width: CUTOUT, height: CUTOUT, backgroundColor: 'transparent' },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: 'rgba(255,255,255,0.95)' },
  cornerTL: { top: 0, left: 0, borderLeftWidth: 3, borderTopWidth: 3, borderTopLeftRadius: 8 },
  cornerTR: { top: 0, right: 0, borderRightWidth: 3, borderTopWidth: 3, borderTopRightRadius: 8 },
  cornerBL: { bottom: 0, left: 0, borderLeftWidth: 3, borderBottomWidth: 3, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 0, right: 0, borderRightWidth: 3, borderBottomWidth: 3, borderBottomRightRadius: 8 },

  topText: {
    marginTop: 70,
    fontFamily: typography.family.semibold,
    fontSize: 16,
    color: colors.white,
    textAlign: 'center',
  },
  bottomText: {
    marginBottom: 18,
    fontFamily: typography.family.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
  },

  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(12, 34, 94, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.floating,
  },
  flashBtn: {
    alignSelf: 'center',
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(12, 34, 94, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...shadows.floating,
  },

  toast: {
    marginHorizontal: 0,
    marginBottom: 18,
    padding: 14,
    borderRadius: radii.md,
    backgroundColor: 'rgba(12, 34, 94, 0.78)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  toastTitle: { fontFamily: typography.family.semibold, fontSize: 12, color: colors.white },
  toastValue: { marginTop: 6, fontFamily: typography.family.regular, fontSize: 12, color: 'rgba(255,255,255,0.9)' },
});


