import { useEffect, useState } from "react";
import { fetchFeed, type FeedResponse } from "../Api/feedApi";

type FeedOptions = {
  active: boolean;
  viewerKey: string;
  onError: (message: string | null) => void;
};

export function useFeed({ active, viewerKey, onError }: FeedOptions) {
  const [data, setData] = useState<FeedResponse | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const key = `${viewerKey}:${revision}`;

  useEffect(() => {
    if (!active && failedKey !== null) setFailedKey(null);
  }, [active, failedKey]);

  useEffect(() => {
    if (!active || viewerKey === "pending" || loadedKey === key || failedKey === key) return;
    let cancelled = false;
    setIsLoading(true);
    fetchFeed()
      .then((payload) => {
        if (!cancelled) {
          setData(payload);
          setLoadedKey(key);
          onError(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setFailedKey(key);
          onError(error instanceof Error ? error.message : "Unknown feed error");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [active, failedKey, key, loadedKey, onError, viewerKey]);

  return {
    feedData: loadedKey === key ? data : null,
    isFeedLoading: isLoading || (active && viewerKey !== "pending" && loadedKey !== key && failedKey !== key),
    invalidateFeed: () => setRevision((current) => current + 1)
  };
}
