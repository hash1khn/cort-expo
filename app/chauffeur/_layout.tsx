import { Drawer } from 'expo-router/drawer';
import { View } from 'react-native';
import { ChauffeurDrawerContent } from '@/features/chauffeur/components/ChauffeurDrawerContent';
import { LanguageProvider } from '@/features/shared/context/LanguageContext';

const hideDrawerItem = { drawerItemStyle: { display: 'none' as const } };

export default function ChauffeurHomeLayout() {
  return (
    <LanguageProvider>
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
          drawerContent={(props) => <ChauffeurDrawerContent {...props} />}
        >
          <Drawer.Screen name="index" options={hideDrawerItem} />
          <Drawer.Screen name="active-trip" options={hideDrawerItem} />
          <Drawer.Screen name="end-ride" options={hideDrawerItem} />
        </Drawer>
      </View>
    </LanguageProvider>
  );
}
