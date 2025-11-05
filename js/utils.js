/**
 * Utility-Funktionen für die CoralReefMap
 */

/**
 * Throttle-Funktion: Limitiert wie oft eine Funktion ausgeführt werden kann
 * Verhindert zu viele API-Anfragen bei schnellem Zoomen/Pannen
 */
export function throttle(fn, wait = 250) {
  let lastCall = 0;
  let timeoutId;
  
  return function(...args) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;
    
    if (timeSinceLastCall >= wait) {
      lastCall = now;
      fn.apply(this, args);
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        fn.apply(this, args);
      }, wait - timeSinceLastCall);
    }
  };
}

/**
 * Debounce-Funktion: Wartet bis User aufhört zu interagieren
 * Noch besser für Map-Movements als throttle
 */
export function debounce(fn, delay = 300) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

/**
 * Normalisiert Longitude auf -180 bis 180
 */
export function wrapLon180(lon) {
  let normalized = ((lon + 180) % 360 + 360) % 360 - 180;
  if (normalized === 180) normalized = -180;
  return normalized;
}

/**
 * Normalisiert BoundingBox und stellt minimale Größe sicher
 * Wichtig: Behandelt die Datumsgrenze korrekt!
 */
export function normalizeBbox([west, south, east, north], minSize = 0.5) {
  // Longitude normalisieren
  west = wrapLon180(west);
  east = wrapLon180(east);
  
  // Datumsgrenze: Wenn east < west, dann über 180° hinweg
  if (east < west) {
    east += 360;
  }
  
  // Latitude begrenzen (Pole)
  south = Math.max(-85, south);
  north = Math.min(85, north);
  
  // Minimale Größe erzwingen (verhindert zu kleine Bboxen)
  const dy = north - south;
  const dx = east - west;
  
  if (dy < minSize) {
    const centerY = (north + south) / 2;
    south = centerY - minSize / 2;
    north = centerY + minSize / 2;
  }
  
  if (dx < minSize) {
    const centerX = (east + west) / 2;
    west = centerX - minSize / 2;
    east = centerX + minSize / 2;
  }
  
  // Maximale Größe (ganze Welt)
  if (dx > 360) {
    west = -180;
    east = 180;
  }
  
  return [west, south, east, north];
}

/**
 * Erstellt ISO-Datum für ERDDAP (12:00 UTC)
 */
export function isoDay(date = new Date()) {
  const utc = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    12, 0, 0, 0
  ));
  return utc.toISOString().replace('.000', '');
}

/**
 * Baut transparente PNG-URL für ERDDAP
 */
export function buildTransparentPngUrl(layerConfig, opts) {
  const { server, datasetId, variable, colorBar } = layerConfig;
  const { date, bbox, maxPixels = 1024 } = opts;
  
  let [west, south, east, north] = bbox;
  const day = isoDay(date);
  
  // Datumsgrenze behandeln
  if (east < west) east += 360;
  
  // Bildgröße berechnen (proportional zur Bbox)
  const dx = Math.abs(east - west);
  const dy = Math.abs(north - south);
  
  let width, height;
  if (dx >= dy) {
    width = maxPixels;
    height = Math.max(1, Math.round(maxPixels * (dy / dx)));
  } else {
    height = maxPixels;
    width = Math.max(1, Math.round(maxPixels * (dx / dy)));
  }
  
  // ERDDAP Query
  const query = `${variable}[(${day})][(${south}):(${north})][(${west}):(${east})]`;
  
  // Parameter
  const params = [
    `.draw=surface`,
    `.size=${width}|${height}`,
    `.transparent=true`,
    `.bgColor=0x00000000`
  ];
  
  // Farbskala
  if (colorBar) {
    params.push(`.colorBar=${encodeURIComponent(colorBar)}`);
  }
  
  // Out-of-range Farben (transparent)
  const belowHex = layerConfig.belowColorHex || "0x00000000";
  const aboveHex = layerConfig.aboveColorHex;
  const missingHex = layerConfig.missingColorHex || "0x00000000";
  
  params.push(`.belowMinColor=${belowHex}`);
  if (aboveHex) params.push(`.aboveMaxColor=${aboveHex}`);
  params.push(`.missingColor=${missingHex}`);
  
  // Interpolation
  if (layerConfig.interpolate) {
    params.push(`.interpolate=${layerConfig.interpolate}`);
  }
  
  return `${server}/griddap/${datasetId}.transparentPng?${query}&${params.join('&')}`;
}

/**
 * Zeigt Loading-Indicator
 */
export function showLoading() {
  const loader = document.getElementById('loading-indicator');
  if (loader) loader.style.display = 'flex';
}

/**
 * Versteckt Loading-Indicator
 */
export function hideLoading() {
  const loader = document.getElementById('loading-indicator');
  if (loader) loader.style.display = 'none';
}

/**
 * Aktualisiert Legende basierend auf aktivem Layer
 */
export function updateLegend(layerConfig) {
  const legendContent = document.getElementById('legend-content');
  if (!legendContent || !layerConfig || !layerConfig.legend) return;
  
  const { title, description, range, levels, color } = layerConfig.legend;
  
  let html = `<div class="legend-item"><strong>${title}</strong></div>`;
  
  if (description) {
    html += `<div class="legend-item" style="font-size: 0.8rem; color: #666;">${description}</div>`;
  }
  
  if (range) {
    html += `<div class="legend-item" style="margin-top: 0.5rem;">Bereich: <strong>${range}</strong></div>`;
  }
  
  if (levels) {
    html += '<div style="margin-top: 0.75rem;">';
    levels.forEach(level => {
      html += `
        <div class="legend-item">
          <span class="legend-color" style="background: ${level.color};"></span>
          ${level.value}: ${level.label}
        </div>
      `;
    });
    html += '</div>';
  }
  
  if (color && !levels) {
    html += `
      <div class="legend-item" style="margin-top: 0.5rem;">
        <span class="legend-color" style="background: ${color};"></span>
        Riff-Gebiete
      </div>
    `;
  }
  
  legendContent.innerHTML = html;
}

/**
 * Cache-Management für ERDDAP-Layer
 * Speichert Bilder 24h im Browser
 */

const CACHE_PREFIX = 'erddap_cache_';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 Stunden in Millisekunden

/**
 * Erstellt eindeutigen Cache-Key aus Layer-Config und Bbox
 */
export function getCacheKey(layerId, date, bbox) {
  const dateStr = date.toISOString().split('T')[0]; // Nur Datum (YYYY-MM-DD)
  const bboxStr = bbox.map(v => v.toFixed(1)).join(','); // Gerundet auf 0.1°
  return `${CACHE_PREFIX}${layerId}_${dateStr}_${bboxStr}`;
}

/**
 * Speichert Bild-URL im Cache
 */
export function setCacheItem(key, imageUrl) {
  try {
    const cacheData = {
      url: imageUrl,
      timestamp: Date.now(),
      date: new Date().toISOString()
    };
    localStorage.setItem(key, JSON.stringify(cacheData));
    console.log(`💾 Cache gespeichert: ${key}`);
  } catch (error) {
    console.warn('⚠️ Cache-Speicherung fehlgeschlagen:', error);
    // Wenn Storage voll: Lösche alte Einträge
    cleanOldCache();
  }
}

/**
 * Holt Bild-URL aus Cache (wenn noch gültig)
 */
export function getCacheItem(key) {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const cacheData = JSON.parse(cached);
    const age = Date.now() - cacheData.timestamp;
    
    // Prüfe ob Cache noch gültig (24h)
    if (age > CACHE_DURATION) {
      console.log(`🕐 Cache abgelaufen: ${key} (${(age / 3600000).toFixed(1)}h alt)`);
      localStorage.removeItem(key);
      return null;
    }
    
    console.log(`✅ Cache-Hit: ${key} (${(age / 3600000).toFixed(1)}h alt)`);
    return cacheData.url;
  } catch (error) {
    console.warn('⚠️ Cache-Abruf fehlgeschlagen:', error);
    return null;
  }
}

/**
 * Löscht alle Cache-Einträge älter als 24h
 */
export function cleanOldCache() {
  console.log('🧹 Bereinige alten Cache...');
  let cleaned = 0;
  
  try {
    const keys = Object.keys(localStorage);
    
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        try {
          const cached = JSON.parse(localStorage.getItem(key));
          const age = Date.now() - cached.timestamp;
          
          if (age > CACHE_DURATION) {
            localStorage.removeItem(key);
            cleaned++;
          }
        } catch (e) {
          // Beschädigter Eintrag -> Löschen
          localStorage.removeItem(key);
          cleaned++;
        }
      }
    });
    
    console.log(`✅ ${cleaned} alte Cache-Einträge gelöscht`);
  } catch (error) {
    console.warn('⚠️ Cache-Bereinigung fehlgeschlagen:', error);
  }
}

/**
 * Zeigt Cache-Statistiken
 */
export function getCacheStats() {
  const keys = Object.keys(localStorage);
  const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
  
  let totalSize = 0;
  cacheKeys.forEach(key => {
    const item = localStorage.getItem(key);
    totalSize += item ? item.length : 0;
  });
  
  return {
    count: cacheKeys.length,
    sizeMB: (totalSize / (1024 * 1024)).toFixed(2)
  };
}

/**
 * Lädt Overpass-Daten (Tauchspots / Häfen) mit CORS-Proxy
 */
export async function fetchOverpassData(query, bbox) {
  const [west, south, east, north] = bbox;
  const bboxStr = `${south},${west},${north},${east}`;
  const filledQuery = query.replace('{{bbox}}', bboxStr);
  
  // Overpass API Server mit CORS-Proxy
  const servers = [
    // Option 1: Direkter Zugriff (funktioniert nur mit CORS-Extension)
    'https://overpass-api.de/api/interpreter',
    
    // Option 2: CORS-Proxy (funktioniert immer, aber langsamer)
    'https://corsproxy.io/?https://overpass-api.de/api/interpreter',
    
    // Option 3: Alternativer CORS-Proxy
    'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://overpass-api.de/api/interpreter')
  ];
  
  for (const url of servers) {
    try {
      console.log(`🔍 Versuche Overpass via: ${url.includes('proxy') || url.includes('allorigins') ? 'CORS-Proxy' : 'Direkt'}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `data=${encodeURIComponent(filledQuery)}`
      });
      
      if (!response.ok) {
        console.warn(`⚠️ Server antwortet mit ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      console.log(`✅ Overpass erfolgreich: ${data.elements?.length || 0} Elemente`);
      
      if (data.elements && data.elements.length > 0) {
        return data.elements;
      }
      
      console.warn('⚠️ Server antwortete, aber 0 Ergebnisse');
      continue;
      
    } catch (error) {
      console.warn(`❌ Fehler bei Anfrage:`, error.message);
      continue;
    }
  }
  
  // Alle Server fehlgeschlagen
  console.error('❌ Alle Overpass-Server nicht erreichbar (inkl. CORS-Proxies)');
  throw new Error('Overpass API nicht verfügbar');
}

/**
 * Konvertiert Overpass-Elemente zu Leaflet-Marker (VERBESSERT)
 */
export function createOverpassMarkers(elements, iconHtml, iconSize = [25, 25]) {
  const markers = [];
  
  elements.forEach(element => {
    let lat, lon;
    
    // Koordinaten extrahieren (node, way center, oder relation center)
    if (element.lat && element.lon) {
      lat = element.lat;
      lon = element.lon;
    } else if (element.center) {
      lat = element.center.lat;
      lon = element.center.lon;
    } else {
      return; // Überspringe wenn keine Koordinaten
    }
    
    const icon = L.divIcon({
      html: `<div style="font-size: 20px; text-shadow: 0 0 3px white;">${iconHtml}</div>`,
      className: '',
      iconSize: iconSize,
      iconAnchor: [iconSize[0] / 2, iconSize[1] / 2]
    });
    
    const marker = L.marker([lat, lon], { icon });
    
    // Popup mit Infos
    const tags = element.tags || {};
    const name = tags.name || tags['name:en'] || 'Unbenannt';
    const type = tags.tourism || tags.amenity || tags.sport || tags['seamark:type'] || 'POI';
    const operator = tags.operator || '';
    const website = tags.website || tags.contact?.website || '';
    
    let popupHTML = `
      <div class="popup-title">${name}</div>
      <div class="popup-info">
        📍 ${type}<br>
    `;
    
    if (operator) popupHTML += `🏢 ${operator}<br>`;
    if (website) popupHTML += `🌐 <a href="${website}" target="_blank">Website</a><br>`;
    
    popupHTML += `
        <small>Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}</small>
      </div>
    `;
    
    marker.bindPopup(popupHTML);
    markers.push(marker);
  });
  
  console.log(`✅ ${markers.length} Marker erstellt`);
  return markers;
}