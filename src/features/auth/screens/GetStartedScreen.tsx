import React from 'react';
import { 
  Pressable, 
  StyleSheet, 
  Text, 
  View, 
  StatusBar,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../../core/theme';

type Props = {
  onGetStarted?: () => void;
};

export function GetStartedScreen({ onGetStarted }: Props) {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bgGrey} />
      
      {/* Top Section: Branding */}
      <View style={styles.header}>
        <Image 
          source={require('../../../../assets/cort-app-icon.png')} 
          style={styles.logoImage}
          resizeMode="contain"
        />
        
        <Text style={styles.title}>CORT</Text>
        <Text style={styles.subTitle}>Enterprise Mobility Platform</Text>
      </View>

      {/* Bottom Section: Action */}
      <View style={styles.bottomContainer}>
        <View style={styles.textBlock}>
          <Text style={styles.heading}>
            Managed Corporate Transport
          </Text>
          <Text style={styles.body}>
            Secure shuttles and premium chauffeur services for your workforce. 
            Reliable, tracked, and reimagined.
          </Text>
        </View>

        {/* Primary CTA - Cort Orange */}
        <Pressable 
          onPress={onGetStarted} 
          style={({ pressed }) => [
            styles.cta, 
            pressed && styles.ctaPressed,
            styles.shadow
          ]}
        >
          <Text style={styles.ctaText}>Get Started</Text>
        </Pressable>

        <Text style={styles.foot}>
          By continuing, you agree to CORT policies.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { 
    flex: 1, 
    backgroundColor: colors.bgGrey,
  },
  header: { 
    flex: 3, // Takes up top 60% of screen
    justifyContent: 'center', 
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logoImage: {
    width: 120,
    height: 120,
    marginBottom: 12,
    alignSelf: 'center',
  },
  title: { 
    // fontFamily: 'Inter-Bold', // Ensure Inter is linked
    fontWeight: '800',
    fontSize: 42, 
    color: colors.navy, 
    letterSpacing: 4,
    textAlign: 'center',
  },
  subTitle: {
    marginTop: 8,
    // fontFamily: 'Inter-Medium',
    fontWeight: '500',
    fontSize: 14,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  bottomContainer: { 
    flex: 2, // Takes up bottom 40%
    backgroundColor: colors.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 32,
    paddingTop: 40,
    paddingBottom: Platform.OS === 'ios' ? 20 : 32,
    // Shadow for the bottom sheet effect
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
  },
  textBlock: {
    marginBottom: 32,
    alignItems: 'center',
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    textAlign: 'center',
  },
  cta: {
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.orange, // Primary Action Color
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  shadow: {
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaPressed: { 
    opacity: 0.85, 
    transform: [{ scale: 0.98 }] 
  },
  ctaText: { 
    fontSize: 17, 
    fontWeight: '700', 
    color: colors.white,
    letterSpacing: 0.5,
  },
  foot: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 12,
    color: colors.muted,
  },
});