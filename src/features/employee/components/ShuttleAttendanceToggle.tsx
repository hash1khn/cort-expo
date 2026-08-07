import React from 'react';
import { View, Text, Alert, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { colors, fontFamily, spacing, radii } from '@/core/theme';
import { useToast } from '@/shared/ui/molecules/Toast';
import { CortButton } from '@/components/atoms/Button/Button';
import { useAppSelector } from '../../../store/hooks';
import { ShuttleTripForEmployee } from '../services/employeeShuttleApi';
import { useMarkSelfAbsentMutation, useUndoSelfAbsentMutation } from '../services/boardingApi';
import { useLanguage } from '@/i18n/useLanguage';

type Props = {
  trip: ShuttleTripForEmployee;
  /** Renders on the dark pocket under the flip card (white CTA on black). */
  variant?: 'default' | 'pocket';
};

/** Extracts a NestJS error message from an RTK Query error, matching the pattern used
 * elsewhere in this app (e.g. RideActive.tsx) for surfacing server-side rejections. */
function getErrorMessage(err: unknown): string {
  const message = (err as { data?: { message?: string | string[] } } | undefined)?.data?.message;
  if (Array.isArray(message)) return message[0] ?? '';
  return message ?? '';
}

/**
 * Morning-only self-service "not coming today" toggle. Editable while the trip is still
 * SCHEDULED; locked the instant it becomes STARTED/IN_PROGRESS — no stop-proximity math,
 * a single gate on trip status, enforced server-side. Deliberately non-optimistic: this
 * button must only ever show "absent" once the server has actually confirmed it, so a
 * rejection (e.g. the ride already started) surfaces as a clear alert instead of a silent
 * visual flip-then-revert.
 */
export function ShuttleAttendanceToggle({ trip, variant = 'default' }: Props) {
  const toast = useToast();
  const { t } = useLanguage();
  const te = (key: string) => t(`employee:${key}`);
  const [markSelfAbsent, { isLoading: isMarking }] = useMarkSelfAbsentMutation();
  const [undoSelfAbsent, { isLoading: isUndoing }] = useUndoSelfAbsentMutation();

  // Derived locally (not passed as props) so the confirmed-success cache patch in
  // boardingApi.ts can target the exact same getShuttleTripsForEmployee cache key that
  // ShuttleEmployee.tsx queried with — that screen derives these identically.
  const user = useAppSelector((state) => state.auth.user);
  const companyId = (user?.company_id ?? 0) as number;
  const employeeId = (user?.id ?? '') as string;
  const queryArgs = { companyId, employeeId };

  const isLocked = trip.status !== 'SCHEDULED';
  const isAbsent = !!trip.my_self_marked_absent;
  const isPocket = variant === 'pocket';

  const handleMarkAbsent = () => {
    Alert.alert(
      te('markAbsentConfirmTitle'),
      te('markAbsentConfirmBody'),
      [
        { text: te('cancel'), style: 'cancel' },
        {
          text: te('markAsAbsent'),
          style: 'destructive',
          onPress: async () => {
            try {
              await markSelfAbsent({ shuttleTripId: trip.id, queryArgs }).unwrap();
              Alert.alert(
                te('markedAbsentSuccessTitle'),
                te('markedAbsentSuccessBody'),
              );
            } catch (err) {
              const message = getErrorMessage(err);
              if (message.toLowerCase().includes('already started')) {
                Alert.alert(
                  te('rideAlreadyStartedTitle'),
                  te('rideAlreadyStartedBody'),
                );
              } else {
                toast.show(te('markAbsentError'), { type: 'error' });
              }
            }
          },
        },
      ],
    );
  };

  const handleUndo = async () => {
    try {
      await undoSelfAbsent({ shuttleTripId: trip.id, queryArgs }).unwrap();
      toast.show(te('undoAbsentSuccess'), { type: 'success' });
    } catch (err) {
      const message = getErrorMessage(err);
      if (message.toLowerCase().includes('already started')) {
        Alert.alert(
          te('rideAlreadyStartedTitle'),
          te('rideAlreadyStartedBody'),
        );
      } else {
        toast.show(te('undoAbsentError'), { type: 'error' });
      }
    }
  };

  if (isLocked) {
    if (isPocket) {
      return (
        <View style={[styles.pocketStatus, isAbsent && styles.pocketStatusAbsent]}>
          <Ionicons
            name={isAbsent ? 'close-circle' : 'lock-closed'}
            size={18}
            color={isAbsent ? '#FCA5A5' : 'rgba(255,255,255,0.55)'}
          />
          <Text style={styles.pocketStatusText}>
            {isAbsent ? te('markedAbsentLocked') : te('attendanceLocked')}
          </Text>
        </View>
      );
    }

    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          borderRadius: radii.md,
          backgroundColor: isAbsent ? colors.dangerBg : colors.bgGrey,
        }}
      >
        <Ionicons
          name={isAbsent ? 'close-circle' : 'lock-closed'}
          size={18}
          color={isAbsent ? colors.red : colors.muted}
        />
        <Text style={{ fontFamily, fontSize: 13, color: colors.text, flex: 1 }}>
          {isAbsent ? te('markedAbsentLocked') : te('attendanceLocked')}
        </Text>
      </View>
    );
  }

  if (isAbsent) {
    if (isPocket) {
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: isUndoing }}
          disabled={isUndoing}
          onPress={handleUndo}
          style={[styles.pocketButton, styles.pocketUndoButton, isUndoing && { opacity: 0.6 }]}
        >
          {isUndoing ? (
            <ActivityIndicator color={colors.success} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={[styles.pocketButtonText, styles.pocketButtonTextSuccess]}>
                {te('undoAbsence')}
              </Text>
            </>
          )}
        </Pressable>
      );
    }

    return (
      <CortButton
        variant="success"
        title={te('undoAbsence')}
        loading={isUndoing}
        onPress={handleUndo}
      />
    );
  }

  if (isPocket) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ busy: isMarking }}
        disabled={isMarking}
        onPress={handleMarkAbsent}
        style={[styles.pocketButton, isMarking && { opacity: 0.6 }]}
      >
        {isMarking ? (
          <ActivityIndicator color={colors.red} />
        ) : (
          <>
            <Ionicons name="close-circle" size={20} color={colors.red} />
            <Text style={[styles.pocketButtonText, styles.pocketButtonTextDanger]}>
              {te('markAsAbsent')}
            </Text>
          </>
        )}
      </Pressable>
    );
  }

  return (
    <CortButton
      variant="danger"
      title={te('markAsAbsent')}
      loading={isMarking}
      onPress={handleMarkAbsent}
    />
  );
}

const styles = StyleSheet.create({
  pocketButton: {
    width: '100%',
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  pocketUndoButton: {
    backgroundColor: '#E8F5EF',
  },
  pocketButtonText: {
    fontFamily,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  pocketButtonTextDanger: {
    color: colors.red,
  },
  pocketButtonTextSuccess: {
    color: colors.success,
  },
  pocketStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  pocketStatusAbsent: {
    backgroundColor: 'rgba(211, 47, 47, 0.22)',
  },
  pocketStatusText: {
    fontFamily,
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    flex: 1,
  },
});
