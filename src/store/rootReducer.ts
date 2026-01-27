import { combineReducers } from '@reduxjs/toolkit';
import { authReducer } from '../features/auth/store';
import { baseApi } from '../core/api/baseApi';

export const rootReducer = combineReducers({
    auth: authReducer,
    [baseApi.reducerPath]: baseApi.reducer,
});
