import { useRouter } from 'expo-router';

import { EmployeeQrScannerScreen } from '../../src/features/employee/screens/EmployeeQrScannerScreen';

export default function EmployeeQrScannerRoute() {
  const router = useRouter();

  return (
    <EmployeeQrScannerScreen
      onClose={() => router.back()}
      onSuccess={() => router.replace('/(employee)/boarding-success')}
    />
  );
}

