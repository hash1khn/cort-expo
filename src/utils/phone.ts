export const PHONE_MAX_LENGTH = 11;
export const PHONE_DIGITS_REGEX = /^\d{11}$/;
export const PHONE_VALIDATION_MESSAGE = 'Phone number must be exactly 11 digits';

export function sanitizePhoneInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, PHONE_MAX_LENGTH);
}

export function getPhoneValidationError(
  value: string | null | undefined,
  options: { required?: boolean } = {},
): string | null {
  const digits = (value ?? '').replace(/\D/g, '');
  if (!digits) {
    return options.required ? 'Phone number is required' : null;
  }
  if (!PHONE_DIGITS_REGEX.test(digits)) {
    return PHONE_VALIDATION_MESSAGE;
  }
  return null;
}
