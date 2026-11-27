import type { ComponentProps } from "react";

import AuthPanel from "./AuthPanel";
import TheTopoImportPanel from "./TheTopoImportPanel";
import styles from "../App.module.css";

type DashboardControlRailProps = {
  authPanelProps: ComponentProps<typeof AuthPanel>;
  importPanelProps: ComponentProps<typeof TheTopoImportPanel>;
};

export default function DashboardControlRail({
  authPanelProps,
  importPanelProps
}: DashboardControlRailProps) {
  return (
    <aside className={styles.controlRail}>
      <AuthPanel {...authPanelProps} />
      <TheTopoImportPanel {...importPanelProps} />
    </aside>
  );
}
