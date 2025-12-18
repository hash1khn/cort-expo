export type ShuttleShift = 'MORNING' | 'EVENING';
export type ShuttleMode = 'PICKUP' | 'DROPOFF';

export type PassengerStatus = 'PENDING' | 'BOARDED' | 'ABSENT' | 'COMPLETED';
export type AbsentReason = 'LEFT_EARLY' | 'SICK_LEAVE' | 'NO_SHOW';

export type ShuttleStop = {
  id: string;
  name: string;
};

export type ManifestPassenger = {
  id: string;
  name: string;
  destinationLabel: string; // e.g. "Stop 1"
  stopId: string;
  status: PassengerStatus;
  absentReason?: AbsentReason;
  boardedAt?: string; // ISO timestamp
  completedAt?: string; // ISO timestamp
};


