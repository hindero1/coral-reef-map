/**
 * Konfigurationsdatei für die CoralReefMap
 * VERSION: 5.0 - WMS/WMTS Integration
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
      description: "Tropische und subtropische Korallenriffe (UNEP-WCMC 2018)",
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
      description: "Tiefwasser-Korallenriffe in kalten Gewässern (UNEP-WCMC 2018)",
      color: "#4A90E2"
    }
  },

  // ⚓ HÄFEN
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

  // 🌡️ WASSERTEMPERATUR (SST) - WMS/WMTS
  sst: {
    id: "sst",
    name: "Wassertemperatur (SST)",
    type: "wmts",  // WMS/WMTS Layer
    
    // NASA GIBS (Primary)
    wmtsUrl: "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/MODIS_Aqua_L3_SST_MidIR_4km_Night_Daily",
    
    // ERDDAP WMS (Fallback)
    wmsUrl: "https://coastwatch.pfeg.noaa.gov/erddap/wms/jplMURSST41/request",
    wmsLayers: "jplMURSST41:analysed_sst",
    
    legend: {
      title: "Meeresoberflächentemperatur",
      description: "NASA GIBS - Täglich aktualisierte Satellitendaten",
      source: "MODIS Aqua L3 SST (4km)",
      levels: [
        { value: "< 10°C", color: "#0000FF", label: "Sehr kalt (Polar)" },
        { value: "10-15°C", color: "#00FFFF", label: "Kalt" },
        { value: "15-20°C", color: "#00FF00", label: "Kühl" },
        { value: "20-25°C", color: "#FFFF00", label: "Gemäßigt" },
        { value: "25-28°C", color: "#FF8800", label: "Warm (Optimal)" },
        { value: "> 28°C", color: "#FF0000", label: "Heiß (Bleaching-Risiko)" }
      ]
    }
  },

  // 🔥 HITZESTRESS (DHW) - WMS
  dhw: {
    id: "dhw",
    name: "Hitzestress (DHW)",
    type: "wms",  // WMS Layer
    
    // NOAA Coral Reef Watch
    wmsUrl: "https://pae-paha.pacioos.hawaii.edu/thredds/wms/dhw_5km",
    wmsLayers: "CRW_DHW",
    
    legend: {
      title: "Degree Heating Weeks (DHW)",
      description: "NOAA Coral Reef Watch - Akkumulierter Hitzestress",
      source: "5km Resolution",
      levels: [
        { value: "0-2", color: "#00FF00", label: "Normal" },
        { value: "2-4", color: "#AAFF00", label: "Leicht erhöht" },
        { value: "4-6", color: "#FFFF00", label: "Warnung" },
        { value: "6-8", color: "#FF8800", label: "Bleaching-Risiko" },
        { value: "8-12", color: "#FF0000", label: "Kritisch" },
        { value: "> 12", color: "#AA0000", label: "Massensterben" }
      ]
    }
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
  minZoom: 2,
  maxZoom: 10,
  worldCopyJump: false
};

export const performanceConfig = {
  debounceDelay: 300,
  minBboxSize: 1.0
};
