import { activeRide, mockUsers, shuttleRoute } from '../data/mockData';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const mockApi = {
  async login(email: string, password: string) {
    await delay(1000);

    const user = mockUsers.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Return the user object (minus password)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _pw, ...safeUser } = user;
    return safeUser;
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


