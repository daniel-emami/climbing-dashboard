import { useMemo, useState, type FormEvent } from "react";
import { confirmTheTopoImport, previewTheTopoImport } from "../Api/importApi";
import type { BoulderRecord, BouldersResponse } from "../Types/boulderTypes";
import type { ImportPreviewResponse } from "../Types/importTypes";

type TheTopoImportPanelProps = {
  currentUsername: string | null;
  onImported: (payload: BouldersResponse) => void;
  onError: (message: string) => void;
};

function boulderKey(boulder: BoulderRecord): string {
  return `${boulder.name}::${boulder.area}::${boulder.climber}`.toLowerCase();
}

export default function TheTopoImportPanel({
  currentUsername,
  onImported,
  onError
}: TheTopoImportPanelProps) {
  const [username, setUsername] = useState("");
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const selectedBoulders = useMemo(
    () => preview?.boulders.filter((boulder) => selectedKeys.has(boulderKey(boulder))) ?? [],
    [preview, selectedKeys]
  );

  const handlePreview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsPreviewing(true);
    try {
      const payload = await previewTheTopoImport(username);
      setPreview(payload);
      setSelectedKeys(new Set(payload.boulders.map(boulderKey)));
    } catch (unknownError: unknown) {
      onError(unknownError instanceof Error ? unknownError.message : "Unknown import error");
    } finally {
      setIsPreviewing(false);
    }
  };

  const toggleBoulder = (boulder: BoulderRecord) => {
    const key = boulderKey(boulder);
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleConfirm = async () => {
    if (!preview || selectedBoulders.length === 0) {
      return;
    }
    if (!currentUsername) {
      onError("Log in before importing boulders.");
      return;
    }
    setIsConfirming(true);
    try {
      const payload = await confirmTheTopoImport({
        source: preview.source,
        boulders: selectedBoulders
      });
      onImported(payload);
      setPreview(null);
      setSelectedKeys(new Set());
    } catch (unknownError: unknown) {
      onError(unknownError instanceof Error ? unknownError.message : "Unknown import error");
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <section className="control-panel import-panel">
      <form className="import-form" onSubmit={(event) => void handlePreview(event)}>
        <div className="control-heading">
          <span>Import</span>
          <strong>TheTopo</strong>
        </div>
        <label>
          Username
          <input
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>
        <button className="primary-button" disabled={isPreviewing} type="submit">
          {isPreviewing ? "Previewing..." : "Preview Boulders"}
        </button>
      </form>

      {preview && (
        <div className="import-preview">
          <div className="import-preview-summary">
            <strong>{preview.imported_count} boulders found</strong>
            <span>{selectedBoulders.length} selected</span>
          </div>
          <button
            className="primary-button"
            disabled={isConfirming || selectedBoulders.length === 0 || !currentUsername}
            type="button"
            onClick={() => void handleConfirm()}
          >
            {isConfirming
              ? "Importing..."
              : currentUsername
                ? "Import Selected"
                : "Login To Import"}
          </button>
          <div className="import-preview-list">
            {preview.boulders.map((boulder) => (
              <label className="import-preview-row" key={boulderKey(boulder)}>
                <input
                  type="checkbox"
                  checked={selectedKeys.has(boulderKey(boulder))}
                  onChange={() => toggleBoulder(boulder)}
                />
                <span>
                  <strong>{boulder.name}</strong>
                  <small>
                    {boulder.area} · {boulder.climber || preview.username} ·{" "}
                    {boulder.grade_27crags || "-"} · {boulder.climbed_on ?? "-"}
                  </small>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
