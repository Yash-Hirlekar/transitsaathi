// Transit Saathi - Schematic Mumbai Suburban Railway Network Map
// Commuter-first, high-clarity SVG map with pan, zoom, station inspector, and route highlighting

const SchematicMap = (function() {
  let svgContainer = null;
  let mapG = null;
  let currentZoom = 1;
  let panX = 0;
  let panY = 0;
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let activeLineFilter = 'ALL';
  let highlightedStationIds = new Set();
  let onStationSelectedCallback = null;

  // Station Schematic Coordinates (500x860 canvas)
  const STATION_COORDS = {
    // Western Line (x approx 110-160)
    CHURCHGATE: { x: 130, y: 810, name: 'Churchgate', code: 'CCG', line: 'western', isInterchange: false },
    MARINE_LINES: { x: 130, y: 780, name: 'Marine Lines', code: 'MEL', line: 'western', isInterchange: false },
    CHARNI_ROAD: { x: 130, y: 750, name: 'Charni Road', code: 'CYR', line: 'western', isInterchange: false },
    GRANT_ROAD: { x: 130, y: 720, name: 'Grant Road', code: 'GTR', line: 'western', isInterchange: false },
    MUMBAI_CENTRAL: { x: 130, y: 690, name: 'Mumbai Central', code: 'MMCT', line: 'western', isInterchange: true },
    MAHALAXMI: { x: 130, y: 660, name: 'Mahalaxmi', code: 'MX', line: 'western', isInterchange: false },
    LOWER_PAREL: { x: 135, y: 630, name: 'Lower Parel', code: 'PL', line: 'western', isInterchange: false },
    PRABHADEVI: { x: 140, y: 600, name: 'Prabhadevi', code: 'PBHD', line: 'western', isInterchange: true, interchangeTo: 'PAREL' },
    DADAR: { x: 165, y: 570, name: 'Dadar Junction', code: 'DDR', line: 'junction', isInterchange: true },
    MATUNGA_ROAD: { x: 150, y: 540, name: 'Matunga Road', code: 'MRU', line: 'western', isInterchange: false },
    MAHIM_JN: { x: 145, y: 510, name: 'Mahim Jn', code: 'MM', line: 'junction', isInterchange: true },
    BANDRA: { x: 140, y: 480, name: 'Bandra', code: 'BA', line: 'junction', isInterchange: true },
    KHAR_ROAD: { x: 138, y: 450, name: 'Khar Road', code: 'KHAR', line: 'western', isInterchange: false },
    SANTACRUZ: { x: 136, y: 420, name: 'Santacruz', code: 'STC', line: 'western', isInterchange: false },
    VILE_PARLE: { x: 134, y: 390, name: 'Vile Parle', code: 'VLP', line: 'western', isInterchange: false },
    ANDHERI: { x: 132, y: 360, name: 'Andheri', code: 'ADH', line: 'junction', isInterchange: true },
    JOGESHWARI: { x: 130, y: 330, name: 'Jogeshwari', code: 'JOS', line: 'western', isInterchange: false },
    RAM_MANDIR: { x: 128, y: 305, name: 'Ram Mandir', code: 'RMAR', line: 'western', isInterchange: false },
    GOREGAON: { x: 126, y: 280, name: 'Goregaon', code: 'GMN', line: 'junction', isInterchange: true },
    MALAD: { x: 124, y: 250, name: 'Malad', code: 'MDD', line: 'western', isInterchange: false },
    KANDIVALI: { x: 122, y: 238, name: 'Kandivali', code: 'KND', line: 'western', isInterchange: false },
    BORIVALI: { x: 120, y: 220, name: 'Borivali', code: 'BVI', line: 'western', isInterchange: true },
    DAHISAR: { x: 118, y: 202, name: 'Dahisar', code: 'DIC', line: 'western', isInterchange: false },
    MIRA_ROAD: { x: 116, y: 184, name: 'Mira Road', code: 'MIRA', line: 'western', isInterchange: false },
    BHAYANDAR: { x: 114, y: 166, name: 'Bhayandar', code: 'BYR', line: 'western', isInterchange: true },
    NAIGAON: { x: 112, y: 152, name: 'Naigaon', code: 'NIG', line: 'western', isInterchange: false },
    VASAI_ROAD: { x: 110, y: 138, name: 'Vasai Road', code: 'BSR', line: 'western', isInterchange: true },
    NALLASOPARA: { x: 107, y: 125, name: 'Nallasopara', code: 'NSP', line: 'western', isInterchange: false },
    VIRAR: { x: 105, y: 112, name: 'Virar', code: 'VR', line: 'western', isInterchange: true },
    VAITARNA: { x: 105, y: 99, name: 'Vaitarna', code: 'VTN', line: 'western', isInterchange: false },
    SAPHALE: { x: 105, y: 86, name: 'Saphale', code: 'SAH', line: 'western', isInterchange: false },
    KELVE_ROAD: { x: 105, y: 73, name: 'Kelve Road', code: 'KLV', line: 'western', isInterchange: false },
    PALGHAR: { x: 105, y: 60, name: 'Palghar', code: 'PLG', line: 'western', isInterchange: false },
    UMROLI: { x: 105, y: 48, name: 'Umroli', code: 'UOI', line: 'western', isInterchange: false },
    BOISAR: { x: 105, y: 36, name: 'Boisar', code: 'BOR', line: 'western', isInterchange: true },
    VANGAON: { x: 105, y: 24, name: 'Vangaon', code: 'VGN', line: 'western', isInterchange: false },
    DAHANU_ROAD: { x: 105, y: 12, name: 'Dahanu Road', code: 'DRD', line: 'western', isInterchange: true },

    // Central Main Line
    CSMT: { x: 235, y: 810, name: 'CSMT', code: 'CSMT', line: 'junction', isInterchange: true },
    MASJID: { x: 235, y: 780, name: 'Masjid', code: 'MSD', line: 'junction', isInterchange: true },
    SANDHURST_ROAD: { x: 235, y: 750, name: 'Sandhurst Road', code: 'SNRD', line: 'junction', isInterchange: true },
    BYCULLA: { x: 220, y: 715, name: 'Byculla', code: 'BY', line: 'central', isInterchange: false },
    CHINCHPOKLI: { x: 210, y: 680, name: 'Chinchpokli', code: 'CHG', line: 'central', isInterchange: false },
    CURREY_ROAD: { x: 200, y: 645, name: 'Currey Road', code: 'CRD', line: 'central', isInterchange: false },
    PAREL: { x: 185, y: 605, name: 'Parel', code: 'PR', line: 'central', isInterchange: true, interchangeTo: 'PRABHADEVI' },
    // DADAR shared
    MATUNGA: { x: 195, y: 540, name: 'Matunga (CR)', code: 'MTN', line: 'central', isInterchange: false },
    SION: { x: 215, y: 515, name: 'Sion', code: 'SIN', line: 'central', isInterchange: false },
    KURLA: { x: 240, y: 485, name: 'Kurla Junction', code: 'CLA', line: 'junction', isInterchange: true },
    VIDYAVIHAR: { x: 255, y: 460, name: 'Vidyavihar', code: 'VVH', line: 'central', isInterchange: false },
    GHATKOPAR: { x: 270, y: 435, name: 'Ghatkopar', code: 'GC', line: 'central', isInterchange: true },
    VIKHROLI: { x: 285, y: 410, name: 'Vikhroli', code: 'VK', line: 'central', isInterchange: false },
    KANJURMARG: { x: 298, y: 385, name: 'Kanjurmarg', code: 'KJMG', line: 'central', isInterchange: false },
    BHANDUP: { x: 310, y: 360, name: 'Bhandup', code: 'BND', line: 'central', isInterchange: false },
    NAHUR: { x: 318, y: 348, name: 'Nahur', code: 'NHU', line: 'central', isInterchange: false },
    MULUND: { x: 325, y: 335, name: 'Mulund', code: 'MLND', line: 'central', isInterchange: false },
    THANE: { x: 345, y: 305, name: 'Thane', code: 'TNA', line: 'junction', isInterchange: true },
    KALVA: { x: 360, y: 280, name: 'Kalva', code: 'KLVA', line: 'central', isInterchange: false },
    MUMBRA: { x: 375, y: 255, name: 'Mumbra', code: 'MBQ', line: 'central', isInterchange: false },
    DIVA_JN: { x: 390, y: 230, name: 'Diva Jn', code: 'DIVA', line: 'central', isInterchange: true },
    KOPAR: { x: 398, y: 218, name: 'Kopar', code: 'KOPR', line: 'central', isInterchange: false },
    DOMBIVLI: { x: 405, y: 205, name: 'Dombivli', code: 'DI', line: 'central', isInterchange: false },
    THAKURLI: { x: 410, y: 192, name: 'Thakurli', code: 'THK', line: 'central', isInterchange: false },
    KALYAN: { x: 415, y: 178, name: 'Kalyan Junction', code: 'KYN', line: 'junction', isInterchange: true },
    // Central Main (Kasara Branch: Kalyan -> Kasara)
    SHAHAD: { x: 423, y: 163, name: 'Shahad', code: 'SHAD', line: 'central', isInterchange: false },
    AMBIVLI: { x: 431, y: 148, name: 'Ambivli', code: 'ABY', line: 'central', isInterchange: false },
    TITWALA: { x: 439, y: 133, name: 'Titwala', code: 'TLA', line: 'central', isInterchange: false },
    KHADAVLI: { x: 447, y: 118, name: 'Khadavli', code: 'KDV', line: 'central', isInterchange: false },
    VASIND: { x: 455, y: 103, name: 'Vasind', code: 'VSD', line: 'central', isInterchange: false },
    ASANGAON: { x: 463, y: 88, name: 'Asangaon', code: 'ASO', line: 'central', isInterchange: false },
    ATGAON: { x: 471, y: 73, name: 'Atgaon', code: 'ATG', line: 'central', isInterchange: false },
    THANSIT: { x: 479, y: 58, name: 'Thansit', code: 'THS', line: 'central', isInterchange: false },
    KHARDI: { x: 487, y: 43, name: 'Khardi', code: 'KDI', line: 'central', isInterchange: false },
    UMBERMALI: { x: 495, y: 28, name: 'Umbermali', code: 'UMB', line: 'central', isInterchange: false },
    KASARA: { x: 503, y: 13, name: 'Kasara', code: 'KSRA', line: 'central', isInterchange: true },
    // Central Main (Khopoli Branch: Kalyan -> Khopoli)
    VITHALWADI: { x: 422, y: 196, name: 'Vithalwadi', code: 'VLDI', line: 'central', isInterchange: false },
    ULHASNAGAR: { x: 429, y: 213, name: 'Ulhasnagar', code: 'ULNR', line: 'central', isInterchange: false },
    AMBERNATH: { x: 436, y: 230, name: 'Ambernath', code: 'ABH', line: 'central', isInterchange: false },
    BADLAPUR: { x: 443, y: 247, name: 'Badlapur', code: 'BUD', line: 'central', isInterchange: false },
    VANGANI: { x: 450, y: 264, name: 'Vangani', code: 'VGI', line: 'central', isInterchange: false },
    SHELU: { x: 457, y: 281, name: 'Shelu', code: 'SHLU', line: 'central', isInterchange: false },
    NERAL: { x: 464, y: 298, name: 'Neral Jn', code: 'NRL', line: 'central', isInterchange: true },
    BHIVPURI_ROAD: { x: 471, y: 315, name: 'Bhivpuri Road', code: 'BVS', line: 'central', isInterchange: false },
    KARJAT: { x: 478, y: 332, name: 'Karjat', code: 'KJT', line: 'central', isInterchange: true },
    PALASDHARI: { x: 485, y: 349, name: 'Palasdari', code: 'PDI', line: 'central', isInterchange: false },
    KELAVLI: { x: 492, y: 366, name: 'Kelavli', code: 'KLY', line: 'central', isInterchange: false },
    DOLAVLI: { x: 498, y: 383, name: 'Dolavli', code: 'DLV', line: 'central', isInterchange: false },
    LOWJEE: { x: 504, y: 400, name: 'Lowjee', code: 'LWJ', line: 'central', isInterchange: false },
    KHOPOLI: { x: 510, y: 417, name: 'Khopoli', code: 'KHPI', line: 'central', isInterchange: true },

    // Harbour Line
    DOCKYARD_ROAD: { x: 250, y: 720, name: 'Dockyard Rd', code: 'DKRD', line: 'harbour', isInterchange: false },
    REAY_ROAD: { x: 255, y: 690, name: 'Reay Road', code: 'RRD', line: 'harbour', isInterchange: false },
    COTTON_GREEN: { x: 260, y: 660, name: 'Cotton Green', code: 'CTGN', line: 'harbour', isInterchange: false },
    SEWRI: { x: 265, y: 630, name: 'Sewri', code: 'SVE', line: 'harbour', isInterchange: false },
    VADALA_ROAD: { x: 265, y: 590, name: 'Vadala Road', code: 'VDLR', line: 'junction', isInterchange: true },
    KINGS_CIRCLE: { x: 200, y: 525, name: "King's Circle", code: 'KCE', line: 'harbour', isInterchange: false },
    GTB_NAGAR: { x: 260, y: 555, name: 'GTB Nagar', code: 'GTBN', line: 'harbour', isInterchange: false },
    CHUNABHATTI: { x: 250, y: 520, name: 'Chunabhatti', code: 'CHF', line: 'harbour', isInterchange: false },
    // KURLA Harbour PF 7/8
    TILAK_NAGAR: { x: 265, y: 495, name: 'Tilak Nagar', code: 'TKNG', line: 'harbour', isInterchange: false },
    CHEMBUR: { x: 290, y: 515, name: 'Chembur', code: 'CMBR', line: 'harbour', isInterchange: true },
    GOVANDI: { x: 315, y: 535, name: 'Govandi', code: 'GV', line: 'harbour', isInterchange: false },
    MANKHURD: { x: 340, y: 555, name: 'Mankhurd', code: 'MNKD', line: 'harbour', isInterchange: false },
    VASHI: { x: 380, y: 580, name: 'Vashi', code: 'VSH', line: 'junction', isInterchange: true },
    SANPADA: { x: 395, y: 605, name: 'Sanpada', code: 'SNPD', line: 'junction', isInterchange: true },
    JUINAGAR: { x: 410, y: 630, name: 'Juinagar', code: 'JNJ', line: 'junction', isInterchange: true },
    NERUL: { x: 425, y: 655, name: 'Nerul', code: 'NEU', line: 'junction', isInterchange: true },
    SEAWOODS: { x: 435, y: 685, name: 'Seawoods Grand Central', code: 'SWDV', line: 'harbour', isInterchange: false },
    BELAPUR_CBD: { x: 445, y: 715, name: 'Belapur CBD', code: 'BEPR', line: 'harbour', isInterchange: true },
    KHARGHAR: { x: 455, y: 745, name: 'Kharghar', code: 'KHAG', line: 'harbour', isInterchange: true },
    MANSAROVAR: { x: 458, y: 762, name: 'Mansarovar', code: 'MANR', line: 'harbour', isInterchange: false },
    KHANDESHWAR: { x: 462, y: 778, name: 'Khandeshwar', code: 'KNDS', line: 'harbour', isInterchange: false },
    PANVEL: { x: 465, y: 795, name: 'Panvel Terminus', code: 'PNVL', line: 'junction', isInterchange: true },

    // Trans-Harbour Line Stations (Thane down to Turbhe & Vashi/Panvel)
    DIGHA_GAON: { x: 355, y: 345, name: 'Digha Gaon', code: 'DIGH', line: 'transharbour', isInterchange: false },
    AIROLI: { x: 365, y: 380, name: 'Airoli', code: 'AIRL', line: 'transharbour', isInterchange: false },
    RABALE: { x: 375, y: 415, name: 'Rabale', code: 'RABE', line: 'transharbour', isInterchange: false },
    GHANSOLI: { x: 385, y: 450, name: 'Ghansoli', code: 'GNSL', line: 'transharbour', isInterchange: false },
    KOPAR_KHAIRANE: { x: 395, y: 485, name: 'Kopar Khairane', code: 'KPHN', line: 'transharbour', isInterchange: false },
    TURBHE: { x: 405, y: 520, name: 'Turbhe', code: 'TRBR', line: 'transharbour', isInterchange: true }
  };

  // Build SVG Path Strings for Corridors
  function buildWesternPath() {
    return 'M 130 810 L 130 690 L 140 600 L 165 570 L 145 510 L 140 480 L 132 360 L 126 280 L 120 220 L 114 166 L 110 138 L 105 112 L 105 12';
  }

  function buildCentralMainPath() {
    return 'M 235 810 L 235 750 L 210 680 L 185 605 L 165 570 L 195 540 L 240 485 L 270 435 L 310 360 L 345 305 L 390 230 L 415 178';
  }

  function buildKasaraBranchPath() {
    return 'M 415 178 L 423 163 L 439 133 L 463 88 L 487 43 L 503 13';
  }

  function buildKarjatBranchPath() {
    return 'M 415 178 L 436 230 L 443 247 L 464 298 L 478 332 L 510 417';
  }

  function buildHarbourMainPath() {
    return 'M 235 810 L 235 750 L 250 720 L 265 630 L 265 590 L 250 520 L 240 485 L 265 495 L 340 555 L 380 580 L 410 630 L 435 685 L 455 745 L 465 795';
  }

  function buildHarbourWesternBranchPath() {
    // Vadala -> Mahim -> Bandra -> Andheri -> Goregaon
    return 'M 265 590 L 220 545 L 145 510 L 140 480 L 132 360 L 126 280';
  }

  function buildTransHarbourPath() {
    // Thane -> Airoli -> Turbhe -> Sanpada / Vashi
    return 'M 345 305 L 365 380 L 385 450 L 405 520 L 395 605 L 380 580';
  }

  // Render SVG Map inside element
  function init(containerEl, onSelectStation) {
    svgContainer = containerEl;
    onStationSelectedCallback = onSelectStation;
    render();
    setupInteractions();
  }

  function render() {
    if (!svgContainer) return;

    svgContainer.innerHTML = `
      <div class="map-controls">
        <button class="map-btn" id="mapZoomIn" title="Zoom in" aria-label="Zoom in">+</button>
        <button class="map-btn" id="mapZoomOut" title="Zoom out" aria-label="Zoom out">−</button>
        <button class="map-btn" id="mapReset" title="Reset view" aria-label="Reset view">⟲</button>
      </div>

      <div class="map-line-legend" id="mapLegendContainer">
        <button class="legend-toggle-btn" id="legendToggleBtn" aria-expanded="true" title="Toggle lines legend">
          <span style="font-weight: 800; font-size: 10.5px; letter-spacing: 0.5px;">LINES</span>
          <span class="legend-toggle-arrow" id="legendToggleArrow">▾</span>
        </button>
        <div class="legend-items-wrapper" id="legendItemsWrapper">
          <button class="legend-pill active" data-line="ALL">All Lines</button>
          <button class="legend-pill legend-cr" data-line="central"><span class="legend-dot dot-cr"></span>Central</button>
          <button class="legend-pill legend-wr" data-line="western"><span class="legend-dot dot-wr"></span>Western</button>
          <button class="legend-pill legend-hr" data-line="harbour"><span class="legend-dot dot-hr"></span>Harbour</button>
          <button class="legend-pill legend-th" data-line="transharbour"><span class="legend-dot dot-th"></span>Trans-Harbour</button>
        </div>
      </div>

      <div class="map-viewport-wrapper" id="mapViewport">
        <svg id="mumbaiMapSvg" viewBox="0 0 520 860" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
          <defs>
            <filter id="mapShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.3"/>
            </filter>
          </defs>

          <!-- Water bodies schematic outline -->
          <g class="map-water-layer" opacity="0.18">
            <!-- Arabian Sea & Thane Creek background labels -->
            <text x="30" y="450" fill="#94A3B8" font-size="12" font-weight="700" letter-spacing="3" transform="rotate(-90 30 450)">ARABIAN SEA</text>
            <text x="345" y="620" fill="#94A3B8" font-size="10" font-weight="700" letter-spacing="2">THANE CREEK</text>
            <path d="M 330 540 Q 360 560 380 575" stroke="#38BDF8" stroke-width="8" stroke-linecap="round" fill="none" opacity="0.25"/>
          </g>

          <g id="mapContentGroup" transform="translate(0, 0) scale(1)">
            <!-- TRACK LINES -->
            <g class="rail-corridors">
              <!-- Central Main & Branches (Maroon/Red) -->
              <path class="rail-path path-cr" d="${buildCentralMainPath()}" stroke="#881337" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none" />
              <path class="rail-path path-cr-branch" d="${buildKasaraBranchPath()}" stroke="#881337" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none" />
              <path class="rail-path path-cr-branch" d="${buildKarjatBranchPath()}" stroke="#881337" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none" />

              <!-- Western Line (Cyan/Blue) -->
              <path class="rail-path path-wr" d="${buildWesternPath()}" stroke="#0284C7" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none" />

              <!-- Harbour Line (Emerald Green) -->
              <path class="rail-path path-hr" d="${buildHarbourMainPath()}" stroke="#059669" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none" />
              <!-- Harbour Western branch (dotted/distinct) -->
              <path class="rail-path path-hr-branch" d="${buildHarbourWesternBranchPath()}" stroke="#059669" stroke-width="5" stroke-dasharray="6,4" stroke-linecap="round" stroke-linejoin="round" fill="none" />

              <!-- Trans-Harbour Line (Yellow/Orange) -->
              <path class="rail-path path-th" d="${buildTransHarbourPath()}" stroke="#D97706" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
            </g>

            <!-- FOOT OVERBRIDGE CONNECTIONS (e.g. Prabhadevi to Parel) -->
            <g class="interchange-connectors">
              <line x1="140" y1="600" x2="185" y2="605" stroke="#F8FAFC" stroke-width="4" stroke-dasharray="3,3" />
            </g>

            <!-- STATIONS NODES -->
            <g class="station-nodes" id="stationNodesGroup">
              ${renderStationNodes()}
            </g>

            <!-- HIGHLIGHTED JOURNEY OVERLAY -->
            <g id="routeHighlightLayer"></g>
          </g>
        </svg>
      </div>

      <!-- Station Peek Card Sheet -->
      <div class="station-peek-card" id="stationPeekCard" style="display: none;">
        <div class="peek-header">
          <div>
            <div class="peek-code" id="peekCode">DDR</div>
            <div class="peek-title" id="peekTitle">Dadar Junction</div>
          </div>
          <button class="peek-close-btn" id="peekCloseBtn" aria-label="Close station info">&times;</button>
        </div>
        <div class="peek-lines" id="peekLines"></div>
        <div class="peek-actions">
          <button class="peek-btn btn-from" id="peekSetFrom">Set as FROM</button>
          <button class="peek-btn btn-to" id="peekSetTo">Set as TO</button>
          <button class="peek-btn btn-departures" id="peekViewDepartures">Live Trains</button>
        </div>
      </div>
    `;

    mapG = document.getElementById('mapContentGroup');
  }

  function renderStationNodes() {
    let html = '';
    for (const [stId, s] of Object.entries(STATION_COORDS)) {
      const isInterchange = s.isInterchange;
      const isMajor = ['CSMT', 'CHURCHGATE', 'DADAR', 'KURLA', 'THANE', 'ANDHERI', 'BORIVALI', 'VIRAR', 'KALYAN', 'PANVEL', 'VASHI'].includes(stId);

      // Node circle
      const r = isMajor ? 7 : (isInterchange ? 5.5 : 4);
      const strokeW = isMajor ? 3 : 2;
      const fillCol = isInterchange ? '#FFFFFF' : '#1E293B';
      const strokeCol = isMajor ? '#F59E0B' : (isInterchange ? '#F8FAFC' : '#94A3B8');

      // Label position
      let textAnchor = 'start';
      let labelDx = 10;
      let labelDy = 4;

      if (s.line === 'western' || stId === 'CHURCHGATE' || stId === 'BORIVALI') {
        textAnchor = 'end';
        labelDx = -10;
      } else if (s.x > 380) {
        textAnchor = 'start';
        labelDx = 8;
      }

      html += `
        <g class="st-node ${s.line} ${isMajor ? 'major' : ''} ${isInterchange ? 'interchange' : ''}" data-station-id="${stId}" transform="translate(${s.x}, ${s.y})">
          <circle r="15" fill="transparent" class="st-hitbox"/>
          <circle r="${r}" fill="${fillCol}" stroke="${strokeCol}" stroke-width="${strokeW}" filter="url(#mapShadow)"/>
          ${isMajor ? `<circle r="${r - 3}" fill="#0F172A"/>` : ''}
          <text x="${labelDx}" y="${labelDy}" text-anchor="${textAnchor}" class="st-label ${isMajor ? 'major-label' : ''}">
            ${s.name}
          </text>
        </g>
      `;
    }
    return html;
  }

  function setupInteractions() {
    const viewport = document.getElementById('mapViewport');
    const zoomIn = document.getElementById('mapZoomIn');
    const zoomOut = document.getElementById('mapZoomOut');
    const zoomReset = document.getElementById('mapReset');
    const peekCard = document.getElementById('stationPeekCard');
    const peekClose = document.getElementById('peekCloseBtn');

    if (!viewport) return;

    // Zoom Buttons
    zoomIn?.addEventListener('click', () => applyZoom(1.3));
    zoomOut?.addEventListener('click', () => applyZoom(0.75));
    zoomReset?.addEventListener('click', () => resetView());

    // Pan (Mouse & Touch)
    viewport.addEventListener('mousedown', (e) => {
      if (e.target.closest('.st-node') || e.target.closest('.map-controls')) return;
      isDragging = true;
      startX = e.clientX - panX;
      startY = e.clientY - panY;
      viewport.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      panX = e.clientX - startX;
      panY = e.clientY - startY;
      updateTransform();
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
      if (viewport) viewport.style.cursor = 'grab';
    });

    // Touch Pinch & Pan
    let touchStartDist = 0;
    viewport.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        startX = e.touches[0].clientX - panX;
        startY = e.touches[0].clientY - panY;
      } else if (e.touches.length === 2) {
        touchStartDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    }, { passive: true });

    viewport.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && isDragging) {
        panX = e.touches[0].clientX - startX;
        panY = e.touches[0].clientY - startY;
        updateTransform();
      } else if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const factor = dist / touchStartDist;
        if (factor > 1.05) {
          applyZoom(1.05);
          touchStartDist = dist;
        } else if (factor < 0.95) {
          applyZoom(0.95);
          touchStartDist = dist;
        }
      }
    }, { passive: true });

    viewport.addEventListener('touchend', () => {
      isDragging = false;
    });

    // Station Node Clicks
    const nodesGroup = document.getElementById('stationNodesGroup');
    nodesGroup?.addEventListener('click', (e) => {
      const node = e.target.closest('.st-node');
      if (!node) return;
      const stId = node.getAttribute('data-station-id');
      if (stId && STATION_COORDS[stId]) {
        showStationPeek(stId);
      }
    });

    // Collapsible Legend Toggle
    const legendToggleBtn = document.getElementById('legendToggleBtn');
    const legendWrapper = document.getElementById('legendItemsWrapper');
    const legendArrow = document.getElementById('legendToggleArrow');
    legendToggleBtn?.addEventListener('click', () => {
      const isCollapsed = legendWrapper?.classList.toggle('collapsed');
      if (legendArrow) legendArrow.textContent = isCollapsed ? '▸' : '▾';
      legendToggleBtn.setAttribute('aria-expanded', !isCollapsed);
    });

    // Line Filter Legend Pills
    const legendPills = document.querySelectorAll('.legend-pill');
    legendPills.forEach(pill => {
      pill.addEventListener('click', () => {
        legendPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        filterByLine(pill.getAttribute('data-line'));
      });
    });

    peekClose?.addEventListener('click', () => {
      if (peekCard) peekCard.style.display = 'none';
    });
  }

  function applyZoom(multiplier) {
    currentZoom = Math.min(Math.max(currentZoom * multiplier, 0.7), 4.5);
    updateTransform();
  }

  function resetView() {
    currentZoom = 1;
    panX = 0;
    panY = 0;
    updateTransform();
  }

  function updateTransform() {
    if (mapG) {
      mapG.setAttribute('transform', `translate(${panX}, ${panY}) scale(${currentZoom})`);
    }
  }

  function filterByLine(lineKey) {
    activeLineFilter = lineKey;
    const paths = document.querySelectorAll('.rail-path');
    const nodes = document.querySelectorAll('.st-node');

    if (lineKey === 'ALL') {
      paths.forEach(p => p.style.opacity = '1');
      nodes.forEach(n => n.style.opacity = '1');
      return;
    }

    const lineClassPrefixes = {
      western: 'path-wr',
      central: 'path-cr',
      harbour: 'path-hr',
      transharbour: 'path-th'
    };

    const targetPrefix = lineClassPrefixes[lineKey];

    paths.forEach(p => {
      const cls = p.getAttribute('class') || '';
      const matches = targetPrefix ? cls.includes(targetPrefix) : false;
      p.style.opacity = matches ? '1' : '0.15';
    });

    nodes.forEach(n => {
      const stId = n.getAttribute('data-station-id');
      const stData = STATIONS_BY_ID[stId];
      if (stData && (stData.lines.includes(lineKey) || stId === 'DADAR' || stId === 'KURLA' || stId === 'THANE' || stId === 'CSMT')) {
        n.style.opacity = '1';
      } else {
        n.style.opacity = '0.15';
      }
    });
  }

  function showStationPeek(stationId) {
    const station = STATIONS_BY_ID[stationId];
    const peekCard = document.getElementById('stationPeekCard');
    if (!station || !peekCard) return;

    document.getElementById('peekCode').textContent = station.code;
    document.getElementById('peekTitle').textContent = station.name;

    const linesContainer = document.getElementById('peekLines');
    linesContainer.innerHTML = station.lines.map(l => `
      <span class="line-badge badge-${l}">${MUMBAI_RAIL_LINES[l].name}</span>
    `).join(' ') + (station.isInterchange ? `<span class="interchange-tag">Interchange</span>` : '');

    peekCard.style.display = 'block';

    // Hook buttons
    document.getElementById('peekSetFrom').onclick = () => {
      if (window.TransitSaathiApp) {
        window.TransitSaathiApp.setJourneyStation('from', stationId);
        peekCard.style.display = 'none';
      }
    };
    document.getElementById('peekSetTo').onclick = () => {
      if (window.TransitSaathiApp) {
        window.TransitSaathiApp.setJourneyStation('to', stationId);
        peekCard.style.display = 'none';
      }
    };
    document.getElementById('peekViewDepartures').onclick = () => {
      if (window.TransitSaathiApp) {
        window.TransitSaathiApp.openStationDepartures(stationId);
        peekCard.style.display = 'none';
      }
    };
  }

  function highlightRoute(fromId, toId) {
    const highlightLayer = document.getElementById('routeHighlightLayer');
    if (!highlightLayer) return;

    highlightLayer.innerHTML = '';
    const fromCoord = STATION_COORDS[fromId];
    const toCoord = STATION_COORDS[toId];

    if (fromCoord && toCoord) {
      // Add pulsing ring over from and to stations
      highlightLayer.innerHTML = `
        <circle cx="${fromCoord.x}" cy="${fromCoord.y}" r="14" fill="none" stroke="#22C55E" stroke-width="3" opacity="0.8" class="pulse-ring"/>
        <circle cx="${toCoord.x}" cy="${toCoord.y}" r="14" fill="none" stroke="#EF4444" stroke-width="3" opacity="0.8" class="pulse-ring"/>
      `;
    }
  }

  return {
    init,
    resetView,
    filterByLine,
    highlightRoute,
    showStationPeek
  };

})();
