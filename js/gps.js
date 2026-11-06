// Transit Saathi - GPS Awareness & Railway Matching Engine
// Tracks commuter GPS, detects speed, infers platform vs train, and matches station & corridor

const GPSEngine = (function() {
  'use strict';

  let watchId = null;
  let lastPosition = null;
  let lastTimestamp = 0;
  let consecutiveMatches = [];
  const listeners = new Set();

  const state = {
    isTracking: false,
    hasLocation: false,
    latitude: null,
    longitude: null,
    accuracy: null,
    speedKmh: 0,
    heading: null,
    context: 'UNKNOWN', // 'PLATFORM' (<10 km/h) or 'TRAIN' (>=10 km/h)
    nearestStationId: null,
    nearestStationDistanceKm: null,
    currentCorridorId: null,
    direction: 'UNKNOWN', // 'UP', 'DOWN', 'UNKNOWN'
    trajectory: [], // Array of { lat, lon, time, speed }
    lastUpdated: null,
    error: null
  };

  // Earth radius in km
  const EARTH_RADIUS_KM = 6371;

  function toRad(deg) {
    return (deg * Math.PI) / 180;
  }

  // Accurate Haversine Distance between two GPS coordinates
  function getHaversineDistanceKm(lat1, lon1, lat2, lon2) {
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_KM * c;
  }

  // Find nearest station from master station registry
  function findNearestStation(lat, lon) {
    if (typeof MUMBAI_STATIONS === 'undefined' || !MUMBAI_STATIONS.length) return null;

    let nearest = null;
    let minDist = Infinity;

    for (const station of MUMBAI_STATIONS) {
      if (station.lat == null || station.lon == null) continue;
      const dist = getHaversineDistanceKm(lat, lon, station.lat, station.lon);
      if (dist < minDist) {
        minDist = dist;
        nearest = station;
      }
    }

    return nearest ? { station: nearest, distanceKm: minDist } : null;
  }

  // Infer corridor and direction based on recent station progression
  function inferCorridorAndDirection(stationId) {
    if (!stationId || typeof TimetableEngine === 'undefined') return { corridor: null, direction: 'UNKNOWN' };

    const corridors = TimetableEngine.CORRIDORS;
    if (!corridors) return { corridor: null, direction: 'UNKNOWN' };

    consecutiveMatches.push({ stationId, time: Date.now() });
    if (consecutiveMatches.length > 5) consecutiveMatches.shift();

    if (consecutiveMatches.length < 2) {
      // Find candidate corridors that contain this single station
      for (const [corrKey, stList] of Object.entries(corridors)) {
        if (stList.includes(stationId)) {
          return { corridor: corrKey, direction: 'UNKNOWN' };
        }
      }
      return { corridor: null, direction: 'UNKNOWN' };
    }

    const prev = consecutiveMatches[consecutiveMatches.length - 2].stationId;
    const curr = stationId;

    if (prev === curr) {
      return { corridor: state.currentCorridorId, direction: state.direction };
    }

    for (const [corrKey, stList] of Object.entries(corridors)) {
      const idxPrev = stList.indexOf(prev);
      const idxCurr = stList.indexOf(curr);
      if (idxPrev !== -1 && idxCurr !== -1) {
        const direction = idxCurr > idxPrev ? 'DOWN' : 'UP';
        return { corridor: corrKey, direction };
      }
    }

    return { corridor: state.currentCorridorId, direction: state.direction };
  }

  function handlePositionUpdate(pos) {
    const coords = pos.coords;
    const now = pos.timestamp || Date.now();

    const lat = coords.latitude;
    const lon = coords.longitude;
    const accuracy = coords.accuracy;

    // Reject obvious GPS teleportation drift (> 150 km away from Mumbai metropolitan area 18.0 - 20.5 N, 72.5 - 73.6 E)
    if (lat < 18.0 || lat > 20.5 || lon < 72.5 || lon > 73.6) {
      state.error = 'Location outside Mumbai Suburban Railway area';
      notifyListeners();
      return;
    }

    let speedKmh = 0;
    if (coords.speed != null && !isNaN(coords.speed) && coords.speed >= 0) {
      speedKmh = coords.speed * 3.6;
    } else if (lastPosition && lastTimestamp > 0) {
      const timeDiffHours = (now - lastTimestamp) / 3600000;
      if (timeDiffHours > 0.0001 && timeDiffHours < 0.2) {
        const distKm = getHaversineDistanceKm(lastPosition.lat, lastPosition.lon, lat, lon);
        const calculatedSpeed = distKm / timeDiffHours;
        // Reject GPS glitch spikes (> 125 km/h)
        if (calculatedSpeed <= 125) {
          speedKmh = calculatedSpeed;
        }
      }
    }

    // Clamp speed to realistic Mumbai local bounds
    if (speedKmh > 120) speedKmh = 0;

    // Platform vs Train context
    const context = speedKmh < 10 ? 'PLATFORM' : 'TRAIN';

    // Match nearest station
    const nearestResult = findNearestStation(lat, lon);
    const nearestStationId = nearestResult ? nearestResult.station.id : null;
    const nearestStationDist = nearestResult ? nearestResult.distanceKm : null;

    // Infer corridor and direction
    const { corridor, direction } = inferCorridorAndDirection(nearestStationId);

    // Update internal state
    state.isTracking = true;
    state.hasLocation = true;
    state.latitude = lat;
    state.longitude = lon;
    state.accuracy = accuracy;
    state.speedKmh = Math.round(speedKmh * 10) / 10;
    state.heading = coords.heading != null && !isNaN(coords.heading) ? coords.heading : null;
    state.context = context;
    state.nearestStationId = nearestStationId;
    state.nearestStationDistanceKm = nearestStationDist ? Math.round(nearestStationDist * 100) / 100 : null;
    state.currentCorridorId = corridor;
    state.direction = direction;
    state.lastUpdated = new Date();
    state.error = null;

    // Record breadcrumb trajectory (limit to last 50 points)
    state.trajectory.push({
      lat,
      lon,
      time: now,
      speed: state.speedKmh
    });
    if (state.trajectory.length > 50) state.trajectory.shift();

    lastPosition = { lat, lon };
    lastTimestamp = now;

    notifyListeners();
  }

  function handlePositionError(err) {
    state.isTracking = false;
    state.error = err.message || 'GPS Signal Unavailable';
    notifyListeners();
  }

  function notifyListeners() {
    listeners.forEach(fn => {
      try {
        fn(getState());
      } catch (e) {
        console.warn('GPS listener error:', e);
      }
    });
  }

  function startTracking() {
    if (!('geolocation' in navigator)) {
      state.error = 'Geolocation not supported by browser';
      notifyListeners();
      return;
    }

    if (watchId !== null) return; // Already watching

    state.isTracking = true;
    watchId = navigator.geolocation.watchPosition(
      handlePositionUpdate,
      handlePositionError,
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 12000
      }
    );
  }

  function stopTracking() {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    state.isTracking = false;
  }

  function requestOneShot() {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        pos => {
          handlePositionUpdate(pos);
          resolve(getState());
        },
        err => {
          handlePositionError(err);
          resolve(getState());
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  }

  function getState() {
    return { ...state };
  }

  function subscribe(fn) {
    listeners.add(fn);
    fn(getState());
    return () => listeners.delete(fn);
  }

  return {
    startTracking,
    stopTracking,
    requestOneShot,
    getState,
    subscribe,
    getHaversineDistanceKm,
    findNearestStation
  };
})();

/**
 * Geolocation Hook / Service for mobile PWAs and responsive browsers
 * Native mobile permissions contract:
 * - Android: android.permission.ACCESS_FINE_LOCATION, android.permission.ACCESS_COARSE_LOCATION
 * - iOS: NSLocationWhenInUseUsageDescription
 * 
 * Supports browser HTML5 Geolocation API with graceful permission queries, mobile wrappers, and fallback
 * @param {Function} [callback] - Invoked on location change with state { latitude, longitude, accuracy, nearestStation, status, error }
 * @param {Object} [options] - Configuration { highAccuracy: true, watch: true, fallbackStation: 'DADAR' }
 * @returns {{ getState: Function, requestLocation: Function, unsubscribe: Function }}
 */
function useUserLocation(callback, options = {}) {
  let permissionStatus = 'prompt';
  if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
    try {
      navigator.permissions.query({ name: 'geolocation' }).then(result => {
        permissionStatus = result.state; // 'granted', 'prompt', 'denied'
        result.onchange = () => {
          permissionStatus = result.state;
          if (typeof callback === 'function') {
            callback(getStatusPayload());
          }
        };
      }).catch(() => {
        // Fallback for browsers not supporting geolocation permission query
      });
    } catch (e) {
      // Ignored in non-browser testing
    }
  }

  function getStatusPayload() {
    const s = GPSEngine.getState();
    const nearestSt = s.nearestStationId && typeof STATIONS_BY_ID !== 'undefined' 
      ? STATIONS_BY_ID[s.nearestStationId] 
      : null;
    return {
      hasLocation: s.hasLocation,
      isTracking: s.isTracking,
      latitude: s.latitude,
      longitude: s.longitude,
      accuracy: s.accuracy,
      speedKmh: s.speedKmh,
      context: s.context,
      nearestStationId: s.nearestStationId,
      nearestStation: nearestSt,
      nearestStationDistanceKm: s.nearestStationDistanceKm,
      corridorId: s.currentCorridorId,
      direction: s.direction,
      permissionStatus: s.hasLocation ? 'granted' : permissionStatus,
      error: s.error,
      timestamp: s.lastUpdated ? s.lastUpdated.getTime() : Date.now()
    };
  }

  let unsub = null;
  if (typeof callback === 'function') {
    unsub = GPSEngine.subscribe(() => {
      callback(getStatusPayload());
    });
  }

  if (options.watch !== false && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
    GPSEngine.startTracking();
  }

  return {
    getState: getStatusPayload,
    requestLocation: async () => {
      await GPSEngine.requestOneShot();
      return getStatusPayload();
    },
    unsubscribe: () => {
      if (typeof unsub === 'function') unsub();
    }
  };
}

if (typeof window !== 'undefined') {
  window.useUserLocation = useUserLocation;
  if (window.GPSEngine) window.GPSEngine.useUserLocation = useUserLocation;
}
if (typeof global !== 'undefined') {
  global.useUserLocation = useUserLocation;
}

