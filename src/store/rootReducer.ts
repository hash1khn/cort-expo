import { combineReducers } from '@reduxjs/toolkit';
import { authReducer } from '../features/auth/store';

export const rootReducer = combineReducers({
    auth: authReducer,
});
