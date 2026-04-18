type LatLng = {
  latitude: number;
  longitude: number;
};

const ROUTES_ENDPOINT =
  'https://routes.googleapis.com/directions/v2:computeRoutes';

import { Platform } from 'react-native';

const API_KEY = Platform.OS === 'ios'
  ? process.env.EXPO_PUBLIC_IOS_GOOGLE_API_KEY
  : process.env.EXPO_PUBLIC_ANDROID_GOOGLE_API_KEY;

// Hard-coded waypoints for the current demo route.
const STOP_1: LatLng = {
  latitude: 24.935432,
  longitude: 67.097292,
};

const STOP_2: LatLng = {
  latitude: 24.935,
  longitude: 67.10527,
};

// Optional: known-good encoded polyline captured from a live response.
// Uncomment the early-return in `fetchRoutePolyline` below to use this for mocking.
// LOG  [googleRoutes] Encoded polyline:
// s}cwC_~oxK_BmBgB_CaEeFgCqDmH}KyJcNc@VkAlAeE|E_FrFiDrD}CtDeBpBKOlAwAn@}@sAeBuAlAQ^aEpDs@t@WLmE`Eg@d@g@t@o@n@rAdBV\
const DEBUG_ENCODED_POLYLINE =
  "s}cwC_~oxKKOUWWYY]CCGIm@{@y@cA}@gAgAuAA??Ay@eAgA{A_AuAcA}AoAhA{CnC}ArAs@p@}DnDwAlAr@|@a@Zq@l@C@BAp@m@`@[s@}@vAmA|DoDr@q@|AsAzCoCnAiAaBeCU_@Y_@S]cA{AeAyAW]W]m@}@W[W_@iA_BqAgBIKKUXQHNBF[Nc@VSRc@b@STgApA}BjC_FrFwBzBq@v@kAxAg@j@CBIJ[^eBpBKOlAwAXe@TWa@g@OSa@i@q@l@c@^Q^IHi@b@a@^c@^c@`@MJUTa@b@QPWL_BzAcA~@EDED[VA@MJKJMLg@t@o@n@`@d@X^V^V"

export async function fetchRoutePolyline(
  origin: LatLng,
  destination: LatLng,
): Promise<LatLng[]> {
  return decodePolyline(DEBUG_ENCODED_POLYLINE);
}


if (!API_KEY) {
  // eslint-disable-next-line no-console
  console.warn(
    '[googleRoutes] Missing platform Google API key; live route requests will fail.',
  );
}

function decodePolyline(encoded: string): LatLng[] {
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;
  const coordinates: LatLng[] = [];

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coordinates.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return coordinates;
}
// export async function fetchRoutePolyline(
//   origin: LatLng,
//   destination: LatLng,
// ): Promise<LatLng[]> {
//   // --- Mock path for later ---
//   // return decodePolyline(DEBUG_ENCODED_POLYLINE);

//   if (!API_KEY) {
//     return [];
//   }

//   const body = {
//     origin: {
//       location: {
//         latLng: {
// longitude: 67.0944149
// latitude: 24.9268883
//         },
//       },
//     },

//     intermediates: [
//       {
//         location: { latLng: { latitude: STOP_1.latitude, longitude: STOP_1.longitude } },
//       },
//       {
//         location: { latLng: { latitude: STOP_2.latitude, longitude: STOP_2.longitude } },
//       },
//     ],
//     destination: {
//       location: {
//         latLng: {
//    latitude: 24.9291421,
// longitude: 67.0973605,
//         },
//       },
//     },
//     travelMode: 'DRIVE',
//     routingPreference: 'TRAFFIC_AWARE',
//     polylineQuality: 'HIGH_QUALITY',   // ← 
//     computeAlternativeRoutes: false,
//     routeModifiers: {
//       avoidTolls: false,
//       avoidHighways: false,
//       avoidFerries: false,
//     },
//     languageCode: 'en-US',
//     units: 'METRIC',
//   };

//   const response = await fetch(ROUTES_ENDPOINT, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       'X-Goog-Api-Key': API_KEY,
//       'X-Goog-FieldMask': 'routes.polyline.encodedPolyline',
//     },
//     body: JSON.stringify(body),
//   });

//   if (!response.ok) {
//     // eslint-disable-next-line no-console
//     console.warn(
//       '[googleRoutes] Failed to fetch route:',
//       response.status,
//       response.statusText,
//     );
//     return [];
//   }

//   const json = (await response.json()) as {
//     routes?: { polyline?: { encodedPolyline?: string } }[];
//   };

//   const encoded = json.routes?.[0]?.polyline?.encodedPolyline;
//   if (!encoded) {
//     return [];
//   }

//   // Log encoded polyline so it can be reused for mocking.
//   // eslint-disable-next-line no-console
//   console.log('[googleRoutes] Encoded polyline:', encoded);

// return decodePolyline(encoded);
// }