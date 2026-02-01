import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DrawerContentScrollView, DrawerContentComponentProps } from '@react-navigation/drawer';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, typography } from '../../../core/theme';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { logOut } from '../../auth/store';
import { logout } from '../../auth/services';

export function CustomDrawerContent(props: DrawerContentComponentProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';

  const handleLogout = async () => {
    
    try {
      await logout();
    } finally {
      dispatch(logOut());
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile header */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text className='font-semibold text-2xl' numberOfLines={1}>
              {user?.full_name ?? 'Guest'}
            </Text>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {user?.email ?? ''}
            </Text>
          </View>
        </View>

        {/* COMMUTE Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>COMMUTE</Text>
          
          <Pressable
            style={styles.menuItem}
            onPress={() => {
              props.navigation.closeDrawer();
              // TODO: Navigate to ride history
            }}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.iconContainer}>
              <MaterialIcons name="history" size={24} color="black" /></View>
              <Text className='text-xl font-semibold'>Ride History</Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color={colors.grey} />
          </Pressable>
        </View>

        {/* SUPPORT & PREFS Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>SUPPORT & PREFS</Text>
          
          <Pressable
            style={styles.menuItem}
            onPress={() => {
              props.navigation.closeDrawer();
              // TODO: Navigate to app settings
            }}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="settings-outline" size={20} color={'black'} />
              </View>
              <Text className="text-xl font-semibold">App Settings</Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color={colors.grey} />
          </Pressable>

          <Pressable
            style={styles.menuItem}
            onPress={() => {
              props.navigation.closeDrawer();
              // TODO: Navigate to report problem
            }}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="warning-outline" size={20}  color={'black'}/>
              </View>
              <Text className="text-xl font-semibold">Report a Problem</Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color={colors.grey} />
          </Pressable>

          <Pressable
            style={styles.menuItem}
            onPress={() => {
              props.navigation.closeDrawer();
              // TODO: Navigate to help & support
            }}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="help-circle-outline" size={20} color={colors.iconFg} />
              </View>
              <Text className="text-xl font-semibold">Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color={colors.grey} />
          </Pressable>
        </View>
      </DrawerContentScrollView>

      {/* Logout Button */}
      <View style={styles.footer}>
        <Pressable
          style={styles.logoutButton}
           className='bg-[#f9bd55]'
          onPress={handleLogout}
        >
          <View style={styles.logoutButtonLeft}>
            <MaterialCommunityIcons name="logout" size={20} color={colors.white} />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </View>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 20,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontFamily: typography.family.semibold,
    fontSize: 18,
    color: colors.navy,
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
   
    fontSize: typography.size.lg,
    color: colors.text,
    marginBottom: 2,
  },
  profileEmail: {
    fontFamily: typography.family.regular,
    fontSize: typography.size.sm,
    color: colors.muted,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionHeading: {
    fontFamily: typography.family.medium,
    fontSize: typography.size.xs,
    letterSpacing: 1.2,
    color: colors.grey,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemText: {
    fontFamily: typography.family.semibold,
    fontSize: typography.size.md,
    color: colors.text,
    
    flex: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 16,
  },
  logoutButton: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    // backgroundColor: colors.navy,
  },
  logoutButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutButtonText: {
    fontFamily: typography.family.semibold,
    fontSize: typography.size.md,
    color: colors.white,
  },
});
