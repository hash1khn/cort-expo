import React, { useMemo } from 'react';

import { AuthStack } from './AuthStack';
import { ChauffeurStack } from './ChauffeurStack';
import { PassengerTabNavigator } from '../tabs/PassengerTabs';
import { ShuttleTabNavigator } from '../tabs/ShuttleTabs';
import { ChauffeurTabNavigator } from '../tabs/ChauffeurTabs';
import { useAuthStore } from '../../core/stores/useAuthStore';

/**
 * RootNavigator (role gate)
 *
 * Rules:
 * - userRole === null -> AuthStack
 * - userRole === 'CHAUFFEUR' -> ChauffeurStack
 * - userRole === 'SHUTTLE_DRIVER' -> ShuttleStack
 * - userRole === 'EMPLOYEE' -> PassengerTabNavigator
 *
 * Replace the local state with your real auth/store selector when ready.
 */
export function RootNavigator() {
  const userRole = useAuthStore((s) => s.role);
  
  const content = useMemo(() => {
    if (userRole === null) return <AuthStack />;

    switch (userRole) {
      case 'CHAUFFEUR':
        return <ChauffeurTabNavigator />;
      case 'SHUTTLE_DRIVER':
        return <ShuttleTabNavigator />;
      case 'EMPLOYEE':
        return <PassengerTabNavigator />;
      default:
        return <AuthStack />;
    }
  }, [userRole]);

  return content;
}


