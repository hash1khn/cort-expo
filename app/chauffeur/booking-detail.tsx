import { BookingDetailScreen } from '@/features/chauffeur/screens/BookingDetailScreen';
import { DrawerScreenWrapper } from '@/features/shared/components/DrawerScreenWrapper';

export default function BookingDetailRoute() {
  return (
    <DrawerScreenWrapper>
      <BookingDetailScreen />
    </DrawerScreenWrapper>
  );
}
