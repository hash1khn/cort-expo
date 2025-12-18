import React, { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { CortButton, CortCard } from '../../../components';
import { colors, radii, typography } from '../../../core/theme';
import { mockApi } from '../../../services/mockApi';

type RouteParams = { email: string };

export function ChauffeurPendingScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const email: string = (route.params as RouteParams | undefined)?.email ?? '';

  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const s = await mockApi.getChauffeurApplicationStatus(email);
      if (mounted) setStatus(s);
    })();
    return () => {
      mounted = false;
    };
  }, [email]);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Login')} style={styles.backBtn}>
          <Text style={styles.backText}>Back to Login</Text>
        </Pressable>
      </View>

      <CortCard style={styles.card}>
        <Text style={styles.title}>Pending Admin Approval</Text>
        <Text style={styles.subtitle}>
          Your chauffeur application has been submitted{email ? ` for ${email}` : ''}. You’ll be able to log in once an
          admin approves your account.
        </Text>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Status</Text>
          <View style={styles.statusPill}>
            <Text style={styles.statusText}>{status ?? 'PENDING'}</Text>
          </View>
        </View>

        {__DEV__ ? (
          <>
            <Text style={styles.devNote}>Dev Only: simulate admin approval.</Text>
            <CortButton
              title="Approve Now (Dev)"
              variant="navy"
              onPress={async () => {
                await mockApi.approveChauffeurApplication(email);
                setStatus('APPROVED');
              }}
            />
          </>
        ) : null}

        <CortButton
          title="Go to Login"
          style={{ marginTop: 12 }}
          onPress={() => navigation.navigate('Login')}
        />
      </CortCard>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white, paddingHorizontal: 18 },
  header: { paddingTop: 10 },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 10, borderRadius: radii.pill, backgroundColor: colors.bgGrey },
  backText: { fontFamily: typography.family.semibold, fontSize: 12, color: colors.navy },
  card: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: colors.shadowNavy,
  },
  title: { fontFamily: typography.family.semibold, fontSize: 20, color: colors.text },
  subtitle: { marginTop: 8, fontFamily: typography.family.regular, fontSize: 13, color: colors.muted, lineHeight: 18 },
  statusRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusLabel: { fontFamily: typography.family.medium, fontSize: 12, color: colors.muted },
  statusPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.pill, backgroundColor: 'rgba(244, 127, 0, 0.12)' },
  statusText: { fontFamily: typography.family.semibold, fontSize: 12, color: colors.orange },
  devNote: { marginTop: 14, marginBottom: 10, fontFamily: typography.family.regular, fontSize: 12, color: colors.muted },
});


