src/
├─ core/
│  ├─ theme/
│  │  ├─ colors.ts
│  │  ├─ typography.ts
│  │  ├─ spacing.ts
│  │  ├─ shadows.ts
│  │  ├─ radii.ts
│  │  └─ index.ts
│  ├─ hooks/
│  │  ├─ useAuth.ts
│  │  ├─ useAppTheme.ts
│  │  ├─ useDebounce.ts
│  │  └─ index.ts
│  ├─ utils/
│  │  ├─ format.ts
│  │  ├─ validators.ts
│  │  ├─ permissions.ts
│  │  ├─ storage.ts
│  │  └─ index.ts
│  ├─ config/
│  │  ├─ env.ts
│  │  ├─ endpoints.ts
│  │  └─ index.ts
│  ├─ types/
│  │  ├─ api.ts
│  │  ├─ navigation.ts
│  │  └─ index.ts
│  └─ services/
│     ├─ api/
│     │  ├─ client.ts
│     │  ├─ interceptors.ts
│     │  └─ index.ts
│     ├─ location/
│     │  ├─ permissions.ts
│     │  └─ index.ts
│     └─ index.ts
│
├─ components/
│  ├─ atoms/
│  │  ├─ Button/
│  │  │  ├─ Button.tsx
│  │  │  ├─ styles.ts
│  │  │  └─ index.ts
│  │  ├─ Input/
│  │  │  ├─ Input.tsx
│  │  │  ├─ styles.ts
│  │  │  └─ index.ts
│  │  ├─ Text/
│  │  │  ├─ Text.tsx
│  │  │  └─ index.ts
│  │  └─ index.ts
│  ├─ molecules/
│  │  ├─ Card/
│  │  │  ├─ Card.tsx
│  │  │  ├─ styles.ts
│  │  │  └─ index.ts
│  │  ├─ ListItem/
│  │  │  ├─ ListItem.tsx
│  │  │  └─ index.ts
│  │  └─ index.ts
│  ├─ organisms/
│  │  ├─ Header/
│  │  │  ├─ Header.tsx
│  │  │  └─ index.ts
│  │  ├─ EmptyState/
│  │  │  ├─ EmptyState.tsx
│  │  │  └─ index.ts
│  │  └─ index.ts
│  └─ index.ts
│
├─ features/
│  ├─ auth/
│  │  ├─ screens/
│  │  │  ├─ WelcomeScreen.tsx
│  │  │  ├─ LoginScreen.tsx
│  │  │  ├─ OTPVerifyScreen.tsx
│  │  │  └─ RoleSelectScreen.tsx
│  │  ├─ components/
│  │  │  ├─ AuthHeader.tsx
│  │  │  └─ index.ts
│  │  ├─ services/
│  │  │  ├─ auth.api.ts
│  │  │  └─ index.ts
│  │  ├─ store/
│  │  │  ├─ auth.slice.ts
│  │  │  └─ index.ts
│  │  ├─ types.ts
│  │  └─ index.ts
│  │
│  ├─ chauffeur/
│  │  ├─ screens/
│  │  │  ├─ ChauffeurHomeScreen.tsx
│  │  │  ├─ TripRequestsScreen.tsx
│  │  │  ├─ ActiveTripScreen.tsx
│  │  │  ├─ EarningsScreen.tsx
│  │  │  └─ ProfileScreen.tsx
│  │  ├─ components/
│  │  │  ├─ TripCard.tsx
│  │  │  ├─ PassengerInfoCard.tsx
│  │  │  └─ index.ts
│  │  ├─ services/
│  │  │  ├─ chauffeur.api.ts
│  │  │  └─ index.ts
│  │  ├─ store/
│  │  │  ├─ chauffeur.slice.ts
│  │  │  └─ index.ts
│  │  ├─ types.ts
│  │  └─ index.ts
│  │
│  ├─ shuttle/
│  │  ├─ screens/
│  │  │  ├─ ShuttleHomeScreen.tsx
│  │  │  ├─ RouteOverviewScreen.tsx
│  │  │  ├─ StopsScreen.tsx
│  │  │  ├─ PassengerManifestScreen.tsx
│  │  │  └─ ProfileScreen.tsx
│  │  ├─ components/
│  │  │  ├─ RouteCard.tsx
│  │  │  ├─ StopCard.tsx
│  │  │  └─ index.ts
│  │  ├─ services/
│  │  │  ├─ shuttle.api.ts
│  │  │  └─ index.ts
│  │  ├─ store/
│  │  │  ├─ shuttle.slice.ts
│  │  │  └─ index.ts
│  │  ├─ types.ts
│  │  └─ index.ts
│  │
│  └─ passenger/
│     ├─ screens/
│     │  ├─ PassengerHomeScreen.tsx
│     │  ├─ BookRideScreen.tsx
│     │  ├─ MyTripsScreen.tsx
│     │  ├─ TripDetailsScreen.tsx
│     │  └─ ProfileScreen.tsx
│     ├─ components/
│     │  ├─ RideOptionCard.tsx
│     │  ├─ TripStatusBadge.tsx
│     │  └─ index.ts
│     ├─ services/
│     │  ├─ passenger.api.ts
│     │  └─ index.ts
│     ├─ store/
│     │  ├─ passenger.slice.ts
│     │  └─ index.ts
│     ├─ types.ts
│     └─ index.ts
│
├─ navigation/
│  ├─ stacks/
│  │  ├─ AuthStack.tsx
│  │  ├─ ChauffeurStack.tsx
│  │  ├─ ShuttleStack.tsx
│  │  ├─ PassengerStack.tsx
│  │  └─ RootStack.tsx
│  ├─ tabs/
│  │  ├─ ChauffeurTabs.tsx
│  │  ├─ ShuttleTabs.tsx
│  │  └─ PassengerTabs.tsx
│  ├─ guards/
│  │  ├─ RoleGate.tsx
│  │  └─ AuthGate.tsx
│  └─ index.ts
│
├─ store/
│  ├─ rootReducer.ts
│  ├─ store.ts
│  └─ index.ts
│
├─ assets/
│  ├─ icons/
│  ├─ images/
│  └─ fonts/
│
├─ i18n/
│  ├─ locales/
│  │  ├─ en.json
│  │  └─ index.ts
│  └─ index.ts
│
├─ App.tsx
└─ index.ts