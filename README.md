🪸 CoralReefMap - Interaktive Korallenriff Karte
Eine interaktive Webanwendung zur Überwachung von Korallenriffen weltweit mit Echtzeit-Umweltdaten.
📋 Features
🗺️ Basis-Layer

Korallenriffe (UNEP-WCMC) - Zeigt globale Korallenriff-Verteilung

🌡️ Umweltdaten (ERDDAP/NOAA)

Wassertemperatur (SST) - Meeresoberflächentemperatur
Hitzestress (DHW) - Degree Heating Weeks (Bleaching-Indikator)
SST Anomalie - Temperaturabweichungen vom Durchschnitt

🌊 Wasserqualität

Chlorophyll-a - Algenwachstum (Verschmutzungsindikator)
Trübung (Kd490) - Wasserklarheit / Lichtdurchdringung

📍 Points of Interest

Tauchspots - Beliebte Tauchgebiete (OpenStreetMap)
Häfen - Küsteninfrastruktur (OpenStreetMap)

🚀 Installation & Start
Voraussetzungen

Moderner Webbrowser (Chrome, Firefox, Safari, Edge)
Lokaler Webserver (z.B. Live Server für VSCode)

Schritt-für-Schritt

Repository/Ordner erstellen

bash   mkdir coral-reef-map
   cd coral-reef-map

Dateien platzieren

   coral-reef-map/
   ├── index.html
   ├── README.md
   ├── css/
   │   └── style.css
   └── js/
       ├── app.js
       ├── config.js
       └── utils.js

Mit VSCode öffnen

bash   code .

Live Server starten

Installiere die Extension "Live Server" in VSCode
Rechtsklick auf index.html → "Open with Live Server"
Oder drücke Alt+L Alt+O


Im Browser öffnen

Automatisch unter http://127.0.0.1:5501
Oder manuell index.html öffnen



🎯 Verwendung
Layer aktivieren/deaktivieren

Checkboxen in der Sidebar nutzen
Mehrere Layer gleichzeitig möglich
Korallenriff-Layer ist immer sichtbar (Basis)

Navigation

Zoomen: Mausrad oder +/- Buttons
Verschieben: Klicken und ziehen
Popup-Infos: Auf Marker klicken (Tauchspots/Häfen)

Legende

Zeigt Informationen zum aktiven Layer
Erklärt Wertebereiche und Bedeutung
Aktualisiert sich automatisch

🔧 Technische Details
APIs & Datenquellen

ERDDAP (NOAA CoastWatch) - Ozeanographische Daten

SST, DHW, Chlorophyll-a, Kd490
Tägliche Updates
5km Auflösung


UNEP-WCMC WMS - Korallenriff-Daten

Globale Riff-Verteilung
WMS-Tile-Service


OpenStreetMap Overpass API - POI-Daten

Tauchspots, Häfen
Crowdsourced Daten



Libraries

Leaflet 1.9.4 - Interaktive Karten
Vanilla JavaScript (ES6 Modules) - Keine zusätzlichen Dependencies

Performance-Optimierungen

Debouncing - Verhindert zu viele API-Anfragen beim Zoomen
Adaptive Bildgröße - ERDDAP-Requests passen sich an Viewport an
Lazy Loading - POI-Daten nur bei Bedarf
Transparente Overlays - Effiziente Darstellung

📊 Layer-Details
DHW (Degree Heating Weeks)

0-4°C·Wochen: Normal (grün)
4-8°C·Wochen: Bleaching-Warnung (gelb)
>8°C·Wochen: Kritisch - Massensterben (rot)

Chlorophyll-a

Niedrig (< 0.1 mg/m³): Klares, nährstoffarmes Wasser
Mittel (0.1-1 mg/m³): Normal
Hoch (> 1 mg/m³): Algenboom, mögliche Verschmutzung

Kd490 (Trübung)

Niedrig (< 0.1 m⁻¹): Sehr klares Wasser
Mittel (0.1-0.5 m⁻¹): Normal
Hoch (> 0.5 m⁻¹): Trübes Wasser, wenig Licht für Korallen

🐛 Troubleshooting
Layer werden nicht angezeigt

Console öffnen (F12) und Fehler prüfen
CORS-Fehler? → Lokalen Server nutzen (nicht file://)
API-Timeout? → Warte 30 Sekunden und zoome erneut

Karte lädt langsam

Zu weit rausgezoomt (große Bbox) → Mehr reinzoomen
Zu viele Layer aktiv → Einzelne Layer deaktivieren
Langsame Internetverbindung → ERDDAP-Server kann langsam sein

POI-Daten fehlen

Overpass API kann überlastet sein → Später nochmal versuchen
Keine Daten in Region → OSM hat keine Einträge für dieses Gebiet

📝 Lizenz & Credits
Datenquellen

NOAA CoastWatch ERDDAP - Ozeanographische Daten (Public Domain)
UNEP-WCMC - Korallenriff-Daten (Open Data)
OpenStreetMap - POI-Daten (ODbL License)
CartoDB - Basemap (CC BY 3.0)

Code

Erstellt für Uni-Projekt "Coral Reef CMS"
Dozent: Philipp Stalder
Open Source (MIT License)

🔮 Zukünftige Features (Roadmap)

 Zeitslider für historische Daten
 Export-Funktion (Screenshot, CSV)
 Bleaching-Alarm Notifications
 Mobile-optimierte Version
 Mehrsprachige Unterstützung
 Echtzeit-Daten-Updates
 Benutzerdefinierte Regionen speichern

💡 Tipps

Beste Performance: Zoom-Level 5-10 verwenden
Daten-Aktualität: ERDDAP-Daten sind ~1-2 Tage verzögert
Regionen: Fokus auf tropische Regionen (30°N - 30°S)
Browser: Chrome/Edge empfohlen für beste Performance


Entwickelt mit 🌊 für den Schutz der Korallenriffe