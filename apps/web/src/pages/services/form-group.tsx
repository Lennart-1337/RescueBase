import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
export function FormGroup({
  title,
  disclosure,
  children,
}: {
  title: string;
  disclosure: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <section className="service-form-group" aria-label={title}>
      {disclosure ? (
        <button
          type="button"
          className="service-form-disclosure"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((value) => !value)}
        >
          {title}
          <ChevronDown
            aria-hidden
            size={17}
            style={{ transform: open ? "rotate(180deg)" : undefined }}
          />
        </button>
      ) : (
        <h3>{title}</h3>
      )}
      {!disclosure || open ? (
        <div id={id} className="service-fields">
          {children}
        </div>
      ) : null}
    </section>
  );
}
