/**
 * Konfigurationsdatei für die CoralReefMap
 * VERSION: 5.3 - All layers now have sources in legends
 */

// ============================================================================
// LAYER KONFIGURATIONEN
// ============================================================================

export const layers = {
  // 🪸 WARMWASSER-KORALLENRIFFE
  "coral-warm": {
    id: "coral-warm",
    name: "Warmwasser-Korallenriffe",
    type: "geojson",
    url: "./data/coral_warm_all.geojson",
    style: {
      color: "#FF6B6B",
      weight: 1,
      fillColor: "#FF6B6B",
      fillOpacity: 0.4,
      radius: 2
    },
    legend: {
      title: "Warmwasser-Korallenriffe",
      description: "Tropische und subtropische Korallenriffe",
      source: "UNEP World Conservation Monitoring Centre (WCMC) 2018",
      sourceUrl: "https://habitats.oceanplus.org/",
      color: "#FF6B6B"
    }
  },

  // ❄️ KALTWASSER-KORALLENRIFFE
  "coral-cold": {
    id: "coral-cold",
    name: "Kaltwasser-Korallenriffe",
    type: "geojson",
    url: "./data/coral_cold_all.geojson",
    style: {
      color: "#4A90E2",
      weight: 1,
      fillColor: "#4A90E2",
      fillOpacity: 0.4,
      radius: 2
    },
    legend: {
      title: "Kaltwasser-Korallenriffe",
      description: "Tiefwasser-Korallenriffe in kalten Gewässern",
      source: "UNEP World Conservation Monitoring Centre (WCMC) 2018",
      sourceUrl: "https://habitats.oceanplus.org/",
      color: "#4A90E2"
    }
  },

  // ⚓ HÄFEN
  "harbours": {
    id: "harbours",
    name: "Häfen",
    type: "geojson",
    url: "./data/ports_all.json",
    minZoom: 5,  // Nur ab Zoom 5 anzeigen
    style: {
      color: "#FF9800",
      weight: 1,
      fillColor: "#FF9800",
      fillOpacity: 0.7,
      radius: 3
    },
    legend: {
      title: "Häfen weltweit",
      description: "Globale Häfen-Datenbank (sichtbar ab Zoom 5, gruppiert bis Zoom 7)",
      source: "World Port Index (National Geospatial-Intelligence Agency)",
      sourceUrl: "https://msi.nga.mil/Publications/WPI"
    },
    icon: "⚓",  // Emoji beibehalten
    iconSize: 12,  // Kleiner machen
    clustering: {
      enabled: true,
      maxClusterRadius: 50,  // Radius für Gruppierung
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      disableClusteringAtZoom: 8  // Ab Zoom 8 keine Cluster mehr
    }
  },

  // 🤿 TAUCHSPOTS - NEU
  "dive-sites": {
    id: "dive-sites",
    name: "Tauchspots",
    type: "overpass",
    apiUrl: "https://overpass-api.de/api/interpreter?data=[out:json][timeout:25];(node[%22sport%22=%22scuba_diving%22];way[%22sport%22=%22scuba_diving%22];relation[%22sport%22=%22scuba_diving%22];);out%20geom;",
    style: {
      color: "#00BCD4",
      fillColor: "#00BCD4",
      fillOpacity: 0.8,
      radius: 6
    },
    legend: {
      title: "Tauchspots weltweit",
      description: "Tauchplätze und Tauchzentren",
      source: "OpenStreetMap (Overpass API)",
      sourceUrl: "https://www.openstreetmap.org/"
    },
    icon: "🤿"
  },

  // 🌡️ WASSERTEMPERATUR (SST) - JETZT FUNKTIONIEREND!
  sst: {
    id: "sst",
    name: "Wassertemperatur (SST)",
    type: "wms",
    enabled: true,  // ✅ AKTIVIERT!
    wmsUrl: "https://pae-paha.pacioos.hawaii.edu/thredds/wms/dhw_5km",
    wmsLayers: "CRW_SST",
    legend: {
      title: "Meeresoberflächentemperatur (SST)",
      description: "NOAA Coral Reef Watch - CoralTemp SST v3.1 | Satellitendaten, täglich aktualisiert",
      source: "NOAA Coral Reef Watch - 5km Resolution, Oberfläche (0-5m Tiefe)",
      sourceUrl: "https://coralreefwatch.noaa.gov/",
      unit: "°C (Grad Celsius)",
      levels: [
        { value: "< 20", color: "#000080", label: "< 20°C - Zu kalt für tropische Korallen ❄️" },
        { value: "20-23", color: "#0000FF", label: "20-23°C - Untere Grenze 🌊" },
        { value: "23-26", color: "#00FFFF", label: "23-26°C - Optimal für Korallenwachstum ✅" },
        { value: "26-28", color: "#00FF00", label: "26-28°C - IDEAL für Korallen ✅" },
        { value: "28-30", color: "#FFFF00", label: "28-30°C - Obere Grenze - Stress beginnt ⚠️" },
        { value: "30-32", color: "#FF8800", label: "30-32°C - Bleaching-Risiko! 🚨" },
        { value: "> 32", color: "#FF0000", label: "> 32°C - KRITISCH - Massenbleiche 💀" }
      ],
      interpretation: "GRÜN (26-28°C) = Perfekt | GELB (28-30°C) = Grenzbereich | ROT (>30°C) = Gefahr für Korallen!"
    }
  },

  // 🔥 HITZESTRESS (DHW) - WMS
  dhw: {
    id: "dhw",
    name: "Hitzestress (DHW)",
    type: "wms",
    wmsUrl: "https://pae-paha.pacioos.hawaii.edu/thredds/wms/dhw_5km",
    wmsLayers: "CRW_DHW",
    legend: {
      title: "Degree Heating Weeks (DHW)",
      description: "NOAA Coral Reef Watch - Akkumulierter Hitzestress",
      source: "NOAA Coral Reef Watch - 5km Resolution",
      sourceUrl: "https://coralreefwatch.noaa.gov/",
      unit: "°C-Wochen",
      levels: [
        { value: "0-2", color: "#00FF00", label: "Normal" },
        { value: "2-4", color: "#AAFF00", label: "Leicht erhöht" },
        { value: "4-6", color: "#FFFF00", label: "Warnung" },
        { value: "6-8", color: "#FF8800", label: "Bleaching-Risiko" },
        { value: "8-12", color: "#FF0000", label: "Kritisch" },
        { value: "> 12", color: "#AA0000", label: "Massensterben" }
      ],
      interpretation: "DHW > 4 = Bleaching-Warnung, DHW > 8 = Schwere Bleaching-Ereignisse"
    }
  },

  // 🌿 CHLOROPHYLL-A (Wasserqualität) - KORRIGIERT
  chlorophyll: {
    id: "chlorophyll",
    name: "Chlorophyll-a (Algenwachstum)",
    type: "wms",
    wmsUrl: "https://coastwatch.noaa.gov/erddap/wms/erdVHNchlaWeekly/request",
    wmsLayers: "erdVHNchlaWeekly:chla",
    legend: {
      title: "Chlorophyll-a Konzentration",
      description: "NOAA CoastWatch VIIRS - Indikator für Algenwachstum",
      source: "NOAA CoastWatch VIIRS - Global, 4km, wöchentlich",
      sourceUrl: "https://coastwatch.noaa.gov/",
      unit: "mg/m³",
      levels: [
        { value: "< 0.1", color: "#000080", label: "Sehr niedrig (oligotroph)" },
        { value: "0.1-0.3", color: "#0000FF", label: "Niedrig" },
        { value: "0.3-1.0", color: "#00FFFF", label: "Mäßig" },
        { value: "1.0-3.0", color: "#00FF00", label: "Erhöht" },
        { value: "3.0-10", color: "#FFFF00", label: "Hoch (eutroph)" },
        { value: "> 10", color: "#FF0000", label: "Sehr hoch (Algenblüte)" }
      ],
      interpretation: "Hohe Werte können auf Eutrophierung (Überdüngung) hinweisen"
    }
  },

  // 💧 TRÜBUNG / WASSERKLARHEIT (Kd490) - KORRIGIERT
  turbidity: {
    id: "turbidity",
    name: "Trübung (Kd490)",
    type: "wms",
    wmsUrl: "https://coastwatch.noaa.gov/erddap/wms/erdVH2kd4908day/request",
    wmsLayers: "erdVH2kd4908kd490:kd_490",
    legend: {
      title: "Diffuse Dämpfung (Kd490)",
      description: "NOAA CoastWatch VIIRS - Indikator für Wasserklarheit",
      source: "NOAA CoastWatch VIIRS - Global, 4km, 8-Tage Komposit",
      sourceUrl: "https://coastwatch.noaa.gov/",
      unit: "m⁻¹",
      levels: [
        { value: "< 0.05", color: "#000080", label: "Sehr klar" },
        { value: "0.05-0.1", color: "#0000FF", label: "Klar" },
        { value: "0.1-0.2", color: "#00FFFF", label: "Mäßig klar" },
        { value: "0.2-0.5", color: "#00FF00", label: "Trüb" },
        { value: "0.5-1.0", color: "#FFFF00", label: "Sehr trüb" },
        { value: "> 1.0", color: "#FF0000", label: "Extrem trüb" }
      ],
      interpretation: "Hohe Werte = schlechte Sicht, mehr Sedimente/Partikel im Wasser"
    }
  },

  // 🌊 WASSERQUALITÄT (Kombiniert) - NEU
  "water-quality": {
    id: "water-quality",
    name: "Wasserqualität",
    type: "wms",
    enabled: true,
    wmsUrl: "https://pae-paha.pacioos.hawaii.edu/thredds/wms/dhw_5km",
    wmsLayers: "CRW_BAA",
    legend: {
      title: "Bleaching Alert Area (BAA)",
      description: "NOAA Coral Reef Watch - Warnsystem für Korallenbleiche",
      source: "NOAA Coral Reef Watch - 5km Resolution, täglich aktualisiert",
      sourceUrl: "https://coralreefwatch.noaa.gov/",
      unit: "Alert Level",
      levels: [
        { value: "Blau", color: "#0066CC", label: "Keine Daten / Normal - Sicher ✓" },
        { value: "0", color: "#00FF00", label: "No Stress - Optimal" },
        { value: "1", color: "#FFFF00", label: "Watch - Beobachten" },
        { value: "2", color: "#FF8800", label: "Warning - Bleiche möglich" },
        { value: "3", color: "#FF0000", label: "Alert Level 1 - Bleiche wahrscheinlich" },
        { value: "4", color: "#AA0000", label: "Alert Level 2 - Massensterben" }
      ],
      interpretation: "Kombiniert Temperatur + Hitzestress + Licht. BLAU = GUT (keine Gefahr), ROT = GEFAHR (Bleiche)"
    }
  },

  // 🔬 MIKROPLASTIK-VERSCHMUTZUNG
  "microplastics": {
    id: "microplastics",
    name: "Mikroplastik-Verschmutzung",
    type: "geojson",
    url: "./data/Marine_Microplastics.geojson",
    style: function(feature) {
      const concentration = feature.properties.Concentration_class_text;
      let color, radius;
      
      switch(concentration) {
        case "Very Low":
          color = "#00FF00";
          radius = 3;
          break;
        case "Low":
          color = "#AAFF00";
          radius = 4;
          break;
        case "Medium":
          color = "#FFFF00";
          radius = 5;
          break;
        case "High":
          color = "#FF8800";
          radius = 6;
          break;
        case "Very High":
          color = "#FF0000";
          radius = 7;
          break;
        default:
          color = "#888888";
          radius = 3;
      }
      
      return {
        color: color,
        fillColor: color,
        fillOpacity: 0.7,
        weight: 1,
        radius: radius
      };
    },
    legend: {
      title: "Mikroplastik-Konzentration",
      description: "Globale Messungen von Mikroplastik in Meerwasser und Sedimenten",
      source: "Verschiedene wissenschaftliche Studien (Marine Microplastics Database)",
      sourceUrl: "https://marinedebris.noaa.gov/",
      unit: "pieces/m³ oder pieces/kg",
      levels: [
        { value: "Very Low", color: "#00FF00", label: "Sehr niedrig (0-0.0005 pieces/m³)" },
        { value: "Low", color: "#AAFF00", label: "Niedrig (0.0005-0.005 pieces/m³)" },
        { value: "Medium", color: "#FFFF00", label: "Mittel (0.005-1 pieces/m³)" },
        { value: "High", color: "#FF8800", label: "Hoch (1-10 pieces/m³)" },
        { value: "Very High", color: "#FF0000", label: "Sehr hoch (>10 pieces/m³)" }
      ],
      interpretation: "Mikroplastik gefährdet marine Organismen und kann in die Nahrungskette gelangen"
    },
    icon: "🔬"
  },

  // 🛢️ ÖL- UND CHEMIE-VORFÄLLE
  "incidents": {
    id: "incidents",
    name: "Öl- & Chemie-Vorfälle",
    type: "csv",
    url: "./data/incidents.csv",
    style: function(feature) {
      const threat = feature.properties.threat;
      let color, iconHtml;
      
      switch(threat) {
        case "Oil":
          color = "#000000";
          iconHtml = "🛢️";
          break;
        case "Chemical":
          color = "#9C27B0";
          iconHtml = "⚗️";
          break;
        default:
          color = "#666666";
          iconHtml = "⚠️";
      }
      
      return {
        color: color,
        fillColor: color,
        fillOpacity: 0.8,
        weight: 2,
        radius: 6,
        iconHtml: iconHtml
      };
    },
    legend: {
      title: "Öl- und Chemie-Vorfälle",
      description: "NOAA Incident News - Verschmutzungsvorfälle weltweit",
      source: "NOAA Office of Response and Restoration",
      sourceUrl: "https://response.restoration.noaa.gov/",
      levels: [
        { value: "Oil", color: "#000000", label: "🛢️ Ölverschmutzung" },
        { value: "Chemical", color: "#9C27B0", label: "⚗️ Chemische Verschmutzung" },
        { value: "Other", color: "#666666", label: "⚠️ Andere Vorfälle" }
      ],
      interpretation: "Dokumentierte Umweltvorfälle mit potenzieller Gefahr für marine Ökosysteme"
    },
    icon: "🛢️"
  }
};

// ============================================================================
// POI KONFIGURATION
// ============================================================================

export const overpassQueries = {
  diveSites: `
    [out:json][timeout:25];
    (
      node["sport"="diving"]({{bbox}});
      node["leisure"="dive_centre"]({{bbox}});
      node["tourism"="attraction"]["name"~".*[Dd]iv.*"]({{bbox}});
      way["sport"="diving"]({{bbox}});
      relation["sport"="diving"]({{bbox}});
    );
    out center;
  `,

  harbours: `
    [out:json][timeout:25];
    (
      node["harbour"]({{bbox}});
      node["seamark:type"="harbour"]({{bbox}});
      node["amenity"="ferry_terminal"]({{bbox}});
      way["harbour"]({{bbox}});
      way["seamark:type"="harbour"]({{bbox}});
      relation["harbour"]({{bbox}});
    );
    out center;
  `
};

export const staticPOIs = {
  diveSites: [
    { name: "Great Barrier Reef - Agincourt Reef", lat: -16.0333, lon: 145.8167, region: "GBR" },
    { name: "Great Barrier Reef - Cod Hole", lat: -14.6667, lon: 145.6167, region: "GBR" },
    { name: "SS Yongala Wreck", lat: -19.3042, lon: 147.6167, region: "GBR" },
    { name: "Blue Hole, Belize", lat: 17.3167, lon: -87.5333, region: "Caribbean" },
    { name: "Cozumel, Mexico", lat: 20.5083, lon: -86.9458, region: "Caribbean" },
    { name: "Bonaire Marine Park", lat: 12.2019, lon: -68.2624, region: "Caribbean" },
    { name: "SS Thistlegorm Wreck", lat: 27.8167, lon: 33.9167, region: "Red Sea" },
    { name: "Ras Mohammed", lat: 27.7333, lon: 34.2333, region: "Red Sea" },
    { name: "Blue Hole Dahab", lat: 28.5833, lon: 34.5167, region: "Red Sea" },
    { name: "Raja Ampat, Indonesia", lat: -0.2297, lon: 130.5178, region: "Indo-Pacific" },
    { name: "Komodo National Park", lat: -8.5500, lon: 119.4833, region: "Indo-Pacific" },
    { name: "Sipadan Island, Malaysia", lat: 4.1158, lon: 118.6283, region: "Indo-Pacific" },
    { name: "Tubbataha Reef, Philippines", lat: 8.8583, lon: 119.8167, region: "Indo-Pacific" },
    { name: "Maldives - North Male Atoll", lat: 4.3333, lon: 73.5333, region: "Maldives" },
    { name: "Maldives - South Ari Atoll", lat: 3.7500, lon: 72.8333, region: "Maldives" },
    { name: "Palau - Blue Corner", lat: 7.2431, lon: 134.2167, region: "Pacific" },
    { name: "Fiji - Rainbow Reef", lat: -16.7167, lon: 179.3333, region: "Pacific" },
    { name: "Galapagos Islands", lat: -0.9538, lon: -90.9656, region: "Pacific" }
  ],

  harbours: [
    { name: "Cairns Harbor", lat: -16.9186, lon: 145.7781, region: "Australia" },
    { name: "Port Douglas", lat: -16.4833, lon: 145.4667, region: "Australia" },
    { name: "Malé Harbor", lat: 4.1755, lon: 73.5093, region: "Maldives" },
    { name: "Sharm el-Sheikh", lat: 27.9158, lon: 34.3300, region: "Egypt" },
    { name: "Hurghada Port", lat: 27.2579, lon: 33.8116, region: "Egypt" },
    { name: "Cozumel Port", lat: 20.5114, lon: -86.9456, region: "Mexico" },
    { name: "Sorong Harbor", lat: -0.8667, lon: 131.2500, region: "Indonesia" },
    { name: "Labuan Bajo", lat: -8.4967, lon: 119.8878, region: "Indonesia" }
  ]
};

// ============================================================================
// MAP EINSTELLUNGEN
// ============================================================================

export const mapConfig = {
  center: [-5, 120],
  zoom: 4,
  minZoom: 2,      // Verhindert zu weites Herauszoomen
  maxZoom: 10,
  worldCopyJump: false
};

export const performanceConfig = {
  debounceDelay: 300,
  minBboxSize: 1.0
};