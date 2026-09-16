import type { ComponentProps } from "react";

import AuthPanel from "./AuthPanel";
import BoulderForm from "./BoulderForm";
import TheTopoImportPanel from "./TheTopoImportPanel";
import styles from "../App.module.css";

type DashboardControlRailProps = {
  authPanelProps: ComponentProps<typeof AuthPanel>;
  boulderFormProps: ComponentProps<typeof BoulderForm>;
  importPanelProps: ComponentProps<typeof TheTopoImportPanel>;
};

export default function DashboardControlRail({
  authPanelProps,
  boulderFormProps,
  importPanelProps
}: DashboardControlRailProps) {
  return (
    <aside className={styles.controlRail}>
      <AuthPanel {...authPanelProps} />
      <TheTopoImportPanel {...importPanelProps} />
      <BoulderForm {...boulderFormProps} />
    </aside>
  );
}
