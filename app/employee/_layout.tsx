// import { Drawer } from 'expo-router/drawer';
// import { CustomDrawerContent } from '@/features/employee/components/CustomDrawerContent';

// export default function Layout() {
//   return (
//     <Drawer
//       screenOptions={{ headerShown: false }}
//       drawerContent={(props) => <CustomDrawerContent {...props} />}
//     >
//       <Drawer.Screen
//         name="(home)" // This is the name of the page and must match the url from root
//         options={{
//           drawerLabel: 'Home',
//           title: 'Home',
//         }}
//       />
//       <Drawer.Screen
//         name="profile"
//         options={{
//           drawerLabel: 'User',
//           title: 'Profile',
//         }}
//       />
//     </Drawer>
//   );
// }
import { Stack } from 'expo-router';


export default function Layout() {
  return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(home)" />
        {/* <Stack.Screen name="chauffeur-details" />
        <Stack.Screen name="qr-scanner" /> */}
        <Stack.Screen name="profile" />
       
      </Stack>
  );
}