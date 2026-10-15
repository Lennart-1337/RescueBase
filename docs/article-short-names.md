# Kurzbezeichnungen für Artikel

Im Artikelformular kann zusätzlich zum vollständigen Namen eine optionale
**Kurzbezeichnung** gepflegt werden. Sie wird in Checklisten als Hauptname
angezeigt. Bei einer abweichenden Kurzbezeichnung bleibt der vollständige Name
darunter sichtbar. Ohne Kurzbezeichnung erscheint weiterhin der vollständige Name.

Die Kurzbezeichnung ist eine manuelle Bezeichnung für die Arbeit mit dem Artikel.
Das Laden und Abgleichen von Meier-Produktdaten überschreibt sie nicht.

## PDF-Export von Rucksackvorlagen

**PDF** öffnet vor dem Export eine Auswahl für die Artikelbezeichnung:

- **Kurzbezeichnung:** verwendet den kurzen Namen, ersatzweise den vollständigen.
- **Vollständiger Name:** verwendet ausschließlich den vollständigen Artikelnamen.
- **Beide:** zeigt beide Namen, wenn sie sich unterscheiden; andernfalls nur einen.

Die Auswahl gilt für den jeweiligen Export. Standard ist die Kurzbezeichnung.
Reihenfolge, Module, Sollmengen und Kritisch-Kennzeichnungen bleiben erhalten.

## Speicherung und Kompatibilität

`Article.shortName` ist optional und auf 191 Zeichen begrenzt. Leere Eingaben
entfernen die Kurzbezeichnung. Fehlt das Feld beim Aktualisieren, bleibt eine
vorhandene Kurzbezeichnung erhalten, etwa bei älteren JSON-Exporten.

Neue Stammdatenexporte enthalten die vorhandenen Kurzbezeichnungen.
Die interne Artikel-ID und die Zuordnung zu Vorlagen ändern sich nicht.
Gespeicherte Prüfprotokolle und Bestellpositionen behalten den vollständigen Namen.

Die Datenbankmigration ergänzt eine optionale Spalte. Das API-Container-Startskript
führt ausstehende Migrationen vor dem Anwendungsstart aus.
