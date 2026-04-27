import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

const KEYS = {
  EMAIL: 'cort_biometric_email',
  PASSWORD: 'cort_biometric_password',
  BIOMETRIC_ENABLED: 'cort_biometric_enabled',
  BIOMETRIC_PROMPTED: 'cort_biometric_prompted',
} as const;

export type BiometricType = 'faceid' | 'fingerprint' | 'iris' | null;

export const credentialStorage = {
  /**
   * Persist credentials in the secure enclave after the user opts in.
   */
  async saveCredentials(email: string, password: string): Promise<void> {
    if (Platform.OS === 'web') return;
    await SecureStore.setItemAsync(KEYS.EMAIL, email);
    await SecureStore.setItemAsync(KEYS.PASSWORD, password);
    await SecureStore.setItemAsync(KEYS.BIOMETRIC_ENABLED, 'true');
  },

  /**
   * True when there are persisted credentials ready to use.
   */
  async hasSavedCredentials(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    const enabled = await SecureStore.getItemAsync(KEYS.BIOMETRIC_ENABLED);
    const email = await SecureStore.getItemAsync(KEYS.EMAIL);
    return enabled === 'true' && email != null && email.length > 0;
  },

  /**
   * True when the device has compatible biometric hardware and enrolled data.
   */
  async isBiometricAvailable(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    const [hardware, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    return hardware && enrolled;
  },

  /**
   * Returns the primary biometric modality for the device so the UI can show
   * the correct icon (Face ID / Touch ID / Fingerprint).
   */
  async getBiometricType(): Promise<BiometricType> {
    if (Platform.OS === 'web') return null;
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'faceid';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'iris';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'fingerprint';
    }
    return null;
  },

  /**
   * Whether the user has already been asked to enable biometric login.
   * Used to show the opt-in prompt only once.
   */
  async hasBeenPrompted(): Promise<boolean> {
    if (Platform.OS === 'web') return true;
    const val = await SecureStore.getItemAsync(KEYS.BIOMETRIC_PROMPTED);
    return val === 'true';
  },

  async markAsPrompted(): Promise<void> {
    if (Platform.OS === 'web') return;
    await SecureStore.setItemAsync(KEYS.BIOMETRIC_PROMPTED, 'true');
  },

  /**
   * Triggers the OS biometric prompt and, on success, returns the stored
   * credentials. Throws on cancellation or failure so the caller can handle
   * messaging.
   */
  async getCredentialsWithBiometricPrompt(): Promise<{ email: string; password: string } | null> {
    if (Platform.OS === 'web') return null;

    const enabled = await SecureStore.getItemAsync(KEYS.BIOMETRIC_ENABLED);
    if (enabled !== 'true') return null;

    const biometricType = await this.getBiometricType();
    const promptMessage =
      biometricType === 'faceid'
        ? 'Use Face ID to sign in'
        : biometricType === 'iris'
        ? 'Use Iris to sign in'
        : 'Use fingerprint to sign in';

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
      fallbackLabel: 'Use Passcode',
    });

    if (!result.success) {
      if (result.error === 'user_cancel' || result.error === 'system_cancel') {
        throw new Error('cancelled');
      }
      throw new Error(result.error ?? 'Biometric authentication failed');
    }

    const email = await SecureStore.getItemAsync(KEYS.EMAIL);
    const password = await SecureStore.getItemAsync(KEYS.PASSWORD);

    if (!email || !password) return null;
    return { email, password };
  },

  /**
   * Removes all stored credentials (call on logout).
   */
  async clearCredentials(): Promise<void> {
    if (Platform.OS === 'web') return;
    await Promise.all([
      SecureStore.deleteItemAsync(KEYS.EMAIL),
      SecureStore.deleteItemAsync(KEYS.PASSWORD),
      SecureStore.deleteItemAsync(KEYS.BIOMETRIC_ENABLED),
    ]);
  },
};
