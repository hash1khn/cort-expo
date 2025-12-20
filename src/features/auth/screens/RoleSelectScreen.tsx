import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function RoleSelectScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Select Role</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: 'Montserrat_400Regular',
    fontWeight: '400',
    fontSize: 16,
  },
});


