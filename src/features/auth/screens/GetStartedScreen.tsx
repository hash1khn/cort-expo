import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  StatusBar,
  Platform,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography } from '../../../core/theme';
import { CortButton } from '@/components';
import AnimatedMeshGradient from '@/shared/ui/organisms/mesh-gradient';
import type { IMeshGradientColor } from '@/shared/ui/organisms/mesh-gradient/types';

const { width, height } = Dimensions.get('window');

type Props = {
  onGetStarted?: () => void;
  onApplyAsChauffeur?: () => void;
};

export function GetStartedScreen({ onGetStarted, onApplyAsChauffeur }: Props) {


  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <SafeAreaView style={styles.safeArea}>


        {/* Header: Logo */}
        <View style={styles.header}>
          <Image
            source={require('../../../../assets/cort-without-at-your.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* Content: Hero Image */}
        <View style={styles.heroContainer} className="">
          <Image
            source={require('../../../../assets/imagee.png')}
            style={styles.heroImage}
            resizeMode="contain"
          />
        </View>

        {/* Footer: Text & CTA */}
        <View style={styles.footer} className="">
          <View style={styles.textBlock}>
            <Text style={styles.heading}>
              Your Commute, Simplified
            </Text>
            <Text style={styles.body}>
              Safe • On-Time • Tracked
            </Text>
          </View>

          <CortButton
            title="Get Started"
            onPress={onGetStarted}
            variant="primary"
            disabled={false}
          />

          <Pressable
            onPress={onApplyAsChauffeur}
            style={({ pressed }) => [
              styles.linkContainer,
              pressed && styles.linkPressed
            ]}
          >
            <Text style={styles.linkText} className="text-center mt-8 mb-4">Apply as a chauffeur</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>

  );
}

const styles = StyleSheet.create({

  root: {
    flex: 1,
    backgroundColor: colors.white,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  logoImage: {
    width: 125, // Smaller logo at the top
    height: 40,
  },
  heroContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  heroImage: {
    width: width * 0.9,
    height: width * 0.9, // Keep it somewhat square-ish for the illustration
    maxHeight: height * 0.45,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 20 : 32,
    paddingTop: 20,
  },
  textBlock: {
    marginBottom: 40,
    alignItems: 'center',
  },
  heading: {
    fontFamily: typography.family.semibold,
    fontSize: 28,
    color: colors.navy,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  body: {
    fontFamily: typography.family.regular,
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  cta: {
    height: 56,
    borderRadius: 28, // Pill shape
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  shadow: {
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }]
  },
  ctaText: {
    fontFamily: typography.family.semibold,
    fontSize: 18,
    color: colors.white,
  },
  linkContainer: {
    marginTop: 20,
    paddingVertical: 12,
    alignItems: 'center',
    width: '100%',
  },
  linkPressed: {
    opacity: 0.6,
  },
  linkText: {
    fontFamily: typography.family.regular,
    fontWeight: '700',
    fontSize: 15,
    alignItems: 'center',
    color: colors.navy// Use Navy for secondary link to distinguish from CTA
  },
});