import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { REHYDRATE } from 'redux-persist';
import type { UserRole } from '../../../core/types/navigation';

export interface AuthState {
  isLoggedIn: boolean;
  shouldCreateAccount: boolean;
  hasCompletedOnboarding: boolean;
  role: UserRole | null;
  user: {
    id: string;
    email: string;
    phone: string;
    full_name: string;
    company_id: number | null;
    account_status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
    profile_picture_url: string | null;
    enabled_services: {
      shuttle: boolean;
      chauffeur: boolean;
    } | null;
  } | null;
  _hasHydrated: boolean;
}

const initialState: AuthState = {
  isLoggedIn: false,
  shouldCreateAccount: false,
  hasCompletedOnboarding: false,
  role: null,
  user: null,
  _hasHydrated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logIn: (state, action: PayloadAction<{ role: UserRole; user: AuthState['user'] }>) => {
      state.isLoggedIn = true;
      state.role = action.payload.role;
      state.user = action.payload.user;
    },
    logOut: (state) => {
      state.isLoggedIn = false;
      state.role = null;
      state.user = null;
    },
    completeOnboarding: (state) => {
      state.hasCompletedOnboarding = true;
    },
    resetOnboarding: (state) => {
      state.hasCompletedOnboarding = false;
    },
    setHasHydrated: (state, action: PayloadAction<boolean>) => {
      state._hasHydrated = action.payload;
    },
    updateUserProfile: (state, action: PayloadAction<Partial<NonNullable<AuthState['user']>>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(REHYDRATE, (state, action: any) => {
      // Ensure role defaults to null if undefined during rehydration
      const rehydratedState = action.payload?.auth;
      if (rehydratedState) {
        return {
          ...rehydratedState,
          role: rehydratedState.role ?? null,
        };
      }
      return state;
    });
  },
});

export const { logIn, logOut, completeOnboarding, resetOnboarding, setHasHydrated, updateUserProfile } = authSlice.actions;
export default authSlice.reducer;
