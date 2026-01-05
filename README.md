### Wichtige Dateien
- **index.html** – Einstiegspunkt der Anwendung  
- **style.css** – Layout, Sidebar, Legenden  
- **app.js** – Initialisierung der Karte und UI-Logik  
- **config.js** – Layer- & API-Konfiguration  
- **layers.js** – Definition der Kartenlayer  
- **utils.js** – Hilfsfunktionen  

---

## 🚀 Installation & Start (lokal)

### Voraussetzungen
- Moderner Webbrowser (Chrome, Firefox, Safari, Edge)
- Lokaler Webserver (z. B. Live Server in VS Code)

### Start mit VS Code
1. Repository klonen oder herunterladen  
2. Projekt in VS Code öffnen  
3. Extension **Live Server** installieren  
4. `index.html` → Rechtsklick → **Open with Live Server**

---

## 🌍 Veröffentlichung (kostenlos)

Dieses Projekt wurde mittels unterstützung von Github veröffentlicht.

### GitHub Pages
- kostenlos
- einfach
- stabil


---

## 🧪 Nutzung der Anwendung

- Layer können über die Sidebar ein- und ausgeschaltet werden
- Mehrere Layer sind gleichzeitig darstellbar
- Klick auf Marker oder Flächen öffnet Informations-Popups
- Zoomen und Verschieben per Maus oder Touch

---

## 📊 Interpretation ausgewählter Indikatoren

### Degree Heating Weeks (DHW)
- **0–4**: Normalzustand  
- **4–8**: Bleaching-Warnung  
- **>8**: Hohes Bleaching-Risiko  

### Chlorophyll-a
- Niedrige Werte: klares, nährstoffarmes Wasser  
- Hohe Werte: erhöhtes Algenwachstum / Nährstoffeintrag  

### Trübung (Kd490)
- Niedrig: gute Lichtdurchdringung  
- Hoch: trübes Wasser, Stress für Korallen  

---

## 🧩 Datenquellen

Alle verwendeten Daten stammen aus **kostenlosen und offenen Quellen**, u. a.:

- **NOAA / ERDDAP** – Ozeanographische Umweltdaten  
- **UNEP-WCMC** – Korallenriff-Verteilung  
- **OpenStreetMap / Overpass API** – Häfen & Tauchspots  
- **Mikroplastik-Daten** – als GeoJSON integriert  


---

## 🐛 Bekannte Einschränkungen

- Overpass API kann zeitweise überlastet sein
- Datenauflösung variiert je nach Region
- Prototypischer Charakter (kein produktives Monitoring-System)

---

## 🔮 Mögliche Erweiterungen

- Zeitbasierte Analyse (Zeitslider)
- Exportfunktionen (CSV, Screenshots)
- Mobile Optimierung
- Mehrsprachige Oberfläche
- Weitere Verschmutzungsindikatoren

---

## 👥 Projektteam & Kontext

Dieses Projekt entstand im Rahmen des Moduls **WI-Projekt**.

**Projektteam:**
- Robin Hinder  
- Fadri Burkhart  
- Abbas Kabbout  

Die Anwendung versteht sich als **wissenschaftlich begleiteter Prototyp**, der zeigt, wie Web-GIS-Technologien zur Umweltanalyse und -bildung eingesetzt werden können.

---

## 📄 Lizenz

Derzeit ist keine explizite Software-Lizenz hinterlegt.  
Für eine Open-Source-Veröffentlichung wird z. B. die **MIT License** empfohlen (unter Berücksichtigung der Datenlizenzen).