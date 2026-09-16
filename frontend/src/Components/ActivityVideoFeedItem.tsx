import { mediaUrl } from "../Api/mediaApi";
import type { BoulderMedia, BoulderPageIdentity } from "../Types/boulderTypes";
import {
  boulderIdentityFromMedia,
  formatDateTime,
  formatMediaLocation,
  initials
} from "../Utilities/activityFeedUtils";
import sharedStyles from "../Styles/Shared.module.css";
import styles from "./ActivityFeed.module.css";

type ActivityVideoFeedItemProps = {
  itemKey: string;
  media: BoulderMedia;
  onOpenBoulder: (identity: BoulderPageIdentity) => void;
  onOpenBoulderer: (username: string) => void;
};

export default function ActivityVideoFeedItem({
  itemKey,
  media,
  onOpenBoulder,
  onOpenBoulderer
}: ActivityVideoFeedItemProps) {
  return (
    <li className={styles.item} key={itemKey}>
      <div className={styles.avatar} aria-hidden="true">
        {initials(media.climber_display_name)}
      </div>
      <div className={styles.body}>
        <p className={styles.copy}>
          <button
            className={sharedStyles.profileLinkButton}
            type="button"
            onClick={() => onOpenBoulderer(media.climber)}
          >
            {media.climber_display_name || "Unknown climber"}
          </button>{" "}
          uploaded a video to{" "}
          <button
            className={styles.boulderLink}
            type="button"
            onClick={() => onOpenBoulder(boulderIdentityFromMedia(media))}
          >
            {media.boulder_name}
          </button>
        </p>
        <p className={styles.meta}>{formatMediaLocation(media)}</p>
        <p className={styles.time}>
          Uploaded {formatDateTime(media.created_at)}
          {media.visibility === "private" ? " · Private" : ""}
        </p>
        <ol className={styles.mediaList}>
          <li className={styles.mediaItem}>
            <video
              controls
              crossOrigin="use-credentials"
              playsInline
              preload="metadata"
              src={mediaUrl(media.url)}
            />
            {media.caption && <p>{media.caption}</p>}
          </li>
        </ol>
      </div>
    </li>
  );
}
