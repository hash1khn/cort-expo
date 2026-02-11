import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// import { X } from 'lucide-react-native';

const Abc = () => {
  return (
    <SafeAreaView className='bg-white flex-1 '>
        {/* Header */}
        <View className="flex-row justify-between items-center  py-4 border-b border-brand-border">
          <Text className="text-[17px] font-semibold text-brand-black">Reminder</Text>
          {/* <TouchableOpacity className="p-1">
            <X size={24} color="#000" strokeWidth={2} />
          </TouchableOpacity> */}
        </View>
        {/* Image Section */}
        <View className="items-center py-6 bg-white">
          <View className="w-28 h-28 rounded-3xl overflow-hidden bg-gray-200">
            <Image
              source={{ uri: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop" }}
              className="w-full h-full"
              resizeMode="cover"
            />
          </View>
        </View>
        {/* General Information Section */}
        <View className="overflow-hidden rounded-ios bg-[#F5F5F5]">
      
          {/* 1. Header Strip */}
          <View className="bg-[#eaeaea] px-4 py-3">
            <Text className="text-[13px] font-semibold text-brand-black">
              General information
            </Text>
          </View>
          {/* 2. Body Content */}
          <View className="bg-[#F5F5F5]">
            {/* Row: Relative to */}
            <View className="flex-row justify-between items-center px-4 py-3 border-b border-brand-border">
              <Text className="text-[17px] text-brand-black">Relative to</Text>
              <Text className="text-[17px] text-brand-gray">Nike AIR Zoom Pegasus</Text>
            </View>
            {/* Row: Date */}
            <View className="flex-row justify-between items-center px-4 py-3 border-b border-brand-border">
              <Text className="text-[17px] text-brand-black">Date</Text>
              <Text className="text-[17px] text-brand-gray">Jul 23, 2026</Text>
            </View>
            {/* Row: Time */}
            <View className="flex-row justify-between items-center px-4 py-3">
              <Text className="text-[17px] text-brand-black">Time</Text>
              <Text className="text-[17px] text-brand-gray">12:57 PM</Text>
            </View>
          </View>
        </View>
    </SafeAreaView>
  );
};

export default Abc;