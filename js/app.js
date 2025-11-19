/**
 * CoralReefMap - Hauptanwendung
 * VERSION: 5.1 - Mit Wasserqualität (Minimal-Integration)
 * Basiert auf deiner funktionierenden app.js
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

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
  }).addTo(map);

  map.createPane('labels');
  map.getPane('labels').style.zIndex = 650;
  map.getPane('labels').style.pointerEvents = 'none';

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
    pane: 'labels',
    subdomains: 'abcd'
  }).addTo(map);

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
  console.log(`🪸 Lade ${layerConfig.name}...`);

  try {
    const response = await fetch(layerConfig.url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const geojson = await response.json();

    const geoJsonLayer = L.geoJSON(geojson, {
      style: (feature) => {
        if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
          return layerConfig.style;
        }
        return null;
      },
      
      pointToLayer: (feature, latlng) => {
        if (layerId === 'harbours' && layerConfig.icon) {
          const icon = L.divIcon({
            html: `<div style="font-size: 18px; text-shadow: 0 0 3px white;">${layerConfig.icon}</div>`,
            className: '',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });
          return L.marker(latlng, { icon });
        }
        
        return L.circleMarker(latlng, {
          radius: layerConfig.style.radius || 1.5,
          fillColor: layerConfig.style.fillColor,
          color: layerConfig.style.fillColor,
          weight: 0.5,
          opacity: 0.8,
          fillOpacity: 0.6
        });
      },
      
      onEachFeature: (feature, layer) => {
        const props = feature.properties || {};
        
        if (layerId === 'harbours') {
          const name = props.PORT_NAME || props.name || 'Unbekannter Hafen';
          const country = props.COUNTRY || props.country || '';
          let popupHTML = `<div class="popup-title">⚓ ${name}</div><div class="popup-info">`;
          if (country) popupHTML += `🌍 ${country}<br>`;
          popupHTML += `</div>`;
          layer.bindPopup(popupHTML);
          return;
        }
        
        const name = props.COUNTRY || props.NAME || 'Korallenriff';
        const type = props.TYPE || props.type || 'unbekannt';
        layer.bindPopup(`
          <div class="popup-title">${name}</div>
          <div class="popup-info">
            🪸 Typ: ${type}<br>
            ${props.AREA_KM2 ? `📐 Fläche: ${props.AREA_KM2} km²` : ''}
          </div>
        `);
      }
    });

    geoJsonLayer.addTo(map);
    activeOverlays.set(layerId, geoJsonLayer);
    updateLegend(layerConfig);
    
    console.log(`✅ ${layerConfig.name} geladen`);
  } catch (error) {
    console.error(`❌ Fehler:`, error);
  } finally {
    hideLoading();
  }
}

function initCoralLayers() {
  loadCoralGeoJSON('coral-warm');
  loadCoralGeoJSON('coral-cold');
  
  const warmCheckbox = document.getElementById('layer-coral-warm');
  if (warmCheckbox) {
    warmCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        loadCoralGeoJSON('coral-warm');
      } else {
        if (activeOverlays.has('coral-warm')) {
          map.removeLayer(activeOverlays.get('coral-warm'));
          activeOverlays.delete('coral-warm');
        }
      }
    });
  }
  
  const coldCheckbox = document.getElementById('layer-coral-cold');
  if (coldCheckbox) {
    coldCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        loadCoralGeoJSON('coral-cold');
      } else {
        if (activeOverlays.has('coral-cold')) {
          map.removeLayer(activeOverlays.get('coral-cold'));
          activeOverlays.delete('coral-cold');
        }
      }
    });
  }
}

// ============================================================================
// DHW (Hitzestress)
// ============================================================================

async function loadDHW() {
  console.log('🔥 Lade DHW...');
  showLoading();
  
  try {
    const wmsUrl = 'https://pae-paha.pacioos.hawaii.edu/thredds/wms/dhw_5km';
    
    const dhwLayer = L.tileLayer.wms(wmsUrl, {
      layers: 'CRW_DHW',
      format: 'image/png',
      transparent: true,
      opacity: 0.7,
      version: '1.3.0',
      attribution: 'NOAA Coral Reef Watch',
      // NEU: Farbskala konfigurieren
      styles: 'boxfill/rainbow',
      colorscalerange: '0,8',
      numcolorbands: 250,
      belowmincolor: 'transparent',  // ← Wichtig!
      abovemaxcolor: 'extend'
    });
    
    dhwLayer.addTo(map);
    activeOverlays.set('dhw', dhwLayer);
    
    setTimeout(() => hideLoading(), 2000);
    console.log('✅ DHW geladen');
  } catch (error) {
    console.error('❌ DHW Fehler:', error);
    hideLoading();
  }
}

// ============================================================================
// WASSERQUALITÄT - CHLOROPHYLL
// ============================================================================

async function loadChlorophyll() {
  console.log('🌿 Lade Chlorophyll-a...');
  showLoading();
  
  try {
    const wmsUrl = 'https://coastwatch.noaa.gov/erddap/wms/noaacwNPPVIIRSchlaWeekly/request';
    
    const chlorophyllLayer = L.tileLayer.wms(wmsUrl, {
      layers: 'noaacwNPPVIIRSchlaWeekly:chlor_a',
      format: 'image/png',
      transparent: true,
      opacity: 0.7,
      version: '1.3.0',
      attribution: 'NOAA CoastWatch'
    });
    
    chlorophyllLayer.addTo(map);
    activeOverlays.set('chlorophyll', chlorophyllLayer);
    
    setTimeout(() => hideLoading(), 2000);
    console.log('✅ Chlorophyll geladen');
  } catch (error) {
    console.error('❌ Chlorophyll Fehler:', error);
    hideLoading();
  }
}

// ============================================================================
// WASSERQUALITÄT - TRÜBUNG
// ============================================================================

async function loadTurbidity() {
  console.log('💧 Lade Trübung...');
  showLoading();
  
  try {
    const wmsUrl = 'https://coastwatch.noaa.gov/erddap/wms/noaacwNPPVIIRSkd490Weekly/request';
    
    const turbidityLayer = L.tileLayer.wms(wmsUrl, {
      layers: 'noaacwNPPVIIRSkd490Weekly:Kd_490',
      format: 'image/png',
      transparent: true,
      opacity: 0.7,
      version: '1.3.0',
      attribution: 'NOAA CoastWatch'
    });
    
    turbidityLayer.addTo(map);
    activeOverlays.set('turbidity', turbidityLayer);
    
    setTimeout(() => hideLoading(), 2000);
    console.log('✅ Trübung geladen');
  } catch (error) {
    console.error('❌ Trübung Fehler:', error);
    hideLoading();
  }
}

// ============================================================================
// POI LAYER
// ============================================================================

async function loadPOILayer(layerId) {
  const layerConfig = layers[layerId];
  if (!layerConfig) return;

  showLoading();
  const bbox = getBbox();
  let markers = [];
  let useStaticFallback = false;

  try {
    const query = layerId === 'dive-sites' 
      ? overpassQueries.diveSites 
      : overpassQueries.harbours;
    
    const elements = await fetchOverpassData(query, bbox);
    
    if (elements.length === 0) {
      useStaticFallback = true;
    } else {
      const icon = layerId === 'dive-sites' ? '🤿' : '⚓';
      markers = createOverpassMarkers(elements, icon);
    }
  } catch (error) {
    useStaticFallback = true;
  }

  if (useStaticFallback || markers.length === 0) {
    const staticData = layerId === 'dive-sites' 
      ? staticPOIs.diveSites 
      : staticPOIs.harbours;
    
    const icon = layerId === 'dive-sites' ? '🤿' : '⚓';
    
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
        <div class="popup-info">📍 ${poi.region}</div>
      `);
      return marker;
    });
  }

  if (markers.length > 0) {
    const layerGroup = L.layerGroup(markers);
    layerGroup.addTo(map);
    activeOverlays.set(layerId, layerGroup);
  }

  hideLoading();
}

function getBbox() {
  const bounds = map.getBounds();
  let west = bounds.getWest();
  let east = bounds.getEast();
  let south = bounds.getSouth();
  let north = bounds.getNorth();
  
  while (west < -180) west += 360;
  while (west > 180) west -= 360;
  while (east < -180) east += 360;
  while (east > 180) east -= 360;
  
  south = Math.max(-85, south);
  north = Math.min(85, north);
  
  return [west, south, east, north];
}

// ============================================================================
// CHECKBOX EVENT HANDLERS
// ============================================================================

function setupCheckboxListeners() {
  console.log('🔧 Richte Event-Listener ein...');
  
  // DHW
  const dhwCheckbox = document.getElementById('layer-dhw');
  if (dhwCheckbox) {
    dhwCheckbox.addEventListener('change', async (e) => {
      if (e.target.checked) {
        await loadDHW();
      } else {
        if (activeOverlays.has('dhw')) {
          map.removeLayer(activeOverlays.get('dhw'));
          activeOverlays.delete('dhw');
        }
      }
    });
    console.log('✅ DHW Listener registriert');
  }
  
  // Chlorophyll
  const chlorophyllCheckbox = document.getElementById('layer-chlorophyll');
  if (chlorophyllCheckbox) {
    chlorophyllCheckbox.addEventListener('change', async (e) => {
      if (e.target.checked) {
        await loadChlorophyll();
      } else {
        if (activeOverlays.has('chlorophyll')) {
          map.removeLayer(activeOverlays.get('chlorophyll'));
          activeOverlays.delete('chlorophyll');
        }
      }
    });
    console.log('✅ Chlorophyll Listener registriert');
  }
  
  // Trübung
  const turbidityCheckbox = document.getElementById('layer-turbidity');
  if (turbidityCheckbox) {
    turbidityCheckbox.addEventListener('change', async (e) => {
      if (e.target.checked) {
        await loadTurbidity();
      } else {
        if (activeOverlays.has('turbidity')) {
          map.removeLayer(activeOverlays.get('turbidity'));
          activeOverlays.delete('turbidity');
        }
      }
    });
    console.log('✅ Trübung Listener registriert');
  }

  // Häfen
  const harboursCheckbox = document.getElementById('layer-harbours');
  if (harboursCheckbox) {
    harboursCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        loadCoralGeoJSON('harbours');
      } else {
        if (activeOverlays.has('harbours')) {
          map.removeLayer(activeOverlays.get('harbours'));
          activeOverlays.delete('harbours');
        }
      }
    });
  }

  // Tauchspots
  const diveSitesCheckbox = document.getElementById('layer-dive-sites');
  if (diveSitesCheckbox) {
    diveSitesCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        loadPOILayer('dive-sites');
      } else {
        if (activeOverlays.has('dive-sites')) {
          map.removeLayer(activeOverlays.get('dive-sites'));
          activeOverlays.delete('dive-sites');
        }
      }
    });
  }

  console.log('✅ Alle Event-Listener eingerichtet');
}

// ============================================================================
// INITIALISIERUNG
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 CoralReefMap v5.1 (mit Wasserqualität) startet...');
  console.log('🌿 Neu: Chlorophyll-a & Trübung verfügbar!');
  
  initMap();
  setupCheckboxListeners();

  console.log('✅ CoralReefMap bereit!');
});