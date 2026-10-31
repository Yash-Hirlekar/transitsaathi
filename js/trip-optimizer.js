// Transit Saathi - Trip Optimiser & Live Re-Optimisation Engine
// Generates crowd-aware, ETA-constrained multi-modal suburban journeys with transfer buffers

const TripOptimizer = (function() {
  'use strict';

  const PREFERENCES = {
    BEST_OVERALL: 'BEST_OVERALL',
    FASTEST: 'FASTEST',
    LEAST_CROWDED: 'LEAST_CROWDED',
    FEWEST_INTERCHANGES: 'FEWEST_INTERCHANGES'
  };

  const BOARDING_BUFFER_MINUTES = 10; // Reach origin station 10 minutes before departure
  const MIN_TRANSFER_BUFFER_MINUTES = 5; // Minimum realistic FOB transfer time in Mumbai
  const RECOMMENDED_TRANSFER_BUFFER_MINUTES = 7; // Safe transfer buffer

  // Calculate crowd risk score: GREEN=1, YELLOW=2.5, RED=4.5
  function getCrowdWeight(densityCode) {
    if (densityCode === 'RED_CRUSH') return 4.5;
    if (densityCode === 'YELLOW_STAND') return 2.5;
    return 1.0;
  }

  // Optimize journey between origin and destination with ETA constraint
  function optimizeTrip(fromId, toId, arriveByTimeStr = null, preference = PREFERENCES.BEST_OVERALL) {
    if (!fromId || !toId || fromId === toId) {
      return { success: false, error: 'Invalid stations' };
    }

    const fromStation = STATIONS_BY_ID[fromId];
    const toStation = STATIONS_BY_ID[toId];
    if (!fromStation || !toStation) {
      return { success: false, error: 'Station not found' };
    }

    const currentMumbaiMinutes = TimetableEngine.getMumbaiCurrentMinutes();
    let arriveByMinutes = null;
    if (arriveByTimeStr) {
      arriveByMinutes = TimetableEngine.timeStrToMinutes(arriveByTimeStr);
      // If arrive by is earlier than current time today, treat as next day or invalid
      if (arriveByMinutes < currentMumbaiMinutes) {
        // Commuter wants arrive by tomorrow or later
      }
    }

    // 1. Check direct connection
    const directLine = TimetableEngine.findDirectLine(fromId, toId);
    const candidateRoutes = [];

    if (directLine) {
      // Direct corridor trains starting slightly in the past / current
      const searchStartMin = Math.max(0, currentMumbaiMinutes - 5);
      const trains = TimetableEngine.generateDirectTrains(fromId, toId, directLine, searchStartMin, 25);

      trains.forEach(t => {
        const depMin = t.rawDepartureMinutes;
        const arrMin = depMin + t.durationMinutes;

        // Skip trains that have already departed
        if (depMin < currentMumbaiMinutes) return;

        // Check ETA compliance
        const meetsEta = arriveByMinutes ? arrMin <= arriveByMinutes : true;
        const etaBufferMin = arriveByMinutes ? (arriveByMinutes - arrMin) : null;

        // Predict crowd for this leg
        const legDir = directLine.fromIdx < directLine.toIdx ? 'DOWN' : 'UP';
        const crowdPred = (typeof CrowdEngine !== 'undefined')
          ? CrowdEngine.calculateDeterministicPrediction(fromId, directLine.corridor, legDir, depMin)
          : { density: 'YELLOW_STAND', confidence: 0.8, trend: 'STABLE' };

        // Reach station time recommendation
        const reachStationMin = depMin - BOARDING_BUFFER_MINUTES;

        candidateRoutes.push({
          type: 'DIRECT',
          preferenceMatch: null,
          isDirect: true,
          interchangesCount: 0,
          fromStation,
          toStation,
          reachOriginTime: TimetableEngine.minutesToTimeStr(reachStationMin),
          reachOriginMinutes: reachStationMin,
          departureTime: t.departureTime,
          rawDepartureMinutes: depMin,
          arrivalTime: t.arrivalTime,
          rawArrivalMinutes: arrMin,
          totalDurationMinutes: t.durationMinutes,
          etaBufferMinutes: etaBufferMin,
          meetsEta: meetsEta,
          crowdRisk: crowdPred,
          legs: [
            {
              trainId: t.id,
              type: t.type,
              line: directLine.line,
              corridor: directLine.corridor,
              fromStation,
              toStation,
              departureTime: t.departureTime,
              arrivalTime: t.arrivalTime,
              platform: t.platform,
              destPlatform: t.destPlatform,
              durationMinutes: t.durationMinutes,
              crowdRisk: crowdPred
            }
          ]
        });
      });
    }

    // 2. Multi-hop Interchange journeys
    const INTERCHANGE_HUBS = [
      'DADAR', 'KURLA', 'THANE', 'KALYAN', 'VASHI', 'NERUL', 'PANVEL',
      'ANDHERI', 'BANDRA', 'VADALA_ROAD', 'DIVA_JN', 'VASAI_ROAD', 'SANPADA', 'JUINAGAR'
    ];

    for (const hubId of INTERCHANGE_HUBS) {
      if (hubId === fromId || hubId === toId) continue;

      const leg1Dir = TimetableEngine.findDirectLine(fromId, hubId);
      const leg2Dir = TimetableEngine.findDirectLine(hubId, toId);
      if (!leg1Dir || !leg2Dir) continue;

      const hubStation = STATIONS_BY_ID[hubId];
      const leg1Trains = TimetableEngine.generateDirectTrains(fromId, hubId, leg1Dir, currentMumbaiMinutes, 6);

      leg1Trains.forEach(t1 => {
        const t1Dep = t1.rawDepartureMinutes;
        const t1Arr = t1Dep + t1.durationMinutes;
        if (t1Dep < currentMumbaiMinutes) return;

        // Transfer planning
        const transferMin = RECOMMENDED_TRANSFER_BUFFER_MINUTES;
        const t2EarliestStart = t1Arr + transferMin;

        const leg2Trains = TimetableEngine.generateDirectTrains(hubId, toId, leg2Dir, t2EarliestStart, 4);
        if (!leg2Trains.length) return;

        const t2 = leg2Trains[0];
        const t2Dep = t2.rawDepartureMinutes;
        const actualTransferTime = t2Dep - t1Arr;

        // Classify connection
        let connectionStatus = 'SAFE';
        if (actualTransferTime < MIN_TRANSFER_BUFFER_MINUTES) {
          connectionStatus = 'MISSED';
        } else if (actualTransferTime <= MIN_TRANSFER_BUFFER_MINUTES + 2) {
          connectionStatus = 'TIGHT';
        }

        if (connectionStatus === 'MISSED') return; // Do not recommend impossible connection

        const t2Arr = t2Dep + t2.durationMinutes;
        const totalDuration = t2Arr - t1Dep;
        const meetsEta = arriveByMinutes ? t2Arr <= arriveByMinutes : true;
        const etaBufferMin = arriveByMinutes ? (arriveByMinutes - t2Arr) : null;

        // Reach station time recommendation
        const reachStationMin = t1Dep - BOARDING_BUFFER_MINUTES;
        const reachHubPlatformMin = t1Arr + 3; // 3 min walk across FOB

        // Crowd risk for each leg
        const t1DirStr = leg1Dir.fromIdx < leg1Dir.toIdx ? 'DOWN' : 'UP';
        const t2DirStr = leg2Dir.fromIdx < leg2Dir.toIdx ? 'DOWN' : 'UP';
        const pred1 = (typeof CrowdEngine !== 'undefined')
          ? CrowdEngine.calculateDeterministicPrediction(fromId, leg1Dir.corridor, t1DirStr, t1Dep)
          : { density: 'YELLOW_STAND', confidence: 0.8, trend: 'STABLE' };
        const pred2 = (typeof CrowdEngine !== 'undefined')
          ? CrowdEngine.calculateDeterministicPrediction(hubId, leg2Dir.corridor, t2DirStr, t2Dep)
          : { density: 'YELLOW_STAND', confidence: 0.8, trend: 'STABLE' };

        // Overall crowd risk is worst-case of the two
        const maxCrowdWeight = Math.max(getCrowdWeight(pred1.density), getCrowdWeight(pred2.density));
        const overallCrowd = maxCrowdWeight >= 4.0 ? pred1.density === 'RED_CRUSH' ? pred1 : pred2 : pred1;

        candidateRoutes.push({
          type: 'INTERCHANGE',
          preferenceMatch: null,
          isDirect: false,
          interchangesCount: 1,
          fromStation,
          toStation,
          hubStation,
          reachOriginTime: TimetableEngine.minutesToTimeStr(reachStationMin),
          reachOriginMinutes: reachStationMin,
          departureTime: t1.departureTime,
          rawDepartureMinutes: t1Dep,
          arrivalTime: t2.arrivalTime,
          rawArrivalMinutes: t2Arr,
          totalDurationMinutes: totalDuration,
          etaBufferMinutes: etaBufferMin,
          meetsEta: meetsEta,
          crowdRisk: overallCrowd,
          transfer: {
            hubId,
            hubName: hubStation.name,
            transferTimeMinutes: actualTransferTime,
            reachPlatformTime: TimetableEngine.minutesToTimeStr(reachHubPlatformMin),
            connectionStatus
          },
          legs: [
            {
              trainId: t1.id,
              type: t1.type,
              line: leg1Dir.line,
              corridor: leg1Dir.corridor,
              fromStation,
              toStation: hubStation,
              departureTime: t1.departureTime,
              arrivalTime: t1.arrivalTime,
              platform: t1.platform,
              destPlatform: t1.destPlatform,
              durationMinutes: t1.durationMinutes,
              crowdRisk: pred1
            },
            {
              trainId: t2.id,
              type: t2.type,
              line: leg2Dir.line,
              corridor: leg2Dir.corridor,
              fromStation: hubStation,
              toStation,
              departureTime: t2.departureTime,
              arrivalTime: t2.arrivalTime,
              platform: t2.platform,
              destPlatform: t2.destPlatform,
              durationMinutes: t2.durationMinutes,
              crowdRisk: pred2
            }
          ]
        });
      });
    }

    if (!candidateRoutes.length) {
      return {
        success: false,
        error: 'No available journeys found between ' + fromStation.name + ' and ' + toStation.name
      };
    }

    // Filter by ETA if requested
    let feasibleRoutes = candidateRoutes;
    let etaSatisfied = true;

    if (arriveByMinutes) {
      feasibleRoutes = candidateRoutes.filter(r => r.meetsEta);
      if (!feasibleRoutes.length) {
        etaSatisfied = false;
        // Fall back to earliest available routes (Section 28)
        feasibleRoutes = candidateRoutes;
      }
    }

    // Score and rank routes (Section 32)
    feasibleRoutes.forEach(r => {
      const travelScore = r.totalDurationMinutes;
      const crowdScore = getCrowdWeight(r.crowdRisk.density) * 15;
      const interchangePenalty = r.interchangesCount * 20;
      const tightTransferPenalty = (r.transfer && r.transfer.connectionStatus === 'TIGHT') ? 25 : 0;
      const etaBufferPenalty = (r.etaBufferMinutes !== null && r.etaBufferMinutes < 5) ? 15 : 0;

      r.score = travelScore + crowdScore + interchangePenalty + tightTransferPenalty + etaBufferPenalty;
    });

    // Sort by best score
    feasibleRoutes.sort((a, b) => a.score - b.score);

    // Pick 3 distinct options: Best Overall, Fastest, Least Crowded (Section 31)
    const bestOverall = feasibleRoutes[0];
    bestOverall.preferenceMatch = PREFERENCES.BEST_OVERALL;

    const fastestCandidates = [...feasibleRoutes].sort((a, b) => a.totalDurationMinutes - b.totalDurationMinutes);
    const fastest = fastestCandidates[0];
    if (fastest && fastest !== bestOverall) fastest.preferenceMatch = PREFERENCES.FASTEST;

    const leastCrowdedCandidates = [...feasibleRoutes].sort((a, b) => {
      const wA = getCrowdWeight(a.crowdRisk.density);
      const wB = getCrowdWeight(b.crowdRisk.density);
      if (wA !== wB) return wA - wB;
      return a.totalDurationMinutes - b.totalDurationMinutes;
    });
    const leastCrowded = leastCrowdedCandidates[0];
    if (leastCrowded && leastCrowded !== bestOverall && leastCrowded !== fastest) {
      leastCrowded.preferenceMatch = PREFERENCES.LEAST_CROWDED;
    }

    const uniqueAlternatives = [bestOverall];
    if (fastest && !uniqueAlternatives.includes(fastest)) uniqueAlternatives.push(fastest);
    if (leastCrowded && !uniqueAlternatives.includes(leastCrowded)) uniqueAlternatives.push(leastCrowded);

    return {
      success: true,
      fromStation,
      toStation,
      arriveByTimeStr,
      etaSatisfied,
      bestRoute: bestOverall,
      alternatives: uniqueAlternatives,
      allFeasibleRoutesCount: feasibleRoutes.length
    };
  }

  // Live Re-Optimisation from Current Location (Section 34)
  function reoptimizeCurrentJourney(currentTripState) {
    const gpsState = (typeof GPSEngine !== 'undefined') ? GPSEngine.getState() : {};
    const fromId = gpsState.nearestStationId || currentTripState.currentStationId || currentTripState.fromStation.id;
    const toId = currentTripState.toStation.id;
    const arriveByStr = currentTripState.arriveByTimeStr;

    return optimizeTrip(fromId, toId, arriveByStr, PREFERENCES.BEST_OVERALL);
  }

  return {
    PREFERENCES,
    optimizeTrip,
    reoptimizeCurrentJourney
  };
})();
