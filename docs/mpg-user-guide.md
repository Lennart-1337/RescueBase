# Anleitung: MPG-Verwaltung

Stand: 20. September 2026

## Zweck und Zuständigkeit

Der Bereich **MPG** dokumentiert Medizinprodukte und die dazugehörigen Betreiberpflichten in RescueBase. Er ist ein normaler Fachbereich der Anwendung. Die vorhandene Geräteverwaltung unter Stammdaten und das Materiallager bleiben davon getrennt.

Ein MPG-Gerät ist kein Lagerartikel. Zubehör und Verbrauchsmaterial wie AED-Elektroden, Batterien oder Teststreifen werden weiterhin im Materiallager geführt. Prüfanforderungen und Fristen müssen für jedes Modell anhand belastbarer Unterlagen festgelegt werden. RescueBase liefert dafür keine Modellvorlagen und keine pauschalen Intervalle.

Diese Anleitung beschreibt die Bedienung. Sie ersetzt nicht die Prüfung der jeweils geltenden Vorgaben, Herstellerinformationen und betrieblichen Zuständigkeiten.

## Zugang

Für den gesamten Bereich ist die Berechtigung **Medizinprodukte verwalten** erforderlich. Administratoren haben sie automatisch. Für andere Benutzer wird sie in der bestehenden Benutzerverwaltung im Tab **Zugang** vergeben.

Ohne diese Berechtigung sind Navigation, Seiten, Geräteakten, Dokumente, Exporte und QR-Ziele nicht verfügbar. Es gibt im MPG selbst keine eigene Berechtigungsverwaltung.

Nach dem Anmelden öffnen Sie in der Hauptnavigation **MPG**. Dort stehen diese Bereiche zur Verfügung:

| Bereich | Zweck |
| --- | --- |
| Geräte | Einzelgeräte, Zuordnungen und Geräteakten |
| Modelle | Modellstammdaten, Gebrauchsanweisungen und Prüfanforderungen |
| Termine | Alle ermittelten Prüffälligkeiten |
| Einweisungen | Modellbezogene Einweisungsnachweise |
| Personen | Personenregister und Einweisungsberechtigungen |
| Sauerstoffflaschen | Tauschflaschen mit eigener Historie |

## Empfohlene Reihenfolge bei der Einführung

1. Legen Sie die benötigten Personen an.
2. Hinterlegen Sie je Modell die Gebrauchsanweisung und die belegten Prüfanforderungen.
3. Prüfen und dokumentieren Sie das Modell verbindlich.
4. Erfassen Sie die einzelnen Geräte und ordnen Sie Standort oder Rucksack zu.
5. Erteilen Sie die Freigabe erst, wenn die Geräteakte vollständig ist.
6. Dokumentieren Sie Prüfungen, Einweisungen, Vorkommnisse und BZ-Kontrollen laufend.

Alte Geräte aus der bisherigen Geräteverwaltung werden nicht übernommen. Sie bleiben dort unverändert. Es gibt weder Import noch eine manuelle oder automatische Übernahme in den MPG-Bereich.

## Modelle verwalten

Öffnen Sie den Bereich **Modelle**. Modelle bündeln Angaben, die bei mehreren baugleichen Geräten gleich sind.

### Modell anlegen

Wählen Sie **Modell anlegen** und erfassen Sie:

- Modellbezeichnung
- Hersteller
- Herstelleranschrift
- Produktart

Beispiele für Produktarten sind AED, Blutzuckermessgerät, Blutdruckmessgerät, Thermometer oder Druckminderer. Erfassen Sie nur tatsächliche Angaben aus belastbaren Unterlagen; RescueBase ergänzt keine Produktdaten.

### Gebrauchsanweisung hinterlegen

Öffnen Sie das Modell in der Tabelle und laden Sie im Abschnitt **Dokumente** die Gebrauchsanweisung hoch. Danach wird die hochgeladene Datei dem Modell als Gebrauchsanweisung zugeordnet.

Unterstützt werden PDF, JPEG und PNG bis 20 MB. Die Datei wird serverseitig geprüft und privat gespeichert.

### Prüfanforderungen dokumentieren

Wählen Sie beim Modell **Prüfanforderung**. Je Anforderung erfassen Sie:

- Prüfart: STK, MTK, Wartung oder weitere Kontrolle
- Bezeichnung
- Begründung
- Quelle oder Herstellerangabe
- Kennzeichnung als Pflichtprüfung, falls anwendbar
- Intervall in Monaten und/oder erste konkrete Fälligkeit

Eine Anforderung ohne Intervall benötigt eine konkrete erste Fälligkeit. Fehlende Anforderungen bedeuten nicht, dass keine Prüfung nötig ist.

### Modellprüfung abschließen

Wählen Sie **Anforderungen prüfen** erst, wenn die Gebrauchsanweisung und mindestens eine aktive, begründete Anforderung hinterlegt sind. Geben Sie die Prüfgrundlage und Begründung an. Dadurch wird die Modellprüfung dokumentiert und Geräte dieses Modells können anschließend die Freigabe erhalten, sofern auch deren weitere Voraussetzungen erfüllt sind.

Ändern Sie Anforderungen nachvollziehbar und anhand der Unterlagen. Ein einzelnes Gerät kann eine Modellpflicht nicht abschwächen oder verlängern.

## Geräte erfassen und freigeben

### Gerät anlegen

Wählen Sie in **Geräte** die Aktion **Gerät erfassen**. Geben Sie mindestens die verfügbaren Stammdaten an:

- Gerätename
- Modell
- Inventarnummer
- Seriennummer oder Loscode
- Anschaffungsjahr
- Inbetriebnahme
- Standort
- optionaler Rucksack
- optionale Notizen

Ein Gerät kann zunächst unvollständig angelegt werden. Der Status lautet dann **In Erfassung – nicht freigegeben**. Das Gerät darf in diesem Zustand nicht verwendet werden. Sichern Sie es organisatorisch und physisch gegen Nutzung; der digitale Status ersetzt keine Kennzeichnung oder Entfernung vor Ort.

### Standort und Rucksack

Jedes Gerät hat einen Standort. Bei Auswahl eines Rucksacks übernimmt RescueBase den Standort dieses Rucksacks. Wechsel von Standort oder Rucksack werden in der Geräteakte mit Zeitpunkt und dokumentierendem Benutzer historisiert.

### Freigabe

Öffnen Sie die **Geräteakte** über die Gerätetabelle und wählen Sie im Tab **Stammdaten** die Aktion **Freigeben**. Die Freigabe wird nur erteilt, wenn mindestens Folgendes vollständig dokumentiert ist:

- Modell
- Inventarnummer
- Seriennummer oder Loscode
- Anschaffungsjahr
- Inbetriebnahme
- verbindlich geprüfte Modellanforderungen
- keine aktuelle Sperrursache

Der positive Status heißt **Freigegeben**. Er bestätigt ausschließlich die MPG-Akte. Zubehör und Verbrauchsmaterial bleiben separat zu prüfen.

### Außerbetriebnahme

Wählen Sie **Außer Betrieb** und dokumentieren Sie den Grund. Die Akte bleibt erhalten und das Gerät kann nicht mehr verändert werden. RescueBase löscht Geräteakten nicht automatisch.

## Geräteakte benutzen

Die Geräteakte enthält diese Tabs:

| Tab | Inhalt |
| --- | --- |
| Stammdaten | Identifikation, Modell, Standort, Rucksack, Freigabe und Außerbetriebnahme |
| Prüfungen | Anforderungen, Prüfungen, Wartungen, Vorkommnisse und BZ-Kontrollen |
| Einweisungen | Einweisungen für das zugehörige Modell |
| Dokumente | Zugeordnete Dateien und Versionen |
| Verlauf | Standortwechsel sowie protokollierte Änderungen |

Im Kopf der Akte stehen außerdem die Ausgaben **Medizinproduktebuch PDF**, **Vollständige Akte** und **QR-Etikett**. Bei einer Sperre zeigt RescueBase die ermittelten Sperrgründe direkt in der Akte an.

### Zusätzliche gerätespezifische Anforderungen

Im Tab **Prüfungen** können Sie für ein einzelnes Gerät zusätzliche oder strengere Anforderungen erfassen. Geben Sie Prüfart, Bezeichnung, Begründung, Quelle und Intervall oder konkrete Fälligkeit an.

Gerätespezifische Anforderungen sind immer Pflichtanforderungen. Das System lässt keine Verlängerung einer gleichartigen Modellpflicht zu.

## Prüfungen und Wartungen dokumentieren

### Entwurf erfassen

Wählen Sie in der Geräteakte unter **Prüfungen und Wartung** die Aktion **Prüfung erfassen**. Ein neuer Datensatz ist zunächst ein Entwurf und beeinflusst Freigabe und Fälligkeiten noch nicht.

Erfassen Sie:

- zugehörige Prüfanforderung
- Durchführungstag
- Ergebnis: bestanden oder nicht bestanden
- entweder interne prüfende Person oder externe prüfende Stelle
- bei externer Stelle: Name und Firma, optional Qualifikation oder Nachweis
- optionalen Prüfbericht
- nächste Fälligkeit, sofern festgelegt
- Bemerkungen

Für eine interne Prüfung genügt der vollständige strukturierte Nachweis; ein Bericht als Datei ist optional. Dienstleisterkonten oder ein separates Dienstleisterregister gibt es nicht.

### Entwurf bearbeiten und abschließen

Wählen Sie einen Entwurf in der Tabelle aus. Solange er offen ist, können Sie ihn über **Entwurf bearbeiten** ändern. Wählen Sie danach **Abschließen**. Erst der Abschluss macht den Nachweis verbindlich und aktualisiert Fälligkeiten sowie Gerätestatus.

Ein abgeschlossener Nachweis ist unveränderlich. Verwenden Sie bei Fehlern **Nachtrag** und geben Sie den Berichtigungsgrund an. Der Nachtrag bleibt mit dem ursprünglichen Nachweis verknüpft.

### Sperren verstehen und beheben

RescueBase sperrt ein Gerät automatisch bei:

- überfälliger Pflichtprüfung
- nicht bestandener abgeschlossener Prüfung
- offenem sicherheitsrelevanten Vorkommnis
- nicht bestandener oder ungültiger BZ-Kontrolle

Eine Sperre kann nicht manuell übersteuert werden. Beheben und dokumentieren Sie jede angezeigte Ursache. Erst wenn alle Sperrgründe fachlich geklärt und die nötigen erfolgreichen Nachweise abgeschlossen sind, kann der Status wieder **Freigegeben** werden.

## Vorkommnisse und Defekte

Öffnen Sie in der Geräteakte den Tab **Prüfungen** und im Abschnitt **Defekte und Vorkommnisse** die Aktion **Vorkommnis erfassen**.

Pflichtangaben sind:

- Datum des Vorkommnisses
- Beschreibung
- Auswirkungen
- Maßnahmen
- Kennzeichnung, ob es sicherheitsrelevant ist

Meldedatum und externe Referenz können zusätzlich dokumentiert werden. RescueBase versendet keine Meldungen an Behörden oder Hersteller.

Sicherheitsrelevante Vorkommnisse sperren das Gerät, solange sie offen sind. Öffnen Sie den Eintrag über **Bearbeiten**, ergänzen Sie Auswirkungen und Maßnahmen und setzen Sie den Status erst nach der fachlichen Klärung auf erledigt.

## BZ-Qualitätskontrollen

Der Abschnitt **BZ-Qualitätskontrollen** erscheint nur bei Geräten, deren Modell als Blutzuckermessgerät geführt wird. Patientenmesswerte können nicht erfasst werden.

Wählen Sie **Kontrollmessung** und erfassen Sie:

- Zeitpunkt
- ausführende Person
- Teststreifencharge
- Kontrolllösung und deren Charge
- Verfallsdatum der Kontrolllösung
- Kontrollniveau
- Mess- und Sollbereichseinheit
- unteren und oberen Sollwert
- Messwert

RescueBase bewertet die Messung anhand des gespeicherten Sollbereichs. Nicht passende Einheiten oder abgelaufene Kontrollmittel werden als ungültig beziehungsweise nicht bestanden dokumentiert; sie werden nicht verworfen.

Ein fehlgeschlagener oder ungültiger Wert sperrt das Gerät. Führen Sie eine gültige erfolgreiche Wiederholungsmessung durch. Wählen Sie danach beim fehlgeschlagenen Eintrag **Klären** und dokumentieren Sie Ursache und Korrekturmaßnahmen. Erst die erfolgreiche Wiederholung und die Klärung beseitigen diesen Sperrgrund.

BZ-Kontrollen erzeugen keine Lagerbuchungen.

## Personen verwalten

Öffnen Sie **Personen** und wählen Sie **Person anlegen**. Das Personenregister ist unabhängig von Benutzerkonten. Pflicht sind:

- Name
- Geburtsdatum

Optional können Sie ein aktives Benutzerkonto zuordnen. Interne Kennung und Zugehörigkeit werden nicht geführt.

### Aktivstatus und Löschen

Deaktivieren Sie Personen, die nicht mehr eingesetzt werden. Personen mit Prüfungen, Einweisungen, BZ-Kontrollen oder hinterlegten Nachweisen können nicht gelöscht werden, damit ihre Historie erhalten bleibt. Unbenutzte Personen dürfen gelöscht werden.

### Einweisungsberechtigung

Die Berechtigung gilt global für alle Modelle. Öffnen Sie die Person und hinterlegen Sie zuerst die Qualifikationsdatei im Bereich **Dokumente**. Aktivieren Sie danach die Einweisungsberechtigung und dokumentieren Sie:

- Beauftragung
- Qualifikationsnachweis
- optionales Gültigkeitsende

Nur aktive Personen mit vollständiger, gültiger Beauftragung und Qualifikationsdatei lassen sich bei einer Einweisung auswählen.

Die Personenakte enthält außerdem eine PDF-Einweisungsübersicht.

## Einweisungen dokumentieren

Öffnen Sie **Einweisungen** und wählen Sie **Einweisung anlegen**. Eine Einweisung gilt stets für ein Modell und damit für alle baugleichen Geräte dieses Modells. Sie gilt nie automatisch für andere Modelle.

Erfassen Sie:

- Modell
- Datum
- einweisende Person
- Inhalte
- mindestens eine teilnehmende Person
- optional die verwendete Dokumentversion

Wählen Sie nach dem Anlegen den Einweisungsnachweis aus. Jede einweisende und teilnehmende Person muss separat **Bestätigung erfassen**. Dabei wählen Sie die betreffende Person, prüfen oder ergänzen den Bestätigungstext und erfassen die eigenhändige Unterschrift auf dem geöffneten Gerät.

Nach allen Bestätigungen wählen Sie **Abschließen**. Der Einweisungsnachweis wird unveränderlich. Eine Korrektur erfolgt ausschließlich über **Nachtrag**; der neue Nachweis verweist auf den ursprünglichen.

Für abgeschlossene Einweisungen ist ein PDF-Nachweis verfügbar. Die gespeicherten Bestätigungen und Unterschriften werden in die Ausgabe aufgenommen.

## Sauerstoffflaschen verwalten

Sauerstoff-Tauschflaschen sind keine MPG-Geräte. Öffnen Sie **Sauerstoffflaschen** und wählen Sie **Tauschflasche erfassen**.

Erfassen Sie verpflichtend:

- Flaschennummer
- Größe
- Standort
- Status: voll, angebrochen, leer oder zurückgegeben
- Prüfdatum
- Prüffälligkeit
- Verfallsdatum

Ein Lieferant wird nicht erfasst. Es gibt keine Verbindung zwischen Flasche und Druckminderer. Druckminderer werden stattdessen als normale MPG-Geräte geführt.

### Flaschentausch

Wählen Sie bei der alten Flasche **Zurückgeben**. Der Datensatz wird unveränderlich und bleibt als Historie erhalten. Erfassen Sie die neue Flasche anschließend als eigenen Datensatz. Überschreiben Sie weder Flaschennummer noch alte Datumsangaben.

Für Tauschflaschen erzeugt RescueBase keine pauschalen STK- oder MTK-Pflichten.

## Dokumente verwalten

Dokumente können an Modellen, Geräten und Personen hinterlegt werden. Im jeweiligen Bereich wählen Sie **Dokument hochladen**.

Erlaubte Formate sind PDF, JPEG und PNG bis 20 MB. Der Server prüft Dateityp und Größe. Downloads sind nur mit MPG-Berechtigung möglich.

Um eine überarbeitete Datei abzulegen, wählen Sie beim Upload unter **Neue Version von** die vorherige Datei. RescueBase speichert eine neue Version; die alte Datei bleibt erhalten und wird nicht überschrieben.

Laden Sie einen Prüfbericht zuerst im Dokumentbereich des Geräts hoch. Beim Prüfentwurf können Sie ihn anschließend optional als Prüfbericht auswählen.

## Termine, Benachrichtigungen und Exporte

### Termine

Der Bereich **Termine** zeigt alle berechneten Prüffälligkeiten mit Gerät, Prüfanforderung und aktuellem Gerätestatus. Öffnen Sie ein Gerät über seinen Namen, um den Nachweis zu erfassen oder Sperrgründe zu prüfen.

In der Gerätetabelle können Sie zusätzlich nach Name, Inventar- oder Seriennummer, Standort, Rucksack, Gerätetyp, Status und Prüffälligkeit filtern.

### Benachrichtigungen

Alle aktiven Benutzer mit MPG-Berechtigung erhalten Benachrichtigungen:

- 30 Tage vor einer Prüffälligkeit
- 7 Tage vor einer Prüffälligkeit
- beim Eintritt einer neuen Sperre

Identische Sofortmeldungen für dieselbe Sperre werden nicht mehrfach versendet.

### Ausgaben

| Ausgabe | Aufruf |
| --- | --- |
| Bestandsverzeichnis | **Geräte** → **Bestandsverzeichnis PDF** |
| Medizinproduktebuch | Geräteakte → **Medizinproduktebuch PDF** |
| Vollständige Geräteakte | Geräteakte → **Vollständige Akte**; ZIP mit Akteninhalt und Anhängen |
| QR-Etikett | Geräteakte → **QR-Etikett** |
| Einweisungsnachweis | abgeschlossene Einweisung → **PDF herunterladen** |
| Personenbezogene Einweisungsübersicht | Personenakte → PDF-Ausgabe |

Das Bestandsverzeichnis wird ausschließlich als PDF angeboten. Einen CSV-Export gibt es nicht.

Der QR-Code enthält Gerätename, Inventarnummer und die geschützte Zieladresse der Geräteakte. Nach dem Scannen ist eine Anmeldung mit MPG-Berechtigung erforderlich.

## Regelmäßige Arbeitsroutine

1. Prüfen Sie den Bereich **Termine** und die Benachrichtigungen.
2. Erfassen Sie Prüfungen zunächst als Entwurf und schließen Sie sie nach der fachlichen Prüfung verbindlich ab.
3. Klären Sie jede Sperre anhand der in der Geräteakte angezeigten Gründe.
4. Legen Sie Nachträge statt Änderungen an abgeschlossenen Nachweisen an.
5. Halten Sie Gebrauchsanweisungen, Prüfberichte, Qualifikations- und Einweisungsunterlagen versioniert aktuell.
6. Führen Sie zurückgegebene Sauerstoffflaschen nicht weiter, sondern erfassen Sie Ersatzflaschen neu.

## Häufige Situationen

### Das Gerät lässt sich nicht freigeben

Öffnen Sie die Geräteakte und prüfen Sie die angezeigten Sperrgründe. Häufig fehlen Modell, Inventarnummer, Seriennummer oder Loscode, Anschaffungsjahr, Inbetriebnahme, geprüfte Modellanforderungen oder ein erforderlicher erfolgreicher Nachweis.

### Ein Prüfentwurf wirkt sich nicht auf den Status aus

Entwürfe sind absichtlich unverbindlich. Wählen Sie den Entwurf und schließen Sie ihn verbindlich ab.

### Eine Einweisungsberechtigung lässt sich nicht verwenden

Prüfen Sie, ob die Person aktiv ist, die Beauftragung dokumentiert wurde, ein Qualifikationsnachweis hinterlegt ist und ein mögliches Gültigkeitsende nicht abgelaufen ist.

### Eine Person lässt sich nicht löschen

Die Person ist bereits Teil eines Nachweises oder hat Dokumente. Deaktivieren Sie sie stattdessen, damit die Historie vollständig bleibt.

### Eine BZ-Sperre bleibt bestehen

Dokumentieren Sie eine erfolgreiche Wiederholung und danach die Klärung am fehlgeschlagenen Eintrag. Beide Schritte sind erforderlich.
