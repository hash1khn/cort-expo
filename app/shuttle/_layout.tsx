import { Drawer } from 'expo-router/drawer';
import { View } from 'react-native';
import { ShuttleDrawerContent } from '@/features/shuttle/components/ShuttleDrawerContent';

const hideDrawerItem = { drawerItemStyle: { display: 'none' as const } };

export default function ShuttleLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: '#1F1F1D' }}>
      <Drawer
        screenOptions={{
          headerShown: false,
          drawerPosition: 'left',
          drawerType: 'back',
          overlayColor: 'transparent',
          sceneStyle: { backgroundColor: 'transparent' },
          drawerStyle: { backgroundColor: 'transparent', width: '65%' },
        }}
        drawerContent={(props) => <ShuttleDrawerContent {...props} />}
      >
        <Drawer.Screen name="index" options={hideDrawerItem} />
        <Drawer.Screen name="ride" options={hideDrawerItem} />
        <Drawer.Screen name="return" options={hideDrawerItem} />
      </Drawer>
    </View>
  );
}
