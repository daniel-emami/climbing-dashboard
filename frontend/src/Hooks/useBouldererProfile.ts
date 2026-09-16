import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import {
  fetchBouldererProfile,
  updateBouldererProfile,
  uploadProfilePicture
} from "../Api/bouldererApi";
import type { AuthUser } from "../Types/authTypes";
import type { BouldererProfile } from "../Types/bouldererTypes";

type UseBouldererProfileOptions = {
  currentUser: AuthUser | null;
  onDataRefresh: () => Promise<void>;
  onError: (message: string | null) => void;
  selectedUsername: string | null;
  setCurrentUser: Dispatch<SetStateAction<AuthUser | null>>;
};

export function useBouldererProfile({
  currentUser,
  onDataRefresh,
  onError,
  selectedUsername,
  setCurrentUser
}: UseBouldererProfileOptions) {
  const [selectedBouldererProfile, setSelectedBouldererProfile] =
    useState<BouldererProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isProfileSaving, setIsProfileSaving] = useState(false);

  useEffect(() => {
    if (!selectedUsername) {
      setSelectedBouldererProfile(null);
      return;
    }
    let ignoreResult = false;
    setIsProfileLoading(true);
    fetchBouldererProfile(selectedUsername)
      .then((profile) => {
        if (!ignoreResult) {
          setSelectedBouldererProfile(profile);
          onError(null);
        }
      })
      .catch((unknownError: unknown) => {
        if (!ignoreResult) {
          setSelectedBouldererProfile(null);
          onError(unknownError instanceof Error ? unknownError.message : "Unknown profile error");
        }
      })
      .finally(() => {
        if (!ignoreResult) {
          setIsProfileLoading(false);
        }
      });
    return () => {
      ignoreResult = true;
    };
  }, [currentUser?.id, onError, selectedUsername]);

  const handleSaveBouldererProfile = async (
    displayName: string,
    profilePicture: File | null
  ) => {
    if (!selectedUsername || !selectedBouldererProfile || !currentUser) {
      return;
    }
    setIsProfileSaving(true);
    try {
      let profile: BouldererProfile = selectedBouldererProfile;
      if (profilePicture) {
        profile = await uploadProfilePicture(selectedUsername, profilePicture);
        setSelectedBouldererProfile(profile);
        setCurrentUser((user) =>
          user ? { ...user, profile_picture_url: profile.user.profile_picture_url } : null
        );
      }
      profile = await updateBouldererProfile(selectedUsername, displayName);
      setSelectedBouldererProfile(profile);
      setCurrentUser((user) =>
        user
          ? {
              ...user,
              display_name: profile.user.display_name,
              profile_picture_url: profile.user.profile_picture_url
            }
          : null
      );
      await onDataRefresh();
      onError(null);
    } catch (unknownError: unknown) {
      onError(unknownError instanceof Error ? unknownError.message : "Unknown profile error");
      throw unknownError;
    } finally {
      setIsProfileSaving(false);
    }
  };

  return {
    handleSaveBouldererProfile,
    isProfileLoading,
    isProfileSaving,
    selectedBouldererProfile
  };
}
