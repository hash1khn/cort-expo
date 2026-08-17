import { Linking, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { CortButton } from '@/components';
import { useLanguage } from '@/i18n/useLanguage';
import { colors, fontFamily } from '@/core/theme';
import type { AppConfigGate } from './types';

type Props = {
  gate: AppConfigGate;
};

export function AppBlockedScreen({ gate }: Props) {
  const { t, isRTL } = useLanguage();
  const isMaintenance = gate.kind === 'maintenance';
  const title = isMaintenance ? t('maintenanceTitle') : t('forceUpdateTitle');
  const body =
    gate.message?.trim() ||
    (isMaintenance ? t('maintenanceBody') : t('forceUpdateBody'));
  const storeUrl = gate.kind === 'force-update' ? gate.storeUrl?.trim() : undefined;
  const canOpenStore = Boolean(storeUrl);

  async function handleUpdate() {
    if (!storeUrl) return;
    try {
      await Linking.openURL(storeUrl);
    } catch {
      // Store URL is invalid or cannot be opened; user stays on this screen.
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-8">
        <View className="mb-6 h-16 w-16 items-center justify-center rounded-full bg-[#FFF1F0]">
          <Ionicons
            name={isMaintenance ? 'construct-outline' : 'cloud-download-outline'}
            size={32}
            color={colors.orange}
          />
        </View>
        <Text
          className="text-center text-[22px] font-semibold text-[#0c225e]"
          style={{ fontFamily, writingDirection: isRTL ? 'rtl' : 'ltr' }}
        >
          {title}
        </Text>
        <Text
          className="mt-3 text-center text-[15px] leading-6 text-[#6B7280]"
          style={{ fontFamily, writingDirection: isRTL ? 'rtl' : 'ltr' }}
        >
          {body}
        </Text>
        {gate.kind === 'force-update' && canOpenStore ? (
          <View className="mt-8 w-full">
            <CortButton title={t('updateApp')} onPress={() => void handleUpdate()} />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
