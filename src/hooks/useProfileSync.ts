import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { updateUserProfile } from '../features/auth/store';
import { useGetProfileQuery } from '../features/auth/services/authApi';

/**
 * Fetches the latest user profile from the server when logged in and syncs
 * the auth state (including profile_picture_url) so drawer avatars stay
 * up-to-date across sessions.
 */
export function useProfileSync() {
  const dispatch = useAppDispatch();
  const isLoggedIn = useAppSelector((s) => s.auth.isLoggedIn);

  const { data } = useGetProfileQuery(undefined, {
    skip: !isLoggedIn,
    // Re-fetch once on mount when the app forgrounds; no background polling.
    refetchOnMountOrArgChange: true,
  });

  useEffect(() => {
    if (!data) return;
    dispatch(updateUserProfile(data));
  }, [data, dispatch]);
}
