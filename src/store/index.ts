import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import { rootReducer } from './rootReducer';
import { baseApi } from '../core/api/baseApi';

const persistConfig = {
  key: 'auth-store',
  storage: AsyncStorage,
  whitelist: ['auth'], // Only persist auth slice, not RTK Query cache
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }).concat(baseApi.middleware),
});

export const persistor = persistStore(store, null, () => {
  // Set hydration flag after rehydration
  store.dispatch({ type: 'auth/setHasHydrated', payload: true });
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
