import React from 'react';
import { View, Text, Alert } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import { colors, fontFamily, spacing, radii } from '@/core/theme';
import { useToast } from '@/shared/ui/molecules/Toast';
import { CortButton } from '@/components/atoms/Button/Button';
import { useAppSelector } from '../../../store/hooks';
import { ShuttleTripForEmployee } from '../services/employeeShuttleApi';
import { useMarkSelfAbsentMutation, useUndoSelfAbsentMutation } from '../services/boardingApi';

type Props = {
  trip: ShuttleTripForEmployee;
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
export function ShuttleAttendanceToggle({ trip }: Props) {
  const toast = useToast();
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

  const handleMarkAbsent = () => {
    Alert.alert(
      "Mark yourself absent?",
      "Let us know if you won't be riding the shuttle this morning.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Absent',
          style: 'destructive',
          onPress: async () => {
            try {
              await markSelfAbsent({ shuttleTripId: trip.id, queryArgs }).unwrap();
              Alert.alert(
                'Marked successfully',
                'You can undo this until the captain has started the ride.',
              );
            } catch (err) {
              const message = getErrorMessage(err);
              if (message.toLowerCase().includes('already started')) {
                Alert.alert(
                  'Ride already started',
                  'The shuttle has already started, so attendance can no longer be changed for today.',
                );
              } else {
                toast.show("Couldn't mark you absent — please try again.", { type: 'error' });
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
      toast.show("You're marked as riding today.", { type: 'success' });
    } catch (err) {
      const message = getErrorMessage(err);
      if (message.toLowerCase().includes('already started')) {
        Alert.alert(
          'Ride already started',
          'The shuttle has already started, so attendance can no longer be changed for today.',
        );
      } else {
        toast.show("Couldn't undo — please try again.", { type: 'error' });
      }
    }
  };

  if (isLocked) {
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
          {isAbsent
            ? "You're marked absent for today"
            : 'Ride has started — attendance is locked'}
        </Text>
      </View>
    );
  }

  if (isAbsent) {
    return (
      <CortButton
        variant="success"
        title="I'm riding today — undo absence"
        loading={isUndoing}
        onPress={handleUndo}
      />
    );
  }

  return (
    <CortButton
      variant="danger"
      title="Mark myself absent today"
      loading={isMarking}
      onPress={handleMarkAbsent}
    />
  );
}
