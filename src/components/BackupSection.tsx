import { useState } from "react";
import type { ChangeEvent } from "react";
import type { Library } from "../models/types";
import {
  applySection,
  exportSectionFile,
  parseBackup,
  pickSection,
  SECTIONS,
  sectionLabel,
} from "../utils/backup";
import type { SectionId } from "../utils/backup";

type Props = {
  library: Library;
  onChange: (library: Library) => void;
};

export default function BackupSection({ library, onChange }: Props) {
  const [section, setSection] = useState<SectionId>("calendar");

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseBackup(String(reader.result));
      if (!parsed) {
        alert("Die Datei konnte nicht gelesen werden.");
        return;
      }
      // Bereichs-Datei: ihr eigener Bereich. Gesamtbackup: der oben gewählte Bereich.
      const target: SectionId =
        parsed.kind === "section" ? parsed.section : section;
      const data =
        parsed.kind === "section"
          ? parsed.data
          : pickSection(parsed.library, target);

      const next = applySection(library, target, data);
      if (!next) {
        alert("Die Datei passt nicht zu diesem Bereich.");
        return;
      }
      if (
        !confirm(
          `Den Bereich „${sectionLabel(target)}“ durch den Inhalt der Datei ersetzen? Alle anderen Bereiche bleiben unverändert.`
        )
      ) {
        return;
      }
      onChange(next);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div>
      <h3>Einzelner Bereich</h3>
      <p className="muted">
        Exportiere oder ersetze nur einen Bereich, z. B. den Kalender. Alle
        anderen Bereiche bleiben unverändert. Beim Import kannst du eine
        Bereichs-Datei wählen oder ein Gesamtbackup (dann wird nur der hier
        gewählte Bereich daraus übernommen).
      </p>
      <label style={{ marginTop: 0 }}>
        Bereich
        <select
          value={section}
          onChange={(e) => setSection(e.target.value as SectionId)}
        >
          {SECTIONS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <div className="row">
        <button onClick={() => exportSectionFile(library, section)}>
          Bereich exportieren
        </button>
        <label className="filebutton">
          Bereich importieren
          <input type="file" accept=".json" onChange={handleFile} hidden />
        </label>
      </div>
    </div>
  );
}