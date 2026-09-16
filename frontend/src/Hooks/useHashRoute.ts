import { useEffect, useState } from "react";

import {
  boulderIdentityFromHash,
  bouldererUsernameFromHash,
  clearHashRoute,
  writeBoulderHash,
  writeBouldererHash
} from "../Routing/hashRoutes";
import type { BoulderPageIdentity } from "../Types/boulderTypes";

export function useHashRoute() {
  const [selectedBoulder, setSelectedBoulder] = useState<BoulderPageIdentity | null>(
    boulderIdentityFromHash
  );
  const [selectedBouldererUsername, setSelectedBouldererUsername] = useState<string | null>(
    bouldererUsernameFromHash
  );

  useEffect(() => {
    const syncRouteFromHash = () => {
      setSelectedBoulder(boulderIdentityFromHash());
      setSelectedBouldererUsername(bouldererUsernameFromHash());
    };
    window.addEventListener("hashchange", syncRouteFromHash);
    window.addEventListener("popstate", syncRouteFromHash);
    return () => {
      window.removeEventListener("hashchange", syncRouteFromHash);
      window.removeEventListener("popstate", syncRouteFromHash);
    };
  }, []);

  const openBoulder = (identity: BoulderPageIdentity) => {
    setSelectedBouldererUsername(null);
    setSelectedBoulder(identity);
    writeBoulderHash(identity);
  };

  const closeBoulder = () => {
    setSelectedBoulder(null);
    writeBoulderHash(null);
  };

  const openBoulderer = (username: string) => {
    setSelectedBoulder(null);
    setSelectedBouldererUsername(username);
    writeBouldererHash(username);
  };

  const closeBoulderer = () => {
    setSelectedBouldererUsername(null);
    writeBouldererHash(null);
  };

  const openDashboardHome = () => {
    setSelectedBoulder(null);
    setSelectedBouldererUsername(null);
    clearHashRoute();
  };

  return {
    closeBoulder,
    closeBoulderer,
    openBoulder,
    openBoulderer,
    openDashboardHome,
    selectedBoulder,
    selectedBouldererUsername
  };
}
