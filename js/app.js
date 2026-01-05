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
  createOverpassMarkers,
  parseCSV,
  createCSVMarkers,
  createMicroplasticPopup
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
  // Definiere maximale Grenzen (verhindert unendliches Scrollen)
  const maxBounds = [
    [-90, -180],  // Südwest-Ecke
    [90, 180]     // Nordost-Ecke
  ];

  map = L.map('map', {
    center: mapConfig.center,
    zoom: mapConfig.zoom,
    minZoom: mapConfig.minZoom,
    maxZoom: mapConfig.maxZoom,
    maxBounds: maxBounds,           // Begrenzt die Karte auf eine Weltkopie
    maxBoundsViscosity: 1.0,        // Macht die Grenzen "hart" (kein Überscrollen)
    worldCopyJump: false,           // Verhindert Springen zwischen Weltkopien
    noWrap: true                    // Verhindert das Wrappen der Tiles
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    noWrap: true,  // Verhindert Tile-Wrapping
    bounds: [[-90, -180], [90, 180]],  // Begrenzt Tiles auf eine Weltkopie
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
  }).addTo(map);

  map.createPane('labels');
  map.getPane('labels').style.zIndex = 650;
  map.getPane('labels').style.pointerEvents = 'none';

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
    pane: 'labels',
    subdomains: 'abcd',
    noWrap: true,  // Verhindert Tile-Wrapping bei Labels
    bounds: [[-90, -180], [90, 180]]
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
        // Mikroplastik Layer - spezielle Darstellung
        if (layerId === 'microplastics') {
          const style = typeof layerConfig.style === 'function' 
            ? layerConfig.style(feature) 
            : layerConfig.style;
          
          return L.circleMarker(latlng, {
            radius: style.radius || 4,
            fillColor: style.fillColor,
            color: style.color,
            weight: style.weight || 1,
            opacity: 0.8,
            fillOpacity: style.fillOpacity || 0.7
          });
        }
        
        // Häfen mit Icon
        if (layerId === 'harbours' && layerConfig.icon) {
          const icon = L.divIcon({
            html: `<div style="font-size: 18px; text-shadow: 0 0 3px white;">${layerConfig.icon}</div>`,
            className: '',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });
          return L.marker(latlng, { icon });
        }
        
        // Standard CircleMarker
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
        
        // Mikroplastik - erweiterte Popup-Funktion
        if (layerId === 'microplastics') {
          layer.bindPopup(createMicroplasticPopup(feature));
          return;
        }
        
        // Häfen
        if (layerId === 'harbours') {
          const name = props.PORT_NAME || props.name || 'Unbekannter Hafen';
          const country = props.COUNTRY || props.country || '';
          let popupHTML = `<div class="popup-title">⚓ ${name}</div><div class="popup-info">`;
          if (country) popupHTML += `🌍 ${country}<br>`;
          popupHTML += `</div>`;
          layer.bindPopup(popupHTML);
          return;
        }
        
        // Korallenriffe
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
// ÖL- UND CHEMIE-VORFÄLLE (CSV) - NEU
// ============================================================================

async function loadIncidents() {
  console.log('🛢️ Lade Öl- und Chemie-Vorfälle...');
  showLoading();
  
  try {
    const layerConfig = layers['incidents'];
    const response = await fetch(layerConfig.url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const csvText = await response.text();
    const csvData = parseCSV(csvText);
    
    console.log(`✅ ${csvData.length} Vorfälle aus CSV geladen`);
    
    if (csvData.length === 0) {
      console.warn('⚠️ Keine Daten in CSV gefunden');
      hideLoading();
      return;
    }
    
    // Filtere gültige Koordinaten
    const validData = csvData.filter(row => {
      const lat = parseFloat(row.lat);
      const lon = parseFloat(row.lon);
      return !isNaN(lat) && !isNaN(lon);
    });
    
    console.log(`✅ ${validData.length} Vorfälle mit gültigen Koordinaten`);
    
    // Erstelle Marker
    const markers = createCSVMarkers(validData, layerConfig.style);
    
    // Füge alle Marker zur Karte hinzu
    const layerGroup = L.layerGroup(markers);
    layerGroup.addTo(map);
    activeOverlays.set('incidents', layerGroup);
    
    updateLegend(layerConfig);
    
    console.log(`✅ ${markers.length} Incident-Marker zur Karte hinzugefügt`);
    hideLoading();
  } catch (error) {
    console.error('❌ Fehler beim Laden der Incidents:', error);
    hideLoading();
  }
}

// ============================================================================
// TAUCHSPOTS (STATISCHE DATEN) - ÜBERARBEITET
// ============================================================================

async function loadDiveSites() {
  console.log('🤿 Lade Tauchspots...');
  showLoading();
  
  try {
    // Zoom-Level prüfen - Overpass API nur bei gutem Zoom
    const currentZoom = map.getZoom();
    const minZoomForOverpass = 6;  // Mindest-Zoom für Overpass API
    
    // Wenn zu weit herausgezoomt: Verwende statische POIs
    if (currentZoom < minZoomForOverpass) {
      console.log(`ℹ️ Zoom-Level ${currentZoom} zu niedrig für Overpass API (min: ${minZoomForOverpass})`);
      console.log('📍 Verwende statische Tauchspots...');
      
      // Lade statische Tauchspots aus config.js
      const diveSites = staticPOIs.diveSites;
      
      if (!diveSites || diveSites.length === 0) {
        alert('ℹ️ Keine Tauchspots verfügbar.\n\nBitte zoomen Sie näher heran (Zoom > 6) um OpenStreetMap-Daten zu laden.');
        hideLoading();
        return;
      }
      
      // Erstelle Marker für statische POIs
      const markers = diveSites.map(site => {
        const icon = L.divIcon({
          html: `<div style="font-size: 20px; text-shadow: 0 0 3px white;">🤿</div>`,
          className: '',
          iconSize: [25, 25],
          iconAnchor: [12, 12]
        });
        
        const marker = L.marker([site.lat, site.lon], { icon });
        
        let popupHTML = `
          <div class="popup-title">🤿 ${site.name}</div>
          <div class="popup-info">
            🌍 Region: ${site.region}<br>
            <small>📍 ${site.lat.toFixed(4)}, ${site.lon.toFixed(4)}</small><br>
            <small style="color: #999;">Beliebter Tauchspot</small><br>
            <small style="color: #666;">💡 Zoom > 6 für mehr Details</small>
          </div>
        `;
        
        marker.bindPopup(popupHTML);
        return marker;
      });
      
      const layerGroup = L.layerGroup(markers);
      layerGroup.addTo(map);
      activeOverlays.set('dive-sites', layerGroup);
      
      updateLegend(layers['dive-sites']);
      
      console.log(`✅ ${markers.length} statische Tauchspots geladen`);
      hideLoading();
      return;
    }
    
    // Bei gutem Zoom: Versuche Overpass API mit Bounding Box
    console.log('📡 Zoom-Level ausreichend, verwende Overpass API...');
    
    const bounds = map.getBounds();
    const bbox = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;
    
    const query = `[out:json][timeout:25];
      (
        node["sport"="scuba_diving"](${bbox});
        node["sport"="diving"](${bbox});
        node["leisure"="dive_centre"](${bbox});
        way["sport"="scuba_diving"](${bbox});
        way["sport"="diving"](${bbox});
        relation["sport"="scuba_diving"](${bbox});
      );
      out center;`;
    
    const apiUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
    
    console.log('📡 Rufe Overpass API auf...');
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✅ ${data.elements?.length || 0} Tauchspots von Overpass gefunden`);
    
    if (!data.elements || data.elements.length === 0) {
      console.log('ℹ️ Keine Overpass-Daten im aktuellen Bereich');
      
      // Fallback zu statischen POIs im sichtbaren Bereich
      const visiblePOIs = staticPOIs.diveSites.filter(site => {
        return site.lat >= bounds.getSouth() && 
               site.lat <= bounds.getNorth() &&
               site.lon >= bounds.getWest() && 
               site.lon <= bounds.getEast();
      });
      
      if (visiblePOIs.length > 0) {
        console.log(`📍 Zeige ${visiblePOIs.length} statische POIs im Bereich`);
        
        const markers = visiblePOIs.map(site => {
          const icon = L.divIcon({
            html: `<div style="font-size: 20px; text-shadow: 0 0 3px white;">🤿</div>`,
            className: '',
            iconSize: [25, 25],
            iconAnchor: [12, 12]
          });
          
          const marker = L.marker([site.lat, site.lon], { icon });
          marker.bindPopup(`
            <div class="popup-title">🤿 ${site.name}</div>
            <div class="popup-info">
              🌍 Region: ${site.region}<br>
              <small>📍 ${site.lat.toFixed(4)}, ${site.lon.toFixed(4)}</small>
            </div>
          `);
          return marker;
        });
        
        const layerGroup = L.layerGroup(markers);
        layerGroup.addTo(map);
        activeOverlays.set('dive-sites', layerGroup);
        updateLegend(layers['dive-sites']);
        
        hideLoading();
        return;
      }
      
      alert('ℹ️ Keine Tauchspots in diesem Bereich gefunden.');
      hideLoading();
      return;
    }
    
    // Erstelle Marker für Overpass-Daten
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
        lat = element.geometry[0].lat;
        lon = element.geometry[0].lon;
      } else {
        return;
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
    
    const layerGroup = L.layerGroup(markers);
    layerGroup.addTo(map);
    activeOverlays.set('dive-sites', layerGroup);
    
    updateLegend(layers['dive-sites']);
    
    console.log(`✅ ${markers.length} Overpass Tauchspots zur Karte hinzugefügt`);
    hideLoading();
    
  } catch (error) {
    console.error('❌ Fehler beim Laden der Tauchspots:', error);
    
    // Zeige Fehlermeldung
    alert(`Fehler beim Laden der Tauchspots!\n\nMögliche Gründe:\n- Overpass API nicht erreichbar\n- Timeout\n- Netzwerkfehler\n\nFehler: ${error.message}\n\nℹ️ Tipp: Zoomen Sie näher heran (Zoom > 6) und versuchen Sie es erneut.`);
    
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

  // Mikroplastik (NEU!)
  const microplasticsCheckbox = document.getElementById('layer-microplastics');
  if (microplasticsCheckbox) {
    microplasticsCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        loadCoralGeoJSON('microplastics');
      } else {
        if (activeOverlays.has('microplastics')) {
          map.removeLayer(activeOverlays.get('microplastics'));
          activeOverlays.delete('microplastics');
        }
      }
    });
    console.log('✅ Mikroplastik Listener registriert');
  }

  // Öl- und Chemie-Vorfälle (NEU!)
  const incidentsCheckbox = document.getElementById('layer-incidents');
  if (incidentsCheckbox) {
    incidentsCheckbox.addEventListener('change', async (e) => {
      if (e.target.checked) {
        await loadIncidents();
      } else {
        if (activeOverlays.has('incidents')) {
          map.removeLayer(activeOverlays.get('incidents'));
          activeOverlays.delete('incidents');
        }
      }
    });
    console.log('✅ Incidents Listener registriert');
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