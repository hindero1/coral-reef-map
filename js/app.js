/**
 * CoralReefMap - Hauptanwendung
 * VERSION: 5.0 - Mit WMS/WMTS Integration für SST/DHW
 * Nutzt NASA GIBS und NOAA Coral Reef Watch für Echtzeit-Daten
 */

import { layers, mapConfig, performanceConfig, overpassQueries, staticPOIs } from './config.js';
import { 
  debounce, 
  normalizeBbox, 
  showLoading,
  hideLoading,
  updateLegend,
  fetchOverpassData,
  createOverpassMarkers
} from './utils.js';

// ============================================================================
// GLOBALE VARIABLEN
// ============================================================================

let map;
const activeOverlays = new Map();
const today = new Date();
const currentDate = new Date(Date.UTC(
  today.getUTCFullYear(), 
  today.getUTCMonth(), 
  today.getUTCDate()
));

// Debug-Modus
const DEBUG = true;
function debugLog(...args) {
  if (DEBUG) console.log(...args);
}

// ============================================================================
// MAP INITIALISIERUNG
// ============================================================================

function initMap() {
  map = L.map('map', {
    center: mapConfig.center,
    zoom: mapConfig.zoom,
    minZoom: mapConfig.minZoom,
    maxZoom: mapConfig.maxZoom,
    worldCopyJump: false
  });

  // Basemap
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
  }).addTo(map);

  // Labels
  map.createPane('labels');
  map.getPane('labels').style.zIndex = 650;
  map.getPane('labels').style.pointerEvents = 'none';

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
    pane: 'labels',
    subdomains: 'abcd'
  }).addTo(map);

  // Korallenriffe aus GeoJSON laden
  initCoralLayers();

  console.log('✅ Map initialisiert');
}

// ============================================================================
// KORALLENRIFFE AUS GEOJSON LADEN
// ============================================================================

async function loadCoralGeoJSON(layerId) {
  const layerConfig = layers[layerId];
  if (!layerConfig || layerConfig.type !== 'geojson') return;

  showLoading();
  console.log(`🪸 Lade ${layerConfig.name} aus ${layerConfig.url}...`);

  try {
    const response = await fetch(layerConfig.url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const geojson = await response.json();
    console.log(`✅ GeoJSON geladen:`, {
      type: geojson.type,
      features: geojson.features?.length || 'unknown'
    });

    // Leaflet GeoJSON Layer erstellen
    const geoJsonLayer = L.geoJSON(geojson, {
      // Style für Polygone
      style: (feature) => {
        if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
          return layerConfig.style;
        }
        return null;
      },
      
      // Für Point-Features
      pointToLayer: (feature, latlng) => {
        // Spezial-Icon für Häfen
        if (layerId === 'harbours' && layerConfig.icon) {
          const icon = L.divIcon({
            html: `<div style="font-size: 18px; text-shadow: 0 0 3px white;">${layerConfig.icon}</div>`,
            className: '',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });
          return L.marker(latlng, { icon });
        }
        
        // Standard Circle Marker für andere Punkte
        return L.circleMarker(latlng, {
          radius: layerConfig.style.radius || 1.5,
          fillColor: layerConfig.style.fillColor,
          color: layerConfig.style.fillColor,
          weight: 0.5,
          opacity: 0.8,
          fillOpacity: 0.6
        });
      },
      
      // Popup für jedes Feature
      onEachFeature: (feature, layer) => {
        const props = feature.properties || {};
        
        // Spezial-Popup für Häfen
        if (layerId === 'harbours') {
          const name = props.PORT_NAME || props.name || props.NAME || 'Unbekannter Hafen';
          const country = props.COUNTRY || props.country || '';
          const latitude = props.LATITUDE || props.LAT_DEM || feature.geometry.coordinates[1];
          const longitude = props.LONGITUDE || props.LONG_DEM || feature.geometry.coordinates[0];
          
          let popupHTML = `
            <div class="popup-title">⚓ ${name}</div>
            <div class="popup-info">
          `;
          
          if (country) popupHTML += `🌍 ${country}<br>`;
          popupHTML += `📍 Lat: ${parseFloat(latitude).toFixed(4)}, Lon: ${parseFloat(longitude).toFixed(4)}<br>`;
          
          if (props.REGION_NO) popupHTML += `📊 Region: ${props.REGION_NO}<br>`;
          
          popupHTML += `<small style="color: #999;">Quelle: Globale Häfen-Datenbank</small>`;
          popupHTML += `</div>`;
          
          layer.bindPopup(popupHTML);
          return;
        }
        
        // Standard-Popup für Korallen
        const name = props.COUNTRY || props.NAME || props.name || 'Korallenriff';
        const type = props.TYPE || props.type || 'unbekannt';
        
        layer.bindPopup(`
          <div class="popup-title">${name}</div>
          <div class="popup-info">
            🪸 Typ: ${type}<br>
            ${props.AREA_KM2 ? `📐 Fläche: ${props.AREA_KM2} km²<br>` : ''}
            <small>Quelle: UNEP-WCMC 2018</small>
          </div>
        `);
      }
    });

    geoJsonLayer.addTo(map);
    activeOverlays.set(layerId, geoJsonLayer);
    updateLegend(layerConfig);
    
    console.log(`✅ ${layerConfig.name} erfolgreich geladen und angezeigt`);
    
  } catch (error) {
    console.error(`❌ Fehler beim Laden von ${layerConfig.name}:`, error);
    alert(`Fehler beim Laden der Korallenriff-Daten!\n\n` +
          `Stelle sicher, dass die Datei existiert:\n${layerConfig.url}\n\n` +
          `Fehler: ${error.message}`);
  } finally {
    hideLoading();
  }
}

function initCoralLayers() {
  // Beide Layer initial laden (beide Checkboxen sind checked)
  loadCoralGeoJSON('coral-warm');
  loadCoralGeoJSON('coral-cold');
  
  // Event-Listener für Warmwasser-Checkbox
  const warmCheckbox = document.getElementById('layer-coral-warm');
  if (warmCheckbox) {
    warmCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        loadCoralGeoJSON('coral-warm');
      } else {
        if (activeOverlays.has('coral-warm')) {
          map.removeLayer(activeOverlays.get('coral-warm'));
          activeOverlays.delete('coral-warm');
          console.log('❌ Warmwasser-Korallen ausgeblendet');
        }
      }
    });
  }
  
  // Event-Listener für Kaltwasser-Checkbox
  const coldCheckbox = document.getElementById('layer-coral-cold');
  if (coldCheckbox) {
    coldCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        loadCoralGeoJSON('coral-cold');
      } else {
        if (activeOverlays.has('coral-cold')) {
          map.removeLayer(activeOverlays.get('coral-cold'));
          activeOverlays.delete('coral-cold');
          console.log('❌ Kaltwasser-Korallen ausgeblendet');
        }
      }
    });
  }
}

// ============================================================================
// WMS/WMTS LAYER (SST, DHW) - ECHTZEIT-DATEN!
// ============================================================================

/**
 * NASA GIBS WMTS - Sea Surface Temperature
 * Täglich aktualisiert, hochauflösend
 */
function loadNASA_GIBS_SST() {
  console.log('🛰️ Lade NASA GIBS SST Tiles...');
  
  // Datum (2-3 Tage zurück wegen Verzögerung)
  const date = new Date();
  date.setDate(date.getDate() - 30);
  const dateStr = date.toISOString().split('T')[0];
  
  debugLog(`Datum: ${dateStr}`);
  
  // NASA GIBS WMTS Endpoint
  const baseUrl = 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/';
  const layer = 'MODIS_Aqua_L3_SST_MidIR_4km_Night_Daily';
  
  const sstLayer = L.tileLayer(
    `${baseUrl}${layer}/default/${dateStr}/250m/{z}/{y}/{x}.png`,
    {
      tms: true,
      opacity: 0.7,
      attribution: 'NASA EOSDIS GIBS',
      minZoom: 0,
      maxZoom: 7,
      bounds: [[-90, -180], [90, 180]]
    }
  );
  
  sstLayer.on('tileload', () => {
    debugLog('✅ NASA GIBS SST Tile geladen');
  });
  
  sstLayer.on('tileerror', (error) => {
    console.warn('⚠️ NASA GIBS Tile Fehler:', error);
  });
  
  sstLayer.addTo(map);
  activeOverlays.set('sst', sstLayer);
  
  console.log(`✅ NASA GIBS SST Layer aktiv (${dateStr})`);
  
  return sstLayer;
}

/**
 * NOAA Coral Reef Watch WMS - DHW (Degree Heating Weeks)
 * Speziell für Korallenriff-Monitoring
 */
function loadNOAA_CRW_DHW() {
  console.log('🪸 Lade NOAA Coral Reef Watch DHW...');
  
  // NOAA CRW WMS Endpoint (PacIOOS)
  const wmsUrl = 'https://pae-paha.pacioos.hawaii.edu/thredds/wms/dhw_5km';
  
  const dhwLayer = L.tileLayer.wms(wmsUrl, {
    layers: 'CRW_DHW',
    format: 'image/png',
    transparent: true,
    opacity: 0.7,
    version: '1.3.0',
    attribution: 'NOAA Coral Reef Watch',
    styles: 'boxfill/rainbow',
    colorscalerange: '0,8',
    numcolorbands: 250
  });
  
  dhwLayer.on('load', () => {
    console.log('✅ NOAA DHW geladen');
  });
  
  dhwLayer.on('tileerror', (error) => {
    console.warn('⚠️ NOAA DHW Fehler:', error);
  });
  
  dhwLayer.addTo(map);
  activeOverlays.set('dhw', dhwLayer);
  
  console.log('✅ NOAA CRW DHW Layer aktiv');
  
  return dhwLayer;
}

/**
 * Alternative: ERDDAP WMS
 * Falls NASA GIBS nicht funktioniert
 */
function loadERDDAP_SST_WMS() {
  console.log('🌊 Lade ERDDAP SST via WMS...');
  
  const date = new Date();
  date.setDate(date.getDate() - 2);
  const timeStr = date.toISOString();
  
  const wmsUrl = 'https://coastwatch.pfeg.noaa.gov/erddap/wms/jplMURSST41/request';
  
  const sstLayer = L.tileLayer.wms(wmsUrl, {
    layers: 'jplMURSST41:analysed_sst',
    format: 'image/png',
    transparent: true,
    opacity: 0.7,
    version: '1.3.0',
    time: timeStr,
    attribution: 'NASA JPL MUR SST via ERDDAP',
    styles: 'boxfill/rainbow',
    colorscalerange: '273,303',
    numcolorbands: 250
  });
  
  sstLayer.addTo(map);
  activeOverlays.set('sst', sstLayer);
  
  console.log('✅ ERDDAP SST WMS aktiv');
  
  return sstLayer;
}

/**
 * Smart Loader: Probiert verschiedene Quellen mit Fallback
 */
function loadSST_Smart() {
  console.log('🔍 Lade SST via ERDDAP WMS (aktueller als GIBS)...');
  showLoading();
  
  try {
    const date = new Date();
    date.setDate(date.getDate() - 6);  // ERDDAP ist schneller!
    const timeStr = date.toISOString();
    
    const wmsUrl = 'https://coastwatch.pfeg.noaa.gov/erddap/wms/jplMURSST41/request';
    
    const sstLayer = L.tileLayer.wms(wmsUrl, {
      layers: 'jplMURSST41:analysed_sst',
      format: 'image/png',
      transparent: true,
      opacity: 0.7,
      version: '1.3.0',
      time: timeStr,
      attribution: 'NASA JPL MUR SST via ERDDAP',
      styles: 'boxfill/rainbow',
      colorscalerange: '273,303',
      numcolorbands: 250
    });
    
    sstLayer.addTo(map);
    activeOverlays.set('sst', sstLayer);
    hideLoading();
    
    console.log('✅ SST via ERDDAP WMS geladen');
    return sstLayer;
    
  } catch (error) {
    console.error('❌ ERDDAP Fehler:', error);
    hideLoading();
    alert('Konnte SST nicht laden');
    return null;
  }
}

async function loadDHW_Smart() {
  console.log('🔍 Lade DHW-Daten...');
  showLoading();
  
  try {
    const layer = loadNOAA_CRW_DHW();
    
    await new Promise((resolve) => {
      setTimeout(() => resolve(true), 2000);
      layer.once('load', () => resolve(true));
    });
    
    hideLoading();
    console.log('✅ DHW Layer erfolgreich geladen');
    return layer;
    
  } catch (error) {
    console.error('❌ DHW Laden fehlgeschlagen', error);
    hideLoading();
    alert('❌ Konnte DHW-Layer nicht laden.\n\nNOAA Coral Reef Watch ist nicht verfügbar.');
    return null;
  }
}

// ============================================================================
// POI LAYER (Dive Sites, Harbours)
// ============================================================================

async function loadPOILayer(layerId) {
  const layerConfig = layers[layerId];
  if (!layerConfig) {
    console.error(`❌ Layer-Config nicht gefunden: ${layerId}`);
    return;
  }

  showLoading();
  console.log(`🔍 Lade ${layerId}...`);

  const bbox = getBbox();
  let markers = [];
  let useStaticFallback = false;

  // Versuche zuerst Overpass API
  try {
    const query = layerId === 'dive-sites' 
      ? overpassQueries.diveSites 
      : overpassQueries.harbours;
    
    const elements = await fetchOverpassData(query, bbox);
    
    if (elements.length === 0) {
      console.warn('⚠️ Keine Daten von Overpass - nutze statische Daten');
      useStaticFallback = true;
    } else {
      const icon = layerId === 'dive-sites' ? '🤿' : '⚓';
      markers = createOverpassMarkers(elements, icon);
      console.log(`✅ ${markers.length} POIs von Overpass API geladen`);
    }
  } catch (error) {
    console.error('❌ Overpass API Fehler:', error);
    useStaticFallback = true;
  }

  // Fallback: Statische Daten aus config.js
  if (useStaticFallback || markers.length === 0) {
    console.log('📦 Lade statische Fallback-Daten...');
    
    const staticData = layerId === 'dive-sites' 
      ? staticPOIs.diveSites 
      : staticPOIs.harbours;
    
    const icon = layerId === 'dive-sites' ? '🤿' : '⚓';
    
    // Filtere POIs im aktuellen Viewport
    const filteredData = staticData.filter(poi => {
      return poi.lat >= bbox[1] && poi.lat <= bbox[3] &&
             poi.lon >= bbox[0] && poi.lon <= bbox[2];
    });
    
    markers = filteredData.map(poi => {
      const divIcon = L.divIcon({
        html: `<div style="font-size: 20px; text-shadow: 0 0 3px white;">${icon}</div>`,
        className: '',
        iconSize: [25, 25],
        iconAnchor: [12, 12]
      });
      
      const marker = L.marker([poi.lat, poi.lon], { icon: divIcon });
      marker.bindPopup(`
        <div class="popup-title">${poi.name}</div>
        <div class="popup-info">
          ${layerId === 'dive-sites' ? '🤿 Tauchspot' : '⚓ Hafen'}<br>
          📍 ${poi.region}<br>
          <small>Lat: ${poi.lat.toFixed(4)}, Lon: ${poi.lon.toFixed(4)}</small><br>
          <small style="color: #999;">Statische Daten</small>
        </div>
      `);
      return marker;
    });
    
    console.log(`✅ ${markers.length} statische POIs geladen (${filteredData.length} im Viewport)`);
  }

  // Layer zur Karte hinzufügen
  if (markers.length > 0) {
    const layerGroup = L.layerGroup(markers);
    layerGroup.addTo(map);
    activeOverlays.set(layerId, layerGroup);
  } else {
    alert('ℹ️ Keine POI-Daten in dieser Region verfügbar.\n\nVersuche eine andere Region oder zoome anders.');
    const checkbox = document.getElementById(`layer-${layerId}`);
    if (checkbox) checkbox.checked = false;
  }

  hideLoading();
}

function getBbox() {
  const bounds = map.getBounds();
  let west = bounds.getWest();
  let east = bounds.getEast();
  let south = bounds.getSouth();
  let north = bounds.getNorth();
  
  // Longitude normalisieren (-180 bis 180)
  while (west < -180) west += 360;
  while (west > 180) west -= 360;
  while (east < -180) east += 360;
  while (east > 180) east -= 360;
  
  // Latitude begrenzen
  south = Math.max(-85, south);
  north = Math.min(85, north);
  
  // Mindestgröße
  const minSize = performanceConfig.minBboxSize || 1.0;
  if (north - south < minSize) {
    const centerY = (north + south) / 2;
    south = centerY - minSize / 2;
    north = centerY + minSize / 2;
  }
  if (east - west < minSize && east - west > -minSize) {
    const centerX = (east + west) / 2;
    west = centerX - minSize / 2;
    east = centerX + minSize / 2;
  }
  
  return [west, south, east, north];
}

// ============================================================================
// CHECKBOX EVENT HANDLERS
// ============================================================================

function setupCheckboxListeners() {
  debugLog('🔧 Richte Event-Listener ein...');
  
  // ============================================================================
  // SST Layer (WMS/WMTS)
  // ============================================================================
  const sstCheckbox = document.getElementById('layer-sst');
  if (sstCheckbox) {
    sstCheckbox.addEventListener('change', async (e) => {
      if (e.target.checked) {
        console.log('✅ Aktiviere SST-Layer...');
        await loadSST_Smart();
      } else {
        console.log('❌ Deaktiviere SST-Layer...');
        if (activeOverlays.has('sst')) {
          map.removeLayer(activeOverlays.get('sst'));
          activeOverlays.delete('sst');
        }
      }
    });
    debugLog('✅ SST Event-Listener registriert');
  }
  
  // ============================================================================
  // DHW Layer (WMS)
  // ============================================================================
  const dhwCheckbox = document.getElementById('layer-dhw');
  if (dhwCheckbox) {
    dhwCheckbox.addEventListener('change', async (e) => {
      if (e.target.checked) {
        console.log('✅ Aktiviere DHW-Layer...');
        await loadDHW_Smart();
      } else {
        console.log('❌ Deaktiviere DHW-Layer...');
        if (activeOverlays.has('dhw')) {
          map.removeLayer(activeOverlays.get('dhw'));
          activeOverlays.delete('dhw');
        }
      }
    });
    debugLog('✅ DHW Event-Listener registriert');
  }

  // ============================================================================
  // GeoJSON-basierte POI Layer (Häfen)
  // ============================================================================
  const geoJsonPOIs = ['harbours'];
  
  geoJsonPOIs.forEach(layerId => {
    const checkbox = document.getElementById(`layer-${layerId}`);
    if (!checkbox) return;

    checkbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        console.log(`✅ Lade ${layerId} aus GeoJSON...`);
        loadCoralGeoJSON(layerId);
      } else {
        console.log(`❌ Deaktiviere ${layerId}`);
        if (activeOverlays.has(layerId)) {
          map.removeLayer(activeOverlays.get(layerId));
          activeOverlays.delete(layerId);
        }
      }
    });
  });

  // ============================================================================
  // Legacy POI Layer (Tauchspots mit Overpass)
  // ============================================================================
  ['dive-sites'].forEach(layerId => {
    const checkbox = document.getElementById(`layer-${layerId}`);
    if (!checkbox) return;

    checkbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        loadPOILayer(layerId);
      } else {
        if (activeOverlays.has(layerId)) {
          map.removeLayer(activeOverlays.get(layerId));
          activeOverlays.delete(layerId);
        }
      }
    });
  });

  console.log('✅ Event-Listener eingerichtet');
  
  // ============================================================================
  // Test-Buttons für OSM-Daten
  // ============================================================================
  document.getElementById('test-cairns')?.addEventListener('click', () => {
    console.log('🧪 Teste Cairns Region...');
    map.setView([-16.9186, 145.7781], 10);
    
    setTimeout(() => {
      const checkbox = document.getElementById('layer-dive-sites');
      if (checkbox && !checkbox.checked) {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change'));
      }
    }, 500);
  });
  
  document.getElementById('test-sharm')?.addEventListener('click', () => {
    console.log('🧪 Teste Sharm el-Sheikh Region...');
    map.setView([27.9158, 34.3300], 11);
    
    setTimeout(() => {
      const checkbox = document.getElementById('layer-dive-sites');
      if (checkbox && !checkbox.checked) {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change'));
      }
    }, 500);
  });
}

// ============================================================================
// INITIALISIERUNG
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 CoralReefMap v5.0 (WMS/WMTS Edition) startet...');
  console.log('📅 Datum:', currentDate.toISOString().split('T')[0]);
  console.log('🛰️ SST: NASA GIBS (Echtzeit-Tiles)');
  console.log('🪸 DHW: NOAA Coral Reef Watch (WMS)');
  
  initMap();
  setupCheckboxListeners();

  // SST initial laden (wenn aktiviert)
  map.whenReady(() => {
    const sstCheckbox = document.getElementById('layer-sst');
    if (sstCheckbox && sstCheckbox.checked) {
      setTimeout(() => {
        console.log('🌡️ Lade initialen SST-Layer...');
        loadSST_Smart();
      }, 1000);
    }
  });

  console.log('✅ CoralReefMap bereit!');
  console.log('💡 SST/DHW nutzen jetzt WMS - keine Downloads nötig!');
});
