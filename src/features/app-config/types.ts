export type MobileAppConfig = {
  maintenanceEnabled: boolean;
  maintenanceMessage: string | null;
  iosMinVersion: string | null;
  androidMinVersion: string | null;
  iosStoreUrl: string | null;
  androidStoreUrl: string | null;
  forceUpdateMessage: string | null;
};

export type AppConfigGate =
  | { kind: 'maintenance'; message: string | null }
  | { kind: 'force-update'; message: string | null; storeUrl: string | null };
