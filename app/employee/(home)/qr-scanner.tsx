import { useRouter } from 'expo-router';

import { EmployeeQrScannerScreen } from '@/features/employee/screens/EmployeeQrScannerScreen'
export default function EmployeeQrScannerRoute() {
  const router = useRouter();

  return (
    <EmployeeQrScannerScreen
      onClose={() => router.back()}
      onSuccess={() => router.push('/employee')}
    />
  );
}

