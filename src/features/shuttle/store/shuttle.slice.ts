import { create } from 'zustand';

import type { AbsentReason, ManifestPassenger, ShuttleMode, ShuttleShift, ShuttleStop } from '../types';

type ShuttleState = {
  shift: ShuttleShift;
  vehicleLabel: string;
  routeLabel: string;
  routePathLabel: string; // "Office ➔ Stop 1 ➔ Stop 2"

  mode: ShuttleMode;
  rideStarted: boolean;
  /** True after returning from RideInProgress (outbound Clifton→Tower completed) */
  outboundRideCompleted: boolean;

  stops: readonly ShuttleStop[];
  activeStopId: string | null;

  passengers: readonly ManifestPassenger[];

  setMode: (mode: ShuttleMode) => void;
  startRide: () => void;
  resetRide: () => void;
  setOutboundRideCompleted: (completed: boolean) => void;

  markBoarded: (passengerId: string, at?: Date) => void;
  markAbsent: (passengerId: string, reason: AbsentReason, at?: Date) => void;
  confirmDropOffForStop: (stopId: string, at?: Date) => void;
};

const demoStops: readonly ShuttleStop[] = [
  { id: 'stop_office', name: 'Office' },
  { id: 'stop_1', name: 'Stop 1' },
  { id: 'stop_2', name: 'Stop 2' },
  { id: 'stop_tower', name: 'Tower Station' },
];

const demoPassengers: readonly ManifestPassenger[] = [
  { id: 'p_ali', name: 'Ali K.', destinationLabel: 'Stop 1', stopId: 'stop_1', status: 'PENDING' },
  { id: 'p_hashir', name: 'Hashir', destinationLabel: 'Tower Station', stopId: 'stop_tower', status: 'PENDING' },
  { id: 'p_bilal', name: 'Bilal', destinationLabel: 'Tower Station', stopId: 'stop_tower', status: 'PENDING' },
  { id: 'p_sana', name: 'Sana', destinationLabel: 'Stop 2', stopId: 'stop_2', status: 'PENDING' },
];

function iso(at: Date) {
  return at.toISOString();
}

export const useShuttleStore = create<ShuttleState>((set) => ({
  shift: 'EVENING',
  vehicleLabel: 'Van-88',
  routeLabel: 'Evening Return',
  routePathLabel: 'Office ➔ Stop 1 ➔ Stop 2',

  mode: 'DROPOFF',
  rideStarted: false,
  outboundRideCompleted: false,

  stops: demoStops,
  activeStopId: null,

  passengers: demoPassengers,

  setMode: (mode) => set({ mode }),

  startRide: () =>
    set((state) => {
      if (state.rideStarted) return state;
      return { rideStarted: true };
    }),

  resetRide: () =>
    set({
      mode: 'DROPOFF',
      rideStarted: false,
      activeStopId: null,
      passengers: demoPassengers,
    }),

  setOutboundRideCompleted: (completed) => set({ outboundRideCompleted: completed }),

  markBoarded: (passengerId, at = new Date()) =>
    set((state) => ({
      passengers: state.passengers.map((p) =>
        p.id !== passengerId
          ? p
          : {
              ...p,
              status: 'BOARDED',
              boardedAt: iso(at),
              absentReason: undefined,
            }
      ),
    })),

  markAbsent: (passengerId, reason, at = new Date()) =>
    set((state) => ({
      passengers: state.passengers.map((p) =>
        p.id !== passengerId
          ? p
          : {
              ...p,
              status: 'ABSENT',
              absentReason: reason,
              boardedAt: undefined,
            }
      ),
    })),

  confirmDropOffForStop: (stopId, at = new Date()) =>
    set((state) => ({
      passengers: state.passengers.map((p) => {
        const matchesStop = p.stopId === stopId;
        const eligible = p.status === 'BOARDED';
        if (!matchesStop || !eligible) return p;
        return { ...p, status: 'COMPLETED', completedAt: iso(at) };
      }),
      activeStopId: stopId,
    })),
}));


