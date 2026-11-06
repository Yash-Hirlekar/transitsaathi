// Transit Saathi - Automated Test Suite
// Verifies Network, Routing, ETA, Transfers, Crowd Prediction, GPS, and Section 55 Critical Test Cases

(function(root) {
  'use strict';

  function runTests() {
    const results = {
      total: 0,
      passed: 0,
      failed: 0,
      failures: []
    };

    function assert(desc, condition, details = '') {
      results.total++;
      if (condition) {
        results.passed++;
        console.log(`%c✓ PASS: ${desc}`, 'color: #10B981;');
      } else {
        results.failed++;
        results.failures.push({ desc, details });
        console.error(`✗ FAIL: ${desc} - ${details}`);
      }
    }

    console.group('%c=== Transit Saathi Engineering Verification Suite ===', 'color: #38BDF8; font-weight: bold; font-size: 14px;');

    // 1. Network Data Integrity
    assert('Master station dataset exists', typeof MUMBAI_STATIONS !== 'undefined' && MUMBAI_STATIONS.length >= 110, `Found: ${MUMBAI_STATIONS ? MUMBAI_STATIONS.length : 0}`);
    assert('STATIONS_BY_ID lookup index populated', typeof STATIONS_BY_ID !== 'undefined' && Object.keys(STATIONS_BY_ID).length >= 110);
    assert('Corridors count is at least 10', typeof TimetableEngine !== 'undefined' && Object.keys(TimetableEngine.CORRIDORS).length >= 10);

    const validation = typeof validateRailwayNetwork === 'function' ? validateRailwayNetwork(MUMBAI_STATIONS, TimetableEngine.CORRIDORS, STATIONS_BY_ID) : { valid: false };
    assert('Network validation function passes with 0 errors', validation.valid === true, JSON.stringify(validation.errors));

    // Intermediate stations check (Section 8)
    const requiredMinorStations = ['THAKURLI', 'KOPAR', 'DIVA_JN', 'NAHUR', 'VANGANI', 'SHELU', 'BHIVPURI_ROAD', 'PALASDHARI', 'KINGS_CIRCLE'];
    requiredMinorStations.forEach(stId => {
      assert(`Required intermediate station present: ${stId}`, STATIONS_BY_ID[stId] !== undefined);
    });

    // 2. Critical Test Cases (Section 55)
    const criticalCases = [
      { from: 'KURLA', to: 'BELAPUR_CBD', expected: 'DIRECT' },
      { from: 'DADAR', to: 'BORIVALI', expected: 'DIRECT' },
      { from: 'DOMBIVLI', to: 'CSMT', expected: 'DIRECT' },
      { from: 'THAKURLI', to: 'CHURCHGATE', expected: 'INTERCHANGE' },
      { from: 'VASHI', to: 'THANE', expected: 'DIRECT' },
      { from: 'NERUL', to: 'URAN', expected: 'DIRECT' },
      { from: 'PANVEL', to: 'ROHA', expected: 'DIRECT' },
      { from: 'VASAI_ROAD', to: 'DIVA_JN', expected: 'DIRECT' },
      { from: 'KALYAN', to: 'KASARA', expected: 'DIRECT' },
      { from: 'KALYAN', to: 'KHOPOLI', expected: 'DIRECT' }
    ];

    criticalCases.forEach(tc => {
      const journey = TimetableEngine.findTrains(tc.from, tc.to, '08:00 AM');
      assert(`Critical Journey: ${tc.from} -> ${tc.to} [${tc.expected}]`, journey.type === tc.expected, `Got: ${journey.type} (${journey.message || ''})`);
    });

    // 3. Trip Optimiser Multi-Route Evaluation (Section 23, 28, 31)
    if (typeof TripOptimizer !== 'undefined') {
      const optResult = TripOptimizer.optimizeTrip('KURLA', 'BELAPUR_CBD', '09:30 AM');
      assert('Trip Optimizer finds routes Kurla -> Belapur', optResult.success === true && optResult.bestRoute !== null);
      assert('Trip Optimizer includes alternatives', optResult.alternatives && optResult.alternatives.length >= 1);
      assert('Trip Optimizer provides reach origin station recommendation', optResult.bestRoute && optResult.bestRoute.reachOriginTime !== undefined);
      assert('Trip Optimizer satisfies ETA buffer calculation', optResult.bestRoute && typeof optResult.bestRoute.etaBufferMinutes === 'number');

      // Test impossible ETA fallback (Section 28)
      // Pass an ETA that is strictly earlier than any train could possibly arrive from now
      const currentMin = TimetableEngine.getMumbaiCurrentMinutes();
      const pastEtaStr = TimetableEngine.minutesToTimeStr(Math.max(0, currentMin - 30));
      const impossibleEta = TripOptimizer.optimizeTrip('KURLA', 'BELAPUR_CBD', pastEtaStr);
      assert('Trip Optimizer falls back to earliest available on impossible ETA', impossibleEta.success === true && impossibleEta.etaSatisfied === false);
    }

    // 4. Crowd Reporting and Prediction Engine (Section 11, 13, 20)
    if (typeof CrowdEngine !== 'undefined') {
      assert('Crowd density enum conforms to specification',
        CrowdEngine.DENSITY_ENUM.GREEN === 'GREEN_SEATS' &&
        CrowdEngine.DENSITY_ENUM.YELLOW === 'YELLOW_STAND' &&
        CrowdEngine.DENSITY_ENUM.RED === 'RED_CRUSH'
      );

      const testReport = CrowdEngine.submitReport('YELLOW_STAND', { stationId: 'DADAR', corridorId: 'central_main' });
      assert('Crowd report generated with valid schema', testReport && testReport.density === 'YELLOW_STAND' && testReport._id !== undefined);

      const prediction = CrowdEngine.calculateDeterministicPrediction('DADAR', 'central_main', 'UP', 540);
      assert('Crowd prediction produces valid confidence and trend', prediction && prediction.confidence >= 0 && prediction.confidence <= 1 && ['INCREASING', 'STABLE', 'DECREASING'].includes(prediction.trend));

      const upcomingPreds = CrowdEngine.predictUpcomingStations('CSMT', 'central_main', 'DOWN', 4, 540);
      assert('Upcoming stations prediction returns array of 4 forecasts', Array.isArray(upcomingPreds) && upcomingPreds.length === 4);
    }

    // 5. GPS Awareness (Section 14, 15)
    if (typeof GPSEngine !== 'undefined') {
      const dist = GPSEngine.getHaversineDistanceKm(18.9322, 72.8264, 19.0178, 72.8478); // Churchgate to Dadar
      assert('Haversine distance calculation is accurate (approx 9-11 km)', dist >= 9 && dist <= 11, `Got: ${dist}`);

      const nearestDadar = GPSEngine.findNearestStation(19.0180, 72.8470);
      assert('Nearest station matching identifies Dadar', nearestDadar && nearestDadar.station.id === 'DADAR');
    }

    // 6. Geolocation Hook (useUserLocation)
    if (typeof useUserLocation === 'function') {
      const hookInstance = useUserLocation();
      assert('useUserLocation hook returns expected interface',
        typeof hookInstance.getState === 'function' &&
        typeof hookInstance.requestLocation === 'function' &&
        typeof hookInstance.unsubscribe === 'function'
      );
      const hookState = hookInstance.getState();
      assert('useUserLocation state contains permission and location status',
        hookState && typeof hookState.permissionStatus === 'string' && typeof hookState.hasLocation === 'boolean'
      );
      hookInstance.unsubscribe();
    }

    // 7. Location-Gated Train Crowding Workflow
    if (typeof CrowdEngine !== 'undefined' && typeof CrowdEngine.submitTrainCrowdReport === 'function') {
      const trainReport = CrowdEngine.submitTrainCrowdReport('WR-9021', 'GREEN_SEATS', {
        latitude: 19.0180,
        longitude: 72.8470,
        accuracy: 10,
        speedKmh: 45,
        nearestStationId: 'DADAR'
      });
      assert('submitTrainCrowdReport binds train_id, density and GPS coordinates',
        trainReport &&
        trainReport.train_id === 'WR-9021' &&
        trainReport.density === 'GREEN_SEATS' &&
        trainReport.location &&
        trainReport.location.coordinates[0] === 72.8470 &&
        trainReport.context === 'TRAIN'
      );

      const retrievedReports = CrowdEngine.getTrainCrowdReports('WR-9021');
      assert('getTrainCrowdReports filters by train_id', Array.isArray(retrievedReports) && retrievedReports.length >= 1);
    }

    // 8. Line Isolation Queries (WR, CR, HR, TH)
    if (typeof TimetableEngine !== 'undefined' && typeof TimetableEngine.getLineIsolatedTrains === 'function') {
      const wrTrains = TimetableEngine.getLineIsolatedTrains('western');
      const crTrains = TimetableEngine.getLineIsolatedTrains('central');
      const hrTrains = TimetableEngine.getLineIsolatedTrains('harbour');
      const thTrains = TimetableEngine.getLineIsolatedTrains('transharbour');

      assert('Line isolation WR returns non-empty train list', Array.isArray(wrTrains) && wrTrains.length > 0 && wrTrains.every(t => t.line === 'western'));
      assert('Line isolation CR returns non-empty train list', Array.isArray(crTrains) && crTrains.length > 0 && crTrains.every(t => t.line === 'central'));
      assert('Line isolation HR returns non-empty train list', Array.isArray(hrTrains) && hrTrains.length > 0 && hrTrains.every(t => t.line === 'harbour'));
      assert('Line isolation TH returns non-empty train list', Array.isArray(thTrains) && thTrains.length > 0 && thTrains.every(t => t.line === 'transharbour'));
    }

    // 9. Outer Suburban Branch Station Completeness
    const dahanuBranchStations = ['VAITARNA', 'SAPHALE', 'KELVE_ROAD', 'PALGHAR', 'UMROLI', 'BOISAR', 'VANGAON', 'DAHANU_ROAD'];
    dahanuBranchStations.forEach(stId => {
      assert(`Dahanu Branch station present in master dataset: ${stId}`, STATIONS_BY_ID[stId] !== undefined);
      assert(`Dahanu Branch station present in Western corridor: ${stId}`, TimetableEngine.CORRIDORS.western.includes(stId));
    });

    const kasaraBranchStations = ['SHAHAD', 'AMBIVLI', 'TITWALA', 'KHADAVLI', 'VASIND', 'ASANGAON', 'ATGAON', 'THANSIT', 'KHARDI', 'UMBERMALI', 'KASARA'];
    kasaraBranchStations.forEach(stId => {
      assert(`Kasara Branch station present: ${stId}`, STATIONS_BY_ID[stId] !== undefined);
    });

    const khopoliBranchStations = ['VITHALWADI', 'ULHASNAGAR', 'AMBERNATH', 'BADLAPUR', 'VANGANI', 'SHELU', 'NERAL', 'BHIVPURI_ROAD', 'KARJAT', 'PALASDHARI', 'KELAVLI', 'DOLAVLI', 'LOWJEE', 'KHOPOLI'];
    khopoliBranchStations.forEach(stId => {
      assert(`Khopoli Branch station present: ${stId}`, STATIONS_BY_ID[stId] !== undefined);
    });

    // 10. SOS Emergency Engine & Relative Location Share
    if (typeof SOSEngine !== 'undefined') {
      const payload = SOSEngine.createEmergencyPayload();
      assert('SOS emergency payload conforms to 2dsphere schema', payload && payload.location && payload.location.type === 'Point' && Array.isArray(payload.location.coordinates));
      assert('SOS payload contains trajectory GeoJSON', payload.trajectoryGeoJSON && payload.trajectoryGeoJSON.type === 'LineString');

      // Trusted Contact save and retrieve
      SOSEngine.saveEmergencyContact({ name: 'Family', phone: '9876543210' });
      const savedContact = SOSEngine.getEmergencyContact();
      assert('Trusted contact stores and retrieves name and phone', savedContact && savedContact.name === 'Family' && savedContact.phone === '9876543210');

      // Authority SOS dispatch
      const dispatchResult = SOSEngine.dispatchAuthoritySOS('RPF_182');
      assert('Authority dispatch formats payload with targeted helpline',
        dispatchResult &&
        dispatchResult.authority.number === '182' &&
        dispatchResult.payload.authority === 'RPF_182' &&
        dispatchResult.telUri === 'tel:182'
      );

      // Relative location sharing links
      const shareLinks = SOSEngine.generateLocationShareLinks();
      assert('Relative location sharing generates Google Maps URL and messaging links',
        shareLinks &&
        shareLinks.mapsUrl.startsWith('https://maps.google.com/?q=') &&
        shareLinks.whatsappUrl.includes('wa.me') &&
        shareLinks.smsUrl.startsWith('sms:9876543210?body=')
      );
    }

    console.groupEnd();
    console.log(`%cVerification Complete: ${results.passed}/${results.total} PASSED (${results.failed} failed)`, results.failed === 0 ? 'color: #10B981; font-weight: bold; font-size: 13px;' : 'color: #EF4444; font-weight: bold; font-size: 13px;');

    return results;
  }

  root.TransitSaathiTests = { runTests };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runTests };
  }
})(typeof window !== 'undefined' ? window : global);
