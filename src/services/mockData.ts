import type { UserRole } from '../core/types/navigation';

export type MockUser = {
  id: string;
  email: string;
  password: string;
  full_name: string;
  phone: string;
  role: UserRole;
  company_id: number;
  account_status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  enabled_services: {
    shuttle: boolean;
    chauffeur: boolean;
  };
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
  latitude: 24.8607,
  longitude: 67.0011,
} as const;

export const mockShuttlePolyline = [
  { latitude: 24.8607, longitude: 67.0011 },
  { latitude: 24.8615, longitude: 67.0020 },
  { latitude: 24.8625, longitude: 67.0025 },
  { latitude: 24.8635, longitude: 67.0020 },
  { latitude: 24.8625, longitude: 67.0005 },
  { latitude: 24.8615, longitude: 66.9995 },
  { latitude: 24.8607, longitude: 67.0011 },
] as const;

// 1) Users
export const mockUsers = [
  {
    id: 'u_employee_1',
    email: 'employee@cort.com',
    password: '123456',
    full_name: 'Sarah J.',
    phone: '+923001234567',
    role: 'EMPLOYEE',
    company_id: 1,
    account_status: 'ACTIVE' as const,
    enabled_services: {
      shuttle: true,
      chauffeur: true,
    },
    avatar: undefined,
    hasPrivateRide: true,
  },
  {
    id: 'u_driver_1',
    email: 'driver@cort.com',
    password: '123456',
    full_name: 'Ali Hassan',
    phone: '+923009876543',
    role: 'CHAUFFEUR',
    company_id: 1,
    account_status: 'ACTIVE' as const,
    enabled_services: {
      shuttle: false,
      chauffeur: true,
    },
    avatar: undefined,
    rating: 4.9,
  },
  {
    id: 'u_shuttle_1',
    email: 'shuttle@cort.com',
    password: '123456',
    full_name: 'Mike T.',
    phone: '+923005555555',
    role: 'SHUTTLE_DRIVER',
    company_id: 1,
    account_status: 'ACTIVE' as const,
    enabled_services: {
      shuttle: true,
      chauffeur: false,
    },
    avatar: undefined,
  },
] as const satisfies readonly MockUser[];

// 2) Ride Data (Passenger/Chauffeur)
export const activeRide = {
  id: 'ride_active_1',
  status: 'EN_ROUTE',
  etaMinutes: 3,
  origin: { label: 'Dolmen Mall Clifton' },
  destination: { label: 'I.I. Chundrigar Road' },
  driver: {
    id: 'u_driver_1',
    name: 'Ali Hassan',
    rating: 4.9,
  },
  car: {
    model: 'Toyota Corolla',
    color: 'White',
    plate: 'KHI-2023',
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


