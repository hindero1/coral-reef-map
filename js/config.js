/**
 * Konfigurationsdatei für die CoralReefMap
 * KOMPLETT AKTUALISIERT für lokale GeoJSON-Dateien + POI-Support
 */

// ERDDAP Server
const COASTWATCH = "https://coastwatch.noaa.gov/erddap";
const USF_ERDDAP = "https://erddap.marine.usf.edu/erddap";
const PFEG = "https://coastwatch.pfeg.noaa.gov/erddap";


/**
 * Layer-Konfigurationen
 */
export const layers = {
  // 🪸 WARMWASSER-KORALLENRIFFE (kombiniert: Polygone + Punkte)
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
      description: "Tropische und subtropische Korallenriffe (UNEP-WCMC 2018)",
      color: "#FF6B6B"
    }
  },

  // ❄️ KALTWASSER-KORALLENRIFFE (kombiniert: Polygone + Punkte)
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
      description: "Tiefwasser-Korallenriffe in kalten Gewässern (UNEP-WCMC 2018)",
      color: "#4A90E2"
    }
  },

  // ⚓ HÄFEN (aus ports_all.json)
  "harbours": {
    id: "harbours",
    name: "Häfen",
    type: "geojson",
    url: "./data/ports_all.json",
    style: {
      color: "#FF9800",
      weight: 1,
      fillColor: "#FF9800",
      fillOpacity: 0.6,
      radius: 4
    },
    legend: {
      title: "Häfen weltweit",
      description: "Globale Häfen-Datenbank",
      color: "#FF9800"
    },
    icon: "⚓"
  },

  // 🌡️ WASSERTEMPERATUR (SST)
  sst: {
    id: "sst",
    name: "Wassertemperatur (SST)",
    type: "erddap",
    server: PFEG,
    datasetId: "NOAA_DHW",
    variable: "CRW_SST",
    colorBar: "Rainbow|C=linear|I=15,32",
    belowColorHex: "0x00000000",
    missingColorHex: "0x00000000",
    opacity: 0.65
  },

  // 🔥 HITZESTRESS (DHW)
  dhw: {
    id: "dhw",
    name: "Hitzestress (DHW)",
    type: "erddap",
    server: PFEG,
    datasetId: "NOAA_DHW",
    variable: "CRW_DHW",
    colorBar: "Rainbow|C=linear|I=1,8",
    belowColorHex: "0x00000000",
    missingColorHex: "0x00000000",
    opacity: 0.7
  },

  // 📊 SST ANOMALIE
  "sst-anom": {
    id: "sst-anom",
    name: "SST Anomalie",
    type: "erddap",
    server: USF_ERDDAP,
    datasetId: "jplMURSST41anom1day",
    variable: "anom",
    units: "°C",
    colorBar: "RdBu_r|C=linear|I=-3,3",
    belowColorHex: "0x00000000",
    missingColorHex: "0x00000000",
    opacity: 0.65,
    legend: {
      title: "Temperatur-Anomalie",
      description: "Abweichung vom langjährigen Durchschnitt",
      range: "-3 bis +3°C"
    }
  },

  // 🌱 CHLOROPHYLL-A
  chla: {
    id: "chla",
    name: "Chlorophyll-a",
    type: "erddap",
    server: COASTWATCH,
    datasetId: "noaacwNPPVIIRSSQchlaDaily",
    variable: "chlor_a",
    units: "mg m⁻³",
    colorBar: "Rainbow|C=log|I=0.01,20",
    belowColorHex: "0x00000000",
    missingColorHex: "0x00000000",
    opacity: 0.6,
    legend: {
      title: "Chlorophyll-a Konzentration",
      description: "Indikator für Algenwachstum. Hohe Werte = Verschmutzung/Eutrophierung",
      range: "0.01-20 mg/m³"
    }
  },

  // 🌊 TRÜBUNG
  turbidity: {
    id: "turbidity",
    name: "Trübung (Kd490)",
    type: "erddap",
    server: COASTWATCH,
    datasetId: "noaacwNPPVIIRSkd490Daily",
    variable: "kd_490",
    units: "m⁻¹",
    colorBar: "Rainbow|C=log|I=0.01,2",
    belowColorHex: "0x00000000",
    missingColorHex: "0x00000000",
    opacity: 0.6,
    legend: {
      title: "Wasser-Trübung (Kd490)",
      description: "Lichtdurchlässigkeit des Wassers. Wichtig für Photosynthese der Korallen.",
      range: "0.01-2 m⁻¹"
    }
  }
};

/**
 * OpenStreetMap Overpass API Queries (OPTIMIERT)
 */
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

/**
 * Statische POI-Daten (Fallback)
 */
export const staticPOIs = {
  diveSites: [
    // Great Barrier Reef
    { name: "Great Barrier Reef - Agincourt Reef", lat: -16.0333, lon: 145.8167, region: "GBR" },
    { name: "Great Barrier Reef - Cod Hole", lat: -14.6667, lon: 145.6167, region: "GBR" },
    { name: "SS Yongala Wreck", lat: -19.3042, lon: 147.6167, region: "GBR" },

    // Karibik
    { name: "Blue Hole, Belize", lat: 17.3167, lon: -87.5333, region: "Caribbean" },
    { name: "Cozumel, Mexico", lat: 20.5083, lon: -86.9458, region: "Caribbean" },
    { name: "Bonaire Marine Park", lat: 12.2019, lon: -68.2624, region: "Caribbean" },

    // Rotes Meer
    { name: "SS Thistlegorm Wreck", lat: 27.8167, lon: 33.9167, region: "Red Sea" },
    { name: "Ras Mohammed", lat: 27.7333, lon: 34.2333, region: "Red Sea" },
    { name: "Blue Hole Dahab", lat: 28.5833, lon: 34.5167, region: "Red Sea" },

    // Indopazifik
    { name: "Raja Ampat, Indonesia", lat: -0.2297, lon: 130.5178, region: "Indo-Pacific" },
    { name: "Komodo National Park", lat: -8.5500, lon: 119.4833, region: "Indo-Pacific" },
    { name: "Sipadan Island, Malaysia", lat: 4.1158, lon: 118.6283, region: "Indo-Pacific" },
    { name: "Tubbataha Reef, Philippines", lat: 8.8583, lon: 119.8167, region: "Indo-Pacific" },

    // Malediven
    { name: "Maldives - North Male Atoll", lat: 4.3333, lon: 73.5333, region: "Maldives" },
    { name: "Maldives - South Ari Atoll", lat: 3.7500, lon: 72.8333, region: "Maldives" },

    // Pazifik
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

/**
 * Map-Einstellungen
 */
export const mapConfig = {
  center: [-5, 120],
  zoom: 4,
  minZoom: 2,
  maxZoom: 10,
  worldCopyJump: false
};

/**
 * Performance-Einstellungen
 */
export const performanceConfig = {
  throttleDelay: 800,
  maxPixels: 1024,
  minBboxSize: 1.0,
  debounceDelay: 1000
};