import React, { useCallback } from 'react';
import { View, Pressable } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { Image } from 'expo-image';

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
                    source={require('../../../../assets/traflinq_logo_no_tagline.svg')}
                    style={{ width: 135, height: 38 ,marginRight:5}}
                    contentFit="contain"
                />
            </View>
        </View>
    );
}
