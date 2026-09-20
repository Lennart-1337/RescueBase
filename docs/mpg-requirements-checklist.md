# MPG-Anforderungen und Abnahmecheckliste

Stand: 20. September 2026

Dieses Dokument ist die verbindliche Grundlage für die MPG-Überarbeitung. Bei Widersprüchen zu früheren Plänen gilt dieses Dokument. Eine Anforderung wird erst abgehakt, wenn Umsetzung und passende automatisierte Prüfung nachweislich vorhanden sind. Bereits vorhandener Code gilt bis zur erneuten Prüfung als nicht abgenommen.

## Bestätigte Leitplanken

- MPG ist ein Fachbereich der bestehenden RescueBase-App und nur in der Navigation eigenständig.
- Code, Ordner, Controller, Services, Datenbankzugriff und Infrastruktur folgen den vorhandenen App-Mustern.
- MPG ist kein Plugin und kein technisch eigenständiges Modul.
- MPG-Geräte sind eigene Datensätze ohne Artikel-ID oder andere Verbindung zu Materialartikeln.
- Die bisherige Geräteverwaltung, ihre Daten und ihre Endpunkte bleiben unverändert.
- Es gibt keinen Import, keine automatische Übernahme und keine manuelle Übernahme alter Gerätedaten.
- Zubehör und Verbrauchsmaterial bleiben ausschließlich im bestehenden Lager.
- Hersteller, Modelle und Prüfintervalle werden nicht erfunden oder als Vorlagen ausgeliefert.

## Statusregeln

- `[ ]` bedeutet: noch nicht umgesetzt oder noch nicht vollständig geprüft.
- `[x]` bedeutet: umgesetzt, durch geeignete Tests geprüft und gegen dieses Dokument abgenommen.
- Ein Punkt wird nicht allein aufgrund vorhandenen Codes abgehakt.
- Abweichungen werden zuerst in diesem Dokument fachlich bestätigt und danach implementiert.

## Navigation und Oberfläche

- [x] Der Navigationspunkt `MPG` verwendet die normale App-Navigation.
- [x] Die Bereiche heißen Geräte, Termine, Einweisungen, Personen und Sauerstoffflaschen.
- [x] Die Modellverwaltung ist innerhalb des Bereichs Geräte erreichbar.
- [x] Die Geräte-Startseite zeigt zunächst nur die Gerätetabelle; zusätzliche Listen für überfällige Prüfungen, Sperren oder unvollständige Akten entfallen.
- [x] Die neue Tabellenkomponente der Benutzerverwaltung wird verwendet.
- [x] Suche und Filter umfassen Name, Inventarnummer, Seriennummer, Standort, Rucksack, Gerätetyp, Status und Prüffälligkeit.
- [x] Seitenköpfe, Aktionen, Dialoge, Detailansichten und Formulare folgen den vorhandenen App-Mustern.
- [x] Es gibt keine zusätzlichen Karten, Aufklappformulare oder MPG-spezifischen Designmuster.

## Modelle und Geräte

- [x] Ein Modell enthält Hersteller, Herstelleranschrift, Modellbezeichnung, Produktart, Gebrauchsanweisung und gemeinsame Prüfanforderungen.
- [x] Ein Einzelgerät enthält Inventarnummer, Seriennummer oder Loscode, Anschaffungsjahr, Inbetriebnahme, Standort und optional einen Rucksack.
- [x] Ein Gerät besitzt keine Verknüpfung zu einem Materialartikel.
- [x] Jedes Gerät hat einen Standort; bei einer Rucksackzuordnung wird der Standort aus dem Rucksack übernommen.
- [x] Eine verantwortliche Person pro Gerät wird weder gespeichert noch verlangt.
- [x] Standort- und Rucksackwechsel sowie Außerbetriebnahmen werden mit Zeitpunkt und ausführendem Benutzer historisiert.
- [x] Geräte können als `In Erfassung – nicht freigegeben` angelegt werden.
- [x] Dieser Zustand erlaubt weder Freigabe noch Benutzung und weist auf die notwendige organisatorische oder physische Sperre hin.
- [x] Die Freigabe ist erst nach vollständiger Prüfung der für das konkrete Produkt geltenden Voraussetzungen möglich.
- [x] Fehlende Anforderungen werden niemals als nicht erforderlich interpretiert.
- [x] Der positive Status heißt `Freigegeben` und erklärt, dass Zubehör und Verbrauchsmaterial separat zu prüfen sind.

## Prüfanforderungen, Prüfungen und Sperren

- [x] Gemeinsame Prüfanforderungen werden am Modell mit Begründung, Quelle und gegebenenfalls Intervall hinterlegt.
- [x] Das Einzelgerät erhält daraus seine individuellen Fälligkeiten und Prüfnachweise.
- [x] Zusätzliche oder strengere gerätespezifische Anforderungen benötigen Begründung und Quelle.
- [x] Eine Modellpflicht kann am Einzelgerät nicht frei deaktiviert oder verlängert werden.
- [x] Prüfungen werden zunächst als bearbeitbarer Entwurf gespeichert.
- [x] Eine Prüfung enthält mindestens Datum, Prüfart, Ergebnis und prüfende Person oder externe Stelle.
- [x] Bei internen Prüfungen genügt ein vollständiger strukturierter Nachweis; eine Berichtsdatei ist optional.
- [x] Externe Prüfer werden direkt mit Name, Firma und optionalem Qualifikationsnachweis erfasst; es gibt kein Dienstleisterkonto oder Dienstleisterregister.
- [x] Abgeschlossene Prüfungen sind unveränderlich.
- [x] Korrekturen erfolgen als begründeter Nachtrag mit Bezug zum ursprünglichen Nachweis, Benutzer und Zeitpunkt.
- [x] Überfällige Pflichtprüfungen, nicht bestandene Prüfungen, sicherheitsrelevante Defekte und nicht bestandene BZ-Kontrollen sperren automatisch.
- [x] Es gibt keine manuelle Übersteuerung einer Sperre.
- [x] Eine Sperre endet erst, wenn alle Ursachen fachlich behoben und die erforderlichen erfolgreichen Nachweise abgeschlossen sind.

## Personen und Einweisungen

- [x] Personen werden unabhängig von Benutzerkonten geführt und können optional mit einem Benutzerkonto verknüpft werden.
- [x] Pflichtangaben einer Person sind Name und Geburtsdatum.
- [x] Interne Kennung und Zugehörigkeit werden nicht geführt.
- [x] Personen besitzen einen Aktivstatus.
- [x] Personen mit Nachweisen können nur deaktiviert werden; unbenutzte Personen dürfen gelöscht werden.
- [x] Die Einweisungsberechtigung gilt global für alle Modelle.
- [x] Eine einweisende Person kann nur ausgewählt werden, wenn Beauftragung und Qualifikationsnachweis vollständig und gültig dokumentiert sind.
- [x] Eine Einweisung enthält verpflichtend Modell, Datum, Inhalte, einweisende Person und Teilnehmer.
- [x] Die verwendete Dokumentversion ist optional.
- [x] Eine Einweisung gilt für alle baugleichen Einzelgeräte des ausgewählten Modells und nie automatisch für andere Modelle.
- [x] Einweisende und alle Teilnehmer bestätigen einzeln mit Name, Bestätigungstext, gezeichneter Unterschrift und Zeitpunkt.
- [x] Der Einweisungsnachweis wird erst nach allen erforderlichen Bestätigungen abgeschlossen und danach unveränderlich.

## BZ-Qualitätskontrollen

- [x] Strukturierte BZ-Kontrollen sind ausschließlich bei als BZ-Gerät geführten Modellen verfügbar.
- [x] Pflichtangaben sind Zeitpunkt, ausführende Person, Teststreifencharge, Kontrolllösung, deren Charge und Verfallsdatum, Kontrollniveau, Einheit, Sollbereich und Messwert.
- [x] Die Bewertung erfolgt automatisch anhand des beim Abschluss gespeicherten Sollbereichs.
- [x] Patientenmesswerte können nicht erfasst werden.
- [x] Abgelaufene Kontrollmittel oder unpassende Einheiten bleiben dokumentiert und führen zu `ungültig/nicht bestanden`.
- [x] Nach einer ungültigen oder nicht bestandenen Kontrolle bleibt das Gerät bis zu einer gültigen erfolgreichen Wiederholung gesperrt.
- [x] BZ-Kontrollen erzeugen keine Lagerbuchungen.

## Sauerstoffflaschen

- [x] Sauerstoff-Tauschflaschen werden in einem eigenen Bereich und unabhängig von Geräten geführt.
- [x] Pflichtangaben sind Flaschennummer, Größe, Standort, Status, Prüfdatum, Prüffälligkeit und Verfallsdatum.
- [x] Ein Lieferant wird nicht erfasst.
- [x] Zulässige Status sind voll, angebrochen, leer und zurückgegeben.
- [x] Es gibt keine Verknüpfung zwischen Sauerstoffflasche und Druckminderer.
- [x] Druckminderer bleiben normale MPG-Geräte.
- [x] Beim Tausch wird die alte Flasche auf `zurückgegeben` gesetzt und die neue Flasche als eigener Datensatz angelegt.
- [x] Flaschennummern und historische Datensätze werden nicht überschrieben.
- [x] Für Flaschen werden keine pauschalen STK- oder MTK-Pflichten erzeugt.

## Dokumente, Vorkommnisse und Aufbewahrung

- [x] PDF-, JPEG- und PNG-Dateien bis 20 MB werden serverseitig typgeprüft und privat gespeichert.
- [x] Jeder Dateiabruf wird serverseitig auf die MPG-Berechtigung geprüft.
- [x] Dokumente werden versioniert; neue Versionen überschreiben keine vorherigen Dateien.
- [x] Vorkommnisse enthalten Datum, Beschreibung, Auswirkungen, Maßnahmen und Bearbeitungsstatus.
- [x] Meldedatum und externe Referenz können optional dokumentiert werden.
- [x] RescueBase sendet keine automatischen Meldungen an Behörden oder Hersteller.
- [x] Alle abgeschlossenen Nachweise sind unveränderlich und nur über nachvollziehbare Berichtigungen korrigierbar.
- [x] Geräteakten werden nach der Außerbetriebnahme mindestens fünf Jahre aufbewahrt und nicht automatisch gelöscht.

## Berechtigungen und Benachrichtigungen

- [x] `medicalDevices.manage` wird ausschließlich in der bestehenden Benutzerverwaltung vergeben.
- [x] Administratoren besitzen die Berechtigung automatisch.
- [x] Das MPG zeigt keine eigene Berechtigungsverwaltung.
- [x] Navigation, Seiten, API, Dateien, Exporte und QR-Ziele sind ohne Anmeldung und Berechtigung unzugänglich.
- [x] Alle aktiven Benutzer mit MPG-Berechtigung erhalten Meldungen 30 und 7 Tage vor einer Prüffälligkeit sowie beim Eintritt einer neuen Sperre.
- [x] Identische Sofortmeldungen werden nicht mehrfach versendet.

## QR-Codes und Ausgaben

- [x] QR-Etiketten enthalten Gerätename, Inventarnummer und QR-Code.
- [x] Der QR-Code öffnet nach Anmeldung direkt die geschützte Geräteakte.
- [x] Das Bestandsverzeichnis ist als PDF verfügbar; ein CSV-Export wird nicht angeboten.
- [x] Das Medizinproduktebuch ist je Gerät als PDF verfügbar.
- [x] Einweisungsnachweis und personenbezogene Einweisungsübersicht sind als PDF verfügbar.
- [x] Die vollständige Geräteakte einschließlich Anhängen ist als Downloadpaket verfügbar.

## Ausdrücklich nicht Bestandteil

- [x] Die bisherige Geräteverwaltung wurde durch MPG nicht verändert.
- [x] Es existiert keine Übernahmefunktion für alte Gerätedaten.
- [x] Patientenverwaltung und Patientenmesswerte sind ausgeschlossen.
- [x] Eine Aufbereitungsakte ist ausgeschlossen.
- [x] Automatische Behörden- oder Herstellermeldungen sind ausgeschlossen.
- [x] Modellvorlagen und pauschale Prüfintervalle sind ausgeschlossen.
- [x] Eine gemeinsame Backup- und Wiederherstellungsprüfung ist kein MPG-Abnahmekriterium.
- [x] Verpflichtende Browserprüfungen auf Desktop oder Tablet sind kein MPG-Abnahmekriterium.

## Technische Abnahme

- [x] Fachregeln werden vor der Korrektur oder Implementierung durch fehlschlagende Tests beschrieben.
- [x] Fristberechnung an Monats- und Jahresgrenzen ist getestet.
- [x] Sperren, Freigaben und die vollständige Behebung mehrerer Sperrgründe sind getestet.
- [x] Unveränderliche Nachweise und Berichtigungen sind getestet.
- [x] Personen, Einweisungsberechtigungen, Mehrfachteilnehmer und Signaturen sind getestet.
- [x] BZ-Grenzwerte, Einheiten, abgelaufene Kontrollmittel und Wiederholungsprüfungen sind getestet.
- [x] Flaschentausch und unveränderliche Flaschenhistorie sind getestet.
- [x] Berechtigungen für API, Dateien, QR-Ziele und Exporte sind getestet.
- [x] Bestehende Lager-, Rucksack-, Artikel- und Geräteabläufe bestehen ihre Regressionstests unverändert.
- [x] Lint, Typprüfung, Backendtests, Frontendtests und Produktions-Build laufen erfolgreich.

## Endabnahme

- [x] Eine berechtigte Person kann ein Gerät ohne Artikelbezug vollständig erfassen.
- [x] Sie kann ein Modell und belegte Prüfanforderungen zuordnen.
- [x] Sie kann eine Prüfung und eine Einweisung vollständig abschließen.
- [x] Sie kann Sperrgründe und deren Behebung lückenlos nachvollziehen.
- [x] Sie kann ein geschütztes QR-Etikett erzeugen.
- [x] Sie kann das Medizinproduktebuch und die vollständige Geräteakte exportieren.
