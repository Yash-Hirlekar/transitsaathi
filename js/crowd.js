// Transit Saathi - Crowd Intelligence & Prediction Engine
// Handles real-time commuter crowd reports, offline queue & sync, and multi-station crowd prediction

const CrowdEngine = (function() {
  'use strict';

  const DENSITY_ENUM = {
    GREEN: 'GREEN_SEATS',
    YELLOW: 'YELLOW_STAND',
    RED: 'RED_CRUSH'
  };

  const DENSITY_META = {
    GREEN_SEATS: {
      code: 'GREEN_SEATS',
      label: 'SEATS AVAILABLE',
      emoji: '🟢',
      color: '#10B981',
      bg: '#064E3B',
      textColor: '#6EE7B7'
    },
    YELLOW_STAND: {
      code: 'YELLOW_STAND',
      label: 'MOSTLY STANDING',
      emoji: '🟡',
      color: '#F59E0B',
      bg: '#451A03',
      textColor: '#FDE047'
    },
    RED_CRUSH: {
      code: 'RED_CRUSH',
      label: 'CRUSHED',
      emoji: '🔴',
      color: '#EF4444',
      bg: '#450A0A',
      textColor: '#FCA5A5'
    }
  };

  const STORAGE_KEYS = {
    REPORTS: 'ts_crowd_reports_v1',
    OFFLINE_QUEUE: 'ts_crowd_offline_queue_v1',
    PREDICTION_CACHE: 'ts_prediction_cache_v1'
  };

  const listeners = new Set();
  const predictionCache = new Map();

  // Load stored reports
  function getStoredReports() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.REPORTS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function saveStoredReports(reports) {
    try {
      // Retain reports within 24 hours (Section 13)
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      const filtered = reports.filter(r => r.timestamp > cutoff);
      localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(filtered.slice(-200)));
    } catch (e) {
      console.warn('Storage quota exceeded for crowd reports');
    }
  }

  function getOfflineQueue() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function saveOfflineQueue(queue) {
    try {
      localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
    } catch (e) {
      console.warn('Failed to save offline queue', e);
    }
  }

  // Create and submit a crowd report
  function submitReport(densityCode, overrideContext = {}) {
    if (!DENSITY_META[densityCode]) {
      console.error('Invalid density code:', densityCode);
      return null;
    }

    const gpsState = (typeof GPSEngine !== 'undefined') ? GPSEngine.getState() : {};

    const stationId = overrideContext.stationId || gpsState.nearestStationId || 'KURLA';
    const corridorId = overrideContext.corridorId || gpsState.currentCorridorId || 'central_main';
    const direction = overrideContext.direction || gpsState.direction || 'UNKNOWN';
    const speedKmh = gpsState.speedKmh || 0;
    const lat = overrideContext.lat || gpsState.latitude || 19.0657;
    const lon = overrideContext.lon || gpsState.longitude || 72.8794;

    const report = {
      _id: 'rep_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      timestamp: Date.now(),
      location: {
        type: 'Point',
        coordinates: [lon, lat]
      },
      speed_kmh: speedKmh,
      direction: direction,
      density: densityCode,
      stationId: stationId,
      corridorId: corridorId,
      context: gpsState.context || (speedKmh < 10 ? 'PLATFORM' : 'TRAIN'),
      is_synced: navigator.onLine
    };

    // Save to local reports
    const allReports = getStoredReports();
    allReports.unshift(report);
    saveStoredReports(allReports);

    if (!navigator.onLine) {
      // Queue offline
      const queue = getOfflineQueue();
      queue.push(report);
      saveOfflineQueue(queue);
    } else {
      // Attempt backend push (simulated or API endpoint)
      sendReportToBackend(report);
    }

    // Invalidate prediction cache for this station/corridor
    invalidateCache(corridorId, stationId);
    notifySubscribers();

    return report;
  }

  // Send report to serverless backend or Atlas
  async function sendReportToBackend(report) {
    try {
      if (typeof fetch !== 'undefined') {
        await fetch('/api/crowd-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(report)
        });
      }
    } catch (e) {
      // Offline fallback: queue if failed
      const queue = getOfflineQueue();
      if (!queue.some(r => r._id === report._id)) {
        report.is_synced = false;
        queue.push(report);
        saveOfflineQueue(queue);
      }
    }
  }

  // Sync offline queue when internet restores
  async function syncOfflineQueue() {
    if (!navigator.onLine) return { synced: 0, pending: getOfflineQueue().length };

    const queue = getOfflineQueue();
    if (!queue.length) return { synced: 0, pending: 0 };

    let syncedCount = 0;
    const remaining = [];

    for (const report of queue) {
      try {
        await sendReportToBackend(report);
        report.is_synced = true;
        syncedCount++;
      } catch (e) {
        remaining.push(report);
      }
    }

    saveOfflineQueue(remaining);
    notifySubscribers();
    return { synced: syncedCount, pending: remaining.length };
  }

  // Get recent reports for a station or corridor
  function getRecentReports(stationId, windowMinutes = 45) {
    const cutoff = Date.now() - windowMinutes * 60 * 1000;
    return getStoredReports().filter(r => r.stationId === stationId && r.timestamp >= cutoff);
  }

  // Invalidate cache
  function invalidateCache(corridorId, stationId) {
    for (const [key] of predictionCache.entries()) {
      if (key.includes(stationId) || key.includes(corridorId)) {
        predictionCache.delete(key);
      }
    }
  }

  // Deterministic Fallback Prediction Model (Section 21)
  function calculateDeterministicPrediction(stationId, corridorId, direction = 'DOWN', requestedMinutes = null) {
    const nowMin = requestedMinutes !== null ? requestedMinutes : ((typeof TimetableEngine !== 'undefined') ? TimetableEngine.getMumbaiCurrentMinutes() : 540);
    const station = (typeof STATIONS_BY_ID !== 'undefined') ? STATIONS_BY_ID[stationId] : null;

    // 1. Check live reports from last 45 minutes
    const recent = getRecentReports(stationId, 45);
    if (recent.length > 0) {
      let redCount = 0;
      let yellowCount = 0;
      let greenCount = 0;

      recent.forEach(r => {
        if (r.density === DENSITY_ENUM.RED) redCount += 2;
        else if (r.density === DENSITY_ENUM.YELLOW) yellowCount += 1.5;
        else greenCount += 1;
      });

      const totalWeight = redCount + yellowCount + greenCount;
      const redRatio = redCount / totalWeight;
      const yellowRatio = yellowCount / totalWeight;

      let density = DENSITY_ENUM.GREEN;
      let confidence = 0.82;
      let trend = 'STABLE';

      if (redRatio >= 0.45) {
        density = DENSITY_ENUM.RED;
        confidence = Math.min(0.95, 0.75 + redRatio * 0.2);
        trend = 'INCREASING';
      } else if (yellowRatio >= 0.40 || redRatio >= 0.25) {
        density = DENSITY_ENUM.YELLOW;
        confidence = 0.85;
        trend = 'STABLE';
      } else {
        density = DENSITY_ENUM.GREEN;
        confidence = 0.80;
        trend = 'DECREASING';
      }

      return {
        station: station ? station.name : stationId,
        stationId: stationId,
        density: density,
        confidence: Math.round(confidence * 100) / 100,
        trend: trend,
        isLiveBased: true
      };
    }

    // 2. Mumbai Suburban Railway Historical Commute Pattern
    // Morning Peak: 08:00 - 11:30 (Minutes 480 - 690)
    // Evening Peak: 17:00 - 20:45 (Minutes 1020 - 1245)
    // Afternoon Lull: 12:30 - 16:00 (Minutes 750 - 960)
    // Night: after 22:30

    const isMorningPeak = (nowMin >= 480 && nowMin <= 690);
    const isEveningPeak = (nowMin >= 1020 && nowMin <= 1245);
    const isLull = (nowMin >= 750 && nowMin <= 960) || nowMin >= 1350 || nowMin <= 360;

    // Major interchange multipliers
    const majorJunctions = ['DADAR', 'KURLA', 'THANE', 'ANDHERI', 'BORIVALI', 'GHATKOPAR', 'DOMBIVLI', 'KALYAN', 'CSMT', 'CHURCHGATE'];
    const isMajor = majorJunctions.includes(stationId);

    let density = DENSITY_ENUM.GREEN;
    let confidence = 0.75;
    let trend = 'STABLE';

    if (isMorningPeak) {
      if (direction === 'UP' || isMajor) {
        // Severe crush towards South Mumbai / business districts
        density = isMajor || ['DOMBIVLI', 'THANE', 'BORIVALI', 'KURLA', 'DADAR'].includes(stationId)
          ? DENSITY_ENUM.RED
          : DENSITY_ENUM.YELLOW;
        confidence = 0.88;
        trend = nowMin < 570 ? 'INCREASING' : 'STABLE';
      } else {
        density = DENSITY_ENUM.YELLOW;
        confidence = 0.78;
        trend = 'STABLE';
      }
    } else if (isEveningPeak) {
      if (direction === 'DOWN' || isMajor) {
        // Severe crush heading North / suburbs
        density = isMajor || ['DADAR', 'KURLA', 'GHATKOPAR', 'ANDHERI', 'THANE', 'BORIVALI'].includes(stationId)
          ? DENSITY_ENUM.RED
          : DENSITY_ENUM.YELLOW;
        confidence = 0.90;
        trend = nowMin < 1140 ? 'INCREASING' : 'DECREASING';
      } else {
        density = DENSITY_ENUM.YELLOW;
        confidence = 0.80;
        trend = 'STABLE';
      }
    } else if (isLull) {
      density = DENSITY_ENUM.GREEN;
      confidence = 0.85;
      trend = 'DECREASING';
    } else {
      // Normal daytime operations
      density = isMajor ? DENSITY_ENUM.YELLOW : DENSITY_ENUM.GREEN;
      confidence = 0.74;
      trend = 'STABLE';
    }

    return {
      station: station ? station.name : stationId,
      stationId: stationId,
      density: density,
      confidence: confidence,
      trend: trend,
      isLiveBased: false
    };
  }

  // Multi-Station Crowd Prediction (Section 17, 18, 20)
  // Predicts upcoming N stations on current train / corridor
  function predictUpcomingStations(currentStationId, corridorId, direction = 'DOWN', count = 4, baseTimeMinutes = null) {
    if (!currentStationId || !corridorId || typeof TimetableEngine === 'undefined') {
      return [];
    }

    const cacheKey = `${corridorId}_${currentStationId}_${direction}_${Math.floor((baseTimeMinutes || 0) / 10)}`;
    if (predictionCache.has(cacheKey)) {
      return predictionCache.get(cacheKey);
    }

    const corridorList = TimetableEngine.CORRIDORS[corridorId];
    if (!corridorList) return [];

    const currIdx = corridorList.indexOf(currentStationId);
    if (currIdx === -1) return [];

    const isDown = direction === 'DOWN';
    const step = isDown ? 1 : -1;
    const upcoming = [];

    let currentMin = baseTimeMinutes !== null ? baseTimeMinutes : TimetableEngine.getMumbaiCurrentMinutes();

    for (let i = 1; i <= count; i++) {
      const nextIdx = currIdx + (i * step);
      if (nextIdx < 0 || nextIdx >= corridorList.length) break;

      const stId = corridorList[nextIdx];
      currentMin += 3; // Approx 3 min per stop

      const pred = calculateDeterministicPrediction(stId, corridorId, direction, currentMin);
      upcoming.push(pred);
    }

    predictionCache.set(cacheKey, upcoming);
    return upcoming;
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function notifySubscribers() {
    listeners.forEach(fn => {
      try { fn(); } catch (e) { console.warn(e); }
    });
  }

  // Initialize network status listeners for automatic sync
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      syncOfflineQueue();
    });
  }

  // Submit location-gated real-time crowd report bound to a specific active train
  function submitTrainCrowdReport(trainId, densityCode, locationPayload = null) {
    if (!trainId) {
      console.error('Cannot report crowd: missing train_id');
      return null;
    }
    if (!DENSITY_META[densityCode]) {
      console.error('Invalid density code:', densityCode);
      return null;
    }

    const gpsState = locationPayload || ((typeof GPSEngine !== 'undefined') ? GPSEngine.getState() : {});
    const lat = gpsState.latitude != null ? gpsState.latitude : (gpsState.lat != null ? gpsState.lat : 19.0657);
    const lon = gpsState.longitude != null ? gpsState.longitude : (gpsState.lon != null ? gpsState.lon : 72.8794);
    const accuracy = gpsState.accuracy || null;
    const speedKmh = gpsState.speedKmh != null ? gpsState.speedKmh : 0;
    const stationId = gpsState.nearestStationId || 'KURLA';
    const corridorId = gpsState.currentCorridorId || 'central_main';
    const direction = gpsState.direction || 'UNKNOWN';

    const report = {
      _id: 'rep_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      train_id: trainId,
      density: densityCode,
      timestamp: Date.now(),
      location: {
        type: 'Point',
        coordinates: [lon, lat]
      },
      accuracy: accuracy,
      speed_kmh: speedKmh,
      direction: direction,
      stationId: stationId,
      corridorId: corridorId,
      context: 'TRAIN',
      is_synced: (typeof navigator !== 'undefined' ? navigator.onLine : true)
    };

    // Save locally
    const allReports = getStoredReports();
    allReports.unshift(report);
    saveStoredReports(allReports);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const queue = getOfflineQueue();
      queue.push(report);
      saveOfflineQueue(queue);
    } else {
      sendReportToBackend(report);
    }

    invalidateCache(corridorId, stationId);
    notifySubscribers();

    return report;
  }

  function getTrainCrowdReports(trainId) {
    if (!trainId) return [];
    return getStoredReports().filter(r => r.train_id === trainId);
  }

  function getLatestTrainCrowdReport(trainId) {
    const reports = getTrainCrowdReports(trainId);
    return reports.length ? reports[0] : null;
  }

  return {
    DENSITY_ENUM,
    DENSITY_META,
    submitReport,
    submitTrainCrowdReport,
    getTrainCrowdReports,
    getLatestTrainCrowdReport,
    syncOfflineQueue,
    getOfflineQueue,
    getStoredReports,
    getRecentReports,
    calculateDeterministicPrediction,
    predictUpcomingStations,
    subscribe
  };
})();
