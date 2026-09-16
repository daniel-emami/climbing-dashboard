import { useCallback, useEffect, useState } from "react";

import {
  addBoulder,
  deleteBoulder,
  fetchBoulders,
  updateBoulder
} from "../Api/boulderApi";
import type {
  BoulderCreateRequest,
  BoulderIdentity,
  BouldersResponse
} from "../Types/boulderTypes";

type UseBouldersOptions = {
  onError: (message: string | null) => void;
};

export function useBoulders({ onError }: UseBouldersOptions) {
  const [data, setData] = useState<BouldersResponse | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadStoredData = useCallback(async () => {
    try {
      const payload = await fetchBoulders();
      setData(payload);
      onError(null);
    } catch (unknownError: unknown) {
      onError(unknownError instanceof Error ? unknownError.message : "Unknown error");
    } finally {
      setIsInitialLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    void loadStoredData();
  }, [loadStoredData]);

  const handleAddBoulder = async (
    request: BoulderCreateRequest,
    currentUsername: string | null
  ) => {
    if (!currentUsername) {
      onError("You must be logged in to save boulders.");
      return;
    }
    setIsSaving(true);
    try {
      const payload = await addBoulder({ ...request, climber: currentUsername });
      setData(payload);
      onError(null);
    } catch (unknownError: unknown) {
      onError(unknownError instanceof Error ? unknownError.message : "Unknown error");
      throw unknownError;
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateBoulder = async (
    original: BoulderIdentity,
    boulder: BoulderCreateRequest,
    currentUsername: string | null
  ) => {
    if (!currentUsername) {
      onError("You must be logged in to edit boulders.");
      return;
    }
    setIsSaving(true);
    try {
      const payload = await updateBoulder({
        original,
        boulder: { ...boulder, climber: currentUsername }
      });
      setData(payload);
      onError(null);
    } catch (unknownError: unknown) {
      onError(unknownError instanceof Error ? unknownError.message : "Unknown error");
      throw unknownError;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBoulder = async (
    request: BoulderIdentity,
    currentUsername: string | null
  ) => {
    if (!currentUsername) {
      onError("You must be logged in to delete boulders.");
      return;
    }
    setIsSaving(true);
    try {
      const payload = await deleteBoulder(request);
      setData(payload);
      onError(null);
    } catch (unknownError: unknown) {
      onError(unknownError instanceof Error ? unknownError.message : "Unknown error");
      throw unknownError;
    } finally {
      setIsSaving(false);
    }
  };

  const handleImportedBoulders = (payload: BouldersResponse) => {
    setData(payload);
    onError(null);
  };

  return {
    data,
    handleAddBoulder,
    handleDeleteBoulder,
    handleImportedBoulders,
    handleUpdateBoulder,
    isInitialLoading,
    isSaving,
    loadStoredData
  };
}
