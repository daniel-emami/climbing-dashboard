import { boulderHref } from "../../Routing/hashRoutes";
import type { BoulderPageIdentity } from "../../Types/boulderTypes";
import styles from "./ActivityFeed.module.css";

type FeedBoulderTitleProps = {
  identity: BoulderPageIdentity;
  grade: string;
  onOpenBoulder: (identity: BoulderPageIdentity) => void;
};

export default function FeedBoulderTitle({ identity, grade, onOpenBoulder }: FeedBoulderTitleProps) {
  return (
    <div className={styles.titleRow}>
      <a
        className={styles.boulderLink}
        href={boulderHref(identity)}
        onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          onOpenBoulder(identity);
        }}
      >
        {identity.name}
      </a>
      {grade && <>{"\u00a0"}<span className={styles.grade}>{grade}</span></>}
    </div>
  );
}
