import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { colors, radii, typography } from '../../../core/theme';

type Props = {
  onGetStarted?: () => void;
};

export function GetStartedScreen({ onGetStarted }: Props) {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <View style={styles.brandMark} />
        <Text style={styles.title}>CORT</Text>
        <Text style={styles.subTitle}>Corporate transport, reimagined.</Text>
      </View>

      <View style={styles.bottom}>
        <Text style={styles.body}>
          Premium rides for employees, chauffeurs, and shuttle operations—secure, reliable, and on time.
        </Text>

        <Pressable onPress={onGetStarted} style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}>
          <Text style={styles.ctaText}>Get Started</Text>
        </Pressable>

        <Text style={styles.foot}>By continuing you agree to CORT policies.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white, paddingHorizontal: 18 },
  header: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  brandMark: {
    width: 54,
    height: 54,
    borderRadius: radii.md,
    backgroundColor: colors.navy,
    marginBottom: 16,
  },
  title: { fontFamily: typography.family.semibold, fontSize: 36, color: colors.navy, letterSpacing: 2 },
  subTitle: {
    marginTop: 10,
    fontFamily: typography.family.regular,
    fontSize: 14,
    color: colors.muted,
  },
  bottom: { paddingBottom: 22 },
  body: {
    fontFamily: typography.family.regular,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 14,
  },
  cta: {
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  ctaText: { fontFamily: typography.family.semibold, fontSize: 15, color: colors.white },
  foot: {
    marginTop: 12,
    textAlign: 'center',
    fontFamily: typography.family.regular,
    fontSize: 11,
    color: colors.muted,
  },
});


