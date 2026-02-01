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
}

const initialState: EmployeeRideState = {
  chauffeurRide: null,
};

const employeeRideSlice = createSlice({
  name: 'employeeRide',
  initialState,
  reducers: {
    setChauffeurRide(state, action: PayloadAction<ChauffeurRide | null>) {
      state.chauffeurRide = action.payload;
    },
  },
});

export const { setChauffeurRide } = employeeRideSlice.actions;
export const employeeRideReducer = employeeRideSlice.reducer;

