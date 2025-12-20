import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CortCard } from '../../../components';
import { useAuthStore } from '../../../core/stores/useAuthStore';
import { colors, radii, typography } from '../../../core/theme';

export function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const logout = useAuthStore((s) => s.logout);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(user?.name ?? 'U').slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.name} numberOfLines={1}>
            {user?.name ?? 'Driver'}
          </Text>
          <Text style={styles.role} numberOfLines={1}>
            {role === 'CHAUFFEUR' ? 'Chauffeur' : 'User'}
          </Text>
        </View>
      </View>

      <CortCard style={styles.card}>
        <Text style={styles.cardTitle}>Rating</Text>
        <Text style={styles.cardSub}>4.9 (demo)</Text>
      </CortCard>

      <CortCard style={styles.card}>
        <Text style={styles.cardTitle}>Vehicle</Text>
        <Text style={styles.cardSub}>Lexus ES (demo)</Text>
      </CortCard>

      <Pressable onPress={logout} accessibilityRole="button" style={styles.logoutBtn}>
        <Text style={styles.logoutText}>Log Out</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 18, paddingBottom: 14 },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(12, 34, 94, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: typography.family.semibold, fontSize: 18, color: colors.navy },
  name: { fontFamily: typography.family.semibold, fontSize: 18, color: colors.text },
  role: { marginTop: 6, fontFamily: typography.family.regular, fontSize: 12, color: colors.muted },
  card: { marginTop: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, shadowColor: colors.shadowNavy },
  cardTitle: { fontFamily: typography.family.semibold, fontSize: 14, color: colors.text },
  cardSub: { marginTop: 6, fontFamily: typography.family.regular, fontSize: 12, color: colors.muted },
  logoutBtn: { paddingVertical: 16, alignItems: 'center', marginTop: 'auto' },
  logoutText: { fontFamily: typography.family.semibold, fontSize: 14, color: colors.red },
});


