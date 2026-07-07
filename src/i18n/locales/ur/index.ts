import { common } from './common';
import { auth } from './auth';
import { shuttle } from './shuttle';
import { chauffeur } from './chauffeur';
import { employee } from './employee';

export const ur = {
  common,
  auth,
  shuttle,
  chauffeur,
  employee,
} as const;
