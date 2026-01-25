import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { REHYDRATE } from 'redux-persist';
import type { UserRole } from '../../../core/types/navigation';

export interface AuthState {
  isLoggedIn: boolean;
  shouldCreateAccount: boolean;
  hasCompletedOnboarding: boolean;
  role: UserRole | null;
  _hasHydrated: boolean;
}

const initialState: AuthState = {
  isLoggedIn: false,
  shouldCreateAccount: false,
  hasCompletedOnboarding: false,
  role: null,
  _hasHydrated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logIn: (state, action: PayloadAction<UserRole>) => {
      state.isLoggedIn = true;
      state.role = action.payload;
    },
    logOut: (state) => {
      state.isLoggedIn = false;
      state.role = null;
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

export const { logIn, logOut, completeOnboarding, resetOnboarding, setHasHydrated } = authSlice.actions;
export default authSlice.reducer;
