import { router } from 'expo-router';
import React from 'react';
import { View, Text, Image, ImageBackground, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// import { Bell, ArrowUpRight } from 'lucid-native';

const EmployeeHome = () => {
  const userName = "Ali";
 
  const goalProgress = 60;
  const goalText = "Your Goal is to own less than 5 things";

  const items = [
    {
      id: 1,
      name: "Nike AIR Zoom Pegasus",
      image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop"
    }
    
   
  ];

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row justify-between items-center px-6 pb-6">
        <View className="w-14 h-14 rounded-full bg-gray-300 overflow-hidden">
          <Image 
            source={{ uri: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop" }}
            className="w-full h-full"
          />
        </View>
        {/* <Pressable>
          <Bell size={28} color="#000" strokeWidth={2} />
        </Pressable> */}
      </View>

      {/* Main Content */}
      <View className="px-6">
        {/* Greeting and Stats */}
        <View className="mb-8">
          <Text className="text-2xl font-bold text-black ">
            Hi {userName},
          </Text>
          <Text className="text-2xl font-bold text-black">
            Your next ride is scheduled {'\n'} for
            <Text className="text-[#f47f00]"> 8:45 PM</Text>
            {' '}tomorrow{' '}
          </Text>
        </View>
       

        {/* Goal Section */}
        <View className="mb-4">
          <Text className="text-[17px] font-bold text-black mb-4">Upcoming</Text>
          
          <Pressable 
            className="rounded-2xl overflow-hidden"
          >
            <ImageBackground
              source={require('@/../assets/bannerbg.png')}
              className="rounded-3xl p-6"
              resizeMode="cover"
            >


<View className="rounded-3xl  p-6">

<View className="flex-row justify-between items-start">

  <View className="flex-1">

    {/* STATUS */}
    <Text className="text-white/80 text-sm mb-1">
      Shuttle • Arriving soon
    </Text>

    {/* TIME (HERO) */}
    <Text className="text-white text-5xl font-bold leading-tight mb-3">
      8:45 PM
    </Text>

    {/* ROUTE / PICKUP */}
    <Text className="text-white text-base font-medium mb-1">
      Block A → Head Office
    </Text>

    {/* SUBTEXT */}
    <Text className="text-white/80 text-sm">
      Boarding at Gate 3
    </Text>

  </View>

  {/* Optional subtle icon */}
  <View className="w-12 h-12 rounded-2xl bg-white/20 items-center justify-center">
    {/* Icon here depending on type */}
  </View>

</View>

</View>

            </ImageBackground>
          </Pressable>
        </View>
        <Pressable
                onPress={()=>router.push('/employee/ride-active')}
                className="flex-row items-center bg-gray-100 rounded-2xl p-4 mb-4"
              >
                <View className="w-16 h-16 rounded-2xl bg-white overflow-hidden mr-4">
                  {/* <Image 
                    source={{ uri: item.image }}
                    className="w-full h-full"
                    resizeMode="cover"
                  /> */}
                </View>
                <View >
                    
                    <Text className=" text-black text-lg font-semibold mb-1">
                      Chauffer ride to Lahore
                    </Text>
                    <Text className='text-[#666666] '>24th Feb, 08:00PM</Text>
                </View>
                
                {/* <ArrowUpRight size={24} color="#666" strokeWidth={2} /> */}
              </Pressable>
        {/* Quick Access Section */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-[17px] font-bold text-black">Recent</Text>
            <Pressable>
              <Text className="text-[#f47f00] text-base font-semibold">See all</Text>
            </Pressable>
          </View>

          {/* Items List */}
          <View className="gap-4">
            {items.map((item) => (
              <Pressable
                key={item.id}
                className="flex-row items-center bg-gray-100 rounded-2xl p-4"
                onPress={()=>router.push('/employee/ride-details')}
              >
                <View className="w-16 h-16 rounded-2xl bg-white overflow-hidden mr-4">
                  <Image 
                    source={{ uri: item.image }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                </View>
                
                <Text className="flex-1 text-black text-lg font-semibold">
                  {item.name}
                </Text>
                
                {/* <ArrowUpRight size={24} color="#666" strokeWidth={2} /> */}
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default EmployeeHome;