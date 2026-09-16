import { useEffect, useState } from "react";

import {
  addBoulderComment,
  deleteBoulderComment,
  fetchBoulderComments,
  updateBoulderComment
} from "../Api/commentApi";
import {
  deleteBoulderMedia,
  fetchBoulderMedia,
  uploadBoulderVideo
} from "../Api/mediaApi";
import type {
  BoulderComment,
  BoulderCommentUpdateRequest,
  BoulderMedia,
  BoulderMediaUploadRequest,
  BoulderPageIdentity
} from "../Types/boulderTypes";

type UseSelectedBoulderContentOptions = {
  currentUsername: string | null;
  onError: (message: string | null) => void;
  selectedBoulder: BoulderPageIdentity | null;
};

export function useSelectedBoulderContent({
  currentUsername,
  onError,
  selectedBoulder
}: UseSelectedBoulderContentOptions) {
  const [selectedBoulderComments, setSelectedBoulderComments] = useState<BoulderComment[]>([]);
  const [selectedBoulderMedia, setSelectedBoulderMedia] = useState<BoulderMedia[]>([]);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [isCommentSaving, setIsCommentSaving] = useState(false);
  const [isMediaLoading, setIsMediaLoading] = useState(false);
  const [isMediaSaving, setIsMediaSaving] = useState(false);

  useEffect(() => {
    if (!selectedBoulder) {
      setSelectedBoulderComments([]);
      return;
    }

    let ignoreResult = false;
    setSelectedBoulderComments([]);
    setIsCommentsLoading(true);
    fetchBoulderComments(selectedBoulder)
      .then((payload) => {
        if (!ignoreResult) {
          setSelectedBoulderComments(payload.comments);
          onError(null);
        }
      })
      .catch((unknownError: unknown) => {
        if (!ignoreResult) {
          onError(unknownError instanceof Error ? unknownError.message : "Unknown comment error");
        }
      })
      .finally(() => {
        if (!ignoreResult) {
          setIsCommentsLoading(false);
        }
      });

    return () => {
      ignoreResult = true;
    };
  }, [currentUsername, onError, selectedBoulder]);

  useEffect(() => {
    if (!selectedBoulder) {
      setSelectedBoulderMedia([]);
      return;
    }

    let ignoreResult = false;
    setSelectedBoulderMedia([]);
    setIsMediaLoading(true);
    fetchBoulderMedia(selectedBoulder)
      .then((payload) => {
        if (!ignoreResult) {
          setSelectedBoulderMedia(payload.media);
          onError(null);
        }
      })
      .catch((unknownError: unknown) => {
        if (!ignoreResult) {
          onError(unknownError instanceof Error ? unknownError.message : "Unknown media error");
        }
      })
      .finally(() => {
        if (!ignoreResult) {
          setIsMediaLoading(false);
        }
      });

    return () => {
      ignoreResult = true;
    };
  }, [onError, selectedBoulder]);

  const handleAddBoulderComment = async (body: string) => {
    if (!selectedBoulder) {
      return;
    }
    if (!currentUsername) {
      onError("You must be logged in to comment.");
      return;
    }
    setIsCommentSaving(true);
    try {
      const payload = await addBoulderComment({
        name: selectedBoulder.name,
        area: selectedBoulder.area,
        sector: selectedBoulder.sector,
        body
      });
      setSelectedBoulderComments(payload.comments);
      onError(null);
    } catch (unknownError: unknown) {
      onError(unknownError instanceof Error ? unknownError.message : "Unknown comment error");
      throw unknownError;
    } finally {
      setIsCommentSaving(false);
    }
  };

  const handleUpdateBoulderComment = async (
    commentId: number,
    request: BoulderCommentUpdateRequest
  ) => {
    if (!currentUsername) {
      onError("You must be logged in to edit comments.");
      return;
    }
    setIsCommentSaving(true);
    try {
      const payload = await updateBoulderComment(commentId, request);
      setSelectedBoulderComments(payload.comments);
      onError(null);
    } catch (unknownError: unknown) {
      onError(unknownError instanceof Error ? unknownError.message : "Unknown comment error");
      throw unknownError;
    } finally {
      setIsCommentSaving(false);
    }
  };

  const handleDeleteBoulderComment = async (commentId: number) => {
    if (!currentUsername) {
      onError("You must be logged in to delete comments.");
      return;
    }
    setIsCommentSaving(true);
    try {
      const payload = await deleteBoulderComment(commentId);
      setSelectedBoulderComments(payload.comments);
      onError(null);
    } catch (unknownError: unknown) {
      onError(unknownError instanceof Error ? unknownError.message : "Unknown comment error");
      throw unknownError;
    } finally {
      setIsCommentSaving(false);
    }
  };

  const handleUploadBoulderVideo = async (
    request: Omit<BoulderMediaUploadRequest, "name" | "area" | "sector">
  ) => {
    if (!selectedBoulder) {
      return;
    }
    setIsMediaSaving(true);
    try {
      const payload = await uploadBoulderVideo({
        ...request,
        name: selectedBoulder.name,
        area: selectedBoulder.area,
        sector: selectedBoulder.sector
      });
      setSelectedBoulderMedia(payload.media);
      onError(null);
    } catch (unknownError: unknown) {
      onError(unknownError instanceof Error ? unknownError.message : "Unknown media error");
      throw unknownError;
    } finally {
      setIsMediaSaving(false);
    }
  };

  const handleDeleteBoulderMedia = async (mediaId: number) => {
    setIsMediaSaving(true);
    try {
      const payload = await deleteBoulderMedia(mediaId);
      setSelectedBoulderMedia(payload.media);
      onError(null);
    } catch (unknownError: unknown) {
      onError(unknownError instanceof Error ? unknownError.message : "Unknown media error");
      throw unknownError;
    } finally {
      setIsMediaSaving(false);
    }
  };

  return {
    handleAddBoulderComment,
    handleDeleteBoulderComment,
    handleDeleteBoulderMedia,
    handleUpdateBoulderComment,
    handleUploadBoulderVideo,
    isCommentsLoading,
    isCommentSaving,
    isMediaLoading,
    isMediaSaving,
    selectedBoulderComments,
    selectedBoulderMedia
  };
}
