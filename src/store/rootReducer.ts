import { combineReducers } from '@reduxjs/toolkit';
import { authReducer } from '../features/auth/store';
import { employeeRideReducer } from '../features/employee/store';
import { baseApi } from '../core/api/baseApi';

const combinedReducer = combineReducers({
  auth: authReducer,
  employeeRide: employeeRideReducer,
  [baseApi.reducerPath]: baseApi.reducer,
});

type CombinedState = ReturnType<typeof combinedReducer>;

/**
 * On logout, wipe the RTKQ cache and the ephemeral ride state so the next
 * user never sees data belonging to the previous session.
 *
 * Passing `undefined` for a slice makes RTK re-initialise it from its own
 * initialState — which is identical to what resetApiState() would do but
 * happens synchronously inside the reducer, covering all logout paths
 * (drawer buttons, unauthorised 401 auto-logout) with a single change.
 *
 * The `auth` slice is intentionally left intact here: its own `logOut`
 * reducer clears the user/role fields in the same dispatch cycle.
 *
 * redux-persist: only `auth` is whitelisted so this never touches
 * AsyncStorage for the api or employeeRide keys.
 */
export const rootReducer = (
  state: CombinedState | undefined,
  action: { type: string },
): CombinedState => {
  if (action.type === 'auth/logOut') {
    return combinedReducer(
      {
        ...state,
        [baseApi.reducerPath]: undefined as any,
        employeeRide: undefined as any,
      },
      action,
    );
  }
  return combinedReducer(state, action);
};
