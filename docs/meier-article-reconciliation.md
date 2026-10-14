# Meier-Artikel abgleichen

Unter **Stammdaten → Artikel → Meier-Bestandsabgleich** können Administratoren
alle vorhandenen Artikel mit einem gültigen Meier-Produktlink prüfen.
Suchfilter in der Artikelliste begrenzen diesen Abgleich nicht.

1. **Abgleich starten** lädt die Produktdaten nacheinander vom Shop.
2. Die Übersicht zeigt für jedes geänderte Feld den bisherigen und den neuen Wert.
3. Änderungen einzeln, je Artikel oder gemeinsam auswählen. Anfangs ist nichts ausgewählt.
4. **Ausgewählte Änderungen übernehmen** speichert ausschließlich diese Felder.

Nicht verfügbare Shop-Daten löschen keine vorhandenen Werte. Es werden dieselben
Produktfelder wie beim Einzelimport verglichen; der Lieferant wird nicht neu zugeordnet.
Hinweise des Importers, etwa zu Verpackungen und Mengenstaffeln, bleiben sichtbar.

Fehlgeschlagene Artikel lassen sich mit **Erneut laden** separat abrufen. Ein Abbruch
stoppt weitere Abrufe; bereits geprüfte Artikel bleiben zur Prüfung verfügbar.
Die Übernahme erfolgt pro Artikel. Erfolgreiche Artikel bleiben gespeichert, auch wenn
andere Artikel fehlschlagen. Die Übersicht zeigt das Ergebnis für jeden Artikel.

## API und Schutz vor konkurrierenden Änderungen

- `POST /catalog/articles/{id}/meier-preview` lädt den gespeicherten Produktlink und
  liefert aktuelle Feldwerte, `expectedUpdatedAt` und die Importvorschau.
- `POST /catalog/articles/{id}/meier-apply` akzeptiert `expectedUpdatedAt` und `changes`.
  Zulässig sind ausschließlich die bestehenden Importfelder mit gültigen Werten.

Die Versionsprüfung und Aktualisierung erfolgen atomar. Wurde ein Artikel seit der
Vorschau geändert, antwortet die API mit HTTP 409. Der Artikel muss erneut geladen
und geprüft werden. Aktualisierung und Audit-Eintrag liegen in derselben Transaktion.

Der Abgleich benötigt keine neue Datenbankmigration und führt keine automatische
zeitgesteuerte Synchronisierung aus.
