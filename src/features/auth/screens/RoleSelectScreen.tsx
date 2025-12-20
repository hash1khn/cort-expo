import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { typography } from '../../../core/theme/typography';

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
    fontFamily: typography.family.regular,
    fontWeight: '400',
    fontSize: 16,
  },
});


