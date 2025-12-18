import type { UserRole } from '../core/types/navigation';

export type MockUser = {
  id: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  avatar?: string;
  rating?: number; // chauffeur only
  hasPrivateRide?: boolean; // employee only (demo)
};

export type RideStatus = 'EN_ROUTE' | 'ARRIVED' | 'CANCELLED';

export type ActiveRide = {
  id: string;
  status: RideStatus;
  etaMinutes: number;
  origin: { label: string };
  destination: { label: string };
  driver: {
    id: string;
    name: string;
    avatar?: string;
    rating?: number;
  };
  car: {
    model: string;
    color: string;
    plate: string;
  };
};

export type StopStatus = 'PAST' | 'CURRENT' | 'NEXT';

export type ShuttleStop = {
  id: string;
  name: string;
  time: string; // e.g. "08:15"
  status: StopStatus;
};

export type ShuttleRoute = {
  id: string;
  name: string;
  occupancy: { current: number; capacity: number };
  stops: readonly ShuttleStop[];
};

export const VALID_SHUTTLE_QR = 'cort-shuttle-01' as const;

export const shuttleCoordinates = {
  latitude: 37.78825,
  longitude: -122.4324,
} as const;

export const mockShuttlePolyline = [
  { latitude: 37.78825, longitude: -122.4324 },
  { latitude: 37.78915, longitude: -122.4309 },
  { latitude: 37.7902, longitude: -122.4299 },
  { latitude: 37.7913, longitude: -122.431 },
  { latitude: 37.79035, longitude: -122.4332 },
  { latitude: 37.7891, longitude: -122.4342 },
  { latitude: 37.78825, longitude: -122.4324 },
] as const;

// 1) Users
export const mockUsers = [
  {
    id: 'u_employee_1',
    email: 'employee@cort.com',
    password: '123456',
    name: 'Sarah J.',
    role: 'EMPLOYEE',
    avatar: undefined,
    hasPrivateRide: true,
  },
  {
    id: 'u_driver_1',
    email: 'driver@cort.com',
    password: '123456',
    name: 'James D.',
    role: 'CHAUFFEUR',
    avatar: undefined,
    rating: 4.9,
  },
  {
    id: 'u_shuttle_1',
    email: 'shuttle@cort.com',
    password: '123456',
    name: 'Mike T.',
    role: 'SHUTTLE_DRIVER',
    avatar: undefined,
  },
] as const satisfies readonly MockUser[];

// 2) Ride Data (Passenger/Chauffeur)
export const activeRide = {
  id: 'ride_active_1',
  status: 'EN_ROUTE',
  etaMinutes: 3,
  origin: { label: 'CORT HQ - Main Entrance' },
  destination: { label: 'Downtown Office Plaza' },
  driver: {
    id: 'u_driver_1',
    name: 'James D.',
    rating: 4.9,
  },
  car: {
    model: 'Lexus ES',
    color: 'Black',
    plate: 'ABC-123',
  },
} as const satisfies ActiveRide;

// 3) Shuttle Data (Shuttle Driver)
export const shuttleRoute = {
  id: 'route_downtown_loop',
  name: 'Downtown Loop',
  occupancy: { current: 12, capacity: 20 },
  stops: [
    { id: 'st_1', name: 'Central Station', time: '08:00', status: 'PAST' },
    { id: 'st_2', name: '5th Ave & Pine', time: '08:10', status: 'PAST' },
    { id: 'st_3', name: 'Union Square', time: '08:20', status: 'CURRENT' },
    { id: 'st_4', name: 'Market St', time: '08:30', status: 'NEXT' },
    { id: 'st_5', name: 'City Hall', time: '08:40', status: 'NEXT' },
  ],
} as const satisfies ShuttleRoute;


