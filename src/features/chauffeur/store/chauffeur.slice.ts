import { create } from 'zustand';

export type ChauffeurBooking = {
  id: string;
  passengerName: string;
  pickup: string;
  dropoff: string;
  pickupTime: string;
  dateLabel: string; // "Today" | "Tomorrow" | date string
  isOutstation?: boolean;
};

type ChauffeurState = {
  bookings: ChauffeurBooking[];
  selectedBookingId: string | null;
  meterPhotoUri: string | null;
  setSelectedBooking: (id: string | null) => void;
  setMeterPhoto: (uri: string | null) => void;
  clearTrip: () => void;
};

const MOCK_BOOKINGS: ChauffeurBooking[] = [
  {
    id: 'b1',
    passengerName: 'Sarah Jenkins',
    pickup: 'Jinnah Terminal 2',
    dropoff: 'MCB tower',
    pickupTime: '2:30 PM',
    dateLabel: 'Today',
  },
  {
    id: 'b2',
    passengerName: 'Michael Chen',
    pickup: 'Marriot Hotel',
    dropoff: 'Pc ',
    pickupTime: '5:15 PM',
    dateLabel: 'Today',
  },
  {
    id: 'b3',
    passengerName: 'Abdul Aslam',
    pickup: 'Port Qasim',
    dropoff: 'Landhi ',
    pickupTime: '9:00 AM',
    dateLabel: 'Tomorrow',
    isOutstation: true,
  },
];

export const useChauffeurStore = create<ChauffeurState>((set) => ({
  bookings: MOCK_BOOKINGS,
  selectedBookingId: null,
  meterPhotoUri: null,

  setSelectedBooking: (id) => set({ selectedBookingId: id }),

  setMeterPhoto: (uri) => set({ meterPhotoUri: uri }),

  clearTrip: () =>
    set({ selectedBookingId: null, meterPhotoUri: null }),
}));



