/**
 * CoralReefMap - Hauptanwendung (KOMPLETT ÜBERARBEITET)
 * Nutzt funktionierende APIs und bessere Darstellung
 */

import { layers, mapConfig, performanceConfig, overpassQueries, staticPOIs } from './config.js';
import { 
  debounce, 
  normalizeBbox, 
  buildTransparentPngUrl,
  showLoading,
  hideLoading,
  updateLegend,
  fetchOverpassData,
  createOverpassMarkers,
  getCacheKey,
  getCacheItem,
  setCacheItem,
  cleanOldCache,
  getCacheStats
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
    worldCopyJump: false // Wichtig für Bbox-Berechnung!
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

  // Events
  map.on('moveend', debouncedMapMove);

  console.log('✅ Map initialisiert');
}

// ============================================================================
// KORALLENRIFFE AUS GEOJSON LADEN (ECHTE DATEN!)
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
          
          // Zusätzliche Infos falls vorhanden
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
    
    // Zur ersten Feature zoomen (optional)
    if (geojson.features && geojson.features.length > 0 && layerId === 'coral-warm') {
      const bounds = geoJsonLayer.getBounds();
      if (bounds.isValid()) {
        // map.fitBounds(bounds); // Auskommentiert - zoome nur bei Bedarf
      }
    }

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
// ERDDAP LAYER - MIT FEHLERBEHANDLUNG
// ============================================================================

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
  const minSize = performanceConfig.minBboxSize;
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

function refreshErddapLayer(layerId) {
  const layerConfig = layers[layerId];
  if (!layerConfig || layerConfig.type !== 'erddap') return;

  const bbox = getBbox();
  const mapSize = map.getSize();
  const targetSize = Math.min(
    performanceConfig.maxPixels, 
    Math.max(mapSize.x, mapSize.y)
  );

  // Prüfe Cache zuerst
  const cacheKey = getCacheKey(layerId, currentDate, bbox);
  const cachedUrl = getCacheItem(cacheKey);

  if (cachedUrl) {
    // Cache-Hit: Lade sofort aus Cache
    console.log(`⚡ Schnell-Laden aus Cache: ${layerConfig.name}`);
    loadCachedErddapLayer(layerId, cachedUrl, bbox, layerConfig);
    return;
  }

  // Cache-Miss: Lade von ERDDAP
  console.log(`🌐 Lade von ERDDAP: ${layerConfig.name}`);
  showLoading();

  try {
    const url = buildTransparentPngUrl(layerConfig, {
      date: currentDate,
      bbox: bbox,
      maxPixels: targetSize
    });

    console.log(`🔄 Lade ${layerConfig.name}:`, {
      bbox: bbox.map(v => v.toFixed(2)),
      size: targetSize,
      cached: false
    });

    // Bounds für Leaflet
    const leafletBounds = [
      [bbox[1], bbox[0]],
      [bbox[3], bbox[2]]
    ];

    // Alten Layer entfernen
    if (activeOverlays.has(layerId)) {
      map.removeLayer(activeOverlays.get(layerId));
    }

    // Image Overlay
    const imageOverlay = L.imageOverlay(url, leafletBounds, {
      opacity: layerConfig.opacity || 0.7
    });

    let loaded = false;

    imageOverlay.on('load', () => {
      if (!loaded) {
        loaded = true;
        console.log(`✅ ${layerConfig.name} erfolgreich geladen`);
        
        // Im Cache speichern
        setCacheItem(cacheKey, url);
        
        hideLoading();
      }
    });

    imageOverlay.on('error', (e) => {
      console.error(`❌ Fehler beim Laden von ${layerConfig.name}`, e);
      hideLoading();
      
      const checkbox = document.getElementById(`layer-${layerId}`);
      if (checkbox) checkbox.checked = false;
      
      alert(`Layer "${layerConfig.name}" konnte nicht geladen werden.\n\nMögliche Gründe:\n- ERDDAP-Server überlastet\n- Keine Daten für diese Region/Datum\n- Netzwerkfehler`);
    });

    // Timeout nach 15 Sekunden
    setTimeout(() => {
      if (!loaded) {
        console.warn(`⏱️ Timeout: ${layerConfig.name} lädt zu lange`);
        hideLoading();
      }
    }, 15000);

    imageOverlay.addTo(map);
    activeOverlays.set(layerId, imageOverlay);
    updateLegend(layerConfig);
    
  } catch (error) {
    console.error(`❌ Fehler bei URL-Erstellung für ${layerConfig.name}:`, error);
    hideLoading();
  }
}

// Hilfsfunktion: Lade aus Cache
function loadCachedErddapLayer(layerId, url, bbox, layerConfig) {
  const leafletBounds = [
    [bbox[1], bbox[0]],
    [bbox[3], bbox[2]]
  ];

  // Alten Layer entfernen
  if (activeOverlays.has(layerId)) {
    map.removeLayer(activeOverlays.get(layerId));
  }

  // Image Overlay aus Cache
  const imageOverlay = L.imageOverlay(url, leafletBounds, {
    opacity: layerConfig.opacity || 0.7
  });

  imageOverlay.on('load', () => {
    console.log(`✅ ${layerConfig.name} aus Cache geladen (sofort)`);
  });

  imageOverlay.on('error', () => {
    console.warn(`⚠️ Cache-Bild fehlerhaft, lade neu...`);
    // Cache ungültig -> Neu laden
    localStorage.removeItem(getCacheKey(layerId, currentDate, bbox));
    refreshErddapLayer(layerId); // Rekursiv neu laden
  });

  imageOverlay.addTo(map);
  activeOverlays.set(layerId, imageOverlay);
  updateLegend(layerConfig);
}

// Debounced refresh
const debouncedMapMove = debounce(() => {
  console.log('🗺️ Map-Update nach Bewegung...');
  
  for (const [layerId] of activeOverlays) {
    const config = layers[layerId];
    if (config && config.type === 'erddap') {
      refreshErddapLayer(layerId);
    }
  }
}, performanceConfig.debounceDelay);

// ============================================================================
// POI LAYER - HYBRID (Overpass API + Static Fallback)
// ============================================================================

async function loadPOILayer(layerId) {
  const zoom = map.getZoom();
  
  console.log(`📊 POI-Load Debug:`, {
    layerId,
    currentZoom: zoom,
    requiredZoom: 5,
    zoomOK: zoom >= 5
  });
  
  // Nur ab Zoom 5 laden (sonst zu viele Daten)
  if (zoom < 5) {
    alert('⚠️ Bitte näher reinzoomen (Zoom Level 5+) um POI-Daten zu laden.\n\nAktueller Zoom: ' + zoom + '\nBenötigt: 5+');
    const checkbox = document.getElementById(`layer-${layerId}`);
    if (checkbox) checkbox.checked = false;
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

// ============================================================================
// CHECKBOX EVENT HANDLERS
// ============================================================================

function setupCheckboxListeners() {
  // ERDDAP Layer
  const erddapLayers = ['sst', 'dhw', 'sst-anom', 'chla', 'turbidity'];
  
  erddapLayers.forEach(layerId => {
    const checkbox = document.getElementById(`layer-${layerId}`);
    if (!checkbox) return;

    checkbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        console.log(`✅ Aktiviere ${layerId}`);
        refreshErddapLayer(layerId);
      } else {
        console.log(`❌ Deaktiviere ${layerId}`);
        if (activeOverlays.has(layerId)) {
          map.removeLayer(activeOverlays.get(layerId));
          activeOverlays.delete(layerId);
        }
      }
    });
  });

  // GeoJSON-basierte POI Layer (Häfen aus ports_all.json)
  const geoJsonPOIs = ['harbours'];
  
  geoJsonPOIs.forEach(layerId => {
    const checkbox = document.getElementById(`layer-${layerId}`);
    if (!checkbox) return;

    checkbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        console.log(`✅ Lade ${layerId} aus GeoJSON...`);
        loadCoralGeoJSON(layerId); // Nutzt die gleiche Funktion wie Korallen
      } else {
        console.log(`❌ Deaktiviere ${layerId}`);
        if (activeOverlays.has(layerId)) {
          map.removeLayer(activeOverlays.get(layerId));
          activeOverlays.delete(layerId);
        }
      }
    });
  });

  // Legacy POI Layer (Tauchspots mit Overpass - nur noch für Tauchspots)
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
  
  // Test-Buttons für OSM-Daten
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
  console.log('🚀 CoralReefMap v2.0 startet...');
  console.log('📅 Datum:', currentDate.toISOString().split('T')[0]);
  
  // Cache-System initialisieren
  cleanOldCache(); // Lösche alte Einträge
  const stats = getCacheStats();
  console.log(`💾 Cache-Status: ${stats.count} Einträge, ${stats.sizeMB} MB`);
  
  initMap();
  setupCheckboxListeners();

  // SST initial laden (statt DHW - meist zuverlässiger)
  map.whenReady(() => {
    const sstCheckbox = document.getElementById('layer-sst');
    if (sstCheckbox && sstCheckbox.checked) {
      setTimeout(() => {
        console.log('🌡️ Lade initialen SST-Layer...');
        refreshErddapLayer('sst');
      }, 1000);
    }
  });

  console.log('✅ CoralReefMap bereit!');
  console.log('💡 Tipp: ERDDAP-Layer werden 24h gecached für schnelles Laden');
});