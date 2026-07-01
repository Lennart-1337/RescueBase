import type { ReactNode } from "react";
import type { LegalSection } from "./legal-content";

function renderContentBlock(block: ReactNode, index: number) {
  if (typeof block === "string") {
    return <p key={index}>{block}</p>;
  }

  return <div key={index}>{block}</div>;
}

export function LegalSectionList({ sections }: { sections: LegalSection[] }) {
  return (
    <article className="legal-page">
      {sections.map((section) => (
        <section key={section.title}>
          <h2>{section.title}</h2>
          {section.content.map(renderContentBlock)}
        </section>
      ))}
    </article>
  );
}
