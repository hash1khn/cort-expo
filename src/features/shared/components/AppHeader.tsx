import React, { useCallback } from 'react';
import { View, Pressable, Image } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';

export function AppHeader() {
    const navigation = useNavigation();

    const handleOpenDrawer = useCallback(() => {
        navigation.dispatch(DrawerActions.openDrawer());
    }, [navigation]);

    return (
        <View className="flex-row items-center justify-center px-4 py-3 relative">
            <Pressable
                onPress={handleOpenDrawer}
                hitSlop={12}
                className="w-12 h-12 rounded-full items-center justify-center absolute left-4"
            >
                <AntDesign name="menu" size={20} color="black" />
            </Pressable>
            <View className="flex-row items-center">
                <Image
                    source={require('../../../../assets/cort-without-at-your.png')}
                    className="w-32 h-10"
                    resizeMode="contain"
                />
            </View>
        </View>
    );
}
