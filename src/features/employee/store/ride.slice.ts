import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

type DriverInfo = {
  id: string;
  full_name: string;
  phone: string;
};

type VehicleInfo = {
  plate_number: string;
  make: string;
  model: string;
  year: number;
  color: string;
};

export type ChauffeurRide = {
  id: number;
  status?: string;
  scheduled_for?: string;
  driver?: DriverInfo;
  vehicle?: VehicleInfo;
  pickupAddress?: string | null;
  destinationCities?: string[] | null;
};

export interface EmployeeRideState {
  chauffeurRide: ChauffeurRide | null;
  /**
   * Dev-only flag to mimic an outstation ride.
   * When true, tapping the chauffeur card will first ask for a dropoff.
   */
  isOutstationDev: boolean;
  /**
   * Dev-only: free‑text dropoff entered by the employee.
   */
  outstationDropoff: string | null;
  /**
   * When true, the active ride screen should show
   * "Waiting for driver to respond..." instead of the
   * normal "ride is on the way" copy.
   */
  isWaitingForDriverResponse: boolean;
}

const initialState: EmployeeRideState = {
  chauffeurRide: null,
  isOutstationDev: false,
  outstationDropoff: null,
  isWaitingForDriverResponse: false,
};

const employeeRideSlice = createSlice({
  name: 'employeeRide',
  initialState,
  reducers: {
    setChauffeurRide(state, action: PayloadAction<ChauffeurRide | null>) {
      state.chauffeurRide = action.payload;
    },
    /**
     * Dev-only toggle used from the active ride bottom sheet.
     */
    setIsOutstationDev(state, action: PayloadAction<boolean>) {
      state.isOutstationDev = action.payload;
      if (!action.payload) {
        state.outstationDropoff = null;
        state.isWaitingForDriverResponse = false;
      }
    },
    setOutstationDropoff(state, action: PayloadAction<string | null>) {
      state.outstationDropoff = action.payload;
    },
    setIsWaitingForDriverResponse(state, action: PayloadAction<boolean>) {
      state.isWaitingForDriverResponse = action.payload;
    },
  },
});

export const {
  setChauffeurRide,
  setIsOutstationDev,
  setOutstationDropoff,
  setIsWaitingForDriverResponse,
} = employeeRideSlice.actions;
export const employeeRideReducer = employeeRideSlice.reducer;

