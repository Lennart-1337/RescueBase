import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { displayTime } from "./time";
import type { ServiceEditorProps } from "./editor";
export function OverviewTasks({
  service,
  save,
  locked,
  onOpen,
}: Pick<ServiceEditorProps, "service" | "save" | "locked"> & {
  onOpen: () => void;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const tasks = service.tasks.filter((task) => !task.done);
  if (!tasks.length) return null;
  return (
    <section className="service-overview-tasks">
      <h2>Nächste Aufgaben</h2>
      <ul>
        {tasks.map((task) => (
          <li key={task.id}>
            <label>
              <input
                type="checkbox"
                checked={task.done}
                disabled={locked || pending !== null}
                onChange={async (event) => {
                  const done = event.target.checked;
                  setPending(task.id);
                  setError("");
                  try {
                    await save({
                      tasks: service.tasks.map((row) =>
                        row.id === task.id ? { ...row, done } : row,
                      ),
                    });
                  } catch (cause) {
                    setError(
                      cause instanceof Error
                        ? cause.message
                        : "Die Aufgabe konnte nicht gespeichert werden.",
                    );
                  } finally {
                    setPending(null);
                  }
                }}
              />
              <span>{task.title}</span>
            </label>
            {task.dueAt ? (
              <time dateTime={task.dueAt}>bis {displayTime(task.dueAt)}</time>
            ) : null}
            <button
              type="button"
              aria-label={`${task.title}: Vorbereitung öffnen`}
              onClick={onOpen}
            >
              <ChevronRight aria-hidden="true" size={18} />
            </button>
          </li>
        ))}
      </ul>
      {error ? (
        <p role="alert" className="service-error">
          {error}
        </p>
      ) : null}
    </section>
  );
}
