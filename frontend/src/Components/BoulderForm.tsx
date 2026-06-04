import { useState, type FormEvent } from "react";
import type { BoulderCreateRequest } from "../Types/boulderTypes";

const EMPTY_FORM: BoulderCreateRequest = {
  name: "",
  grade_27crags: "",
  guide_grade: "",
  min_grade: "",
  area: "",
  flash: false,
  climbed_on: new Date().toISOString().slice(0, 10)
};

type BoulderFormProps = {
  isSaving: boolean;
  knownAreas: string[];
  knownGrades: string[];
  onSubmit: (request: BoulderCreateRequest) => Promise<void>;
};

export default function BoulderForm({
  isSaving,
  knownAreas,
  knownGrades,
  onSubmit
}: BoulderFormProps) {
  const [form, setForm] = useState<BoulderCreateRequest>(EMPTY_FORM);

  const updateForm = <K extends keyof BoulderCreateRequest>(
    key: K,
    value: BoulderCreateRequest[K]
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit({
      ...form,
      climbed_on: form.climbed_on || null
    });
    setForm(EMPTY_FORM);
  };

  return (
    <form className="control-panel" onSubmit={(event) => void handleSubmit(event)}>
      <div className="control-heading">
        <span>Log climb</span>
        <strong>New boulder</strong>
      </div>

      <label>
        Name
        <input
          required
          value={form.name}
          onChange={(event) => updateForm("name", event.target.value)}
        />
      </label>

      <div className="three-column-fields">
        <label>
          27Crags
          <input
            list="known-grades"
            value={form.grade_27crags}
            onChange={(event) => updateForm("grade_27crags", event.target.value)}
          />
        </label>
        <label>
          Guide
          <input
            list="known-grades"
            value={form.guide_grade}
            onChange={(event) => updateForm("guide_grade", event.target.value)}
          />
        </label>
        <label>
          Min
          <input
            list="known-grades"
            value={form.min_grade}
            onChange={(event) => updateForm("min_grade", event.target.value)}
          />
        </label>
      </div>

      <label>
        Area
        <input
          required
          list="known-areas"
          value={form.area}
          onChange={(event) => updateForm("area", event.target.value)}
        />
      </label>

      <label>
        Date
        <input
          type="date"
          value={form.climbed_on ?? ""}
          onChange={(event) => updateForm("climbed_on", event.target.value)}
        />
      </label>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={form.flash}
          onChange={(event) => updateForm("flash", event.target.checked)}
        />
        Flash
      </label>

      <datalist id="known-areas">
        {knownAreas.map((area) => (
          <option value={area} key={area} />
        ))}
      </datalist>
      <datalist id="known-grades">
        {knownGrades.map((grade) => (
          <option value={grade} key={grade} />
        ))}
      </datalist>

      <button className="primary-button" disabled={isSaving} type="submit">
        {isSaving ? "Saving..." : "Save boulder"}
      </button>
    </form>
  );
}
