import type { UserRole } from '../core/types/navigation';
import type { ShuttleTripForEmployee } from '../features/employee/services/employeeShuttleApi';

export type MockUser = {
  id: string;
  email: string;
  password: string;
  full_name: string;
  phone: string;
  role: UserRole;
  company_id: number | null;
  account_status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  enabled_services: {
    shuttle: boolean;
    chauffeur: boolean;
  } | null;
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

// ─────────────────────────────────────────────────────────────────────────────
// 4) Employee Shuttle Screen — mock shuttle trips (ShuttleEmployee.tsx)
//    Matches the shape returned by GET /shuttle-trips/for-employee,
//    including the new my_pickup_stop_id / my_pickup_stop fields.
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_ROUTE_STOPS = [
  {
    id: 4,
    route_id: 2,
    name: 'Clifton Phase 1',
    sequence_order: 1,
    morning_eta: '08:00',
    evening_eta: '18:00',
    lat: 24.873044,
    lng: 67.002354,
    stop_type: 'PICKUP' as const,
  },
  {
    id: 5,
    route_id: 2,
    name: 'A-One Snacks Phase 2',
    sequence_order: 2,
    morning_eta: '08:15',
    evening_eta: '18:15',
    lat: 24.859338,
    lng: 66.994114,
    stop_type: 'PICKUP' as const,
  },
  {
    id: 6,
    route_id: 2,
    name: 'Tower (Destination)',
    sequence_order: 3,
    morning_eta: '08:35',
    evening_eta: '18:35',
    lat: 24.867437,
    lng: 67.029305,
    stop_type: 'OFFICE' as const,
  },
];

const MOCK_ROUTE = {
  id: 2,
  name: 'Clifton to Tower',
  vehicles: {
    id: 12,
    plate_number: 'ADD-1234',
    make: 'SUZUKI',
    model: 'Bolan',
  },
  route_stops: MOCK_ROUTE_STOPS,
};

const MOCK_DRIVER = {
  id: 'd3dc467d-706d-4f50-b52c-a8c26db84ef5',
  full_name: 'Sajjad Hussain',
  phone: '03162211320',
  profile_picture_url: null,
};

/** The employee's assigned pickup stop (second stop on the route) */
const MY_PICKUP_STOP = MOCK_ROUTE_STOPS[1]; // A-One Snacks Phase 2

export const mockShuttleTrips: ShuttleTripForEmployee[] = [
  {
    id: 10,
    route_id: 2,
    driver_id: MOCK_DRIVER.id,
    trip_date: new Date().toISOString(),
    direction: 'MORNING',
    status: 'STARTED',
    started_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // started 10 min ago
    completed_at: null,
    current_stop_id: 4, // driver is at Clifton Phase 1
    current_stop_arrived_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    my_pickup_stop_id: MY_PICKUP_STOP.id,
    my_pickup_stop: MY_PICKUP_STOP,
    routes: MOCK_ROUTE,
    users: MOCK_DRIVER,
  },
  {
    id: 11,
    route_id: 2,
    driver_id: MOCK_DRIVER.id,
    trip_date: new Date().toISOString(),
    direction: 'EVENING',
    status: 'SCHEDULED',
    started_at: null,
    completed_at: null,
    current_stop_id: null,
    current_stop_arrived_at: null,
    my_pickup_stop_id: MY_PICKUP_STOP.id,
    my_pickup_stop: MY_PICKUP_STOP,
    routes: MOCK_ROUTE,
    users: MOCK_DRIVER,
  },
  {
    id: 9,
    route_id: 2,
    driver_id: MOCK_DRIVER.id,
    trip_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // yesterday
    direction: 'MORNING',
    status: 'COMPLETED',
    started_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
    current_stop_id: 6,
    current_stop_arrived_at: new Date(Date.now() - 23.5 * 60 * 60 * 1000).toISOString(),
    my_pickup_stop_id: MY_PICKUP_STOP.id,
    my_pickup_stop: MY_PICKUP_STOP,
    routes: MOCK_ROUTE,
    users: MOCK_DRIVER,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 5) RideActive screen — mock data for the active ride bottom sheet
// ─────────────────────────────────────────────────────────────────────────────
export const mockActiveShuttleRide = {
  tripId: 10,
  driver: {
    name: 'Sajjad Hussain',
    initials: 'SJ',
    phone: '03162211320',
  },
  vehicle: {
    plate: 'ADD-1234',
    make: 'SUZUKI',
    model: 'Bolan',
    displayName: 'Suzuki Bolan',
  },
  /** Simulated driver coordinate (Clifton area) */
  driverCoord: { latitude: 24.873044, longitude: 67.002354 },
  /** ETA display text */
  eta: 'ARRIVING IN 5 MIN',
  /** The employee's pickup stop */
  myPickupStop: MY_PICKUP_STOP,
} as const;
