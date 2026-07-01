import type { ReactNode } from "react";

export type LegalSection = {
  title: string;
  content: ReactNode[];
};

const contactMail = (
  <a href="mailto:info@neukirchen-vluyn.dlrg.de">
    info@neukirchen-vluyn.dlrg.de
  </a>
);

export const imprintSections: LegalSection[] = [
  {
    title: "Angaben gemäß § 5 DDG",
    content: [
      <>
        <strong>Deutsche Lebens-Rettungs-Gesellschaft</strong>
        <br />
        <strong>Ortsgruppe Neukirchen-Vluyn e.V.</strong>
      </>,
      <>
        Am Honigshuck 50
        <br />
        47506 Neukirchen-Vluyn
        <br />
        Deutschland
      </>,
      <>
        Telefon: 02845 37457
        <br />
        E-Mail: {contactMail}
      </>,
      <>
        Eingetragen im Vereinsregister des Amtsgerichts Kleve
        <br />
        Registernummer: VR 41098
      </>,
      <>
        Vertreten durch den Vorstand der DLRG Ortsgruppe Neukirchen-Vluyn e.V.
      </>,
    ],
  },
  {
    title: "Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV",
    content: [
      <>
        Marina Berg
        <br />
        DLRG Ortsgruppe Neukirchen-Vluyn e.V.
        <br />
        Am Honigshuck 50
        <br />
        47506 Neukirchen-Vluyn
      </>,
    ],
  },
];

export const privacySections: LegalSection[] = [
  {
    title: "1. Verantwortlicher",
    content: [
      <>
        DLRG Ortsgruppe Neukirchen-Vluyn e.V.
        <br />
        Am Honigshuck 50
        <br />
        47506 Neukirchen-Vluyn
        <br />
        E-Mail: {contactMail}
      </>,
    ],
  },
  {
    title: "2. Zweck des Portals",
    content: [
      "Dieses Webportal dient ausschließlich der internen Organisation und Verwaltung der Vereinsarbeit der DLRG Ortsgruppe Neukirchen-Vluyn e.V.",
      "Die Nutzung ist ausschließlich berechtigten Mitgliedern und Funktionsträgern vorbehalten.",
    ],
  },
  {
    title: "3. Verarbeitete Daten",
    content: [
      "Im Rahmen der Nutzung können insbesondere folgende personenbezogene Daten verarbeitet werden:",
      <ul>
        <li>Name und Vorname</li>
        <li>E-Mail-Adresse</li>
        <li>Benutzername</li>
        <li>Protokolldaten über Anmeldungen und Zugriffe</li>
        <li>Vereinsbezogene Verwaltungs- und Lagerdaten</li>
      </ul>,
      "Die Verarbeitung erfolgt ausschließlich zur Durchführung und Organisation der Vereinsarbeit.",
    ],
  },
  {
    title: "4. Rechtsgrundlage",
    content: [
      "Die Verarbeitung personenbezogener Daten erfolgt gemäß Art. 6 Abs. 1 lit. b DSGVO zur Erfüllung vereinsbezogener Aufgaben sowie gemäß Art. 6 Abs. 1 lit. f DSGVO aufgrund des berechtigten Interesses an einer sicheren und effizienten Organisation der Vereinsarbeit.",
    ],
  },
  {
    title: "5. Speicherdauer",
    content: [
      "Personenbezogene Daten werden nur solange gespeichert, wie dies für die jeweiligen Zwecke erforderlich ist oder gesetzliche Aufbewahrungsfristen bestehen.",
    ],
  },
  {
    title: "6. Weitergabe an Dritte",
    content: [
      "Eine Weitergabe personenbezogener Daten an Dritte erfolgt grundsätzlich nicht, sofern keine gesetzliche Verpflichtung hierzu besteht oder externe Dienstleister im Rahmen einer Auftragsverarbeitung eingesetzt werden.",
    ],
  },
  {
    title: "7. Betroffenenrechte",
    content: [
      "Betroffene Personen haben nach der DSGVO insbesondere folgende Rechte:",
      <ul>
        <li>Recht auf Auskunft</li>
        <li>Recht auf Berichtigung</li>
        <li>Recht auf Löschung</li>
        <li>Recht auf Einschränkung der Verarbeitung</li>
        <li>Recht auf Datenübertragbarkeit</li>
        <li>Recht auf Widerspruch gegen die Verarbeitung</li>
        <li>Beschwerderecht bei einer zuständigen Aufsichtsbehörde</li>
      </ul>,
    ],
  },
  {
    title: "8. Server-Logfiles",
    content: [
      "Beim Zugriff auf das Portal werden durch den Server automatisch Informationen erhoben und in Logdateien gespeichert. Hierzu können insbesondere IP-Adresse, Zeitpunkt des Zugriffs, Browsertyp und aufgerufene Seiten gehören.",
      "Diese Verarbeitung dient ausschließlich der Gewährleistung eines sicheren und störungsfreien Betriebs des Angebots.",
    ],
  },
  {
    title: "9. Cookies und Sitzungsdaten",
    content: [
      "Das Portal verwendet technisch notwendige Sitzungsinformationen und Authentifizierungsmechanismen, die für den Betrieb und die Anmeldung erforderlich sind. Eine Nutzung zu Werbe- oder Trackingzwecken erfolgt nicht.",
    ],
  },
];
