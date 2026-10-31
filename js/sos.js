// Transit Saathi - Predictive SOS & Emergency Location Engine
// Handles Slide-To-SOS, 3-second countdown abort, emergency calling (112), and live trajectory logging

const SOSEngine = (function() {
  'use strict';

  const STORAGE_KEY = 'ts_emergency_sessions_v1';
  let cancelTimer = null;
  let remainingSeconds = 3;
  let activeSessionId = null;
  const listeners = new Set();

  function generateSessionId() {
    return 'sos_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  }

  function getStoredSessions() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function saveStoredSessions(sessions) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(-20)));
    } catch (e) {
      console.warn('Storage failed for SOS sessions', e);
    }
  }

  // Predict next probable station along corridor
  function predictNextStation(currentStationId, corridorId, direction) {
    if (!currentStationId || !corridorId || typeof TimetableEngine === 'undefined') return null;

    const corridorList = TimetableEngine.CORRIDORS[corridorId];
    if (!corridorList) return null;

    const currIdx = corridorList.indexOf(currentStationId);
    if (currIdx === -1) return null;

    const nextIdx = direction === 'DOWN' ? currIdx + 1 : currIdx - 1;
    if (nextIdx >= 0 && nextIdx < corridorList.length) {
      const nextId = corridorList[nextIdx];
      return (typeof STATIONS_BY_ID !== 'undefined') ? STATIONS_BY_ID[nextId] : null;
    }
    return null;
  }

  // Create emergency context payload
  function createEmergencyPayload() {
    const gps = (typeof GPSEngine !== 'undefined') ? GPSEngine.getState() : {};
    const stationId = gps.nearestStationId || 'UNKNOWN';
    const corridorId = gps.currentCorridorId || 'UNKNOWN';
    const direction = gps.direction || 'UNKNOWN';
    const nextSt = predictNextStation(stationId, corridorId, direction);

    return {
      _id: activeSessionId || generateSessionId(),
      timestamp: Date.now(),
      user_session: activeSessionId,
      location: {
        type: 'Point',
        coordinates: [gps.longitude || 72.8794, gps.latitude || 19.0657]
      },
      accuracy: gps.accuracy || null,
      speed_kmh: gps.speedKmh || 0,
      heading: gps.heading || null,
      nearestStationId: stationId,
      corridorId: corridorId,
      direction: direction,
      predictedNextStation: nextSt ? { id: nextSt.id, name: nextSt.name } : null,
      trajectoryGeoJSON: {
        type: 'LineString',
        coordinates: (gps.trajectory || []).map(p => [p.lon, p.lat])
      },
      resolved: false
    };
  }

  // Trigger Slide-To-SOS confirmation sequence (3-second cancel countdown)
  function startSOSSequence(onTick, onConfirm, onAbort) {
    if (cancelTimer !== null) return; // Sequence already in progress

    activeSessionId = generateSessionId();
    remainingSeconds = 3;

    if (typeof onTick === 'function') onTick(remainingSeconds);

    cancelTimer = setInterval(() => {
      remainingSeconds--;
      if (remainingSeconds > 0) {
        if (typeof onTick === 'function') onTick(remainingSeconds);
      } else {
        clearInterval(cancelTimer);
        cancelTimer = null;

        // Confirmed emergency trigger
        const payload = createEmergencyPayload();
        const stored = getStoredSessions();
        stored.push(payload);
        saveStoredSessions(stored);

        // Attempt push to backend
        if (typeof fetch !== 'undefined') {
          fetch('/api/emergency', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }).catch(e => console.warn('Emergency backend dispatch offline', e));
        }

        if (typeof onConfirm === 'function') onConfirm(payload);

        // Dial 112 National Emergency Helpline (Section 36)
        if (typeof window !== 'undefined') {
          window.location.href = 'tel:112';
        }
      }
    }, 1000);
  }

  // Cancel / Abort the countdown
  function abortSOSSequence(onAbort) {
    if (cancelTimer !== null) {
      clearInterval(cancelTimer);
      cancelTimer = null;
      remainingSeconds = 3;
      if (typeof onAbort === 'function') onAbort();
      return true;
    }
    return false;
  }

  function isSequenceActive() {
    return cancelTimer !== null;
  }

  return {
    startSOSSequence,
    abortSOSSequence,
    isSequenceActive,
    createEmergencyPayload,
    getStoredSessions
  };
})();
