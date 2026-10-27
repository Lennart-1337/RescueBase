import { Button, CheckboxField, Field } from "../../components/ui";
import {
  qualifications,
  qualificationLabels,
  type ServicePersonWrite,
  type Qualification,
} from "./types";
type QualificationRow = ServicePersonWrite["qualifications"][number];
export function QualificationsEditor({
  rows,
  onChange,
}: {
  rows: QualificationRow[];
  onChange: (rows: QualificationRow[]) => void;
}) {
  function update(index: number, values: Partial<QualificationRow>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...values } : row)));
  }
  return (
    <fieldset className="service-qualifications">
      <legend>Qualifikationen und Anerkennungen</legend>
      <p>
        Eine höhere Qualifikation wird nur dann für eine andere Position
        anerkannt, wenn diese Anerkennung hier ausdrücklich dokumentiert ist.
      </p>
      {rows.map((row, index) => (
        <div className="service-qualification" key={index}>
          <div className="service-fields">
            <Field label="Qualifikation">
              <select
                value={row.qualification}
                onChange={(event) =>
                  update(index, {
                    qualification: event.target.value as Qualification,
                  })
                }
              >
                {qualifications.map((value) => (
                  <option key={value} value={value}>
                    {qualificationLabels[value]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Gültig bis (leer = ohne Ablaufdatum)">
              <input
                type="date"
                value={row.validUntil?.slice(0, 10) ?? ""}
                onChange={(event) =>
                  update(index, { validUntil: event.target.value || null })
                }
              />
            </Field>
          </div>
          <fieldset>
            <legend>Zusätzlich ausdrücklich anerkannt für</legend>
            <div className="service-checks">
              {qualifications
                .filter((value) => value !== row.qualification)
                .map((value) => (
                  <CheckboxField
                    key={value}
                    label={qualificationLabels[value]}
                    checked={row.recognizedQualifications.includes(value)}
                    onChange={(event) =>
                      update(index, {
                        recognizedQualifications: event.target.checked
                          ? [...row.recognizedQualifications, value]
                          : row.recognizedQualifications.filter(
                              (previous) => previous !== value,
                            ),
                      })
                    }
                  />
                ))}
            </div>
          </fieldset>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onChange(rows.filter((_, i) => i !== index))}
          >
            Qualifikation entfernen
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        disabled={rows.length === qualifications.length}
        onClick={() => {
          const qualification = qualifications.find(
            (value) => !rows.some((row) => row.qualification === value),
          );
          if (qualification)
            onChange([
              ...rows,
              { qualification, validUntil: null, recognizedQualifications: [] },
            ]);
        }}
      >
        Qualifikation hinzufügen
      </Button>
    </fieldset>
  );
}
