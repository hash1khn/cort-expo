import AsyncStorage from '@react-native-async-storage/async-storage';

import { activeRide, mockUsers, shuttleRoute } from './mockData';
import type { UserRole } from '../core/types/navigation';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type ChauffeurApplicationStatus = 'PENDING' | 'APPROVED';

type ChauffeurApplication = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  cnic?: string;
  licenseNumber?: string;
  password: string; // demo-only
  status: ChauffeurApplicationStatus;
  createdAt: string; // ISO
};

const STORAGE_KEYS = {
  chauffeurApps: 'cort.chauffeur_apps.v1',
} as const;

async function readChauffeurApps(): Promise<ChauffeurApplication[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.chauffeurApps);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ChauffeurApplication[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeChauffeurApps(apps: ChauffeurApplication[]) {
  await AsyncStorage.setItem(STORAGE_KEYS.chauffeurApps, JSON.stringify(apps));
}

export const mockApi = {
  async login(email: string, password: string) {
    await delay(1000);

    // 1) Built-in demo users
    const user = mockUsers.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    if (user) {
      // Return role and user object (minus password)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _pw, ...safeUser } = user;
      return {
        role: safeUser.role,
        user: {
          id: safeUser.id,
          email: safeUser.email,
          full_name: safeUser.full_name,
          phone: safeUser.phone,
          company_id: safeUser.company_id,
          account_status: safeUser.account_status,
          enabled_services: safeUser.enabled_services,
        },
      };
    }

    // 2) Chauffeur applications (persisted)
    const apps = await readChauffeurApps();
    const app = apps.find((a) => a.email.toLowerCase() === email.toLowerCase() && a.password === password);

    if (!app) {
      throw new Error('Invalid email or password');
    }

    if (app.status !== 'APPROVED') {
      throw new Error('Your chauffeur application is pending admin approval.');
    }

    return {
      role: 'CHAUFFEUR' as UserRole,
      user: {
        id: app.id,
        email: app.email,
        full_name: app.name,
        phone: app.phone || '+92300000000',
        company_id: 1,
        account_status: 'ACTIVE' as const,
        enabled_services: {
          shuttle: false,
          chauffeur: true,
        },
      },
    };
  },

  async submitChauffeurApplication(input: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    cnic?: string;
    licenseNumber?: string;
  }) {
    await delay(800);

    const email = input.email.trim().toLowerCase();
    if (!email) throw new Error('Email is required');

    // avoid collisions with built-in demo users
    const existsInMockUsers = mockUsers.some((u) => u.email.toLowerCase() === email);
    if (existsInMockUsers) {
      throw new Error('This email is already registered. Please log in.');
    }

    const apps = await readChauffeurApps();
    const exists = apps.some((a) => a.email.toLowerCase() === email);
    if (exists) {
      throw new Error('An application with this email already exists.');
    }

    const app: ChauffeurApplication = {
      id: `app_chauffeur_${Math.random().toString(16).slice(2, 10)}`,
      name: input.name.trim() || 'Driver',
      email,
      phone: input.phone?.trim() || undefined,
      cnic: input.cnic?.trim() || undefined,
      licenseNumber: input.licenseNumber?.trim() || undefined,
      password: input.password,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    await writeChauffeurApps([app, ...apps]);
    return { id: app.id, status: app.status };
  },

  async getChauffeurApplicationStatus(email: string) {
    await delay(250);
    const apps = await readChauffeurApps();
    const app = apps.find((a) => a.email.toLowerCase() === email.trim().toLowerCase());
    return app?.status ?? null;
  },

  async approveChauffeurApplication(email: string) {
    await delay(400);
    const target = email.trim().toLowerCase();
    const apps = await readChauffeurApps();
    const next = apps.map((a) => (a.email.toLowerCase() === target ? { ...a, status: 'APPROVED' as const } : a));
    await writeChauffeurApps(next);
    return true;
  },

  async fetchActiveRide() {
    await delay(500);
    return activeRide;
  },

  async fetchShuttleRoute() {
    await delay(500);
    return shuttleRoute;
  },
} as const;

