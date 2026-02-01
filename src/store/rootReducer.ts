import { combineReducers } from '@reduxjs/toolkit';
import { authReducer } from '../features/auth/store';
import { employeeRideReducer } from '../features/employee/store';
import { baseApi } from '../core/api/baseApi';

export const rootReducer = combineReducers({
  auth: authReducer,
  employeeRide: employeeRideReducer,
  [baseApi.reducerPath]: baseApi.reducer,
});
