import React, { useCallback } from 'react';
import { Linking, Platform, Pressable, Text, View } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { ChauffeurRide } from '../store/ride.slice';

type ChauffeurDetailsProps = {
  chauffeurRideLoading?: boolean;
  chauffeurRide: ChauffeurRide | null;
 
};

export function ChauffeurDetails({
  chauffeurRideLoading,
  chauffeurRide,

}: ChauffeurDetailsProps) {

  const handleCallCaptain = useCallback(() => {
    const phoneNumber = chauffeurRide?.driver?.phone;
    if (phoneNumber) {
      const phoneUrl = Platform.OS === 'ios' 
        ? `telprompt:${phoneNumber}` 
        : `tel:${phoneNumber}`;
      Linking.openURL(phoneUrl).catch((err) => {
        console.error('Error opening phone dialer:', err);
      });
    }
  }, [chauffeurRide?.driver?.phone]);


  return (
    <View className="absolute top-0">
      {/* Header Section */}
      <View className="px-5 pb-4 ">
        <Text className="text-3xl font-bold text-gray-900 ">
          Get ready, your chauffeur is on the way
        </Text>
      </View>

      {/* Driver Info Section */}
      <View className="px-5 pb-4 my-2 flex-row items-center">
        {/* Driver Avatar */}
        {chauffeurRideLoading ? (
          <View className="w-14 h-14 rounded-full bg-gray-200 mr-4" />
        ) : (
          <View className="w-14 h-14 rounded-full bg-orange-500 items-center justify-center mr-4">
            <Text className="font-bold text-xl text-white">
              {chauffeurRide?.driver?.full_name?.charAt(0) ?? 'C'}
            </Text>
          </View>
        )}

        {/* Driver Details */}
        <View className="flex-1">
          {chauffeurRideLoading ? (
            <>
              <View className="h-4 w-32 bg-gray-200 rounded-full mb-2" />
              <View className="h-3 w-40 bg-gray-200 rounded-full mb-2" />
              <View className="h-3 w-24 bg-gray-200 rounded-full" />
            </>
          ) : (
            <>
              {/* Driver Name & Rating */}
              <View className="flex-row items-center mb-1">
                <Text className="text-base font-semibold text-gray-600 mr-2">
                  {chauffeurRide?.driver?.full_name ?? 'Your Driver'}
                </Text>
              </View>

              {/* Vehicle Info */}
              <View className="flex-row items-center ">
                <View className="flex-row items-center flex-shrink ">
                  <View
                    className="h-5 w-5 rounded-full mr-2"
                    style={{
                      backgroundColor: chauffeurRide?.vehicle?.color
                        ? chauffeurRide.vehicle.color.toLowerCase()
                        : 'white',
                    }}
                  />
                  <Text
                    className="text-base font-semibold text-gray-800"
                    numberOfLines={1}
                  >
                    {chauffeurRide?.vehicle
                      ? `${chauffeurRide.vehicle.color ?? 'White'} ${chauffeurRide.vehicle.make} ${chauffeurRide.vehicle.model}`
                      : 'White Lexus ES350'}
                  </Text>
                </View>

                <View className="ml-3 px-2 py-1 rounded-md border border-gray-300 bg-white">
                  <Text className="text-xs font-semibold">
                    {chauffeurRide?.vehicle?.plate_number ?? 'L21758'}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Action Buttons */}
      {!chauffeurRideLoading && (
        <View className="px-5 pb-5">
          <Pressable
            onPress={handleCallCaptain}
            className="flex-row items-center justify-center bg-gray-100 rounded-xl py-3.5 active:bg-gray-200"
          >
            <Text className="text-sm font-semibold text-gray-900 mr-2">📞</Text>
            <Text className="text-sm font-semibold text-gray-900">Call Driver</Text>
          </Pressable>
        </View>
      )}

      {/* Trip Details Section */}
      {!chauffeurRideLoading && (
        <View className="border-t-8 border-gray-200 px-5 py-4">
          <Text className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
            Trip details
          </Text>

          {/* Pickup Location */}
          <View className="flex-row mb-3">
            <View className="mr-3 pt-1">
              <View className="w-4 h-4 rounded-full border-2 border-orange-500 bg-white" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-gray-900 mb-1">
                Pickup
              </Text>
              <Text className="text-sm font-normal w-full text-gray-600 text-ellipsis">
                {chauffeurRide?.pickupAddress ?? 'Fast university'}
              </Text>
            </View>
          </View>

          {/* Downward Arrow */}
          <View className="flex-row mb-5">
            <View className="mr-3 items-center text-gray-500">
              <FontAwesome6 name="arrow-down-long" size={17} color="#6b7280" />
            </View>
          </View>

          {/* Destination Location */}
          <View className="flex-row">
            <View className="mr-3 pt-1">
              <View className="w-4 h-4 rounded-full bg-orange-500" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-gray-900 mb-1">
                Destination
              </Text>
              <Text className="text-sm font-normal text-gray-600">
                Destination Address
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
