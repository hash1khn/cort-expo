import type { UserRole } from '../../../core/types/navigation';

export function getHomePathForRole(role: UserRole): string {
  switch (role) {
    case 'CHAUFFEUR':
      return '/chauffeur';
    case 'SHUTTLE_DRIVER':
      return '/shuttle';
    case 'EMPLOYEE':
      return '/employee';
    default:
      return '/(auth)/get-started';
  }
}
