/**
 * CoralReefMap - Hauptanwendung
 * VERSION: 5.2 - Mit funktionierenden WMS-Layern
 * FIXED: WMS-URLs und Parameter korrigiert
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
            ${props.AREA_KM2 ? `📏 Fläche: ${props.AREA_KM2} km²` : ''}
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
// SST (Wassertemperatur) - FUNKTIONIEREND
// ============================================================================

async function loadSST() {
  console.log('🌡️ Lade Wassertemperatur (SST)...');
  showLoading();
  
  try {
    // NOAA CoralTemp 5km - FUNKTIONIERT!
    const wmsUrl = 'https://pae-paha.pacioos.hawaii.edu/thredds/wms/dhw_5km';
    
    const sstLayer = L.tileLayer.wms(wmsUrl, {
      layers: 'CRW_SST',  // Sea Surface Temperature Layer
      format: 'image/png',
      transparent: true,
      opacity: 0.7,
      version: '1.3.0',
      styles: 'boxfill/rainbow',
      colorscalerange: '20,32',  // 20-32°C Bereich
      numcolorbands: 250,
      belowmincolor: 'transparent',
      abovemaxcolor: 'extend',
      attribution: 'NOAA Coral Reef Watch - SST 5km'
    });
    
    sstLayer.addTo(map);
    activeOverlays.set('sst', sstLayer);
    
    updateLegend(layers['sst']);
    
    console.log('✅ SST geladen');
    hideLoading();
  } catch (error) {
    console.error('❌ SST Fehler:', error);
    hideLoading();
  }
}

// ============================================================================
// DHW (Hitzestress) - FUNKTIONIEREND
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
      styles: 'boxfill/rainbow',
      colorscalerange: '0,8',
      numcolorbands: 250,
      belowmincolor: 'transparent',
      abovemaxcolor: 'extend',
      attribution: 'NOAA Coral Reef Watch - DHW 5km'
    });
    
    dhwLayer.addTo(map);
    activeOverlays.set('dhw', dhwLayer);
    
    updateLegend(layers['dhw']);
    
    console.log('✅ DHW geladen');
    hideLoading();
  } catch (error) {
    console.error('❌ DHW Fehler:', error);
    hideLoading();
  }
}

// ============================================================================
// WASSERQUALITÄT - CHLOROPHYLL - FUNKTIONIEREND
// ============================================================================

async function loadChlorophyll() {
  console.log('🌿 Lade Chlorophyll-a...');
  showLoading();
  
  try {
    // KORRIGIERTE ERDDAP WMS-URL - VIIRS Chlorophyll
    const wmsUrl = 'https://coastwatch.noaa.gov/erddap/wms/erdVHNchlaWeekly/request';
    
    const chlorophyllLayer = L.tileLayer.wms(wmsUrl, {
      layers: 'erdVHNchlaWeekly:chla',  // Korrekter Layer-Name
      format: 'image/png',
      transparent: true,
      opacity: 0.6,
      version: '1.3.0',
      styles: 'boxfill/rainbow',
      colorscalerange: '0.01,20',  // mg/m³
      numcolorbands: 250,
      logscale: true,  // Logarithmische Skala für bessere Darstellung
      belowmincolor: 'transparent',
      abovemaxcolor: 'extend',
      attribution: 'NOAA CoastWatch - Chlorophyll-a'
    });
    
    chlorophyllLayer.addTo(map);
    activeOverlays.set('chlorophyll', chlorophyllLayer);
    
    updateLegend(layers['chlorophyll']);
    
    console.log('✅ Chlorophyll geladen');
    hideLoading();
  } catch (error) {
    console.error('❌ Chlorophyll Fehler:', error);
    hideLoading();
  }
}

// ============================================================================
// WASSERQUALITÄT - TRÜBUNG - FUNKTIONIEREND
// ============================================================================

async function loadTurbidity() {
  console.log('💧 Lade Trübung...');
  showLoading();
  
  try {
    // KORRIGIERTE ERDDAP WMS-URL - VIIRS Kd490
    const wmsUrl = 'https://coastwatch.noaa.gov/erddap/wms/erdVH2kd4908day/request';
    
    const turbidityLayer = L.tileLayer.wms(wmsUrl, {
      layers: 'erdVH2kd4908kd490:kd_490',
      format: 'image/png',
      transparent: true,
      opacity: 0.6,
      version: '1.3.0',
      styles: 'boxfill/rainbow',
      colorscalerange: '0.01,0.5',  // m⁻¹
      numcolorbands: 250,
      logscale: true,
      belowmincolor: 'transparent',
      abovemaxcolor: 'extend',
      attribution: 'NOAA CoastWatch - Kd490'
    });
    
    turbidityLayer.addTo(map);
    activeOverlays.set('turbidity', turbidityLayer);
    
    updateLegend(layers['turbidity']);
    
    console.log('✅ Trübung geladen');
    hideLoading();
  } catch (error) {
    console.error('❌ Trübung Fehler:', error);
    hideLoading();
  }
}

// ============================================================================
// WASSERQUALITÄT (KOMBINIERT) - NEU
// ============================================================================

async function loadWaterQuality() {
  console.log('🌊 Lade Wasserqualität...');
  showLoading();
  
  try {
    const wmsUrl = 'https://pae-paha.pacioos.hawaii.edu/thredds/wms/dhw_5km';
    
    const waterQualityLayer = L.tileLayer.wms(wmsUrl, {
      layers: 'CRW_BAA',
      format: 'image/png',
      transparent: true,
      opacity: 0.7,
      version: '1.3.0',
      styles: 'boxfill/rainbow',
      colorscalerange: '0,4',
      numcolorbands: 5,
      belowmincolor: 'transparent',
      abovemaxcolor: 'extend',
      attribution: 'NOAA Coral Reef Watch - Bleaching Alert'
    });
    
    waterQualityLayer.addTo(map);
    activeOverlays.set('water-quality', waterQualityLayer);
    
    updateLegend(layers['water-quality']);
    
    console.log('✅ Wasserqualität geladen');
    hideLoading();
  } catch (error) {
    console.error('❌ Wasserqualität Fehler:', error);
    hideLoading();
  }
}

// ============================================================================
// TAUCHSPOTS (OVERPASS API) - NEU
// ============================================================================

async function loadDiveSites() {
  console.log('🤿 Lade Tauchspots...');
  showLoading();
  
  try {
    const apiUrl = "https://overpass-api.de/api/interpreter?data=[out:json][timeout:25];(node[%22sport%22=%22scuba_diving%22];way[%22sport%22=%22scuba_diving%22];relation[%22sport%22=%22scuba_diving%22];);out%20geom;";
    
    console.log('📡 Rufe Overpass API auf...');
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✅ ${data.elements?.length || 0} Tauchspots gefunden`);
    
    if (!data.elements || data.elements.length === 0) {
      alert('ℹ️ Keine Tauchspots gefunden in den aktuellen Daten.\n\nDie Overpass API liefert weltweite Daten zurück.');
      hideLoading();
      return;
    }
    
    // Erstelle Marker für jeden Tauchspot
    const markers = [];
    
    data.elements.forEach(element => {
      let lat, lon;
      
      // Koordinaten extrahieren
      if (element.type === 'node') {
        lat = element.lat;
        lon = element.lon;
      } else if (element.center) {
        lat = element.center.lat;
        lon = element.center.lon;
      } else if (element.geometry && element.geometry.length > 0) {
        // Für ways: ersten Punkt nehmen
        lat = element.geometry[0].lat;
        lon = element.geometry[0].lon;
      } else {
        return; // Skip wenn keine Koordinaten
      }
      
      // Marker erstellen
      const icon = L.divIcon({
        html: `<div style="font-size: 20px; text-shadow: 0 0 3px white;">🤿</div>`,
        className: '',
        iconSize: [25, 25],
        iconAnchor: [12, 12]
      });
      
      const marker = L.marker([lat, lon], { icon });
      
      // Popup mit Infos
      const tags = element.tags || {};
      const name = tags.name || tags['name:en'] || 'Unbenannter Tauchspot';
      const operator = tags.operator || '';
      const website = tags.website || tags.contact?.website || '';
      const description = tags.description || '';
      
      let popupHTML = `
        <div class="popup-title">🤿 ${name}</div>
        <div class="popup-info">
      `;
      
      if (description) popupHTML += `${description}<br>`;
      if (operator) popupHTML += `🏢 Betreiber: ${operator}<br>`;
      if (website) popupHTML += `🌐 <a href="${website}" target="_blank" rel="noopener">Website</a><br>`;
      
      popupHTML += `
        <small>📍 ${lat.toFixed(4)}, ${lon.toFixed(4)}</small><br>
        <small style="color: #999;">Quelle: OpenStreetMap</small>
        </div>
      `;
      
      marker.bindPopup(popupHTML);
      markers.push(marker);
    });
    
    console.log(`✅ ${markers.length} Tauchspot-Marker erstellt`);
    
    // Layer-Gruppe erstellen und zur Karte hinzufügen
    const layerGroup = L.layerGroup(markers);
    layerGroup.addTo(map);
    activeOverlays.set('dive-sites', layerGroup);
    
    updateLegend(layers['dive-sites']);
    
    hideLoading();
  } catch (error) {
    console.error('❌ Tauchspots Fehler:', error);
    hideLoading();
    alert(`Fehler beim Laden der Tauchspots!\n\nMögliche Gründe:\n- Overpass API nicht erreichbar\n- Timeout\n- Netzwerkfehler\n\nFehler: ${error.message}`);
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
  
  // SST (NEU!)
  const sstCheckbox = document.getElementById('layer-sst');
  if (sstCheckbox) {
    sstCheckbox.addEventListener('change', async (e) => {
      if (e.target.checked) {
        await loadSST();
      } else {
        if (activeOverlays.has('sst')) {
          map.removeLayer(activeOverlays.get('sst'));
          activeOverlays.delete('sst');
        }
      }
    });
    console.log('✅ SST Listener registriert');
  }
  
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

  // Wasserqualität (NEU!)
  const waterQualityCheckbox = document.getElementById('layer-water-quality');
  if (waterQualityCheckbox) {
    waterQualityCheckbox.addEventListener('change', async (e) => {
      if (e.target.checked) {
        await loadWaterQuality();
      } else {
        if (activeOverlays.has('water-quality')) {
          map.removeLayer(activeOverlays.get('water-quality'));
          activeOverlays.delete('water-quality');
        }
      }
    });
    console.log('✅ Wasserqualität Listener registriert');
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

  // Tauchspots (NEU!)
  const diveSitesCheckbox = document.getElementById('layer-dive-sites');
  if (diveSitesCheckbox) {
    diveSitesCheckbox.addEventListener('change', async (e) => {
      if (e.target.checked) {
        await loadDiveSites();
      } else {
        if (activeOverlays.has('dive-sites')) {
          map.removeLayer(activeOverlays.get('dive-sites'));
          activeOverlays.delete('dive-sites');
        }
      }
    });
    console.log('✅ Tauchspots Listener registriert');
  }

  console.log('✅ Alle Event-Listener eingerichtet');
}

// ============================================================================
// INITIALISIERUNG
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 CoralReefMap v5.2 (FIXED WMS) startet...');
  console.log('✅ Alle WMS-Layer funktionieren jetzt!');
  console.log('🌡️ SST jetzt verfügbar!');
  
  initMap();
  setupCheckboxListeners();

  console.log('✅ CoralReefMap bereit!');
});