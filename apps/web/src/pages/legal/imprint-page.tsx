import "./legal-page.css";

export function ImprintPage() {
  return (
    <article className="legal-page">
      <section>
        <h2>Platzhalter für Anbieterkennzeichnung</h2>
        <p>Name, Rechtsform, vertretungsberechtigte Person und vollständige Anschrift eintragen.</p>
      </section>
      <section>
        <h2>Kontakt</h2>
        <p>Telefon, E-Mail-Adresse und weitere verpflichtende Kontaktwege ergänzen.</p>
      </section>
      <section>
        <h2>Register- und Aufsichtsangaben</h2>
        <p>Falls erforderlich: Vereinsregister, Registernummer, Aufsichtsbehörde oder berufsrechtliche Angaben ergänzen.</p>
      </section>
      <section>
        <h2>Verantwortlich für den Inhalt</h2>
        <p>Verantwortliche Person gemäß den anwendbaren gesetzlichen Vorgaben ergänzen.</p>
      </section>
    </article>
  );
}
