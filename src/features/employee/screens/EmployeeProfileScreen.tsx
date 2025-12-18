import React, { useMemo } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { CortButton } from '../../../components';
import { useAuthStore } from '../../../core/stores/useAuthStore';
import { colors, radii, typography } from '../../../core/theme';

type Item = { key: string; label: string; icon: keyof typeof Ionicons.glyphMap };

export function EmployeeProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const items = useMemo<Item[]>(
    () => [
      { key: 'ride_history', label: 'Ride History', icon: 'time-outline' },
      { key: 'routes', label: 'My Shuttle Routes', icon: 'map-outline' },
      { key: 'support', label: 'Support', icon: 'help-circle-outline' },
    ],
    []
  );

  const initials = (user?.name ?? 'Sarah Jenkins')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials || 'SJ'}</Text>
        </View>
        <Text style={styles.name} numberOfLines={1}>
          {user?.name ?? 'Sarah Jenkins'}
        </Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>Employee</Text>
        </View>
      </View>

      <View style={styles.list}>
        {items.map((it) => (
          <Pressable key={it.key} style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}>
            <View style={styles.itemLeft}>
              <Ionicons name={it.icon} size={18} color={colors.navy} />
            </View>
            <Text style={styles.itemText}>{it.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.grey} />
          </Pressable>
        ))}
      </View>

      <CortButton title="Log Out" variant="outline" onPress={logout} style={styles.logoutBtn} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white, paddingHorizontal: 16, paddingTop: 10 },
  header: { alignItems: 'center', paddingTop: 10, paddingBottom: 12 },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(12, 34, 94, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: typography.family.semibold, fontSize: 26, color: colors.navy },
  name: { marginTop: 12, fontFamily: typography.family.semibold, fontSize: 18, color: colors.text },
  roleBadge: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  roleBadgeText: { fontFamily: typography.family.semibold, fontSize: 12, color: '#1E40AF' },

  list: { marginTop: 16, gap: 10 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  itemPressed: { opacity: 0.92, transform: [{ scale: 0.998 }] },
  itemLeft: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(12, 34, 94, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: { flex: 1, fontFamily: typography.family.medium, fontSize: 14, color: colors.text },

  logoutBtn: { marginTop: 'auto', marginBottom: 18, borderColor: colors.red },
});


