# Meier-Shop durchsuchen

Unter **Stammdaten → Artikel → Meier-Shop durchsuchen** können Administratoren
Produkte anhand eines Namens oder einer Artikelnummer suchen. Der Suchbegriff
muss 2 bis 120 Zeichen enthalten. Weitere Ergebnisse sind über die Seitennavigation
erreichbar; die Suche ist nicht auf die erste Ergebnisseite begrenzt.

**Daten prüfen** öffnet das Artikelformular und lädt die bestehende Importvorschau.
Bei neuen Artikeln sind die verfügbaren Shop-Felder zunächst zur Übernahme ausgewählt.
Die Auswahl kann geändert werden. Erst **Ausgewählte Daten übernehmen** überträgt die
Werte in das Formular, und erst **Artikel anlegen** speichert den Artikel.
Nicht eindeutig erkennbare Daten werden mit den bestehenden Importhinweisen angezeigt.

Bereits vorhandene Artikel werden auch dann erkannt, wenn sie durch einen Suchfilter
in der Artikelliste ausgeblendet sind. Der Abgleich verwendet Meier-Produktlinks und
Lieferantenartikelnummern; bei Artikeln ohne Produktlink kann ein eindeutig benannter
Meier-Standardlieferant zur Zuordnung verwendet werden. **Vorhandenen Artikel prüfen**
öffnet diesen Artikel zum Bearbeiten. Vorhandene Werte werden nur nach Auswahl ersetzt.
Mehrdeutige Zuordnungen erlauben keine Neuanlage aus der Suche.

Die Suchliste zeigt den im Shop dargestellten Preis, der auch UVP- oder Ab-Preise
enthalten kann. Der Produktimport prüft beim Öffnen des Artikels erneut den tatsächlich
verfügbaren Bruttoverkaufspreis und die Verkaufseinheit.

## API und Tests

`POST /catalog/articles/meier-search` akzeptiert `{query, page?}` und liefert
Suchtreffer, Seitenzahl und Hinweise. Der Endpunkt ist auf Administratoren beschränkt
und begrenzt auf 20 Anfragen pro Minute. Suchanfragen speichern keine Daten.

Die Suche liest öffentliche Shop-Ergebnisse mit festen Zieladressen, Zeitlimit,
Größenbegrenzung und geprüften Weiterleitungen. Kundenkonten werden nicht benötigt.
Die Produktlink-Prüfung des bestehenden Imports bleibt unverändert streng.

Regressionstests verwenden kompakte echte Suchseiten sowie Fehler- und Grenzfälle.
Frontend-Tests prüfen Seitennavigation, Wiederholung, veraltete Antworten,
Dublettenerkennung und die getrennten Schritte Laden, Übernehmen und Speichern.
