import type { BouldersResponse } from "../Types/boulderTypes";

type SummaryStripProps = {
  data: BouldersResponse;
};

export default function SummaryStrip({ data }: SummaryStripProps) {
  const topArea = data.stats.areas[0];
  const addedDates = data.records
    .filter((record) => record.added_at)
    .map((record) => record.added_at as string)
    .sort();
  const latest = addedDates[addedDates.length - 1];

  return (
    <section className="summary-strip" aria-label="Climbing summary">
      <article className="summary-tile">
        <span>Total</span>
        <strong>{data.stats.total}</strong>
        <small>Outdoor boulders logged</small>
      </article>
      <article className="summary-tile">
        <span>Flashes</span>
        <strong>{data.stats.flash_count}</strong>
        <small>{Math.round(data.stats.flash_rate * 100)}% of climbs</small>
      </article>
      <article className="summary-tile">
        <span>Areas</span>
        <strong>{data.stats.areas.length}</strong>
        <small>{topArea ? `${topArea.area} leads with ${topArea.count}` : "No areas yet"}</small>
      </article>
      <article className="summary-tile">
        <span>Latest</span>
        <strong>{latest ? latest.slice(0, 10) : "-"}</strong>
        <small>Most recently added</small>
      </article>
    </section>
  );
}
