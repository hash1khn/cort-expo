import React from 'react';
import { 
  Pressable, 
  StyleSheet, 
  Text, 
  View, 
  StatusBar,
  Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Mapped from design.md
const cortColors = {
  navy: '#0c225e',      // Corporate Anchor
  orange: '#f47f00',    // Primary Action (CTA)
  purple: '#670e4c',    // Secondary/Accents
  lightGrey: '#F5F5F5', // Background
  white: '#FFFFFF',
  text: '#1f2937',      // Dark Grey for body
  muted: '#6b7280',     // Muted text
};

type Props = {
  onGetStarted?: () => void;
};

export function GetStartedScreen({ onGetStarted }: Props) {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={cortColors.lightGrey} />
      
      {/* Top Section: Branding */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          {/* Abstract Logo Placeholder using Brand Colors */}
          <View style={[styles.logoShape, styles.logoBack]} />
          <View style={[styles.logoShape, styles.logoFront]} />
        </View>
        
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
    backgroundColor: cortColors.lightGrey, //
  },
  header: { 
    flex: 3, // Takes up top 60% of screen
    justifyContent: 'center', 
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  // Logo Logic: Creating a visual mark using Navy and Purple
  logoContainer: {
    width: 80,
    height: 80,
    marginBottom: 24,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoShape: {
    position: 'absolute',
    borderRadius: 16,
  },
  logoBack: {
    width: 60,
    height: 60,
    backgroundColor: cortColors.purple, // Secondary Brand Color
    transform: [{ rotate: '-12deg' }],
    opacity: 0.8,
  },
  logoFront: {
    width: 60,
    height: 60,
    backgroundColor: cortColors.navy, // Corporate Anchor
    transform: [{ rotate: '12deg' }],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },
  title: { 
    // fontFamily: 'Inter-Bold', // Ensure Inter is linked
    fontWeight: '800',
    fontSize: 42, 
    color: cortColors.navy, 
    letterSpacing: 4,
    textAlign: 'center',
  },
  subTitle: {
    marginTop: 8,
    // fontFamily: 'Inter-Medium',
    fontWeight: '500',
    fontSize: 14,
    color: cortColors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  bottomContainer: { 
    flex: 2, // Takes up bottom 40%
    backgroundColor: cortColors.white,
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
    color: cortColors.navy,
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    color: cortColors.text,
    lineHeight: 22,
    textAlign: 'center',
  },
  cta: {
    height: 56,
    borderRadius: 12,
    backgroundColor: cortColors.orange, // Primary Action Color
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  shadow: {
    shadowColor: cortColors.orange,
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
    color: cortColors.white,
    letterSpacing: 0.5,
  },
  foot: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 12,
    color: cortColors.muted,
  },
});