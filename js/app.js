// Transit Saathi - Main Application Controller
// Commuter-first Mumbai Suburban Rail Companion

(function() {
  'use strict';

  // Application State
  const AppState = {
    fromStationId: 'KURLA',
    toStationId: 'DADAR',
    timeOffset: 0,
    currentSpeedFilter: 'ALL',
    currentLineFilter: 'ALL',
    activeView: 'homeView',
    activePickerTarget: 'from',
    currentStationViewId: 'KURLA',
    selectedTrain: null,
    deferredInstallPrompt: null,
    favourites: {
      routes: [
        { id: 'r1', fromId: 'KURLA', toId: 'DADAR', label: 'Office / Central' },
        { id: 'r2', fromId: 'DADAR', toId: 'KURLA', label: 'Evening Return' },
        { id: 'r3', fromId: 'THANE', toId: 'CSMT', label: 'Fast Commute' },
        { id: 'r4', fromId: 'BORIVALI', toId: 'CHURCHGATE', label: 'Western Fast' }
      ],
      stations: ['KURLA', 'DADAR', 'THANE', 'ANDHERI', 'BORIVALI', 'CSMT']
    },
    recentStations: ['KURLA', 'DADAR', 'ANDHERI', 'THANE', 'CSMT', 'BORIVALI']
  };

  // Popular commute shortcuts for home screen
  const POPULAR_COMMUTES = [
    { fromId: 'KURLA', toId: 'DADAR', tag: 'Central Fast/Slow' },
    { fromId: 'DADAR', toId: 'CHURCHGATE', tag: 'Western Line' },
    { fromId: 'THANE', toId: 'CSMT', tag: 'Fast Corridor' },
    { fromId: 'BORIVALI', toId: 'ANDHERI', tag: 'Western Fast' },
    { fromId: 'CSMT', toId: 'PANVEL', tag: 'Harbour Line' },
    { fromId: 'THANE', toId: 'VASHI', tag: 'Trans-Harbour' }
  ];

  // Initialize Application
  function init() {
    loadStoredData();
    setupLiveClock();
    setupOfflineAndPwa();
    setupNavigation();
    setupHomeView();
    setupStationPicker();
    setupTrainResultsView();
    setupTrainDetailModal();
    setupStationView();
    setupFavouritesView();
    setupMoreView();
    setupSchematicMap();

    updateHomeStationDisplays();
    renderPopularCommutes();
  }

  // Load / Save persistent user data in LocalStorage
  function loadStoredData() {
    try {
      const savedFavs = localStorage.getItem('transit_saathi_favs');
      if (savedFavs) {
        AppState.favourites = JSON.parse(savedFavs);
      }
      const savedRecents = localStorage.getItem('transit_saathi_recents');
      if (savedRecents) {
        AppState.recentStations = JSON.parse(savedRecents);
      }
    } catch (e) {
      console.warn('Storage not available', e);
    }
  }

  function saveStoredData() {
    try {
      localStorage.setItem('transit_saathi_favs', JSON.stringify(AppState.favourites));
      localStorage.setItem('transit_saathi_recents', JSON.stringify(AppState.recentStations));
    } catch (e) {
      console.warn('Error saving to storage', e);
    }
  }

  function addRecentStation(stId) {
    if (!stId) return;
    AppState.recentStations = AppState.recentStations.filter(id => id !== stId);
    AppState.recentStations.unshift(stId);
    if (AppState.recentStations.length > 8) {
      AppState.recentStations.pop();
    }
    saveStoredData();
  }

  // Live Mumbai Time Clock
  function setupLiveClock() {
    const clockEl = document.getElementById('clockTime');
    function updateTime() {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      const minStr = minutes < 10 ? '0' + minutes : minutes;
      const hoursStr = hours < 10 ? '0' + hours : hours;
      if (clockEl) {
        clockEl.textContent = `${hoursStr}:${minStr} ${ampm}`;
      }
    }
    updateTime();
    setInterval(updateTime, 1000);
  }

  // Offline / PWA Service Worker Setup
  function setupOfflineAndPwa() {
    const offlineBanner = document.getElementById('offlineBanner');

    function updateOnlineStatus() {
      if (!navigator.onLine) {
        if (offlineBanner) offlineBanner.style.display = 'flex';
      } else {
        if (offlineBanner) offlineBanner.style.display = 'none';
      }
    }

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

    // Service Worker Registration
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => console.log('Transit Saathi Service Worker registered:', reg.scope))
          .catch(err => console.log('Service Worker registration skipped:', err));
      });
    }

    // PWA Install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      AppState.deferredInstallPrompt = e;
      const pwaRow = document.getElementById('pwaInstallRow');
      if (pwaRow) pwaRow.style.display = 'flex';
    });

    document.getElementById('btnInstallPwa')?.addEventListener('click', () => {
      if (AppState.deferredInstallPrompt) {
        AppState.deferredInstallPrompt.prompt();
        AppState.deferredInstallPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User installed Transit Saathi');
          }
          AppState.deferredInstallPrompt = null;
        });
      } else {
        alert('Transit Saathi is ready to install! On iOS, tap "Share" > "Add to Home Screen". On Chrome/Edge, click the install icon in the URL bar.');
      }
    });
  }

  // Navigation Controller
  function switchView(viewId) {
    AppState.activeView = viewId;
    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.classList.remove('active');
    });
    const target = document.getElementById(viewId);
    if (target) {
      target.classList.add('active');
      document.getElementById('mainContainer')?.scrollTo(0, 0);
    }

    // Update bottom nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.getAttribute('data-target') === viewId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    if (viewId === 'trainsView') {
      const fromSt = STATIONS_BY_ID[AppState.fromStationId];
      const toSt = STATIONS_BY_ID[AppState.toStationId];
      const fromTitle = document.getElementById('resultsFromTitle');
      const toTitle = document.getElementById('resultsToTitle');
      if (fromTitle) fromTitle.textContent = fromSt ? fromSt.name : AppState.fromStationId;
      if (toTitle) toTitle.textContent = toSt ? toSt.name : AppState.toStationId;
      loadAndRenderTrainResults();
    } else if (viewId === 'mapView') {
      setTimeout(() => {
        SchematicMap.highlightRoute(AppState.fromStationId, AppState.toStationId);
      }, 50);
    } else if (viewId === 'favouritesView') {
      renderFavouritesView();
    }
  }

  function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetView = btn.getAttribute('data-target');
        if (targetView) switchView(targetView);
      });
    });

    document.getElementById('brandHeaderBtn')?.addEventListener('click', () => {
      switchView('homeView');
    });

    document.getElementById('headerInfoBtn')?.addEventListener('click', () => {
      switchView('moreView');
    });

    // Close any modal when clicking backdrop
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('active');
        }
      });
    });

    // Escape key closes modals
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
      }
    });
  }

  // Home View Setup
  function updateHomeStationDisplays() {
    const fromData = STATIONS_BY_ID[AppState.fromStationId];
    const toData = STATIONS_BY_ID[AppState.toStationId];

    const fromDisplay = document.getElementById('fromStationName');
    const toDisplay = document.getElementById('toStationName');

    if (fromDisplay) fromDisplay.textContent = fromData ? fromData.name : 'Select station';
    if (toDisplay) toDisplay.textContent = toData ? toData.name : 'Select station';
  }

  function setupHomeView() {
    // Open Picker for FROM
    document.getElementById('fromStationBtn')?.addEventListener('click', () => {
      openStationPicker('from');
    });

    // Open Picker for TO
    document.getElementById('toStationBtn')?.addEventListener('click', () => {
      openStationPicker('to');
    });

    // Swap Stations
    document.getElementById('swapStationsBtn')?.addEventListener('click', () => {
      const temp = AppState.fromStationId;
      AppState.fromStationId = AppState.toStationId;
      AppState.toStationId = temp;
      updateHomeStationDisplays();
    });

    // Time offset chips
    document.querySelectorAll('.time-chip[data-offset]').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.time-chip[data-offset]').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        AppState.timeOffset = parseInt(chip.getAttribute('data-offset'), 10) || 0;
      });
    });

    // Dominant Find Trains Button
    document.getElementById('btnFindTrains')?.addEventListener('click', () => {
      executeJourneySearch();
    });

    // Quick Actions
    document.getElementById('qaNextTrain')?.addEventListener('click', () => {
      executeJourneySearch();
    });

    document.getElementById('qaRouteMap')?.addEventListener('click', () => {
      switchView('mapView');
    });

    document.getElementById('qaFavourites')?.addEventListener('click', () => {
      switchView('favouritesView');
    });

    document.getElementById('qaNearby')?.addEventListener('click', () => {
      findNearbyStation();
    });
  }

  // Render Popular Commutes in Home
  function renderPopularCommutes() {
    const listEl = document.getElementById('popularCommuteList');
    if (!listEl) return;

    listEl.innerHTML = POPULAR_COMMUTES.map(c => {
      const fromSt = STATIONS_BY_ID[c.fromId];
      const toSt = STATIONS_BY_ID[c.toId];
      return `
        <div class="commute-quick-card" data-from="${c.fromId}" data-to="${c.toId}">
          <div class="cqc-route">
            <span>${fromSt ? fromSt.name : c.fromId}</span>
            <span class="cqc-arrow">→</span>
            <span>${toSt ? toSt.name : c.toId}</span>
            <span class="cqc-tag">${c.tag}</span>
          </div>
          <span class="cqc-action-link">VIEW</span>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.commute-quick-card').forEach(card => {
      card.addEventListener('click', () => {
        AppState.fromStationId = card.getAttribute('data-from');
        AppState.toStationId = card.getAttribute('data-to');
        updateHomeStationDisplays();
        executeJourneySearch();
      });
    });
  }

  // Geolocation Nearby Station
  function findNearbyStation() {
    if (!navigator.geolocation) {
      alert('Location services not available on your device. Selecting Dadar Junction.');
      setJourneyStation('from', 'DADAR');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLon = pos.coords.longitude;

        let closestStation = null;
        let minDistance = Infinity;

        MUMBAI_STATIONS.forEach(st => {
          if (st.lat && st.lon) {
            const d = Math.hypot(st.lat - userLat, st.lon - userLon);
            if (d < minDistance) {
              minDistance = d;
              closestStation = st;
            }
          }
        });

        if (closestStation) {
          AppState.fromStationId = closestStation.id;
          updateHomeStationDisplays();
          alert(`Nearest station detected: ${closestStation.name} (${closestStation.code})! Set as FROM station.`);
        }
      },
      (err) => {
        console.warn('Geolocation error or denied:', err);
        // Default to a major hub
        alert('Could not detect GPS location. Defaulting to Dadar Central/Western.');
        AppState.fromStationId = 'DADAR';
        updateHomeStationDisplays();
      },
      { timeout: 6000 }
    );
  }

  // Station Picker Modal
  function openStationPicker(target) {
    AppState.activePickerTarget = target;
    const modal = document.getElementById('stationPickerModal');
    const searchInput = document.getElementById('stationSearchInput');
    if (!modal) return;

    modal.classList.add('active');
    if (searchInput) {
      searchInput.value = '';
      searchInput.focus();
    }
    renderStationPickerResults('');
  }

  function closeStationPicker() {
    document.getElementById('stationPickerModal')?.classList.remove('active');
  }

  function setupStationPicker() {
    const searchInput = document.getElementById('stationSearchInput');
    const closeBtn = document.getElementById('closePickerBtn');
    const lineTabs = document.querySelectorAll('#pickerLineTabs .line-tab-chip');

    closeBtn?.addEventListener('click', closeStationPicker);

    searchInput?.addEventListener('input', (e) => {
      renderStationPickerResults(e.target.value);
    });

    lineTabs.forEach(chip => {
      chip.addEventListener('click', () => {
        lineTabs.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        renderStationPickerResults(searchInput?.value || '', chip.getAttribute('data-line'));
      });
    });
  }

  function renderStationPickerResults(query = '', lineFilter = 'ALL') {
    const listEl = document.getElementById('pickerResultsList');
    if (!listEl) return;

    const trimmed = query.trim().toLowerCase();
    let stations = MUMBAI_STATIONS;

    if (lineFilter !== 'ALL') {
      stations = stations.filter(s => s.lines.includes(lineFilter));
    }

    if (trimmed) {
      stations = stations.filter(s => {
        const matchName = s.name.toLowerCase().includes(trimmed);
        const matchCode = s.code.toLowerCase().includes(trimmed);
        const matchAliases = s.aliases.some(a => a.toLowerCase().includes(trimmed));
        return matchName || matchCode || matchAliases;
      });

      listEl.innerHTML = `
        <div class="picker-group-title">Search Results (${stations.length})</div>
        ${stations.map(renderPickerStationItem).join('')}
      `;
    } else {
      // Show Recents & Popular
      const recentStationsData = AppState.recentStations
        .map(id => STATIONS_BY_ID[id])
        .filter(Boolean);

      const popularStationsData = MUMBAI_STATIONS.filter(s => s.popular);

      listEl.innerHTML = `
        ${recentStationsData.length ? `
          <div class="picker-group-title">Recent Stations</div>
          ${recentStationsData.map(renderPickerStationItem).join('')}
        ` : ''}

        <div class="picker-group-title">Popular Hubs & Junctions</div>
        ${popularStationsData.map(renderPickerStationItem).join('')}

        <div class="picker-group-title">All Stations (${stations.length})</div>
        ${stations.map(renderPickerStationItem).join('')}
      `;
    }

    // Attach click handlers
    listEl.querySelectorAll('.picker-station-item').forEach(item => {
      item.addEventListener('click', () => {
        const stId = item.getAttribute('data-station-id');
        selectStationFromPicker(stId);
      });
    });
  }

  function renderPickerStationItem(station) {
    const lineBadges = station.lines.map(l => `
      <span class="line-badge badge-${l}">${MUMBAI_RAIL_LINES[l].shortName}</span>
    `).join(' ');

    return `
      <div class="picker-station-item" data-station-id="${station.id}">
        <div class="psi-left">
          <span class="psi-name">${station.name}</span>
          <span class="psi-alias">${station.aliases.slice(0, 2).join(' · ')}</span>
        </div>
        <div class="psi-right">
          ${lineBadges}
          <span class="psi-code">${station.code}</span>
        </div>
      </div>
    `;
  }

  function selectStationFromPicker(stationId) {
    if (!stationId) return;

    if (AppState.activePickerTarget === 'from') {
      AppState.fromStationId = stationId;
    } else {
      AppState.toStationId = stationId;
    }

    addRecentStation(stationId);
    updateHomeStationDisplays();
    closeStationPicker();
  }

  // Public method so other modules (e.g. Map) can set journey stations
  function setJourneyStation(target, stationId) {
    if (target === 'from') {
      AppState.fromStationId = stationId;
    } else {
      AppState.toStationId = stationId;
    }
    addRecentStation(stationId);
    updateHomeStationDisplays();
    switchView('homeView');
  }

  // Execute Journey Search
  function executeJourneySearch() {
    if (AppState.fromStationId === AppState.toStationId) {
      alert('FROM and TO stations cannot be identical. Please pick distinct Mumbai local stations.');
      return;
    }

    addRecentStation(AppState.fromStationId);
    addRecentStation(AppState.toStationId);

    const fromSt = STATIONS_BY_ID[AppState.fromStationId];
    const toSt = STATIONS_BY_ID[AppState.toStationId];

    document.getElementById('resultsFromTitle').textContent = fromSt ? fromSt.name : AppState.fromStationId;
    document.getElementById('resultsToTitle').textContent = toSt ? toSt.name : AppState.toStationId;

    switchView('trainsView');
    loadAndRenderTrainResults();
  }

  // Train Results View
  function setupTrainResultsView() {
    document.getElementById('resultsBackBtn')?.addEventListener('click', () => {
      switchView('homeView');
    });

    document.getElementById('resultsSwapBtn')?.addEventListener('click', () => {
      const temp = AppState.fromStationId;
      AppState.fromStationId = AppState.toStationId;
      AppState.toStationId = temp;
      updateHomeStationDisplays();
      executeJourneySearch();
    });

    // Speed filters (ALL, FAST, SLOW)
    document.querySelectorAll('#speedFilterGroup .filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#speedFilterGroup .filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        AppState.currentSpeedFilter = btn.getAttribute('data-speed');
        filterRenderedTrains();
      });
    });

    // Line filters
    document.querySelectorAll('#lineFilterGroup .filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#lineFilterGroup .filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        AppState.currentLineFilter = btn.getAttribute('data-line');
        filterRenderedTrains();
      });
    });
  }

  let currentLoadedJourneyResult = null;

  function loadAndRenderTrainResults() {
    const container = document.getElementById('trainResultsContainer');
    if (!container) return;

    container.innerHTML = '<div style="padding: 24px; text-align: center; color: var(--text-secondary);">Calculating fastest suburban routes...</div>';

    const nowMin = TimetableEngine.getMumbaiCurrentMinutes() + AppState.timeOffset;
    const reqTimeStr = TimetableEngine.minutesToTimeStr(nowMin);

    const result = TimetableEngine.findTrains(AppState.fromStationId, AppState.toStationId, reqTimeStr);
    currentLoadedJourneyResult = result;

    if (result.type === 'DIRECT') {
      filterRenderedTrains();
    } else if (result.type === 'INTERCHANGE') {
      renderInterchangeJourney(result.journey);
    } else {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <div class="empty-title">No Direct Train Available</div>
          <div class="empty-subtitle">Check interchange at Dadar (Western-Central) or Kurla (Central-Harbour).</div>
        </div>
      `;
    }
  }

  function filterRenderedTrains() {
    const container = document.getElementById('trainResultsContainer');
    if (!container || !currentLoadedJourneyResult || currentLoadedJourneyResult.type !== 'DIRECT') return;

    let trains = currentLoadedJourneyResult.trains || [];

    if (AppState.currentSpeedFilter !== 'ALL') {
      trains = trains.filter(t => t.type === AppState.currentSpeedFilter);
    }
    if (AppState.currentLineFilter !== 'ALL') {
      trains = trains.filter(t => t.line === AppState.currentLineFilter);
    }

    if (!trains.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🚉</div>
          <div class="empty-title">No Trains Found For Selected Filter</div>
          <div class="empty-subtitle">Try switching to "ALL" speed or line filter to view all upcoming services.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = trains.map((t, index) => renderTrainCard(t, index)).join('');

    // Attach click events
    container.querySelectorAll('.train-card').forEach((card, idx) => {
      card.addEventListener('click', () => {
        openTrainDetail(trains[idx]);
      });
    });
  }

  // Compact commuter-friendly train card rendering
  function renderTrainCard(train, index) {
    const toStation = STATIONS_BY_ID[AppState.toStationId];
    const toName = toStation ? toStation.name : 'Destination';

    const currentMin = TimetableEngine.getMumbaiCurrentMinutes();
    const waitMins = Math.max(0, Math.round(train.rawDepartureMinutes - currentMin));
    const countdownText = waitMins === 0 ? 'Due now' : (waitMins < 60 ? `in ${waitMins} min` : `in ${Math.floor(waitMins / 60)}h ${waitMins % 60}m`);

    const speedBadgeClass = train.isFast ? 'badge-fast' : 'badge-slow';
    const lineBadgeClass = `badge-${train.line}`;

    return `
      <div class="train-card" data-train-id="${train.id}">
        <!-- Top Row: Time (Dominant) & Badges -->
        <div class="train-card-main">
          <div class="train-time-block">
            <span class="train-dep-time">${train.departureTime}</span>
            <span class="train-eta-countdown">${countdownText}</span>
          </div>

          <div class="train-badges-row">
            <span class="${speedBadgeClass}">${train.type}</span>
            <span class="line-badge ${lineBadgeClass}">${train.lineName}</span>
          </div>
        </div>

        <!-- Middle Row: Destination & Arrival at user's destination -->
        <div class="train-details-row">
          <div class="train-destination">
            <span>Towards <strong>${train.destinationName}</strong></span>
            <span class="train-destination-code">(${train.destinationCode})</span>
          </div>

          <div class="train-arrival-info">
            Arrives ${toName} <strong>${train.arrivalTime}</strong>
          </div>
        </div>

        <!-- Bottom Row: Stops, Duration, Platform, Status -->
        <div class="train-footer-row">
          <div class="train-stops-duration">
            ${train.durationMinutes} min · ${train.stopsCount} stops
          </div>

          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="platform-badge">${train.platform}</span>
            <span class="status-pill ${train.status.class}">${train.status.label}</span>
          </div>
        </div>
      </div>
    `;
  }

  // 1-Hop Transfer Itinerary Card Rendering
  function renderInterchangeJourney(journey) {
    const container = document.getElementById('trainResultsContainer');
    if (!container) return;

    container.innerHTML = `
      <div class="transfer-card">
        <div class="transfer-title">
          <span>🔄 1-Transfer Mumbai Local Route via <strong>${journey.hubName}</strong></span>
        </div>
        <div style="font-size: 11.5px; color: var(--text-secondary);">
          Total journey time: <strong>${journey.totalDurationMinutes} min</strong> including transfer across foot overbridge.
        </div>

        <div style="margin-top: 6px;">
          <div class="section-label" style="margin-bottom: 4px;">Leg 1: ${journey.leg1.fromStationId} → ${journey.hubId}</div>
          ${renderTrainCard(journey.leg1, 0)}
        </div>

        <div style="margin-top: 10px;">
          <div class="section-label" style="margin-bottom: 4px;">Leg 2: ${journey.hubId} → ${journey.leg2.toStationId}</div>
          ${renderTrainCard(journey.leg2, 1)}
        </div>
      </div>
    `;

    container.querySelectorAll('.train-card').forEach((card, idx) => {
      card.addEventListener('click', () => {
        openTrainDetail(idx === 0 ? journey.leg1 : journey.leg2);
      });
    });
  }

  // Train Detail Modal with Vertical Timeline
  function setupTrainDetailModal() {
    document.getElementById('closeTrainDetailBtn')?.addEventListener('click', () => {
      document.getElementById('trainDetailModal')?.classList.remove('active');
    });
  }

  function openTrainDetail(train) {
    AppState.selectedTrain = train;
    const modal = document.getElementById('trainDetailModal');
    if (!modal) return;

    // Header info
    document.getElementById('tdTrainId').textContent = train.id;
    const speedBadge = document.getElementById('tdSpeedBadge');
    speedBadge.textContent = train.type;
    speedBadge.className = train.isFast ? 'badge-fast' : 'badge-slow';

    const lineBadge = document.getElementById('tdLineBadge');
    lineBadge.textContent = train.lineName;
    lineBadge.className = `line-badge badge-${train.line}`;

    document.getElementById('tdDestHeader').textContent = `${train.originName} → ${train.destinationName}`;
    document.getElementById('tdOrigDestSubtitle').textContent = `Local Service · Starting Platform ${train.stops[0]?.platform || 'PF 1'}`;
    document.getElementById('tdDepartureTime').textContent = train.departureTime;

    document.getElementById('tdDuration').textContent = `${train.durationMinutes} min`;
    document.getElementById('tdStops').textContent = `${train.stopsCount} halts`;
    document.getElementById('tdPlatform').textContent = train.platform;
    document.getElementById('tdStatus').textContent = train.status.label;
    document.getElementById('tdStatus').style.color = train.status.code === 'ON_TIME' ? '#6EE7B7' : '#FDE047';

    // Render Vertical Timeline
    renderVerticalTimeline(train);

    modal.classList.add('active');
  }

  function renderVerticalTimeline(train) {
    const listEl = document.getElementById('trainTimelineList');
    if (!listEl) return;

    const currentMin = TimetableEngine.getMumbaiCurrentMinutes();
    let foundCurrent = false;

    listEl.innerHTML = train.stops.map(stop => {
      const isPassed = stop.rawMinutes < currentMin - 1;
      const isCurrent = !isPassed && !foundCurrent && !stop.isSkipped;
      if (isCurrent) foundCurrent = true;

      const isFrom = stop.stationId === AppState.fromStationId;
      const isTo = stop.stationId === AppState.toStationId;

      let nodeClass = 'timeline-node';
      if (stop.isSkipped) {
        nodeClass += ' skipped';
      } else if (isPassed) {
        nodeClass += ' passed';
      } else if (isCurrent) {
        nodeClass += ' current';
      }

      if (isFrom) nodeClass += ' selected-from';
      if (isTo) nodeClass += ' selected-to';

      return `
        <div class="${nodeClass}">
          <div class="timeline-dot"></div>
          <div class="timeline-content">
            <div class="tl-station-name">
              <span>${stop.stationName}</span>
              ${isFrom ? '<span class="tl-badge-journey badge-from">YOUR FROM</span>' : ''}
              ${isTo ? '<span class="tl-badge-journey badge-to">YOUR TO</span>' : ''}
              ${stop.isInterchange ? '<span class="interchange-tag">Interchange</span>' : ''}
              ${stop.isSkipped ? '<span style="color: var(--text-muted); font-size: 10px;">(Fast train skips)</span>' : ''}
            </div>

            <div class="tl-time-pf">
              <span class="tl-time">${stop.isSkipped ? '—' : stop.departureTime}</span>
              <span class="tl-pf">${stop.isSkipped ? '' : stop.platform}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Station Screen (Live Departures & Platform Guide)
  function setupStationView() {
    const tabDep = document.getElementById('stTabDepartures');
    const tabPf = document.getElementById('stTabPlatforms');
    const depList = document.getElementById('stationDeparturesList');
    const pfList = document.getElementById('stationPlatformsList');

    tabDep?.addEventListener('click', () => {
      tabDep.classList.add('active');
      tabPf?.classList.remove('active');
      if (depList) depList.style.display = 'flex';
      if (pfList) pfList.style.display = 'none';
    });

    tabPf?.addEventListener('click', () => {
      tabPf.classList.add('active');
      tabDep?.classList.remove('active');
      if (depList) depList.style.display = 'none';
      if (pfList) pfList.style.display = 'flex';
    });

    document.getElementById('stationFavToggle')?.addEventListener('click', () => {
      toggleStationFavourite(AppState.currentStationViewId);
    });
  }

  function openStationDepartures(stationId) {
    AppState.currentStationViewId = stationId;
    const station = STATIONS_BY_ID[stationId];
    if (!station) return;

    document.getElementById('stationViewName').textContent = station.name;

    const linesEl = document.getElementById('stationViewLines');
    if (linesEl) {
      linesEl.innerHTML = station.lines.map(l => `
        <span class="line-badge badge-${l}">${MUMBAI_RAIL_LINES[l].name}</span>
      `).join(' ');
    }

    const pfStrip = document.getElementById('stationViewPlatforms');
    if (pfStrip) {
      pfStrip.innerHTML = station.platforms.map(p => `
        <span class="platform-badge" style="font-size: 9.5px;">${p}</span>
      `).join(' ');
    }

    updateStationFavBtn(stationId);
    loadStationDepartures(stationId);
    renderStationPlatformGuide(stationId);

    switchView('stationView');
  }

  function loadStationDepartures(stationId) {
    const container = document.getElementById('stationDeparturesList');
    if (!container) return;

    const deps = TimetableEngine.getStationDepartures(stationId);
    if (!deps.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🚉</div>
          <div class="empty-title">No Immediate Trains</div>
          <div class="empty-subtitle">Services running on scheduled intervals.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = deps.map((t, idx) => renderTrainCard(t, idx)).join('');

    container.querySelectorAll('.train-card').forEach((card, idx) => {
      card.addEventListener('click', () => {
        openTrainDetail(deps[idx]);
      });
    });
  }

  function renderStationPlatformGuide(stationId) {
    const container = document.getElementById('stationPlatformsList');
    if (!container) return;

    const guideData = PLATFORM_GUIDES[stationId];
    if (!guideData) {
      const station = STATIONS_BY_ID[stationId];
      container.innerHTML = (station?.platforms || []).map((pf, idx) => `
        <div class="pf-guide-card">
          <div class="pf-number-tag">PF ${idx + 1}</div>
          <div class="pf-info-body">
            <span class="pf-direction">${pf}</span>
            <span class="pf-destinations">Standard suburban boarding platform</span>
          </div>
        </div>
      `).join('');
      return;
    }

    let html = '';
    for (const [lineKey, platforms] of Object.entries(guideData)) {
      html += `<div class="picker-group-title" style="margin-top: 6px;">${MUMBAI_RAIL_LINES[lineKey]?.name || lineKey} Platforms</div>`;
      platforms.forEach(p => {
        html += `
          <div class="pf-guide-card">
            <div class="pf-number-tag">${p.pf}</div>
            <div class="pf-info-body">
              <span class="pf-direction">${p.dir}</span>
              <span class="pf-destinations">${p.dest}</span>
            </div>
          </div>
        `;
      });
    }

    container.innerHTML = html;
  }

  function toggleStationFavourite(stId) {
    if (AppState.favourites.stations.includes(stId)) {
      AppState.favourites.stations = AppState.favourites.stations.filter(id => id !== stId);
    } else {
      AppState.favourites.stations.push(stId);
    }
    saveStoredData();
    updateStationFavBtn(stId);
    renderFavouritesView();
  }

  function updateStationFavBtn(stId) {
    const btn = document.getElementById('stationFavToggle');
    if (!btn) return;
    const isFav = AppState.favourites.stations.includes(stId);
    if (isFav) {
      btn.classList.add('favorited');
    } else {
      btn.classList.remove('favorited');
    }
  }

  // Favourites View Controller
  function setupFavouritesView() {
    document.getElementById('btnAddFavRoute')?.addEventListener('click', () => {
      const fromSt = STATIONS_BY_ID[AppState.fromStationId];
      const toSt = STATIONS_BY_ID[AppState.toStationId];
      if (!fromSt || !toSt) return;

      const label = prompt('Enter a label for this route (e.g. Home, College, Office):', 'Daily Route');
      if (label) {
        AppState.favourites.routes.push({
          id: 'r_' + Date.now(),
          fromId: AppState.fromStationId,
          toId: AppState.toStationId,
          label: label
        });
        saveStoredData();
        renderFavouritesView();
      }
    });

    renderFavouritesView();
  }

  function renderFavouritesView() {
    const routesList = document.getElementById('favRoutesList');
    const stationsGrid = document.getElementById('favStationsGrid');

    if (routesList) {
      if (!AppState.favourites.routes.length) {
        routesList.innerHTML = `
          <div class="empty-state">
            <div class="empty-title">No Saved Routes Yet</div>
            <div class="empty-subtitle">Save your daily home and office commute routes for quick 1-tap departure lookups.</div>
          </div>
        `;
      } else {
        routesList.innerHTML = AppState.favourites.routes.map(r => {
          const fromSt = STATIONS_BY_ID[r.fromId];
          const toSt = STATIONS_BY_ID[r.toId];
          return `
            <div class="fav-route-card" data-from="${r.fromId}" data-to="${r.toId}">
              <div class="fav-route-info">
                <span class="fav-route-label">⭐ ${r.label}</span>
                <span class="fav-route-text">${fromSt ? fromSt.name : r.fromId} → ${toSt ? toSt.name : r.toId}</span>
              </div>
              <div class="fav-next-train-box">
                <button class="btn-fav-next" data-from="${r.fromId}" data-to="${r.toId}">NEXT TRAIN</button>
              </div>
            </div>
          `;
        }).join('');

        routesList.querySelectorAll('.btn-fav-next').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            AppState.fromStationId = btn.getAttribute('data-from');
            AppState.toStationId = btn.getAttribute('data-to');
            updateHomeStationDisplays();
            executeJourneySearch();
          });
        });
      }
    }

    if (stationsGrid) {
      if (!AppState.favourites.stations.length) {
        stationsGrid.innerHTML = `
          <div class="empty-subtitle" style="grid-column: span 2; text-align: center; padding: 12px;">
            Tap the star icon on any station to pin it here.
          </div>
        `;
      } else {
        stationsGrid.innerHTML = AppState.favourites.stations.map(stId => {
          const st = STATIONS_BY_ID[stId];
          if (!st) return '';
          return `
            <div class="fav-station-card" data-station-id="${st.id}">
              <div>
                <span style="font-weight: 800; font-size: 13.5px; color: #FFFFFF;">${st.name}</span>
                <div style="font-size: 10px; color: var(--brand-accent); font-family: var(--font-mono);">${st.code}</div>
              </div>
              <span style="color: #F59E0B; font-size: 16px;">★</span>
            </div>
          `;
        }).join('');

        stationsGrid.querySelectorAll('.fav-station-card').forEach(card => {
          card.addEventListener('click', () => {
            openStationDepartures(card.getAttribute('data-station-id'));
          });
        });
      }
    }
  }

  // More / Info Directory Setup
  function setupMoreView() {
    const modal = document.getElementById('infoDirectoryModal');
    const closeBtn = document.getElementById('closeInfoModalBtn');
    const modalTitle = document.getElementById('infoModalTitle');
    const modalBody = document.getElementById('infoModalBody');

    closeBtn?.addEventListener('click', () => {
      modal?.classList.remove('active');
    });

    document.getElementById('btnOpenPlatformDirectory')?.addEventListener('click', () => {
      if (modalTitle) modalTitle.textContent = 'Major Mumbai Platform Guide';
      if (modalBody) {
        modalBody.innerHTML = `
          <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px;">
            Quick reference for major Mumbai suburban railway interchange hubs:
          </p>
          ${Object.keys(PLATFORM_GUIDES).map(stId => {
            const st = STATIONS_BY_ID[stId];
            return `
              <div style="margin-bottom: 14px; background: var(--bg-card); padding: 10px; border-radius: 8px; border: 1px solid var(--border-subtle);">
                <div style="font-weight: 800; font-size: 14px; color: #FFFFFF; margin-bottom: 6px;">${st?.name || stId}</div>
                <button class="time-chip" onclick="TransitSaathiApp.openStationDepartures('${stId}')" style="margin-bottom: 8px;">View Live Departures</button>
              </div>
            `;
          }).join('')}
        `;
      }
      modal?.classList.add('active');
    });

    document.getElementById('btnOpenFastSlowGuide')?.addEventListener('click', () => {
      if (modalTitle) modalTitle.textContent = 'Mumbai Fast vs Slow Guide';
      if (modalBody) {
        modalBody.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 12px; font-size: 12.5px; color: var(--text-secondary);">
            <div style="background: var(--bg-card); padding: 12px; border-radius: 8px; border: 1px solid var(--border-subtle);">
              <div style="font-weight: 800; color: #FCA5A5; margin-bottom: 4px;">Western Line Fast Trains</div>
              <p>Halt only at: Churchgate, Mumbai Central, Dadar, Bandra, Andheri, Borivali, Bhayandar, Vasai Road, Virar, Palghar, Dahanu Road. Skips intermediate small stations to save 20-30 minutes.</p>
            </div>

            <div style="background: var(--bg-card); padding: 12px; border-radius: 8px; border: 1px solid var(--border-subtle);">
              <div style="font-weight: 800; color: #93C5FD; margin-bottom: 4px;">Central Line Fast Trains</div>
              <p>Halt only at: CSMT, Byculla, Dadar, Kurla, Ghatkopar, Bhandup (select), Mulund (select), Thane, Dombivli, Kalyan, and all stations beyond Kalyan to Kasara/Karjat.</p>
            </div>

            <div style="background: var(--bg-card); padding: 12px; border-radius: 8px; border: 1px solid var(--border-subtle);">
              <div style="font-weight: 800; color: #6EE7B7; margin-bottom: 4px;">Harbour & Trans-Harbour Lines</div>
              <p>All Harbour and Trans-Harbour locals operate as all-stop SLOW services connecting CSMT, Vadala, Chembur, Vashi, Panvel, and Thane.</p>
            </div>
          </div>
        `;
      }
      modal?.classList.add('active');
    });

    document.getElementById('btnClearCache')?.addEventListener('click', () => {
      if ('caches' in window) {
        caches.keys().then(keys => {
          keys.forEach(k => caches.delete(k));
          alert('Transit Saathi suburban timetable cache synced successfully!');
        });
      } else {
        alert('Cache refreshed.');
      }
    });
  }

  // Schematic Map Setup
  function setupSchematicMap() {
    const mapContainer = document.getElementById('mapContainer');
    if (mapContainer) {
      SchematicMap.init(mapContainer, (stationId) => {
        openStationDepartures(stationId);
      });
    }
  }

  // Export to window for inter-module hooks
  window.TransitSaathiApp = {
    setJourneyStation,
    openStationDepartures,
    switchView
  };

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
