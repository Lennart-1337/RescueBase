# Mindestbestände als Tabelle

Unter **Lager → Sollbestände** werden für das ausgewählte Lager immer alle aktiven
Artikel angezeigt, auch ohne hinterlegten Mindestbestand. Filter aus der Ansicht
**Bestand** werden nicht übernommen. Die Tabelle hat keine Seiteneinteilung.

## Bearbeiten

- Lager im Auswahlfeld wechseln.
- Mindestmengen direkt in den Zellen eingeben. Kurzbezeichnungen werden bevorzugt;
  der vollständige Artikelname ist als Tooltip verfügbar.
- Enter, Umschalt+Enter und Pfeiltasten wechseln zwischen Mengenzellen; Tab springt
  zur nächsten Eingabe. Beim Fokussieren wird der Wert zum Überschreiben ausgewählt.
- Eine einzelne Mengenspalte aus Excel kann ab der gewählten Zeile eingefügt werden.
  Ungültige Werte oder zu viele Zeilen verwerfen die gesamte Einfügeaktion.
- **Änderungen speichern** speichert ausschließlich geänderte Werte gemeinsam.
- **Zurücksetzen** verwirft die offenen Eingaben und zeigt die zuletzt geladenen Werte.

Leere Felder und 0 bedeuten **kein Mindestbestand**. Bestehende Sollvorgaben werden
dadurch entfernt. Offene automatische Beschaffungsaufträge werden wie bisher
storniert; bereits begonnene Aufträge bleiben bestehen.

Die Spalte **Verfügbar** zählt ausschließlich positive Bestände nicht abgelaufener
Chargen am gewählten Lagerort. **Fehlmenge** wird aus der bearbeiteten Mindestmenge
und diesem verfügbaren Bestand berechnet. Geänderte Zellen sind farblich markiert.

## Schutz vor Datenverlust

Bei ungespeicherten Änderungen fragt ein Lager- oder Seitenwechsel nach:
weiter bearbeiten, verwerfen und wechseln oder speichern und wechseln.
Beim Schließen oder Neuladen der Browserseite greift die Browserwarnung.
Während einer Speicherung sind die Eingaben gesperrt.

Die API prüft die ursprünglichen Mindestmengen und speichert alle Änderungen samt
Audit-Einträgen in einer Transaktion. Bei Konflikten wird HTTP 409 zurückgegeben,
ohne einen Teil der Änderungen zu übernehmen. Eingaben bleiben zur Prüfung erhalten.
Die Daten werden neu geladen; **Zurücksetzen** übernimmt den aktuellen Stand.

`PUT /inventory/targets/bulk` akzeptiert `locationId` und `changes` mit
`articleId`, `targetQuantity` sowie `expectedTargetQuantity` (Zahl oder `null`, falls
zuvor keine Vorgabe vorhanden war). Mengen müssen ganze Zahlen von 0 bis 2147483647
sein. Die bestehenden Endpunkte für einzelne Mindestbestände bleiben verfügbar.
