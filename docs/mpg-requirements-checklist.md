# MPG-Anforderungen und Abnahmecheckliste

Stand: 15. September 2026

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

- [ ] Der Navigationspunkt `MPG` verwendet die normale App-Navigation.
- [ ] Die Bereiche heißen Geräte, Termine, Einweisungen, Personen und Sauerstoffflaschen.
- [ ] Die Modellverwaltung ist innerhalb des Bereichs Geräte erreichbar.
- [ ] Die Geräte-Startseite zeigt zunächst nur die Gerätetabelle; zusätzliche Listen für überfällige Prüfungen, Sperren oder unvollständige Akten entfallen.
- [ ] Die neue Tabellenkomponente der Benutzerverwaltung wird verwendet.
- [ ] Suche und Filter umfassen Name, Inventarnummer, Seriennummer, Standort, Rucksack, Gerätetyp, Status und Prüffälligkeit.
- [ ] Seitenköpfe, Aktionen, Dialoge, Detailansichten und Formulare folgen den vorhandenen App-Mustern.
- [ ] Es gibt keine zusätzlichen Karten, Aufklappformulare oder MPG-spezifischen Designmuster.

## Modelle und Geräte

- [ ] Ein Modell enthält Hersteller, Herstelleranschrift, Modellbezeichnung, Produktart, Gebrauchsanweisung und gemeinsame Prüfanforderungen.
- [ ] Ein Einzelgerät enthält Inventarnummer, Seriennummer oder Loscode, Anschaffungsjahr, Inbetriebnahme, Standort und optional einen Rucksack.
- [ ] Ein Gerät besitzt keine Verknüpfung zu einem Materialartikel.
- [ ] Jedes Gerät hat einen Standort; bei einer Rucksackzuordnung wird der Standort aus dem Rucksack übernommen.
- [ ] Eine verantwortliche Person pro Gerät wird weder gespeichert noch verlangt.
- [ ] Standort- und Rucksackwechsel sowie Außerbetriebnahmen werden mit Zeitpunkt und ausführendem Benutzer historisiert.
- [ ] Geräte können als `In Erfassung – nicht freigegeben` angelegt werden.
- [ ] Dieser Zustand erlaubt weder Freigabe noch Benutzung und weist auf die notwendige organisatorische oder physische Sperre hin.
- [ ] Die Freigabe ist erst nach vollständiger Prüfung der für das konkrete Produkt geltenden Voraussetzungen möglich.
- [ ] Fehlende Anforderungen werden niemals als nicht erforderlich interpretiert.
- [ ] Der positive Status heißt `Freigegeben` und erklärt, dass Zubehör und Verbrauchsmaterial separat zu prüfen sind.

## Prüfanforderungen, Prüfungen und Sperren

- [ ] Gemeinsame Prüfanforderungen werden am Modell mit Begründung, Quelle und gegebenenfalls Intervall hinterlegt.
- [ ] Das Einzelgerät erhält daraus seine individuellen Fälligkeiten und Prüfnachweise.
- [ ] Zusätzliche oder strengere gerätespezifische Anforderungen benötigen Begründung und Quelle.
- [ ] Eine Modellpflicht kann am Einzelgerät nicht frei deaktiviert oder verlängert werden.
- [ ] Prüfungen werden zunächst als bearbeitbarer Entwurf gespeichert.
- [ ] Eine Prüfung enthält mindestens Datum, Prüfart, Ergebnis und prüfende Person oder externe Stelle.
- [ ] Bei internen Prüfungen genügt ein vollständiger strukturierter Nachweis; eine Berichtsdatei ist optional.
- [ ] Externe Prüfer werden direkt mit Name, Firma und optionalem Qualifikationsnachweis erfasst; es gibt kein Dienstleisterkonto oder Dienstleisterregister.
- [ ] Abgeschlossene Prüfungen sind unveränderlich.
- [ ] Korrekturen erfolgen als begründeter Nachtrag mit Bezug zum ursprünglichen Nachweis, Benutzer und Zeitpunkt.
- [ ] Überfällige Pflichtprüfungen, nicht bestandene Prüfungen, sicherheitsrelevante Defekte und nicht bestandene BZ-Kontrollen sperren automatisch.
- [ ] Es gibt keine manuelle Übersteuerung einer Sperre.
- [ ] Eine Sperre endet erst, wenn alle Ursachen fachlich behoben und die erforderlichen erfolgreichen Nachweise abgeschlossen sind.

## Personen und Einweisungen

- [ ] Personen werden unabhängig von Benutzerkonten geführt und können optional mit einem Benutzerkonto verknüpft werden.
- [ ] Pflichtangaben einer Person sind Name und Geburtsdatum.
- [ ] Interne Kennung und Zugehörigkeit werden nicht geführt.
- [ ] Personen besitzen einen Aktivstatus.
- [ ] Personen mit Nachweisen können nur deaktiviert werden; unbenutzte Personen dürfen gelöscht werden.
- [ ] Die Einweisungsberechtigung gilt global für alle Modelle.
- [ ] Eine einweisende Person kann nur ausgewählt werden, wenn Beauftragung und Qualifikationsnachweis vollständig und gültig dokumentiert sind.
- [ ] Eine Einweisung enthält verpflichtend Modell, Datum, Inhalte, einweisende Person und Teilnehmer.
- [ ] Die verwendete Dokumentversion ist optional.
- [ ] Eine Einweisung gilt für alle baugleichen Einzelgeräte des ausgewählten Modells und nie automatisch für andere Modelle.
- [ ] Einweisende und alle Teilnehmer bestätigen einzeln mit Name, Bestätigungstext, gezeichneter Unterschrift und Zeitpunkt.
- [ ] Der Einweisungsnachweis wird erst nach allen erforderlichen Bestätigungen abgeschlossen und danach unveränderlich.

## BZ-Qualitätskontrollen

- [ ] Strukturierte BZ-Kontrollen sind ausschließlich bei als BZ-Gerät geführten Modellen verfügbar.
- [ ] Pflichtangaben sind Zeitpunkt, ausführende Person, Teststreifencharge, Kontrolllösung, deren Charge und Verfallsdatum, Kontrollniveau, Einheit, Sollbereich und Messwert.
- [ ] Die Bewertung erfolgt automatisch anhand des beim Abschluss gespeicherten Sollbereichs.
- [ ] Patientenmesswerte können nicht erfasst werden.
- [ ] Abgelaufene Kontrollmittel oder unpassende Einheiten bleiben dokumentiert und führen zu `ungültig/nicht bestanden`.
- [ ] Nach einer ungültigen oder nicht bestandenen Kontrolle bleibt das Gerät bis zu einer gültigen erfolgreichen Wiederholung gesperrt.
- [ ] BZ-Kontrollen erzeugen keine Lagerbuchungen.

## Sauerstoffflaschen

- [ ] Sauerstoff-Tauschflaschen werden in einem eigenen Bereich und unabhängig von Geräten geführt.
- [ ] Pflichtangaben sind Flaschennummer, Größe, Standort, Status, Prüfdatum, Prüffälligkeit und Verfallsdatum.
- [ ] Ein Lieferant wird nicht erfasst.
- [ ] Zulässige Status sind voll, angebrochen, leer und zurückgegeben.
- [ ] Es gibt keine Verknüpfung zwischen Sauerstoffflasche und Druckminderer.
- [ ] Druckminderer bleiben normale MPG-Geräte.
- [ ] Beim Tausch wird die alte Flasche auf `zurückgegeben` gesetzt und die neue Flasche als eigener Datensatz angelegt.
- [ ] Flaschennummern und historische Datensätze werden nicht überschrieben.
- [ ] Für Flaschen werden keine pauschalen STK- oder MTK-Pflichten erzeugt.

## Dokumente, Vorkommnisse und Aufbewahrung

- [ ] PDF-, JPEG- und PNG-Dateien bis 20 MB werden serverseitig typgeprüft und privat gespeichert.
- [ ] Jeder Dateiabruf wird serverseitig auf die MPG-Berechtigung geprüft.
- [ ] Dokumente werden versioniert; neue Versionen überschreiben keine vorherigen Dateien.
- [ ] Vorkommnisse enthalten Datum, Beschreibung, Auswirkungen, Maßnahmen und Bearbeitungsstatus.
- [ ] Meldedatum und externe Referenz können optional dokumentiert werden.
- [ ] RescueBase sendet keine automatischen Meldungen an Behörden oder Hersteller.
- [ ] Alle abgeschlossenen Nachweise sind unveränderlich und nur über nachvollziehbare Berichtigungen korrigierbar.
- [ ] Geräteakten werden nach der Außerbetriebnahme mindestens fünf Jahre aufbewahrt und nicht automatisch gelöscht.

## Berechtigungen und Benachrichtigungen

- [ ] `medicalDevices.manage` wird ausschließlich in der bestehenden Benutzerverwaltung vergeben.
- [ ] Administratoren besitzen die Berechtigung automatisch.
- [ ] Das MPG zeigt keine eigene Berechtigungsverwaltung.
- [ ] Navigation, Seiten, API, Dateien, Exporte und QR-Ziele sind ohne Anmeldung und Berechtigung unzugänglich.
- [ ] Alle aktiven Benutzer mit MPG-Berechtigung erhalten Meldungen 30 und 7 Tage vor einer Prüffälligkeit sowie beim Eintritt einer neuen Sperre.
- [ ] Identische Sofortmeldungen werden nicht mehrfach versendet.

## QR-Codes und Ausgaben

- [ ] QR-Etiketten enthalten Gerätename, Inventarnummer und QR-Code.
- [ ] Der QR-Code öffnet nach Anmeldung direkt die geschützte Geräteakte.
- [ ] Das Bestandsverzeichnis ist als PDF verfügbar; ein CSV-Export wird nicht angeboten.
- [ ] Das Medizinproduktebuch ist je Gerät als PDF verfügbar.
- [ ] Einweisungsnachweis und personenbezogene Einweisungsübersicht sind als PDF verfügbar.
- [ ] Die vollständige Geräteakte einschließlich Anhängen ist als Downloadpaket verfügbar.

## Ausdrücklich nicht Bestandteil

- [ ] Die bisherige Geräteverwaltung wurde durch MPG nicht verändert.
- [ ] Es existiert keine Übernahmefunktion für alte Gerätedaten.
- [ ] Patientenverwaltung und Patientenmesswerte sind ausgeschlossen.
- [ ] Eine Aufbereitungsakte ist ausgeschlossen.
- [ ] Automatische Behörden- oder Herstellermeldungen sind ausgeschlossen.
- [ ] Modellvorlagen und pauschale Prüfintervalle sind ausgeschlossen.
- [ ] Eine gemeinsame Backup- und Wiederherstellungsprüfung ist kein MPG-Abnahmekriterium.
- [ ] Verpflichtende Browserprüfungen auf Desktop oder Tablet sind kein MPG-Abnahmekriterium.

## Technische Abnahme

- [ ] Fachregeln werden vor der Korrektur oder Implementierung durch fehlschlagende Tests beschrieben.
- [ ] Fristberechnung an Monats- und Jahresgrenzen ist getestet.
- [ ] Sperren, Freigaben und die vollständige Behebung mehrerer Sperrgründe sind getestet.
- [ ] Unveränderliche Nachweise und Berichtigungen sind getestet.
- [ ] Personen, Einweisungsberechtigungen, Mehrfachteilnehmer und Signaturen sind getestet.
- [ ] BZ-Grenzwerte, Einheiten, abgelaufene Kontrollmittel und Wiederholungsprüfungen sind getestet.
- [ ] Flaschentausch und unveränderliche Flaschenhistorie sind getestet.
- [ ] Berechtigungen für API, Dateien, QR-Ziele und Exporte sind getestet.
- [ ] Bestehende Lager-, Rucksack-, Artikel- und Geräteabläufe bestehen ihre Regressionstests unverändert.
- [ ] Lint, Typprüfung, Backendtests, Frontendtests und Produktions-Build laufen erfolgreich.

## Endabnahme

- [ ] Eine berechtigte Person kann ein Gerät ohne Artikelbezug vollständig erfassen.
- [ ] Sie kann ein Modell und belegte Prüfanforderungen zuordnen.
- [ ] Sie kann eine Prüfung und eine Einweisung vollständig abschließen.
- [ ] Sie kann Sperrgründe und deren Behebung lückenlos nachvollziehen.
- [ ] Sie kann ein geschütztes QR-Etikett erzeugen.
- [ ] Sie kann das Medizinproduktebuch und die vollständige Geräteakte exportieren.
