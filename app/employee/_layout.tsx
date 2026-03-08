import { Drawer } from 'expo-router/drawer';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { EmployeeDrawerContent } from '@/features/employee/components/EmployeeDrawerContent';

const hideDrawerItem = { drawerItemStyle: { display: 'none' as const } };

export default function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: '#1F1F1D' }}>
        <Drawer
          screenOptions={{
            headerShown: false,
            drawerPosition: 'left',
            drawerType: 'back',
            overlayColor: 'transparent',
            sceneStyle: { backgroundColor: 'transparent' },
            drawerStyle: { backgroundColor: 'transparent', width: '60%' },
          }}
          drawerContent={(props) => <EmployeeDrawerContent {...props} />}
        >
          <Drawer.Screen name="index" options={hideDrawerItem} />
          <Drawer.Screen name="rides" options={hideDrawerItem} />
          <Drawer.Screen name="qr-scanner" options={hideDrawerItem} />
          <Drawer.Screen name="ride-details" options={hideDrawerItem} />
          <Drawer.Screen name="ride-active" options={hideDrawerItem} />
        </Drawer>
      </View>
    </GestureHandlerRootView>
  );
}
