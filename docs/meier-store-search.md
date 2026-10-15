# Meier-Shop durchsuchen

Unter **Stammdaten → Artikel → Meier-Shop durchsuchen** können Administratoren
Produkte anhand eines Namens oder einer Artikelnummer suchen. Der Suchbegriff
muss 2 bis 120 Zeichen enthalten. Weitere Ergebnisse sind über die Seitennavigation
erreichbar; die Suche ist nicht auf die erste Ergebnisseite begrenzt.

Die Treffer müssen zum Suchbegriff im Produktnamen, beim Hersteller oder in der
Artikelnummer passen. Reine Beschreibungstreffer, etwa gefüllte Taschen statt
einzelner Kanülen, werden ausgeblendet. Die Shop-Seitennavigation bleibt erhalten;
eine Seite ohne passende Treffer bedeutet nicht, dass spätere Seiten leer sind.
„Braunüle“ und „Braunuele“ werden als „Venenverweilkanüle“ gesucht, auch in der
Mehrzahl. Zusätzliche Angaben im Suchbegriff bleiben erhalten. Der tatsächlich
verwendete Begriff wird als Hinweis angezeigt.

Bei einer genauen Artikelnummer wird eine passende, vom Shop tatsächlich verlinkte
Variante gewählt. Die Nummer und Variantenbezeichnung werden angezeigt. Der Preis
der Standardvariante wird dabei nicht übernommen; der Variantenpreis wird erst
beim Laden der Produktdaten ermittelt.

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

Die Suche nutzt denselben öffentlichen AJAX-Endpunkt wie die Ergebnisliste der
Meier-Webseite: `GET /widgets/search?search=…&p=…` mit
`X-Requested-With: XMLHttpRequest`. Dieser liefert ein HTML-Fragment mit Treffern
und Seitennavigation, keine JSON-Produktdaten. Die vollständige Suchseite wird
nicht mehr geladen. `/suggest` dient im Shop nur den kurzen Suchvorschlägen und
würde die vollständige Ergebnisliste nicht ersetzen.

Der Abruf verwendet feste Zieladressen, Zeitlimit, Größenbegrenzung und geprüfte
Weiterleitungen. API-Schlüssel, Kundenkonten und Cookies werden nicht benötigt.
Die separate Shopware Store API unter `/store-api/search` wird nicht verwendet.
Die Produktlink-Prüfung des bestehenden Imports bleibt unverändert streng.

Regressionstests verwenden kompakte echte Suchseiten sowie Fehler- und Grenzfälle.
Die Widget-Fixtures `widget-ambu.html` und `widget-empty.html` wurden am 15.10.2026
anonym vom öffentlichen AJAX-Endpunkt geladen und auf relevante Elemente gekürzt.
Frontend-Tests prüfen Seitennavigation, Wiederholung, veraltete Antworten,
Dublettenerkennung und die getrennten Schritte Laden, Übernehmen und Speichern.
