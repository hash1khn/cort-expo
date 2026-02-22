import { Drawer } from 'expo-router/drawer';
import { LanguageProvider } from '@/features/shared/context/LanguageContext';
import { ShuttleDrawerContent } from '@/features/shuttle/components/ShuttleDrawerContent';

const hideDrawerItem = { drawerItemStyle: { display: 'none' as const } };

export default function ShuttleLayout() {
  return (
    <LanguageProvider>
      <Drawer
        screenOptions={{
          headerShown: false,
          drawerPosition: 'right',
          drawerStyle: { backgroundColor: '#1F1F1D' },
        }}
        drawerContent={(props) => <ShuttleDrawerContent {...props} />}
      >
        <Drawer.Screen name="index" options={hideDrawerItem} />
        <Drawer.Screen name="ride" options={hideDrawerItem} />
        <Drawer.Screen name="return" options={hideDrawerItem} />
        <Drawer.Screen name="profile" options={hideDrawerItem} />
        <Drawer.Screen name="settings" options={hideDrawerItem} />
      </Drawer>
    </LanguageProvider>
  );
}
