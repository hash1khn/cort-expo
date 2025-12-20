import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CortCard } from '../../../components';
import { useAuthStore } from '../../../core/stores/useAuthStore';
import { colors, radii, typography } from '../../../core/theme';

function roleLabel(role: string | null) {
  if (role === 'CHAUFFEUR') return 'Chauffeur';
  if (role === 'SHUTTLE_DRIVER') return 'Shuttle Driver';
  if (role === 'EMPLOYEE') return 'Employee';
  return 'Guest';
}

export function SettingsScreen() {
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
            {user?.name ?? 'User'}
          </Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{roleLabel(role)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.list}>
        <CortCard style={styles.item}>
          <Text style={styles.itemTitle}>Account Info</Text>
          <Text style={styles.itemSub}>View your details and preferences</Text>
        </CortCard>

        <CortCard style={styles.item}>
          <Text style={styles.itemTitle}>Support</Text>
          <Text style={styles.itemSub}>Get help or contact concierge</Text>
        </CortCard>

        <CortCard style={styles.item}>
          <Text style={styles.itemTitle}>App Settings</Text>
          <Text style={styles.itemSub}>Notifications, privacy, and more</Text>
        </CortCard>
      </View>

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
  roleBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.navy,
  },
  roleText: { fontFamily: typography.family.semibold, fontSize: 12, color: colors.white },
  list: { gap: 12, paddingTop: 8 },
  item: { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, shadowColor: colors.shadowNavy },
  itemTitle: { fontFamily: typography.family.semibold, fontSize: 14, color: colors.text },
  itemSub: { marginTop: 6, fontFamily: typography.family.regular, fontSize: 12, color: colors.muted },
  logoutBtn: { paddingVertical: 16, alignItems: 'center', marginTop: 'auto' },
  logoutText: { fontFamily: typography.family.semibold, fontSize: 14, color: colors.red },
});


