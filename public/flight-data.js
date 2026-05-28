const VATSIM_DATA_URL = 'https://data.dubhenexus.org/api/flights/vatsim';
const ISFP_DATA_URL = 'https://data.dubhenexus.org/api/flights/isfp';
const SKYLITE_DATA_URL = 'https://data.dubhenexus.org/api/flights/skylite';
const APOC_DATA_URL = 'https://data.dubhenexus.org/api/flights/apoc';
const VOLANTA_DATA_URL = 'https://data.dubhenexus.org/api/flights/volanta';
const PLANEPALS_DATA_URL = 'https://data.dubhenexus.org/api/flights/planepals';

const VATSIM_REFRESH_MS = 1000;
const ISFP_REFRESH_MS = 15000;
const SKYLITE_REFRESH_MS = 1000;
const APOC_REFRESH_MS = 15000;
const VOLANTA_REFRESH_MS = 1000;
const PLANEPALS_REFRESH_MS = 1000;

let cachedVatsimFlights = [];
let cachedIsfpFlights = [];
let cachedSkyLiteFlights = [];
let cachedApocFlights = [];
let cachedVolantaFlights = [];
let cachedPlanePalsFlights = [];

let lastVatsimFetchAt = 0;
let lastIsfpFetchAt = 0;
let lastSkyLiteFetchAt = 0;
let lastApocFetchAt = 0;
let lastVolantaFetchAt = 0;
let lastPlanePalsFetchAt = 0;

function extractIcaoAircraft(str) {
  if (!str) return '';
  const parts = str.split('/');
  for (const part of parts) {
    if (/^[A-Z]\d{3}$/.test(part) || /^[A-Z][A-Z0-9]{2,3}$/.test(part)) {
      return part;
    }
  }
  return parts[0] || str;
}

function parseFiniteNumber(value) {
  if (value == null) return null;
  const s = String(value).trim();
  if (s === '') return null;
  const num = Number(s);
  return Number.isFinite(num) ? num : null;
}

function sanitizeAltitude(value, source) {
  const num = parseFiniteNumber(value);
  if (num == null) return null;
  const rounded = Math.round(num);
  if ((source === 'Volanta' || source === 'Plane Pal') && rounded > -100 && rounded < 100) {
    return 0;
  }
  return rounded;
}

function sanitizeSpeed(value, source) {
  if (value == null) return 0;
  const num = parseFiniteNumber(value);
  if (num == null) return 0;
  if (source === 'Volanta' || source === 'Plane Pal') {
    if (Math.abs(num) < 1) return 0;
    return Math.round(num);
  }
  return Math.round(num);
}

function sanitizeHeading(value) {
  const num = parseFiniteNumber(value);
  if (num == null) return null;
  return ((Math.round(num) % 360) + 360) % 360;
}

function normalizePilot(pilot, source) {
  const fp = pilot.flight_plan;
  if (!fp) return null;

  const base = {
    source,
    callsign: pilot.callsign || '',
  };

  if (source === 'vatsim') {
    return {
      ...base,
    };
  }

  return {
    ...base,
    name: pilot.real_name || pilot.name || '',
    latitude: pilot.latitude,
    longitude: pilot.longitude,
    altitude: pilot.altitude || pilot.altitude,
    groundspeed: pilot.groundspeed || pilot.ground_speed || 0,
    heading: pilot.heading || 0,
    departure: fp.departure || '',
    arrival: fp.arrival || '',
    aircraft: fp.aircraft || '',
    cruise_altitude: fp.altitude || '',
    route: fp.route || '',
    deptime: fp.deptime || fp.departure_time || '',
    enroute_time: fp.enroute_time || fp.route_time_hour || '',
    fuel_time: fp.fuel_time || fp.fuel_time_hour || '',
    logon_time: pilot.logon_time || '',
    transponder: pilot.transponder || '',
  };
}

function normalizeVatsimPilot(pilot) {
  const fp = pilot.flight_plan;
  if (!fp) return null;
  const altitude = sanitizeAltitude(pilot.altitude, 'VATSIM');
  let groundspeed = sanitizeSpeed(pilot.groundspeed, 'VATSIM');
  if (groundspeed == null) {
    groundspeed = pilot.groundspeed != null ? Number(pilot.groundspeed) : 0;
    if (!Number.isFinite(groundspeed)) groundspeed = 0;
  }
  console.log('[VATSIM]', pilot.callsign, 'gs raw:', pilot.groundspeed, '→ sanitize:', groundspeed);
  return {
    source: 'VATSIM',
    cid: pilot.cid || '',
    callsign: pilot.callsign || '',
    name: pilot.name || '',
    latitude: pilot.latitude,
    longitude: pilot.longitude,
    altitude,
    groundspeed,
    heading: sanitizeHeading(pilot.heading),
    departure: fp.departure || '',
    arrival: fp.arrival || '',
    aircraft: extractIcaoAircraft(fp.aircraft) || fp.aircraft_short || '',
    aircraft_short: fp.aircraft_short || '',
    cruise_tas: fp.cruise_tas || '',
    cruise_altitude: fp.altitude || '',
    route: fp.route || '',
    deptime: fp.deptime || '',
    enroute_time: fp.enroute_time || '',
    fuel_time: fp.fuel_time || '',
    remarks: fp.remarks || '',
    logon_time: pilot.logon_time || '',
    transponder: pilot.transponder || '',
    _gsRaw: pilot.groundspeed,
  };
}

function normalizeIsfpPilot(pilot) {
  const fp = pilot.flight_plan;
  if (!fp) return null;
  return {
    source: 'ISFP',
    cid: pilot.cid || '',
    callsign: pilot.callsign || '',
    name: pilot.real_name || '',
    latitude: pilot.latitude,
    longitude: pilot.longitude,
    altitude: sanitizeAltitude(pilot.altitude, 'ISFP'),
    groundspeed: sanitizeSpeed(
      pilot.groundspeed != null ? pilot.groundspeed : pilot.ground_speed,
      'ISFP'
    ),
    heading: sanitizeHeading(pilot.heading),
    departure: fp.departure || '',
    arrival: fp.arrival || '',
    aircraft: extractIcaoAircraft(fp.aircraft),
    cruise_tas: fp.cruise_tas || '',
    cruise_altitude: fp.altitude || '',
    route: fp.route || '',
    deptime: fp.departure_time || '',
    enroute_time: fp.route_time_hour && fp.route_time_minute
      ? `${String(fp.route_time_hour).padStart(2, '0')}:${String(fp.route_time_minute).padStart(2, '0')}`
      : '',
    fuel_time: fp.fuel_time_hour && fp.fuel_time_minute
      ? `${String(fp.fuel_time_hour).padStart(2, '0')}:${String(fp.fuel_time_minute).padStart(2, '0')}`
      : '',
    remarks: fp.remarks || '',
    logon_time: pilot.logon_time || '',
    transponder: pilot.transponder || '',
  };
}

function normalizeApocPilot(pilot) {
  const fp = pilot.flight_plan;
  if (!fp) return null;
  return {
    source: 'APOC',
    cid: pilot.cid || '',
    callsign: pilot.callsign || '',
    name: pilot.real_name || '',
    latitude: pilot.latitude,
    longitude: pilot.longitude,
    altitude: sanitizeAltitude(pilot.altitude, 'APOC'),
    groundspeed: sanitizeSpeed(
      pilot.groundspeed != null ? pilot.groundspeed : pilot.ground_speed,
      'APOC'
    ),
    heading: sanitizeHeading(pilot.heading),
    departure: fp.departure || '',
    arrival: fp.arrival || '',
    aircraft: extractIcaoAircraft(fp.aircraft),
    cruise_tas: fp.cruise_tas || '',
    cruise_altitude: fp.altitude || '',
    route: fp.route || '',
    deptime: fp.departure_time || '',
    enroute_time: fp.route_time_hour && fp.route_time_minute
      ? `${String(fp.route_time_hour).padStart(2, '0')}:${String(fp.route_time_minute).padStart(2, '0')}`
      : '',
    fuel_time: fp.fuel_time_hour && fp.fuel_time_minute
      ? `${String(fp.fuel_time_hour).padStart(2, '0')}:${String(fp.fuel_time_minute).padStart(2, '0')}`
      : '',
    remarks: fp.remarks || '',
    logon_time: pilot.logon_time || '',
    transponder: pilot.transponder || '',
  };
}

function normalizeFsdPilot(pilot) {
  const fp = pilot.flight_plan;
  if (!fp) return null;
  return {
    source: 'SkyLite',
    cid: pilot.cid || '',
    callsign: pilot.callsign || '',
    name: pilot.name || '',
    latitude: pilot.latitude,
    longitude: pilot.longitude,
    altitude: sanitizeAltitude(pilot.altitude, 'SkyLite'),
    groundspeed: sanitizeSpeed(pilot.groundspeed, 'SkyLite'),
    heading: sanitizeHeading(pilot.heading),
    departure: fp.departure || '',
    arrival: fp.arrival || '',
    aircraft: extractIcaoAircraft(fp.aircraft),
    cruise_tas: fp.cruise_tas || '',
    cruise_altitude: fp.altitude || '',
    route: fp.route || '',
    deptime: fp.deptime || '',
    enroute_time: '',
    fuel_time: '',
    remarks: fp.remarks || '',
    logon_time: pilot.logon_time || '',
    transponder: pilot.transponder || '',
  };
}

function normalizePlanepalsPilot(pilot) {
  if (!pilot) return null;
  if (pilot.network !== 'Background') return null;
  const dep = (pilot.waypointNames && pilot.waypointNames.length >= 1) ? pilot.waypointNames[0] : '';
  const arr = (pilot.waypointNames && pilot.waypointNames.length >= 2) ? pilot.waypointNames[1] : '';
  const altitude = sanitizeAltitude(pilot.alt, 'Plane Pal');
  const groundspeed = sanitizeSpeed(pilot.speed, 'Plane Pal');

  return {
    source: 'Plane Pal',
    cid: '',
    callsign: pilot.callsign || '',
    name: (pilot.user || '').replace(/\s*\(V\)$/, ''),
    latitude: pilot.lat,
    longitude: pilot.lon,
    altitude,
    groundspeed,
    heading: sanitizeHeading(pilot.heading),
    departure: dep,
    arrival: arr,
    aircraft: pilot.icao || '',
    cruise_tas: '',
    cruise_altitude: pilot.alt != null ? String(pilot.alt) : '',
    route: '',
    deptime: (() => {
      const zulu = pilot.simZuluTime;
      if (!zulu) return '';
      const d = new Date(zulu);
      if (isNaN(d.getTime())) return '';
      return `${String(d.getUTCHours()).padStart(2, '0')}${String(d.getUTCMinutes()).padStart(2, '0')}`;
    })(),
    enroute_time: '',
    fuel_time: '',
    remarks: pilot.sim ? pilot.sim.toUpperCase() : '',
    logon_time: '',
    transponder: '',
  };
}

const VOLANTA_NETWORK_MAP = {
  Volanta: 'Volanta',
  Apoc: 'APOC',
  PilotEdge: 'PilotEdge',
  Vatsim: 'VATSIM'
};

function normalizeNativeVolantaPilot(pilot) {
  if (!pilot) return null;
  const pos = pilot.position;
  if (!pos) return null;
  const network = pilot.network || '';
  const source = VOLANTA_NETWORK_MAP[network];
  if (!source) return null;
  const altitude = sanitizeAltitude(pos.altitude, source);
  const groundspeed = sanitizeSpeed(pos.groundSpeed, source);

  return {
    source,
    cid: '',
    callsign: pilot.callsign || '',
    name: pilot.networkUserName || '',
    latitude: pos.latitude,
    longitude: pos.longitude,
    altitude,
    groundspeed,
    heading: sanitizeHeading(pos.headingTrue),
    departure: pilot.originIcao || '',
    arrival: pilot.destinationIcao || '',
    aircraft: extractIcaoAircraft(pilot.aircraftIcao) || pilot.aircraftIcao || '',
    cruise_tas: '',
    cruise_altitude: '',
    route: pilot.atcRoute || '',
    deptime: '',
    enroute_time: '',
    fuel_time: '',
    remarks: pilot.simulatorAbbreviation ? pilot.simulatorAbbreviation.toUpperCase() : '',
    logon_time: pilot.simZuluTime || pos.time || '',
    transponder: pos.transponder || '',
  };
}

async function fetchSingleAPI(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return [];
    const data = await response.json();

    if (url.includes('vatsim')) {
      return (data.pilots || []).map(normalizeVatsimPilot).filter(Boolean);
    } else if (url.includes('flights/isfp')) {
      return (data.pilots || []).map(normalizeIsfpPilot).filter(Boolean);
    } else if (url.includes('flights/apoc')) {
      return (data.pilots || []).map(normalizeApocPilot).filter(Boolean);
    } else if (url.includes('flights/skylite')) {
      return (data.pilot || []).map(normalizeFsdPilot).filter(Boolean);
    } else if (url.includes('flights/volanta')) {
      const pilots = data.data || [];
      const results = [];
      for (const p of pilots) {
        const entry = normalizeNativeVolantaPilot(p);
        if (entry) results.push(entry);
      }
      return results;
    } else if (url.includes('planepals')) {
      return (Array.isArray(data) ? data : []).map(normalizePlanepalsPilot).filter(Boolean);
    }
    return [];
  } catch {
    return [];
  }
}

async function getVatsimFlights() {
  const now = Date.now();
  if (cachedVatsimFlights.length > 0 && now - lastVatsimFetchAt < VATSIM_REFRESH_MS) {
    return cachedVatsimFlights;
  }
  const flights = await fetchSingleAPI(VATSIM_DATA_URL);
  if (flights.length > 0) {
    cachedVatsimFlights = flights;
    lastVatsimFetchAt = now;
    return flights;
  }
  if (cachedVatsimFlights.length > 0) return cachedVatsimFlights;
  lastVatsimFetchAt = now;
  return [];
}

async function getIsfpFlights() {
  const now = Date.now();
  if (cachedIsfpFlights.length > 0 && now - lastIsfpFetchAt < ISFP_REFRESH_MS) {
    return cachedIsfpFlights;
  }
  const flights = await fetchSingleAPI(ISFP_DATA_URL);
  if (flights.length > 0) {
    cachedIsfpFlights = flights;
    lastIsfpFetchAt = now;
    return flights;
  }
  if (cachedIsfpFlights.length > 0) return cachedIsfpFlights;
  lastIsfpFetchAt = now;
  return [];
}

async function getSkyLiteFlights() {
  const now = Date.now();
  if (cachedSkyLiteFlights.length > 0 && now - lastSkyLiteFetchAt < SKYLITE_REFRESH_MS) {
    return cachedSkyLiteFlights;
  }
  const flights = await fetchSingleAPI(SKYLITE_DATA_URL);
  if (flights.length > 0) {
    cachedSkyLiteFlights = flights;
    lastSkyLiteFetchAt = now;
    return flights;
  }
  if (cachedSkyLiteFlights.length > 0) return cachedSkyLiteFlights;
  lastSkyLiteFetchAt = now;
  return [];
}

async function getApocFlights() {
  const now = Date.now();
  if (cachedApocFlights.length > 0 && now - lastApocFetchAt < APOC_REFRESH_MS) {
    return cachedApocFlights;
  }
  const flights = await fetchSingleAPI(APOC_DATA_URL);
  if (flights.length > 0) {
    cachedApocFlights = flights;
    lastApocFetchAt = now;
    return flights;
  }
  if (cachedApocFlights.length > 0) return cachedApocFlights;
  lastApocFetchAt = now;
  return [];
}

async function getPlanePalsFlights() {
  const now = Date.now();
  if (cachedPlanePalsFlights.length > 0 && now - lastPlanePalsFetchAt < PLANEPALS_REFRESH_MS) {
    return cachedPlanePalsFlights;
  }
  const flights = await fetchSingleAPI(PLANEPALS_DATA_URL);
  if (flights.length > 0) {
    cachedPlanePalsFlights = flights;
    lastPlanePalsFetchAt = now;
    return flights;
  }
  if (cachedPlanePalsFlights.length > 0) return cachedPlanePalsFlights;
  lastPlanePalsFetchAt = now;
  return [];
}

async function getVolantaFlights() {
  const now = Date.now();
  if (cachedVolantaFlights.length > 0 && now - lastVolantaFetchAt < VOLANTA_REFRESH_MS) {
    return cachedVolantaFlights;
  }
  const flights = await fetchSingleAPI(VOLANTA_DATA_URL);
  if (flights.length > 0) {
    cachedVolantaFlights = flights;
    lastVolantaFetchAt = now;
    return flights;
  }
  if (cachedVolantaFlights.length > 0) return cachedVolantaFlights;
  lastVolantaFetchAt = now;
  return [];
}

function formatLogonTime(logonTime) {
  if (!logonTime) return '';
  try {
    const d = new Date(logonTime);
    if (isNaN(d.getTime())) return logonTime;
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${month}-${day} ${hours}:${mins}`;
  } catch {
    return logonTime;
  }
}

function formatAltitude(alt) {
  if (!alt && alt !== 0) return '';
  const altStr = String(alt);
  if (altStr.startsWith('FL')) return altStr;
  const num = typeof alt === 'string' ? parseInt(alt, 10) : alt;
  if (isNaN(num)) return altStr;
  if (num > 1000) return `FL${Math.round(num / 100)}`;
  return `${num} ft`;
}

function formatAltitudeFeet(alt) {
  if (!alt && alt !== 0) return '-';
  const altStr = String(alt);
  if (altStr.startsWith('FL')) {
    const fl = parseInt(altStr.replace('FL', ''), 10);
    if (!isNaN(fl)) return `${(fl * 100).toLocaleString()} ft`;
    return altStr;
  }
  const num = typeof alt === 'string' ? parseInt(altStr, 10) : alt;
  if (isNaN(num)) return altStr;
  if (num >= 1000 && num < 10000) return `${num.toLocaleString()} ft`;
  return `${num.toLocaleString()} ft`;
}

function formatDeptime(time) {
  if (!time && time !== 0) return '-';
  const str = String(time).padStart(4, '0');
  if (str.length >= 4) {
    return `${str.slice(0, 2)}:${str.slice(2, 4)}`;
  }
  return str;
}

const airportCache = new Map();
const airportFetching = new Map();

async function fetchAirportData(icao) {
  const key = icao.toUpperCase();
  if (airportCache.has(key)) return airportCache.get(key);
  if (airportFetching.has(key)) return airportFetching.get(key);

  const promise = fetch(`https://data.dubhenexus.org/api/airport/${key}`)
    .then(r => r.json())
    .then(json => {
      const d = json && json.data ? json.data : null;
      const info = d ? { name: d.name, lat: d.lat, lon: d.lon } : null;
      airportCache.set(key, info);
      return info;
    })
    .catch(() => {
      airportCache.set(key, null);
      return null;
    })
    .finally(() => {
      airportFetching.delete(key);
    });

  airportFetching.set(key, promise);
  return promise;
}

function getAirportName(icao) {
  if (!icao) return '';
  const info = airportCache.get(icao.toUpperCase());
  return info ? info.name : '';
}

function getAirportCoords(icao) {
  if (!icao) return null;
  const info = airportCache.get(icao.toUpperCase());
  return info ? { lat: info.lat, lon: info.lon } : null;
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function getFlightDistance(dep, arr) {
  const depCoords = getAirportCoords(dep);
  const arrCoords = getAirportCoords(arr);
  if (!depCoords || !arrCoords) return null;
  return haversineDistance(depCoords.lat, depCoords.lon, arrCoords.lat, arrCoords.lon);
}

function getFlightProgress(flight) {
  if (!flight.latitude || !flight.longitude) return null;

  const depCoords = getAirportCoords(flight.departure);
  const arrCoords = getAirportCoords(flight.arrival);
  if (!depCoords || !arrCoords) return null;

  const totalDist = haversineDistance(depCoords.lat, depCoords.lon, arrCoords.lat, arrCoords.lon);
  if (totalDist === 0) return 0;

  const flownDist = haversineDistance(depCoords.lat, depCoords.lon, flight.latitude, flight.longitude);
  const progress = Math.min(100, Math.max(0, Math.round((flownDist / totalDist) * 100)));

  return { totalDist, flownDist, progress };
}

function formatEnrouteTime(time) {
  if (!time) return '-';
  const parts = String(time).split(':');
  if (parts.length >= 2) {
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }
  const num = parseInt(time, 10);
  if (!isNaN(num) && num > 0) {
    const h = Math.floor(num / 100);
    const m = num % 100;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }
  return time;
}

window.FLIGHT_DATA = {
  async fetchAll() {
    const results = await Promise.allSettled([
      getVatsimFlights(),
      getIsfpFlights(),
      getSkyLiteFlights(),
      getApocFlights(),
      getVolantaFlights(),
      getPlanePalsFlights()
    ]);

    const allFlights = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value);

    const now = new Date();
    const nowMs = now.getTime();
    const todayBase = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).getTime();

    function deptimeDiff(deptime) {
      if ((!deptime && deptime !== 0) || deptime === '') return Infinity;
      const str = String(deptime).padStart(4, '0');
      const hh = parseInt(str.slice(0, 2), 10);
      const mm = parseInt(str.slice(2, 4), 10);
      if (isNaN(hh) || isNaN(mm) || hh > 23 || mm > 59) return Infinity;

      const candidate = todayBase + hh * 3600000 + mm * 60000;
      const yesterday = candidate - 86400000;
      const tomorrow  = candidate + 86400000;

      let best = candidate;
      if (Math.abs(yesterday - nowMs) < Math.abs(best - nowMs)) best = yesterday;
      if (Math.abs(tomorrow  - nowMs) < Math.abs(best - nowMs)) best = tomorrow;

      return Math.abs(best - nowMs);
    }

    allFlights.sort((a, b) => {
      const aDiff = deptimeDiff(a.deptime);
      const bDiff = deptimeDiff(b.deptime);
      if (aDiff === Infinity && bDiff === Infinity) return 0;
      if (aDiff === Infinity) return 1;
      if (bDiff === Infinity) return -1;
      return aDiff - bDiff;
    });

    return allFlights;
  },

  async ensureFlightAirports(flight) {
    const tasks = [];
    if (flight && flight.departure) tasks.push(fetchAirportData(flight.departure));
    if (flight && flight.arrival && flight.arrival !== flight.departure) tasks.push(fetchAirportData(flight.arrival));
    await Promise.allSettled(tasks);
    const card = document.querySelector(
      `.ticket-card[data-flight-callsign="${flight.callsign || ''}"][data-flight-source="${flight.source || ''}"]`
    );
    if (!card) return;
    if (flight.departure) {
      const depEl = card.querySelector('.ticket-airport-name[data-icao="' + (flight.departure || '') + '"]');
      if (depEl) {
        const loading = depEl.querySelector('.airport-loading');
        if (loading) {
          depEl.textContent = getAirportName(flight.departure) || flight.departure || '';
        }
      }
    }
    if (flight.arrival) {
      const arrEl = card.querySelector('.ticket-airport-name[data-icao="' + (flight.arrival || '') + '"]');
      if (arrEl) {
        const loading = arrEl.querySelector('.airport-loading');
        if (loading) {
          arrEl.textContent = getAirportName(flight.arrival) || flight.arrival || '';
        }
      }
    }
    const progressSection = card.querySelector('.ticket-progress-section');
    if (progressSection && !progressSection.querySelector('.ticket-progress-bar, .ticket-dist-label')) {
      const progress = getFlightProgress(flight);
      const dist = getFlightDistance(flight.departure, flight.arrival);
      if (progress) {
        progressSection.innerHTML = `<div>
          <div class="ticket-progress-bar"><div class="ticket-progress-fill" style="width:${progress.progress}%"></div></div>
          <div class="ticket-dist-label"><span>${progress.progress}%</span><span>${progress.totalDist} km</span></div>
        </div>`;
      } else if (dist) {
        progressSection.innerHTML = `<div class="ticket-dist-label"><span>总航程</span><span>${dist} km</span></div>`;
      }
    }
  },

  async getRecentFlights(count = 5) {
    const flights = await this.fetchAll();
    return flights.slice(0, count);
  },

  async getAllFlights() {
    return await this.fetchAll();
  },

  formatLogonTime,
  formatAltitude,
  formatAltitudeFeet,
  formatDeptime,
  formatEnrouteTime,
  getAirportName,
  getAirportCoords,
  getFlightDistance,
  getFlightProgress,

  buildTicketHTML(flight, pendingAirports = false) {
    const depName = getAirportName(flight.departure);
    const arrName = getAirportName(flight.arrival);
    const progress = getFlightProgress(flight);
    const dist = getFlightDistance(flight.departure, flight.arrival);
    const lat = flight.latitude != null ? flight.latitude.toFixed(4) : '-';
    const lng = flight.longitude != null ? flight.longitude.toFixed(4) : '-';
    const gsRaw = flight._gsRaw != null ? flight._gsRaw : flight.groundspeed;
    const gsDisplay = gsRaw != null ? `${gsRaw} kt` : '-';
    const altDisplay = flight.altitude != null ? formatAltitudeFeet(flight.altitude) : '-';
    const sourceClass = 'ticket-source-' + flight.source.toLowerCase().replace(/\s+/g, '-');
    const sourceColors = { VATSIM: '#0288d1', ISFP: '#2aa37b', SkyLite: '#d4af37', Volanta: '#8b5cf6', 'Plane Pal': '#06b6d4', IVAO: '#f59e0b', PilotEdge: '#0d9488', APOC: '#ec4899' };
    const srcColor = sourceColors[flight.source] || '#52606d';
    const depLabel = depName ? depName : `<span class="airport-loading" data-icao-load="${flight.departure || ''}">加载中…</span>`;
    const arrLabel = arrName ? arrName : `<span class="airport-loading" data-icao-load="${flight.arrival || ''}">加载中…</span>`;

    return `<td colspan="9" style="padding:0 16px 16px !important;border-bottom:1px solid var(--medium-grey) !important;"><div class="ticket-card" data-flight-callsign="${flight.callsign || ''}" data-flight-source="${flight.source || ''}">
      <div class="ticket-left">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <div class="ticket-callsign">${flight.callsign || 'UNK'}</div>
            <div class="ticket-airport-name" style="margin-top:4px;">${flight.name || 'UNK'}</div>
          </div>
          <span class="ticket-platform-badge ${sourceClass}" style="background:${srcColor}15;color:${srcColor};">${flight.source}</span>
        </div>
        <div class="ticket-route">
          <div>
            <div class="ticket-airport">${flight.departure || 'N/A'}</div>
            <div class="ticket-airport-name" data-icao="${flight.departure || ''}">${depLabel}</div>
          </div>
          <div class="ticket-arrow">→</div>
          <div>
            <div class="ticket-airport">${flight.arrival || 'N/A'}</div>
            <div class="ticket-airport-name" data-icao="${flight.arrival || ''}">${arrLabel}</div>
          </div>
        </div>
        <div class="ticket-progress-section">
          ${progress ? `<div>
            <div class="ticket-progress-bar"><div class="ticket-progress-fill" style="width:${progress.progress}%"></div></div>
            <div class="ticket-dist-label"><span>${progress.progress}%</span><span>${progress.totalDist} km</span></div>
          </div>` : (dist ? `<div class="ticket-dist-label"><span>总航程</span><span>${dist} km</span></div>` : '')}
        </div>
        <div class="ticket-meta">
          <div class="ticket-meta-item"><span class="ticket-meta-label">出发时间</span><span class="ticket-meta-value">UTC ${formatDeptime(flight.deptime)}</span></div>
          <div class="ticket-meta-item"><span class="ticket-meta-label">预计航时</span><span class="ticket-meta-value">${formatEnrouteTime(flight.enroute_time)}</span></div>
          <div class="ticket-meta-item"><span class="ticket-meta-label">巡航速度</span><span class="ticket-meta-value">${flight.cruise_tas ? flight.cruise_tas + ' kt' : '-'}</span></div>
          <div class="ticket-meta-item"><span class="ticket-meta-label">巡航高度</span><span class="ticket-meta-value mono" style="font-size:.78rem;">${formatAltitudeFeet(flight.cruise_altitude || flight.altitude)}</span></div>
        </div>
      </div>
      <div class="ticket-right">
        <div class="ticket-section">
          <div class="ticket-section-title">飞行数据</div>
          <div class="ticket-detail-row"><span class="ticket-detail-label">机型</span><span class="ticket-detail-value">${flight.aircraft || 'UNK'}</span></div>
          <div class="ticket-detail-row"><span class="ticket-detail-label">高度</span><span class="ticket-detail-value mono">${altDisplay}</span></div>
          <div class="ticket-detail-row"><span class="ticket-detail-label">速度</span><span class="ticket-detail-value mono">${gsDisplay}</span></div>
          <div class="ticket-detail-row"><span class="ticket-detail-label">航向</span><span class="ticket-detail-value mono">${flight.heading != null ? flight.heading + '°' : 'UNK'}</span></div>
          <div class="ticket-detail-row"><span class="ticket-detail-label">应答机</span><span class="ticket-detail-value mono">${flight.transponder || '-'}</span></div>
          <div class="ticket-detail-row"><span class="ticket-detail-label">经纬度</span><span class="ticket-latlng">${lat}, ${lng}</span></div>
        </div>
        <div class="ticket-section">
          <div class="ticket-section-title">平台信息</div>
          <div class="ticket-detail-row"><span class="ticket-detail-label">平台</span><span class="ticket-detail-value"><span class="ticket-platform-badge ${sourceClass}" style="background:${srcColor}15;color:${srcColor};">${flight.source}</span></span></div>
          <div class="ticket-detail-row"><span class="ticket-detail-label">CID</span><span class="ticket-detail-value mono">${flight.cid || '-'}</span></div>
          <div class="ticket-detail-row"><span class="ticket-detail-label">登录时间 (UTC)</span><span class="ticket-detail-value">${formatLogonTime(flight.logon_time) || '-'}</span></div>
          ${(flight.departure) ? `<a class="ticket-metar-link" href="https://service.dubhenexus.org/weather?icao=${flight.departure}" target="_blank" rel="noopener"><i class="fas fa-cloud-sun"></i>${flight.departure} METAR</a>` : ''}
          ${(flight.arrival) ? `<a class="ticket-metar-link" href="https://service.dubhenexus.org/weather?icao=${flight.arrival}" target="_blank" rel="noopener"><i class="fas fa-cloud-sun"></i>${flight.arrival} METAR</a>` : ''}
        </div>
        ${flight.route ? `<div class="ticket-section">
          <div class="ticket-section-title">申报航线</div>
          <div class="ticket-route-full">${flight.route}</div>
        </div>` : ''}
        ${flight.remarks ? `<div class="ticket-section">
          <div class="ticket-section-title">备注</div>
          <div style="font-size:.72rem;color:var(--dark-grey);line-height:1.4;">${flight.remarks}</div>
        </div>` : ''}
      </div>
    </div></td>`;
  },

  async searchFlights(query) {
    const flights = await this.fetchAll();
    if (!query || !query.trim()) return flights;

    const q = query.trim().toLowerCase();
    return flights.filter(f =>
      (f.callsign && f.callsign.toLowerCase().includes(q)) ||
      (f.name && f.name.toLowerCase().includes(q)) ||
      (f.departure && f.departure.toLowerCase().includes(q)) ||
      (f.arrival && f.arrival.toLowerCase().includes(q)) ||
      (f.aircraft && f.aircraft.toLowerCase().includes(q)) ||
      (f.departure && f.arrival && `${f.departure}->${f.arrival}`.toLowerCase().includes(q))
    );
  }
};
