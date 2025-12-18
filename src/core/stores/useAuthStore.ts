import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type { UserRole } from '../types/navigation';
import { mockApi } from '../../services/mockApi';

export type AuthUser = {
  id: string;
  name: string;
  avatar?: string;
  hasPrivateRide?: boolean;
};

type AuthState = {
  user: AuthUser | null;
  role: UserRole | null;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      role: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        const u = await mockApi.login(email, password);
        set({
          isAuthenticated: true,
          role: u.role,
          user: {
            id: u.id,
            name: u.name,
            avatar: u.avatar,
            // demo-only flag; present only for employee users in mock data
            hasPrivateRide: (u as any).hasPrivateRide,
          },
        });
      },

      logout: () => {
        set({ user: null, role: null, isAuthenticated: false });
      },
    }),
    {
      name: 'cort.auth',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: (state) => ({
        user: state.user,
        role: state.role,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);


