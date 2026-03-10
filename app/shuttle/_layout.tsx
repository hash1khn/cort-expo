import { Drawer } from 'expo-router/drawer';
import { View } from 'react-native';
import { LanguageProvider } from '@/features/shared/context/LanguageContext';
import { ShuttleDrawerContent } from '@/features/shuttle/components/ShuttleDrawerContent';

const hideDrawerItem = { drawerItemStyle: { display: 'none' as const } };

export default function ShuttleLayout() {
  return (
    <LanguageProvider>
      <View style={{ flex: 1, backgroundColor: '#1F1F1D' }}>
        <Drawer
          screenOptions={{
            headerShown: false,
            drawerPosition: 'left',
            drawerType: 'back', // the screen itself moves, drawer sits at back
            overlayColor: 'transparent', // remove dark overlay on home screen
            sceneStyle: { backgroundColor: 'transparent' }, // so we see the #1F1F1D base underneath
            drawerStyle: { backgroundColor: 'transparent', width: '65%' }, // decrease width so screen doesn't slide too far
          }}
          drawerContent={(props) => <ShuttleDrawerContent {...props} />}
        >
          <Drawer.Screen name="index" options={hideDrawerItem} />
          <Drawer.Screen name="ride" options={hideDrawerItem} />
          <Drawer.Screen name="return" options={hideDrawerItem} />
        </Drawer>
      </View>
    </LanguageProvider>
  );
}
