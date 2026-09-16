import { mediaUrl } from "../../Api/mediaApi";
import type { BoulderMedia, BoulderPageIdentity } from "../../Types/boulderTypes";
import sharedStyles from "../../Styles/Shared.module.css";
import styles from "./BouldererProfilePage.module.css";

type BouldererVideosPanelProps = {
  media: BoulderMedia[];
  onOpenBoulder: (identity: BoulderPageIdentity) => void;
};

export default function BouldererVideosPanel({
  media,
  onOpenBoulder
}: BouldererVideosPanelProps) {
  return (
    <section className={`${sharedStyles.panel} ${styles.gridPanel} ${styles.fullWidthPanel}`}>
      <div className={sharedStyles.panelHeading}>
        <span className={sharedStyles.sectionKicker}>Uploaded videos</span>
        <strong>{media.length}</strong>
      </div>
      {media.length === 0 ? (
        <div className={sharedStyles.emptyDetailSlot}>No visible videos</div>
      ) : (
        <ol className={styles.videoList}>
          {media.map((item) => (
            <li key={item.id}>
              <video
                controls
                crossOrigin="use-credentials"
                playsInline
                preload="metadata"
                src={mediaUrl(item.url)}
              />
              <button
                type="button"
                onClick={() =>
                  onOpenBoulder({
                    name: item.boulder_name,
                    area: item.area,
                    sector: item.sector
                  })
                }
              >
                {item.boulder_name}
              </button>
              <span>{item.caption || [item.area, item.sector].filter(Boolean).join(" / ")}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
