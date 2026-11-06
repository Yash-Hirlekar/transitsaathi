// Transit Saathi - Official Mumbai Suburban Railway Database
// Exclusively for Mumbai suburban local trains: Central, Western, Harbour, Trans-Harbour

/**
 * Phase 2 Official Railway API Typed Models
 * @typedef {Object} IStation
 * @property {string} id - Station identifier enum key (e.g., 'DADAR', 'KURLA')
 * @property {string} code - Official Indian Railways telegraphic code (e.g., 'DR', 'CLA')
 * @property {string} name - Canonical public station display name
 * @property {string[]} aliases - Commuter search aliases and common colloquial names
 * @property {string[]} lines - Operating suburban lines ['central', 'western', 'harbour', 'transharbour']
 * @property {boolean} isInterchange - Whether interchange between lines/corridors is possible
 * @property {string[]} [interchangeLines] - List of connected suburban/metro corridors
 * @property {string[]} platforms - Ordered physical platform designations
 * @property {number} [lat] - Geographic latitude (WGS 84)
 * @property {number} [lon] - Geographic longitude (WGS 84)
 * @property {number} [orderWestern] - Sequential index on Western corridor
 * @property {number} [orderCentral] - Sequential index on Central corridor
 * @property {number} [orderHarbour] - Sequential index on Harbour corridor
 * @property {boolean} [popular] - Frequently queried suburban commuter terminal
 */

/**
 * @typedef {Object} ITrain
 * @property {string} id - Unique operational rake run identifier (e.g. 'CR-4021', 'WR-9011')
 * @property {string} line - Operational line key ('central', 'western', 'harbour', 'transharbour')
 * @property {string} lineName - Full line display name
 * @property {string} type - Service classification ('FAST' | 'SLOW')
 * @property {boolean} isFast - Fast/Skip-stop indicator flag
 * @property {string} departureTime - HH:MM AM/PM 12-hour formatted departure at origin
 * @property {number} rawDepartureMinutes - Minutes from midnight IST (0 - 1439)
 * @property {string} originId - Origin station identifier
 * @property {string} originName - Origin station name
 * @property {string} originCode - Origin station Indian Railways code
 * @property {string} destinationId - Terminus station identifier
 * @property {string} destinationName - Terminus station name
 * @property {string} destinationCode - Terminus station Indian Railways code
 * @property {number} haltsCount - Number of intermediate stops
 * @property {Array<{stationId: string, stationName: string, time: string, rawMinutes: number, platform: string, isHalt: boolean}>} stops - Halt trajectory schedule
 * @property {string} platform - Assigned departure platform at user's boarding station
 * @property {string} status - Service status ('ON TIME' | 'DELAYED 3m' | 'DELAYED 5m')
 */

/**
 * @typedef {Object} ICrowdReport
 * @property {string} _id - Unique submission identifier
 * @property {string} train_id - Assigned operational train run ID (e.g., 'CR-4021')
 * @property {string} density - Density rating ('GREEN_SEATS' | 'YELLOW_STAND' | 'RED_CRUSH')
 * @property {number} timestamp - Epoch timestamp in milliseconds
 * @property {{type: 'Point', coordinates: [number, number]}} location - GeoJSON [longitude, latitude]
 * @property {number|null} accuracy - GPS accuracy radius in meters
 * @property {number} speed_kmh - Commuter ground velocity in km/h
 * @property {string} [direction] - Train progression ('UP' | 'DOWN' | 'UNKNOWN')
 * @property {string} stationId - Nearest suburban station identifier
 * @property {string} [corridorId] - Matched corridor key
 * @property {string} context - 'TRAIN' | 'PLATFORM'
 * @property {boolean} is_synced - Cloud backend synchronisation status
 */

/**
 * @typedef {Object} ISosPayload
 * @property {string} _id - Unique emergency session record identifier
 * @property {number} timestamp - Incident trigger epoch in milliseconds
 * @property {string} user_session - Active commuter session token
 * @property {string} [authority] - Targeted dispatch service ('RPF_182' | 'HELPLINE_139' | 'GRP_1512' | 'POLICE_112')
 * @property {{type: 'Point', coordinates: [number, number]}} location - GeoJSON [longitude, latitude]
 * @property {number|null} accuracy - GPS location accuracy in meters
 * @property {number} speed_kmh - Ground velocity at incident trigger
 * @property {number|null} heading - Compass travel angle
 * @property {string} nearestStationId - Last detected railway station ID
 * @property {string} [nearestStationName] - Last detected railway station display name
 * @property {string} corridorId - Active railway corridor identifier
 * @property {string} direction - Trajectory direction ('UP' | 'DOWN' | 'UNKNOWN')
 * @property {{id: string, name: string}|null} [predictedNextStation] - Next approach station
 * @property {{type: 'LineString', coordinates: Array<[number, number]>}} trajectoryGeoJSON - Breadcrumb route
 * @property {boolean} resolved - Emergency resolution flag
 */

const MUMBAI_RAIL_LINES = {
  central: {
    id: 'central',
    name: 'Central Line',
    shortName: 'Central',
    color: '#881337', // Indian Railways deep maroon/red
    badgeColor: '#701A28',
    lightBg: '#FFE4E6',
    textColor: '#FFFFFF',
    terminals: ['CSMT', 'Dadar', 'Kurla', 'Thane', 'Kalyan', 'Titwala', 'Asangaon', 'Kasara', 'Badlapur', 'Karjat', 'Khopoli']
  },
  western: {
    id: 'western',
    name: 'Western Line',
    shortName: 'Western',
    color: '#0284C7', // Western Line vibrant cyan/cobalt blue
    badgeColor: '#0369A1',
    lightBg: '#E0F2FE',
    textColor: '#FFFFFF',
    terminals: ['Churchgate', 'Mumbai Central', 'Dadar', 'Bandra', 'Andheri', 'Borivali', 'Bhayandar', 'Vasai Road', 'Virar', 'Palghar', 'Boisar', 'Dahanu Road']
  },
  harbour: {
    id: 'harbour',
    name: 'Harbour Line',
    shortName: 'Harbour',
    color: '#059669', // Emerald green
    badgeColor: '#047857',
    lightBg: '#D1FAE5',
    textColor: '#FFFFFF',
    terminals: ['CSMT', 'Vadala Road', 'Bandra', 'Goregaon', 'Vashi', 'Belapur', 'Panvel']
  },
  transharbour: {
    id: 'transharbour',
    name: 'Trans-Harbour Line',
    shortName: 'Trans-Harbour',
    color: '#D97706', // Copper amber / yellow-orange
    badgeColor: '#B45309',
    lightBg: '#FEF3C7',
    textColor: '#FFFFFF',
    terminals: ['Thane', 'Vashi', 'Nerul', 'Panvel']
  }
};

// Fast Train Stoppage Station IDs
const FAST_STOPS_CENTRAL = [
  'CSMT', 'BYCULLA', 'DADAR', 'KURLA', 'GHATKOPAR', 'BHANDUP', 'MULUND', 'THANE', 'DOMBIVLI', 'KALYAN',
  'TITWALA', 'ASANGAON', 'KASARA', 'AMBERNATH', 'BADLAPUR', 'NERAL', 'KARJAT', 'KHOPOLI'
];

const FAST_STOPS_WESTERN = [
  'CHURCHGATE', 'MUMBAI_CENTRAL', 'DADAR', 'BANDRA', 'ANDHERI', 'BORIVALI', 'BHAYANDAR', 'VASAI_ROAD', 'VIRAR', 'PALGHAR', 'BOISAR', 'DAHANU_ROAD'
];

// Complete Mumbai Suburban Stations
const MUMBAI_STATIONS = [
  // --- WESTERN LINE ---
  {
    id: 'CHURCHGATE',
    code: 'CCG',
    name: 'Churchgate',
    aliases: ['CCG', 'Church gate'],
    lines: ['western'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Slow/Fast)', 'PF 2 (Slow/Fast)', 'PF 3 (Fast)', 'PF 4 (Fast)'],
    lat: 18.9322,
    lon: 72.8264,
    orderWestern: 1,
    popular: true
  },
  {
    id: 'MARINE_LINES',
    code: 'MEL',
    name: 'Marine Lines',
    aliases: ['MEL', 'Marine drive'],
    lines: ['western'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Slow)', 'PF 2 (Up Slow)'],
    lat: 18.9436,
    lon: 72.8239,
    orderWestern: 2,
    popular: false
  },
  {
    id: 'CHARNI_ROAD',
    code: 'CYR',
    name: 'Charni Road',
    aliases: ['CYR', 'Girgaon', 'Chowpatty'],
    lines: ['western'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Slow)', 'PF 2 (Up Slow)'],
    lat: 18.9515,
    lon: 72.8191,
    orderWestern: 3,
    popular: true
  },
  {
    id: 'GRANT_ROAD',
    code: 'GTR',
    name: 'Grant Road',
    aliases: ['GTR', 'Lamington Road', 'Nana Chowk'],
    lines: ['western'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Slow)', 'PF 2 (Up Slow)', 'PF 3 (Fast)', 'PF 4 (Fast)'],
    lat: 18.9632,
    lon: 72.8159,
    orderWestern: 4,
    popular: true
  },
  {
    id: 'MUMBAI_CENTRAL',
    code: 'MMCT',
    name: 'Mumbai Central',
    aliases: ['MMCT', 'BCL', 'Bombay Central', 'Central Western'],
    lines: ['western'],
    isInterchange: false,
    interchangeLines: ['Western Outstation'],
    platforms: ['PF 1 (Down Slow)', 'PF 2 (Up Slow)', 'PF 3 (Down Fast)', 'PF 4 (Up Fast)'],
    lat: 18.9696,
    lon: 72.8194,
    orderWestern: 5,
    popular: true
  },
  {
    id: 'MAHALAXMI',
    code: 'MX',
    name: 'Mahalaxmi',
    aliases: ['MX', 'Mahalakshmi', 'Race Course', 'Dhobi Ghat'],
    lines: ['western'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Slow)', 'PF 2 (Up Slow)'],
    lat: 18.9829,
    lon: 72.8237,
    orderWestern: 6,
    popular: true
  },
  {
    id: 'LOWER_PAREL',
    code: 'PL',
    name: 'Lower Parel',
    aliases: ['PL', 'Phoenix Mills', 'High Street Phoenix', 'Parel West'],
    lines: ['western'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Slow)', 'PF 2 (Up Slow)'],
    lat: 18.9954,
    lon: 72.8306,
    orderWestern: 7,
    popular: true
  },
  {
    id: 'PRABHADEVI',
    code: 'PBHD',
    name: 'Prabhadevi',
    aliases: ['PBHD', 'Elphinstone Road', 'Elphinstone', 'Siddhivinayak'],
    lines: ['western'],
    isInterchange: true,
    interchangeLines: ['Central Line (via Parel FOB)'],
    platforms: ['PF 1 (Down Slow)', 'PF 2 (Up Slow)'],
    lat: 19.0068,
    lon: 72.8353,
    orderWestern: 8,
    popular: true
  },
  {
    id: 'DADAR',
    code: 'DDR',
    name: 'Dadar',
    aliases: ['DDR', 'DR', 'Dadar Central', 'Dadar Western', 'Dadar TT', 'Chhabildas'],
    lines: ['western', 'central'],
    isInterchange: true,
    interchangeLines: ['Central Line', 'Western Line'],
    platforms: [
      'WR PF 1 (Down Slow)', 'WR PF 2 (Up Slow)', 'WR PF 3 (Down Fast)', 'WR PF 4 (Up Fast)', 'WR PF 5 (Fast Terminus)',
      'CR PF 1 (Down Slow)', 'CR PF 2 (Down Slow)', 'CR PF 3 (Up Slow)', 'CR PF 4 (Down Fast)', 'CR PF 5 (Up Fast)', 'CR PF 6 (Outstation/Suburban)'
    ],
    lat: 19.0178,
    lon: 72.8478,
    orderWestern: 9,
    orderCentral: 8,
    popular: true
  },
  {
    id: 'MATUNGA_ROAD',
    code: 'MRU',
    name: 'Matunga Road',
    aliases: ['MRU', 'Matunga West'],
    lines: ['western'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Slow)', 'PF 2 (Up Slow)'],
    lat: 19.0279,
    lon: 72.8436,
    orderWestern: 10,
    popular: false
  },
  {
    id: 'MAHIM_JN',
    code: 'MM',
    name: 'Mahim Junction',
    aliases: ['MM', 'Mahim', 'Mahim Dargah'],
    lines: ['western', 'harbour'],
    isInterchange: true,
    interchangeLines: ['Harbour Line (Goregaon/CSMT branch)'],
    platforms: ['PF 1 (Down Slow)', 'PF 2 (Up Slow)', 'PF 3 (Harbour Down)', 'PF 4 (Harbour Up)'],
    lat: 19.0407,
    lon: 72.8441,
    orderWestern: 11,
    orderHarbourExt: 2,
    popular: true
  },
  {
    id: 'BANDRA',
    code: 'BA',
    name: 'Bandra',
    aliases: ['BA', 'Bandra West', 'Bandra East', 'BKC', 'Linking Road', 'Hill Road'],
    lines: ['western', 'harbour'],
    isInterchange: true,
    interchangeLines: ['Harbour Line', 'Western Line'],
    platforms: ['PF 1 (Down Slow)', 'PF 2 (Up Slow)', 'PF 3 (Down Fast)', 'PF 4 (Up Fast)', 'PF 5 (Fast/Terminus)', 'PF 6 (Harbour Down)', 'PF 7 (Harbour Up)'],
    lat: 19.0544,
    lon: 72.8404,
    orderWestern: 12,
    orderHarbourExt: 3,
    popular: true
  },
  {
    id: 'KHAR_ROAD',
    code: 'KHAR',
    name: 'Khar Road',
    aliases: ['KHAR', 'Khar', 'Khar Danda'],
    lines: ['western', 'harbour'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Slow)', 'PF 2 (Up Slow)', 'PF 3 (Harbour Down)', 'PF 4 (Harbour Up)'],
    lat: 19.0694,
    lon: 72.8398,
    orderWestern: 13,
    orderHarbourExt: 4,
    popular: false
  },
  {
    id: 'SANTACRUZ',
    code: 'STC',
    name: 'Santacruz',
    aliases: ['STC', 'Santa Cruz', 'Vakola'],
    lines: ['western', 'harbour'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Slow)', 'PF 2 (Up Slow)', 'PF 3 (Harbour Down)', 'PF 4 (Harbour Up)'],
    lat: 19.0818,
    lon: 72.8415,
    orderWestern: 14,
    orderHarbourExt: 5,
    popular: true
  },
  {
    id: 'VILE_PARLE',
    code: 'VLP',
    name: 'Vile Parle',
    aliases: ['VLP', 'Parle', 'NMIMS', 'Mithibai', 'Domestic Airport'],
    lines: ['western', 'harbour'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Slow)', 'PF 2 (Up Slow)', 'PF 3 (Harbour Down)', 'PF 4 (Harbour Up)'],
    lat: 19.0991,
    lon: 72.8439,
    orderWestern: 15,
    orderHarbourExt: 6,
    popular: true
  },
  {
    id: 'ANDHERI',
    code: 'ADH',
    name: 'Andheri',
    aliases: ['ADH', 'Andheri West', 'Andheri East', 'DN Nagar', 'Lokhandwala', 'SEEPZ'],
    lines: ['western', 'harbour'],
    isInterchange: true,
    interchangeLines: ['Harbour Line', 'Western Line'],
    platforms: [
      'PF 1 (Down Slow)', 'PF 2 (Up Slow)', 'PF 3 (Slow Terminus)',
      'PF 4 (Down Fast)', 'PF 5 (Up Fast)', 'PF 6 (Harbour Down)', 'PF 7 (Harbour Up)'
    ],
    lat: 19.1197,
    lon: 72.8464,
    orderWestern: 16,
    orderHarbourExt: 7,
    popular: true
  },
  {
    id: 'JOGESHWARI',
    code: 'JOS',
    name: 'Jogeshwari',
    aliases: ['JOS', 'Jogeshwari Caves'],
    lines: ['western', 'harbour'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Slow)', 'PF 2 (Up Slow)', 'PF 3 (Harbour Down)', 'PF 4 (Harbour Up)'],
    lat: 19.1352,
    lon: 72.8491,
    orderWestern: 17,
    orderHarbourExt: 8,
    popular: false
  },
  {
    id: 'RAM_MANDIR',
    code: 'RMAR',
    name: 'Ram Mandir',
    aliases: ['RMAR', 'Oshiwara'],
    lines: ['western', 'harbour'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Slow)', 'PF 2 (Up Slow)', 'PF 3 (Harbour Down)', 'PF 4 (Harbour Up)'],
    lat: 19.1481,
    lon: 72.8512,
    orderWestern: 18,
    orderHarbourExt: 9,
    popular: false
  },
  {
    id: 'GOREGAON',
    code: 'GMN',
    name: 'Goregaon',
    aliases: ['GMN', 'Film City', 'Aarey', 'Goregaon West', 'Goregaon East'],
    lines: ['western', 'harbour'],
    isInterchange: true,
    interchangeLines: ['Harbour Line Terminus', 'Western Line'],
    platforms: ['PF 1 (Harbour Terminus)', 'PF 2 (Harbour Terminus)', 'PF 3 (Down Slow)', 'PF 4 (Up Slow)', 'PF 5 (Fast Terminus)', 'PF 6 (Fast Terminus)'],
    lat: 19.1648,
    lon: 72.8492,
    orderWestern: 19,
    orderHarbourExt: 10,
    popular: true
  },
  {
    id: 'MALAD',
    code: 'MDD',
    name: 'Malad',
    aliases: ['MDD', 'Inorbit', 'Mindspace', 'Malad West', 'Malad East'],
    lines: ['western'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Slow)', 'PF 2 (Up Slow)', 'PF 3 (Down Fast)', 'PF 4 (Up Fast)'],
    lat: 19.1866,
    lon: 72.8486,
    orderWestern: 20,
    popular: true
  },
  {
    id: 'KANDIVALI',
    code: 'KND',
    name: 'Kandivali',
    aliases: ['KND', 'Kandivli', 'Mahavir Nagar', 'Thakur Village', 'Thakur Complex'],
    lines: ['western'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Slow)', 'PF 2 (Up Slow)', 'PF 3 (Down Fast)', 'PF 4 (Up Fast)'],
    lat: 19.2045,
    lon: 72.8519,
    orderWestern: 21,
    popular: true
  },
  {
    id: 'BORIVALI',
    code: 'BVI',
    name: 'Borivali',
    aliases: ['BVI', 'National Park', 'Borivli', 'Borivali West', 'Borivali East', 'IC Colony'],
    lines: ['western'],
    isInterchange: true,
    interchangeLines: ['Western Line Fast/Slow Terminus'],
    platforms: [
      'PF 1 (Slow Terminus)', 'PF 2 (Slow Terminus)', 'PF 3 (Down Slow)', 'PF 4 (Up Slow)',
      'PF 5 (Down Fast)', 'PF 6 (Up Fast)', 'PF 7 (Fast Terminus)', 'PF 8 (Fast Terminus)'
    ],
    lat: 19.2291,
    lon: 72.8574,
    orderWestern: 22,
    popular: true
  },
  {
    id: 'DAHISAR',
    code: 'DIC',
    name: 'Dahisar',
    aliases: ['DIC', 'Dahisar Check Naka'],
    lines: ['western'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Slow)', 'PF 2 (Up Slow)', 'PF 3 (Down Fast)', 'PF 4 (Up Fast)'],
    lat: 19.2501,
    lon: 72.8596,
    orderWestern: 23,
    popular: false
  },
  {
    id: 'MIRA_ROAD',
    code: 'MIRA',
    name: 'Mira Road',
    aliases: ['MIRA', 'Mira Bhayandar', 'Shanti Nagar'],
    lines: ['western'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Slow)', 'PF 2 (Up Slow)', 'PF 3 (Down Fast)', 'PF 4 (Up Fast)'],
    lat: 19.2811,
    lon: 72.8561,
    orderWestern: 24,
    popular: true
  },
  {
    id: 'BHAYANDAR',
    code: 'BYR',
    name: 'Bhayandar',
    aliases: ['BYR', 'Bhayander', 'Uttan', 'Gorai'],
    lines: ['western'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Slow)', 'PF 2 (Up Slow)', 'PF 3 (Down Fast)', 'PF 4 (Up Fast)', 'PF 5 (Fast Terminus)', 'PF 6 (Fast Terminus)'],
    lat: 19.3013,
    lon: 72.8524,
    orderWestern: 25,
    popular: true
  },
  {
    id: 'NAIGAON',
    code: 'NIG',
    name: 'Naigaon',
    aliases: ['NIG', 'Naigaon East'],
    lines: ['western'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Slow)', 'PF 2 (Up Slow)'],
    lat: 19.3516,
    lon: 72.8465,
    orderWestern: 26,
    popular: false
  },
  {
    id: 'VASAI_ROAD',
    code: 'BSR',
    name: 'Vasai Road',
    aliases: ['BSR', 'Vasai', 'Bassein', 'Navghar'],
    lines: ['western'],
    isInterchange: false,
    interchangeLines: ['Diva-Vasai Freight/MEMU'],
    platforms: ['PF 1 (Down Slow)', 'PF 2 (Up Slow)', 'PF 3 (Down Fast)', 'PF 4 (Up Fast)', 'PF 5 (Fast Terminus)'],
    lat: 19.3807,
    lon: 72.8322,
    orderWestern: 27,
    popular: true
  },
  {
    id: 'NALLASOPARA',
    code: 'NSP',
    name: 'Nallasopara',
    aliases: ['NSP', 'Nala Sopara', 'Sopara'],
    lines: ['western'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Slow)', 'PF 2 (Up Slow)', 'PF 3 (Down Fast)', 'PF 4 (Up Fast)'],
    lat: 19.4172,
    lon: 72.8184,
    orderWestern: 28,
    popular: true
  },
  {
    id: 'VIRAR',
    code: 'VR',
    name: 'Virar',
    aliases: ['VR', 'Jivdani', 'Arnala'],
    lines: ['western'],
    isInterchange: true,
    interchangeLines: ['Western Line Suburban Terminus'],
    platforms: [
      'PF 1 (Down Slow)', 'PF 2 (Up Slow Terminus)', 'PF 3 (Up Fast Terminus)',
      'PF 4 (Fast Terminus)', 'PF 5 (Dahanu Passenger)', 'PF 6 (Dahanu Down)'
    ],
    lat: 19.4564,
    lon: 72.8105,
    orderWestern: 29,
    popular: true
  },
  {
    id: 'VAITARNA',
    code: 'VTN',
    name: 'Vaitarna',
    aliases: ['VTN', 'Vaitarana'],
    lines: ['western'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down)', 'PF 2 (Up)'],
    lat: 19.5103,
    lon: 72.8532,
    orderWestern: 30,
    popular: false
  },
  {
    id: 'SAPHALE',
    code: 'SAH',
    name: 'Saphale',
    aliases: ['SAH', 'Safale'],
    lines: ['western'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down)', 'PF 2 (Up)'],
    lat: 19.5786,
    lon: 72.8228,
    orderWestern: 31,
    popular: false
  },
  {
    id: 'KELVE_ROAD',
    code: 'KLV',
    name: 'Kelve Road',
    aliases: ['KLV', 'Kelwa Road', 'Kelwe'],
    lines: ['western'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down)', 'PF 2 (Up)'],
    lat: 19.6247,
    lon: 72.7951,
    orderWestern: 32,
    popular: false
  },
  {
    id: 'PALGHAR',
    code: 'PLG',
    name: 'Palghar',
    aliases: ['PLG'],
    lines: ['western'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down)', 'PF 2 (Up)', 'PF 3 (Loop)'],
    lat: 19.6967,
    lon: 72.7655,
    orderWestern: 33,
    popular: true
  },
  {
    id: 'UMROLI',
    code: 'UOI',
    name: 'Umroli',
    aliases: ['UOI', 'Umaroli'],
    lines: ['western'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down)', 'PF 2 (Up)'],
    lat: 19.7423,
    lon: 72.7489,
    orderWestern: 34,
    popular: false
  },
  {
    id: 'BOISAR',
    code: 'BOR',
    name: 'Boisar',
    aliases: ['BOR', 'Tarapur MIDC', 'Tarapur'],
    lines: ['western'],
    isInterchange: true,
    interchangeLines: ['Tarapur Industrial Suburban Terminus'],
    platforms: ['PF 1 (Down)', 'PF 2 (Up)', 'PF 3 (Loop)'],
    lat: 19.8021,
    lon: 72.7534,
    orderWestern: 35,
    popular: true
  },
  {
    id: 'VANGAON',
    code: 'VGN',
    name: 'Vangaon',
    aliases: ['VGN'],
    lines: ['western'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down)', 'PF 2 (Up)'],
    lat: 19.8824,
    lon: 72.7542,
    orderWestern: 36,
    popular: false
  },
  {
    id: 'DAHANU_ROAD',
    code: 'DRD',
    name: 'Dahanu Road',
    aliases: ['DRD', 'Dahanu', 'Bordi'],
    lines: ['western'],
    isInterchange: false,
    interchangeLines: ['WR Suburban North Terminus'],
    platforms: ['PF 1 (Down)', 'PF 2 (Up Terminus)', 'PF 3 (Up)'],
    lat: 19.9723,
    lon: 72.7323,
    orderWestern: 37,
    popular: true
  },

  // --- CENTRAL MAIN LINE ---
  {
    id: 'CSMT',
    code: 'CSMT',
    name: 'CSMT (Victoria Terminus)',
    aliases: ['CSMT', 'CST', 'VT', 'Victoria Terminus', 'Bori Bunder', 'Fort', 'Colaba', 'Mantralaya', 'Nariman Point'],
    lines: ['central', 'harbour'],
    isInterchange: true,
    interchangeLines: ['Central Main Line', 'Harbour Line'],
    platforms: [
      'PF 1 (Harbour Up/Down)', 'PF 2 (Harbour Up/Down)', 'PF 3 (Central Slow)', 'PF 4 (Central Slow)',
      'PF 5 (Central Fast)', 'PF 6 (Central Fast)', 'PF 7 (Central Terminus)'
    ],
    lat: 18.9401,
    lon: 72.8354,
    orderCentral: 1,
    orderHarbour: 1,
    popular: true
  },
  {
    id: 'MASJID',
    code: 'MSD',
    name: 'Masjid Bunder',
    aliases: ['MSD', 'Masjid', 'Crawford Market', 'Zaveri Bazaar'],
    lines: ['central', 'harbour'],
    isInterchange: true,
    interchangeLines: ['Central Line', 'Harbour Line'],
    platforms: ['PF 1 (CR Down Slow)', 'PF 2 (CR Up Slow)', 'PF 3 (HR Down)', 'PF 4 (HR Up)'],
    lat: 18.9525,
    lon: 72.8398,
    orderCentral: 2,
    orderHarbour: 2,
    popular: false
  },
  {
    id: 'SANDHURST_ROAD',
    code: 'SNRD',
    name: 'Sandhurst Road',
    aliases: ['SNRD', 'Dongri', 'Noor Baug'],
    lines: ['central', 'harbour'],
    isInterchange: true,
    interchangeLines: ['Central Line (Ground level)', 'Harbour Line (Elevated level)'],
    platforms: ['PF 1 (CR Down Slow)', 'PF 2 (CR Up Slow)', 'PF 3 (HR Down Elevated)', 'PF 4 (HR Up Elevated)'],
    lat: 18.9619,
    lon: 72.8394,
    orderCentral: 3,
    orderHarbour: 3,
    popular: false
  },
  {
    id: 'BYCULLA',
    code: 'BY',
    name: 'Byculla',
    aliases: ['BY', 'Jijamata Udyan', 'Rani Baug', 'Mazgaon'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Slow)', 'PF 2 (Up Slow)', 'PF 3 (Down Fast)', 'PF 4 (Up Fast)'],
    lat: 18.9749,
    lon: 72.8339,
    orderCentral: 4,
    popular: true
  },
  {
    id: 'CHINCHPOKLI',
    code: 'CHG',
    name: 'Chinchpokli',
    aliases: ['CHG', 'Chintamani', 'Arthur Road'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Slow)', 'PF 2 (Up Slow)'],
    lat: 18.9868,
    lon: 72.8341,
    orderCentral: 5,
    popular: false
  },
  {
    id: 'CURREY_ROAD',
    code: 'CRD',
    name: 'Currey Road',
    aliases: ['CRD', 'Lalbaug', 'Lalbaugcha Raja'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Slow)', 'PF 2 (Up Slow)'],
    lat: 18.9959,
    lon: 72.8338,
    orderCentral: 6,
    popular: true
  },
  {
    id: 'PAREL',
    code: 'PR',
    name: 'Parel',
    aliases: ['PR', 'KEM Hospital', 'Tata Memorial', 'Parel East'],
    lines: ['central'],
    isInterchange: true,
    interchangeLines: ['Western Line (via Prabhadevi FOB)'],
    platforms: ['PF 1 (Down Slow Terminus)', 'PF 2 (Down Slow)', 'PF 3 (Up Slow)'],
    lat: 19.0061,
    lon: 72.8398,
    orderCentral: 7,
    popular: true
  },
  {
    id: 'MATUNGA',
    code: 'MTN',
    name: 'Matunga (Central)',
    aliases: ['MTN', 'VJTI', 'ICT', 'Ruia College', 'Matunga Central', 'Five Gardens'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Slow)', 'PF 2 (Up Slow)'],
    lat: 19.0272,
    lon: 72.8561,
    orderCentral: 9,
    popular: true
  },
  {
    id: 'SION',
    code: 'SIN',
    name: 'Sion',
    aliases: ['SIN', 'Shev', 'Sion Circle', 'Sion Hospital'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Slow)', 'PF 2 (Up Slow)'],
    lat: 19.0396,
    lon: 72.8624,
    orderCentral: 10,
    popular: true
  },
  {
    id: 'KURLA',
    code: 'CLA',
    name: 'Kurla',
    aliases: ['CLA', 'Kurla West', 'Kurla East', 'BKC Kurla', 'Phoenix Marketcity', 'LTT'],
    lines: ['central', 'harbour'],
    isInterchange: true,
    interchangeLines: ['Central Main Line', 'Harbour Line'],
    platforms: [
      'CR PF 1 (Down Slow)', 'CR PF 2 (Up Slow)', 'CR PF 3 (Down Fast)', 'CR PF 4 (Up Fast)', 'CR PF 5 (Fast Terminus)',
      'HR PF 7 (Harbour Down Panvel)', 'HR PF 8 (Harbour Up CSMT)'
    ],
    lat: 19.0657,
    lon: 72.8794,
    orderCentral: 11,
    orderHarbour: 11,
    popular: true
  },
  {
    id: 'VIDYAVIHAR',
    code: 'VVH',
    name: 'Vidyavihar',
    aliases: ['VVH', 'Somaiya College', 'Somaiya Vidyavihar'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Slow)', 'PF 2 (Up Slow)'],
    lat: 19.0789,
    lon: 72.8966,
    orderCentral: 12,
    popular: false
  },
  {
    id: 'GHATKOPAR',
    code: 'GC',
    name: 'Ghatkopar',
    aliases: ['GC', 'Ghatkopar East', 'Ghatkopar West', 'R City Mall'],
    lines: ['central'],
    isInterchange: true,
    interchangeLines: ['Mumbai Metro Line 1'],
    platforms: ['PF 1 (Down Slow)', 'PF 2 (Up Slow)', 'PF 3 (Down Fast)', 'PF 4 (Up Fast)'],
    lat: 19.0864,
    lon: 72.9081,
    orderCentral: 13,
    popular: true
  },
  {
    id: 'VIKHROLI',
    code: 'VK',
    name: 'Vikhroli',
    aliases: ['VK', 'Godrej', 'Vikhroli East', 'Vikhroli West'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Slow)', 'PF 2 (Up Slow)', 'PF 3 (Down Fast)', 'PF 4 (Up Fast)'],
    lat: 19.1107,
    lon: 72.9298,
    orderCentral: 14,
    popular: true
  },
  {
    id: 'KANJURMARG',
    code: 'KJMG',
    name: 'Kanjurmarg',
    aliases: ['KJMG', 'Kanjur', 'IIT Bombay (via bus)'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Slow)', 'PF 2 (Up Slow)'],
    lat: 19.1257,
    lon: 72.9372,
    orderCentral: 15,
    popular: false
  },
  {
    id: 'BHANDUP',
    code: 'BND',
    name: 'Bhandup',
    aliases: ['BND', 'Bhandup West', 'Bhandup East'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Slow)', 'PF 2 (Up Slow)', 'PF 3 (Down Fast)', 'PF 4 (Up Fast)'],
    lat: 19.1417,
    lon: 72.9366,
    orderCentral: 16,
    popular: true
  },
  {
    id: 'NAHUR',
    code: 'NHU',
    name: 'Nahur',
    aliases: ['NHU', 'Nahur East'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Slow)', 'PF 2 (Up Slow)'],
    lat: 19.1554,
    lon: 72.9463,
    orderCentral: 17,
    popular: false
  },
  {
    id: 'MULUND',
    code: 'MLND',
    name: 'Mulund',
    aliases: ['MLND', 'Mulund West', 'Mulund East', 'Check Naka'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Slow)', 'PF 2 (Up Slow)', 'PF 3 (Down Fast)', 'PF 4 (Up Fast)'],
    lat: 19.1724,
    lon: 72.9564,
    orderCentral: 18,
    popular: true
  },
  {
    id: 'THANE',
    code: 'TNA',
    name: 'Thane',
    aliases: ['TNA', 'Thane West', 'Thane East', 'Naupada', 'Viviana Mall', 'Ghodbunder Road'],
    lines: ['central', 'transharbour'],
    isInterchange: true,
    interchangeLines: ['Central Main Line', 'Trans-Harbour Line (Navi Mumbai)'],
    platforms: [
      'PF 1 (Down Slow Terminus)', 'PF 2 (Up Slow Terminus)', 'PF 3 (Down Slow)', 'PF 4 (Up Slow)',
      'PF 5 (Down Fast)', 'PF 6 (Up Fast)', 'PF 7 (Fast Terminus)', 'PF 8 (Outstation)',
      'PF 9 (Trans-Harbour Vashi/Panvel)', 'PF 10 (Trans-Harbour Vashi/Panvel)'
    ],
    lat: 19.1860,
    lon: 72.9757,
    orderCentral: 19,
    orderTransHarbour: 1,
    popular: true
  },
  {
    id: 'KALVA',
    code: 'KLVA',
    name: 'Kalva',
    aliases: ['KLVA', 'Kalwa'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Slow)', 'PF 2 (Up Slow)'],
    lat: 19.1994,
    lon: 72.9972,
    orderCentral: 20,
    popular: false
  },
  {
    id: 'MUMBRA',
    code: 'MBQ',
    name: 'Mumbra',
    aliases: ['MBQ', 'Kausa'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Slow)', 'PF 2 (Up Slow)'],
    lat: 19.1764,
    lon: 73.0232,
    orderCentral: 21,
    popular: true
  },
  {
    id: 'DIVA_JN',
    code: 'DIVA',
    name: 'Diva Junction',
    aliases: ['DIVA', 'Diva'],
    lines: ['central'],
    isInterchange: true,
    interchangeLines: ['Vasai Road / Panvel Passenger Line'],
    platforms: ['PF 1 (Down Slow)', 'PF 2 (Up Slow)', 'PF 3 (Down Fast)', 'PF 4 (Up Fast)', 'PF 5 (Rohas/Vasai MEMU)'],
    lat: 19.1894,
    lon: 73.0441,
    orderCentral: 22,
    popular: false
  },
  {
    id: 'KOPAR',
    code: 'KOPR',
    name: 'Kopar',
    aliases: ['KOPR', 'Kopar Upper'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Slow)', 'PF 2 (Up Slow)'],
    lat: 19.2131,
    lon: 73.0764,
    orderCentral: 23,
    popular: false
  },
  {
    id: 'DOMBIVLI',
    code: 'DI',
    name: 'Dombivli',
    aliases: ['DI', 'Dombivali', 'Dombivli East', 'Dombivli West', 'MIDC'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Slow)', 'PF 2 (Up Slow Terminus)', 'PF 3 (Down Slow)', 'PF 4 (Up Fast)', 'PF 5 (Down Fast)'],
    lat: 19.2184,
    lon: 73.0867,
    orderCentral: 24,
    popular: true
  },
  {
    id: 'THAKURLI',
    code: 'THK',
    name: 'Thakurli',
    aliases: ['THK', '90 Feet Road'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Slow)', 'PF 2 (Up Slow)'],
    lat: 19.2274,
    lon: 73.1039,
    orderCentral: 25,
    popular: false
  },
  {
    id: 'KALYAN',
    code: 'KYN',
    name: 'Kalyan Junction',
    aliases: ['KYN', 'Kalyan', 'Kalyan East', 'Kalyan West'],
    lines: ['central'],
    isInterchange: true,
    interchangeLines: ['Kasara Branch', 'Karjat Branch'],
    platforms: [
      'PF 1 (Down Slow/Terminus)', 'PF 1A (Terminus)', 'PF 2 (Up Slow/Terminus)', 'PF 3 (Up Slow)',
      'PF 4 (Down Fast)', 'PF 5 (Up Fast)', 'PF 6 (Outstation)', 'PF 7 (Outstation)'
    ],
    lat: 19.2364,
    lon: 73.1306,
    orderCentral: 26,
    popular: true
  },
  // Kasara Branch
  {
    id: 'TITWALA',
    code: 'TLA',
    name: 'Titwala',
    aliases: ['TLA', 'Titwala Ganpati'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Slow)', 'PF 2 (Up Slow)', 'PF 3 (Terminus)'],
    lat: 19.2991,
    lon: 73.2081,
    orderCentral: 29,
    popular: true
  },
  {
    id: 'ASANGAON',
    code: 'ASO',
    name: 'Asangaon',
    aliases: ['ASO', 'Shahapur'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down)', 'PF 2 (Up)', 'PF 3 (Terminus)'],
    lat: 19.4389,
    lon: 73.3081,
    orderCentral: 32,
    popular: true
  },
  {
    id: 'KASARA',
    code: 'KSRA',
    name: 'Kasara',
    aliases: ['KSRA', 'Kasara Ghat', 'Igatpuri connect'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: ['Central North-East Terminus'],
    platforms: ['PF 1 (Down)', 'PF 2 (Up Terminus)', 'PF 3 (Up Terminus)'],
    lat: 19.6542,
    lon: 73.4839,
    orderCentral: 37,
    popular: true
  },
  // Karjat Branch
  {
    id: 'AMBERNATH',
    code: 'ABH',
    name: 'Ambernath',
    aliases: ['ABH', 'Ambarnath', 'Shiv Mandir'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down)', 'PF 2 (Up)', 'PF 3 (Terminus)'],
    lat: 19.1989,
    lon: 73.1953,
    orderCentral: 28,
    popular: true
  },
  {
    id: 'BADLAPUR',
    code: 'BUD',
    name: 'Badlapur',
    aliases: ['BUD', 'Badlapur East', 'Badlapur West'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down)', 'PF 2 (Up)', 'PF 3 (Terminus)'],
    lat: 19.1554,
    lon: 73.2653,
    orderCentral: 30,
    popular: true
  },
  {
    id: 'NERAL',
    code: 'NRL',
    name: 'Neral Junction',
    aliases: ['NRL', 'Matheran toy train'],
    lines: ['central'],
    isInterchange: true,
    interchangeLines: ['Matheran Hill Railway'],
    platforms: ['PF 1 (Down)', 'PF 2 (Up)', 'PF 3 (Matheran Narrow Gauge)'],
    lat: 19.0278,
    lon: 73.3189,
    orderCentral: 33,
    popular: true
  },
  {
    id: 'KARJAT',
    code: 'KJT',
    name: 'Karjat',
    aliases: ['KJT', 'Karjat Junction', 'Pune connect'],
    lines: ['central'],
    isInterchange: true,
    interchangeLines: ['Central South-East Terminus', 'Khopoli Shuttle'],
    platforms: ['PF 1 (Down)', 'PF 2 (Up Terminus)', 'PF 3 (Khopoli Shuttle)'],
    lat: 18.9114,
    lon: 73.3283,
    orderCentral: 36,
    popular: true
  },
  {
    id: 'KHOPOLI',
    code: 'KHPI',
    name: 'Khopoli',
    aliases: ['KHPI', 'Imagica connect'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: ['Khopoli Branch Terminus'],
    platforms: ['PF 1 (Single Platform Terminus)'],
    lat: 18.7844,
    lon: 73.3444,
    orderCentral: 40,
    popular: false
  },

  // --- HARBOUR LINE ---
  {
    id: 'DOCKYARD_ROAD',
    code: 'DKRD',
    name: 'Dockyard Road',
    aliases: ['DKRD', 'Mazgaon Docks'],
    lines: ['harbour'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down)', 'PF 2 (Up)'],
    lat: 18.9669,
    lon: 72.8427,
    orderHarbour: 4,
    popular: false
  },
  {
    id: 'REAY_ROAD',
    code: 'RRD',
    name: 'Reay Road',
    aliases: ['RRD', 'Darukhana'],
    lines: ['harbour'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down)', 'PF 2 (Up)'],
    lat: 18.9754,
    lon: 72.8449,
    orderHarbour: 5,
    popular: false
  },
  {
    id: 'COTTON_GREEN',
    code: 'CTGN',
    name: 'Cotton Green',
    aliases: ['CTGN', 'Kalachowki'],
    lines: ['harbour'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down)', 'PF 2 (Up)'],
    lat: 18.9861,
    lon: 72.8472,
    orderHarbour: 6,
    popular: false
  },
  {
    id: 'SEWRI',
    code: 'SVE',
    name: 'Sewri',
    aliases: ['SVE', 'Sewree', 'Flamingo Point', 'Sewri Fort', 'MTHL / Atal Setu'],
    lines: ['harbour'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down)', 'PF 2 (Up)'],
    lat: 18.9989,
    lon: 72.8547,
    orderHarbour: 7,
    popular: true
  },
  {
    id: 'VADALA_ROAD',
    code: 'VDLR',
    name: 'Vadala Road',
    aliases: ['VDLR', 'Wadala', 'Wadala Road', 'Wadala Depot', 'Veermata Jijabai'],
    lines: ['harbour'],
    isInterchange: true,
    interchangeLines: ['Harbour Main (Panvel)', 'Harbour Western Branch (Goregaon)'],
    platforms: ['PF 1 (Down Panvel)', 'PF 2 (Up CSMT)', 'PF 3 (Down Bandra/Goregaon)', 'PF 4 (Up CSMT from Western)'],
    lat: 19.0169,
    lon: 72.8589,
    orderHarbour: 8,
    orderHarbourExt: 1,
    popular: true
  },
  {
    id: 'GTB_NAGAR',
    code: 'GTBN',
    name: 'GTB Nagar',
    aliases: ['GTBN', 'Guru Tegh Bahadur Nagar', 'Koliwada', 'Sion Koliwada'],
    lines: ['harbour'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down)', 'PF 2 (Up)'],
    lat: 19.0347,
    lon: 72.8654,
    orderHarbour: 9,
    popular: false
  },
  {
    id: 'CHUNABHATTI',
    code: 'CHF',
    name: 'Chunabhatti',
    aliases: ['CHF', 'Sion East BKC connector'],
    lines: ['harbour'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down)', 'PF 2 (Up)'],
    lat: 19.0494,
    lon: 72.8711,
    orderHarbour: 10,
    popular: false
  },
  {
    id: 'TILAK_NAGAR',
    code: 'TKNG',
    name: 'Tilak Nagar',
    aliases: ['TKNG', 'Lokmanya Tilak Terminus connector', 'Sahakar Nagar'],
    lines: ['harbour'],
    isInterchange: false,
    interchangeLines: ['LTT Terminus Footbridge'],
    platforms: ['PF 1 (Down)', 'PF 2 (Up)'],
    lat: 19.0681,
    lon: 72.8942,
    orderHarbour: 12,
    popular: false
  },
  {
    id: 'CHEMBUR',
    code: 'CMBR',
    name: 'Chembur',
    aliases: ['CMBR', 'Chembur Naka', 'Diamond Garden', 'RCF'],
    lines: ['harbour'],
    isInterchange: true,
    interchangeLines: ['Mumbai Monorail Line 1'],
    platforms: ['PF 1 (Down)', 'PF 2 (Up)'],
    lat: 19.0624,
    lon: 72.9016,
    orderHarbour: 13,
    popular: true
  },
  {
    id: 'GOVANDI',
    code: 'GV',
    name: 'Govandi',
    aliases: ['GV', 'Deonar'],
    lines: ['harbour'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down)', 'PF 2 (Up)'],
    lat: 19.0558,
    lon: 72.9152,
    orderHarbour: 14,
    popular: false
  },
  {
    id: 'MANKHURD',
    code: 'MNKD',
    name: 'Mankhurd',
    aliases: ['MNKD', 'BARC', 'Anushakti Nagar'],
    lines: ['harbour'],
    isInterchange: false,
    interchangeLines: ['Thane Creek Bridge border'],
    platforms: ['PF 1 (Down)', 'PF 2 (Up)', 'PF 3 (Terminus)'],
    lat: 19.0486,
    lon: 72.9328,
    orderHarbour: 15,
    popular: true
  },
  {
    id: 'VASHI',
    code: 'VSH',
    name: 'Vashi',
    aliases: ['VSH', 'Vashi Sector 17', 'Inorbit Vashi', 'APMC Market'],
    lines: ['harbour', 'transharbour'],
    isInterchange: true,
    interchangeLines: ['Harbour Line', 'Trans-Harbour Line'],
    platforms: ['PF 1 (Down Panvel)', 'PF 2 (Up CSMT)', 'PF 3 (Trans-Harbour Thane)', 'PF 4 (Terminus)'],
    lat: 19.0645,
    lon: 72.9989,
    orderHarbour: 16,
    orderTransHarbour: 8,
    popular: true
  },
  {
    id: 'SANPADA',
    code: 'SNPD',
    name: 'Sanpada',
    aliases: ['SNPD', 'Sanpada Carshed'],
    lines: ['harbour', 'transharbour'],
    isInterchange: true,
    interchangeLines: ['Harbour Line', 'Trans-Harbour Line'],
    platforms: ['PF 1 (Down Panvel)', 'PF 2 (Up CSMT)', 'PF 3 (Trans-Harbour Down)', 'PF 4 (Trans-Harbour Up)'],
    lat: 19.0664,
    lon: 73.0119,
    orderHarbour: 17,
    orderTransHarbour: 7,
    popular: false
  },
  {
    id: 'JUINAGAR',
    code: 'JNJ',
    name: 'Juinagar',
    aliases: ['JNJ', 'Sanpada East', 'MIDC Nerul'],
    lines: ['harbour', 'transharbour'],
    isInterchange: true,
    interchangeLines: ['Harbour Line', 'Trans-Harbour Line'],
    platforms: ['PF 1 (Down Panvel)', 'PF 2 (Up CSMT)', 'PF 3 (Trans-Harbour Down)', 'PF 4 (Trans-Harbour Up)'],
    lat: 19.0553,
    lon: 73.0211,
    orderHarbour: 18,
    orderTransHarbour: 6,
    popular: false
  },
  {
    id: 'NERUL',
    code: 'NEU',
    name: 'Nerul',
    aliases: ['NEU', 'DY Patil Stadium', 'Nerul West', 'Nerul East', 'Wonders Park'],
    lines: ['harbour', 'transharbour'],
    isInterchange: true,
    interchangeLines: ['Harbour Line', 'Trans-Harbour Line', 'Uran Line'],
    platforms: [
      'PF 1 (Down Panvel)', 'PF 2 (Up CSMT)', 'PF 3 (Trans-Harbour Down)',
      'PF 4 (Trans-Harbour Up Thane)', 'PF 5 (Uran Line)'
    ],
    lat: 19.0344,
    lon: 73.0178,
    orderHarbour: 19,
    orderTransHarbour: 5,
    popular: true
  },
  {
    id: 'SEAWOODS',
    code: 'SWDV',
    name: 'Seawoods Grand Central',
    aliases: ['SWDV', 'Seawoods', 'Grand Central Mall', 'Seawoods Darave'],
    lines: ['harbour', 'transharbour'],
    isInterchange: true,
    interchangeLines: ['Harbour Line', 'Uran Line'],
    platforms: ['PF 1 (Down Panvel)', 'PF 2 (Up CSMT)', 'PF 3 (Trans-Harbour / Uran)'],
    lat: 19.0201,
    lon: 73.0189,
    orderHarbour: 20,
    popular: true
  },
  {
    id: 'BELAPUR_CBD',
    code: 'BEPR',
    name: 'Belapur CBD',
    aliases: ['BEPR', 'CBD Belapur', 'Killa Gaon', 'CIDCO'],
    lines: ['harbour', 'transharbour'],
    isInterchange: true,
    interchangeLines: ['Harbour Line', 'Trans-Harbour Line Terminus'],
    platforms: ['PF 1 (Down Panvel)', 'PF 2 (Up CSMT)', 'PF 3 (Terminus / Trans-Harbour)', 'PF 4 (Terminus)'],
    lat: 19.0164,
    lon: 73.0401,
    orderHarbour: 21,
    popular: true
  },
  {
    id: 'KHARGHAR',
    code: 'KHAG',
    name: 'Kharghar',
    aliases: ['KHAG', 'Utsav Chowk', 'Central Park Kharghar', 'NIFT', 'ITM'],
    lines: ['harbour'],
    isInterchange: true,
    interchangeLines: ['Navi Mumbai Metro Line 1'],
    platforms: ['PF 1 (Down Panvel)', 'PF 2 (Up CSMT/Thane)'],
    lat: 19.0315,
    lon: 73.0682,
    orderHarbour: 22,
    popular: true
  },
  {
    id: 'MANSAROVAR',
    code: 'MANR',
    name: 'Mansarovar',
    aliases: ['MANR', 'Kamothe West'],
    lines: ['harbour'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Panvel)', 'PF 2 (Up CSMT)'],
    lat: 19.0207,
    lon: 73.0898,
    orderHarbour: 23,
    popular: false
  },
  {
    id: 'KHANDESHWAR',
    code: 'KNDS',
    name: 'Khandeshwar',
    aliases: ['KNDS', 'Kamothe East', 'New Panvel'],
    lines: ['harbour'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Panvel)', 'PF 2 (Up CSMT)'],
    lat: 19.0068,
    lon: 73.1042,
    orderHarbour: 24,
    popular: false
  },
  {
    id: 'PANVEL',
    code: 'PNVL',
    name: 'Panvel Junction',
    aliases: ['PNVL', 'Panvel', 'Old Panvel', 'Navi Mumbai Airport Link'],
    lines: ['harbour', 'transharbour'],
    isInterchange: true,
    interchangeLines: ['Harbour Line Terminus', 'Trans-Harbour Terminus', 'Konkan Railway Link'],
    platforms: ['PF 1 (Harbour Up CSMT)', 'PF 2 (Harbour Up CSMT)', 'PF 3 (Trans-Harbour Up Thane)', 'PF 4 (Trans-Harbour Up Thane)'],
    lat: 18.9894,
    lon: 73.1214,
    orderHarbour: 25,
    popular: true
  },

  // --- TRANS-HARBOUR LINE SPECIFIC STATIONS ---
  {
    id: 'DIGHA_GAON',
    code: 'DIGH',
    name: 'Digha Gaon',
    aliases: ['DIGH', 'Digha', 'Airoli North'],
    lines: ['transharbour'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Vashi/Panvel)', 'PF 2 (Up Thane)'],
    lat: 19.1764,
    lon: 72.9942,
    orderTransHarbour: 2,
    popular: false
  },
  {
    id: 'AIROLI',
    code: 'AIRL',
    name: 'Airoli',
    aliases: ['AIRL', 'Airoli Knowledge Park', 'Mindspace Airoli', 'Mulund-Airoli Bridge'],
    lines: ['transharbour'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Vashi/Panvel)', 'PF 2 (Up Thane)'],
    lat: 19.1578,
    lon: 72.9989,
    orderTransHarbour: 3,
    popular: true
  },
  {
    id: 'RABALE',
    code: 'RABE',
    name: 'Rabale',
    aliases: ['RABE', 'Rabale MIDC'],
    lines: ['transharbour'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Vashi/Panvel)', 'PF 2 (Up Thane)'],
    lat: 19.1384,
    lon: 73.0039,
    orderTransHarbour: 4,
    popular: false
  },
  {
    id: 'GHANSOLI',
    code: 'GNSL',
    name: 'Ghansoli',
    aliases: ['GNSL', 'Reliance Corporate Park', 'RCP', 'Dhirubhai Ambani Knowledge City'],
    lines: ['transharbour'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Vashi/Panvel)', 'PF 2 (Up Thane)'],
    lat: 19.1211,
    lon: 73.0094,
    orderTransHarbour: 5,
    popular: true
  },
  {
    id: 'KOPAR_KHAIRANE',
    code: 'KPHN',
    name: 'Kopar Khairane',
    aliases: ['KPHN', 'Koperkhairane', 'Sector 14'],
    lines: ['transharbour'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Vashi/Panvel)', 'PF 2 (Up Thane)'],
    lat: 19.1024,
    lon: 73.0124,
    orderTransHarbour: 6,
    popular: true
  },
  {
    id: 'TURBHE',
    code: 'TRBR',
    name: 'Turbhe',
    aliases: ['TRBR', 'Turbhe MIDC', 'APMC Vegetable Market'],
    lines: ['transharbour'],
    isInterchange: true,
    interchangeLines: ['Trans-Harbour Line Junction (Vashi / Nerul bifurcation)'],
    platforms: ['PF 1 (Down Vashi)', 'PF 2 (Down Nerul/Panvel)', 'PF 3 (Up Thane)', 'PF 4 (Up Thane)'],
    lat: 19.0789,
    lon: 73.0189,
    orderTransHarbour: 7,
    popular: true
  },

  // --- HARBOUR GOREGAON BRANCH MISSING LINK ---
  {
    id: 'KINGS_CIRCLE',
    code: 'KCE',
    name: "King's Circle",
    aliases: ['KCE', 'Kings Circle', 'Maheshwari Udyan', 'Matunga Harbour'],
    lines: ['harbour'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Mahim/Andheri)', 'PF 2 (Up Vadala/CSMT)'],
    lat: 19.0305,
    lon: 72.8576,
    orderHarbour: 8.5,
    popular: true
  },

  // --- KALYAN - KASARA BRANCH INTERMEDIATE STATIONS ---
  {
    id: 'SHAHAD',
    code: 'SHAD',
    name: 'Shahad',
    aliases: ['SHAD', 'NRC Colony', 'Century Rayon'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Kasara)', 'PF 2 (Up Kalyan/CSMT)'],
    lat: 19.2553,
    lon: 73.1558,
    popular: false
  },
  {
    id: 'AMBIVLI',
    code: 'ABY',
    name: 'Ambivli',
    aliases: ['ABY', 'Ambivali', 'Mohone'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Kasara)', 'PF 2 (Up Kalyan/CSMT)'],
    lat: 19.2785,
    lon: 73.1678,
    popular: false
  },
  {
    id: 'KHADAVLI',
    code: 'KDV',
    name: 'Khadavli',
    aliases: ['KDV', 'Khadavali'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Kasara)', 'PF 2 (Up Kalyan/CSMT)'],
    lat: 19.3789,
    lon: 73.2307,
    popular: false
  },
  {
    id: 'VASIND',
    code: 'VSD',
    name: 'Vasind',
    aliases: ['VSD', 'Bhatsa River'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Kasara)', 'PF 2 (Up Kalyan/CSMT)'],
    lat: 19.4079,
    lon: 73.2678,
    popular: false
  },
  {
    id: 'ATGAON',
    code: 'ATG',
    name: 'Atgaon',
    aliases: ['ATG'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Kasara)', 'PF 2 (Up Kalyan/CSMT)'],
    lat: 19.5126,
    lon: 73.3444,
    popular: false
  },
  {
    id: 'THANSIT',
    code: 'THS',
    name: 'Thansit',
    aliases: ['THS'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Kasara)', 'PF 2 (Up Kalyan/CSMT)'],
    lat: 19.5623,
    lon: 73.3768,
    popular: false
  },
  {
    id: 'KHARDI',
    code: 'KE',
    name: 'Khardi',
    aliases: ['KE'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Kasara)', 'PF 2 (Up Kalyan/CSMT)'],
    lat: 19.5891,
    lon: 73.3985,
    popular: false
  },
  {
    id: 'UMBERMALI',
    code: 'UMB',
    name: 'Umbermali',
    aliases: ['UMB'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Kasara)', 'PF 2 (Up Kalyan/CSMT)'],
    lat: 19.6457,
    lon: 73.4478,
    popular: false
  },

  // --- KALYAN - KARJAT / KHOPOLI BRANCH INTERMEDIATE STATIONS ---
  {
    id: 'VITHALWADI',
    code: 'VLDI',
    name: 'Vithalwadi',
    aliases: ['VLDI', 'Vitthalwadi'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Karjat/Khopoli)', 'PF 2 (Up Kalyan/CSMT)'],
    lat: 19.2312,
    lon: 73.1412,
    popular: false
  },
  {
    id: 'ULHASNAGAR',
    code: 'ULNR',
    name: 'Ulhasnagar',
    aliases: ['ULNR', 'Camp 3'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Karjat/Khopoli)', 'PF 2 (Up Kalyan/CSMT)'],
    lat: 19.2215,
    lon: 73.1534,
    popular: true
  },
  {
    id: 'VANGANI',
    code: 'VGI',
    name: 'Vangani',
    aliases: ['VGI'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Karjat/Khopoli)', 'PF 2 (Up Kalyan/CSMT)'],
    lat: 19.1235,
    lon: 73.2642,
    popular: false
  },
  {
    id: 'SHELU',
    code: 'SHLU',
    name: 'Shelu',
    aliases: ['SHLU'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Karjat/Khopoli)', 'PF 2 (Up Kalyan/CSMT)'],
    lat: 19.0987,
    lon: 73.2876,
    popular: false
  },
  {
    id: 'BHIVPURI_ROAD',
    code: 'BPR',
    name: 'Bhivpuri Road',
    aliases: ['BPR', 'Bhivpuri Waterfall'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Karjat/Khopoli)', 'PF 2 (Up Kalyan/CSMT)'],
    lat: 19.0345,
    lon: 73.3089,
    popular: false
  },
  {
    id: 'PALASDHARI',
    code: 'PDI',
    name: 'Palasdhari',
    aliases: ['PDI'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Khopoli)', 'PF 2 (Up Karjat/CSMT)'],
    lat: 18.8924,
    lon: 73.3245,
    popular: false
  },
  {
    id: 'KELAVLI',
    code: 'KLY',
    name: 'Kelavli',
    aliases: ['KLY'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Khopoli)', 'PF 2 (Up Karjat/CSMT)'],
    lat: 18.8546,
    lon: 73.3298,
    popular: false
  },
  {
    id: 'DOLAVLI',
    code: 'DLV',
    name: 'Dolavli',
    aliases: ['DLV'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Khopoli)', 'PF 2 (Up Karjat/CSMT)'],
    lat: 18.8354,
    lon: 73.3341,
    popular: false
  },
  {
    id: 'LOWJEE',
    code: 'LWJ',
    name: 'Lowjee',
    aliases: ['LWJ'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Khopoli)', 'PF 2 (Up Karjat/CSMT)'],
    lat: 18.8123,
    lon: 73.3387,
    popular: false
  },

  // --- VASAI ROAD - DIVA JUNCTION CROSS-CORRIDOR ---
  {
    id: 'JUCHANDRA',
    code: 'JCNR',
    name: 'Juchandra',
    aliases: ['JCNR', 'Naigaon East'],
    lines: ['western', 'central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Diva)', 'PF 2 (Up Vasai Road)'],
    lat: 19.3456,
    lon: 72.8765,
    popular: false
  },
  {
    id: 'KAMAN_ROAD',
    code: 'KARD',
    name: 'Kaman Road',
    aliases: ['KARD', 'Kaman'],
    lines: ['western', 'central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Diva)', 'PF 2 (Up Vasai Road)'],
    lat: 19.3241,
    lon: 72.9123,
    popular: false
  },
  {
    id: 'KHARBAV',
    code: 'KLV',
    name: 'Kharbav',
    aliases: ['KLV', 'Paygaon'],
    lines: ['western', 'central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Diva)', 'PF 2 (Up Vasai Road)'],
    lat: 19.2987,
    lon: 72.9654,
    popular: false
  },
  {
    id: 'BHIWANDI_ROAD',
    code: 'BIRD',
    name: 'Bhiwandi Road',
    aliases: ['BIRD', 'Bhiwandi', 'Bhiwandi City'],
    lines: ['western', 'central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Diva)', 'PF 2 (Up Vasai Road)'],
    lat: 19.2812,
    lon: 73.0234,
    popular: true
  },

  // --- NERUL / SEAWOODS - URAN CROSS-CORRIDOR ---
  {
    id: 'SAGAR_SANGAM',
    code: 'SGRS',
    name: 'Sagar Sangam',
    aliases: ['SGRS', 'Sector 54 Nerul'],
    lines: ['harbour'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Uran)', 'PF 2 (Up Nerul)'],
    lat: 18.9987,
    lon: 73.0189,
    popular: false
  },
  {
    id: 'TARGHAR',
    code: 'TRGR',
    name: 'Targhar',
    aliases: ['TRGR', 'Navi Mumbai International Airport', 'NMIA'],
    lines: ['harbour'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Uran)', 'PF 2 (Up Nerul)'],
    lat: 18.9832,
    lon: 73.0234,
    popular: true
  },
  {
    id: 'BAMANDONGRI',
    code: 'BMDR',
    name: 'Bamandongri',
    aliases: ['BMDR', 'Ulwe Sector 19'],
    lines: ['harbour'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Uran)', 'PF 2 (Up Nerul)'],
    lat: 18.9654,
    lon: 73.0267,
    popular: true
  },
  {
    id: 'KHARKOPAR',
    code: 'KARP',
    name: 'Kharkopar',
    aliases: ['KARP', 'Ulwe Sector 17'],
    lines: ['harbour'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Uran)', 'PF 2 (Up Nerul)'],
    lat: 18.9489,
    lon: 73.0298,
    popular: true
  },
  {
    id: 'SHEMTIKHAR',
    code: 'SEMK',
    name: 'Shemtikhar',
    aliases: ['SEMK'],
    lines: ['harbour'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Uran)', 'PF 2 (Up Nerul)'],
    lat: 18.9321,
    lon: 73.0287,
    popular: false
  },
  {
    id: 'NHAVA_SHEVA',
    code: 'NESH',
    name: 'Nhava Sheva',
    aliases: ['NESH', 'JNPT', 'Jawaharlal Nehru Port'],
    lines: ['harbour'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Uran)', 'PF 2 (Up Nerul)'],
    lat: 18.9145,
    lon: 73.0178,
    popular: true
  },
  {
    id: 'DRONAGIRI',
    code: 'DRGI',
    name: 'Dronagiri',
    aliases: ['DRGI', 'Dronagiri Node'],
    lines: ['harbour'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Uran)', 'PF 2 (Up Nerul)'],
    lat: 18.8923,
    lon: 73.0034,
    popular: false
  },
  {
    id: 'URAN',
    code: 'UNR',
    name: 'Uran City',
    aliases: ['UNR', 'Uran Terminus'],
    lines: ['harbour'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Terminus)', 'PF 2 (Terminus)'],
    lat: 18.8789,
    lon: 72.9876,
    popular: true
  },

  // --- PANVEL - ROHA CROSS-CORRIDOR ---
  {
    id: 'SOMATNE',
    code: 'SMNE',
    name: 'Somatne',
    aliases: ['SMNE'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Roha)', 'PF 2 (Up Panvel)'],
    lat: 18.9567,
    lon: 73.1456,
    popular: false
  },
  {
    id: 'RASAYANI',
    code: 'RSYI',
    name: 'Rasayani',
    aliases: ['RSYI', 'HOCL Colony', 'Patalganga'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Roha)', 'PF 2 (Up Panvel)'],
    lat: 18.8934,
    lon: 73.1678,
    popular: false
  },
  {
    id: 'APTA',
    code: 'APTA',
    name: 'Apta',
    aliases: ['APTA', 'Apta Railway Station'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Roha)', 'PF 2 (Up Panvel)'],
    lat: 18.8543,
    lon: 73.1489,
    popular: false
  },
  {
    id: 'JITE',
    code: 'JITE',
    name: 'Jite',
    aliases: ['JITE'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Roha)', 'PF 2 (Up Panvel)'],
    lat: 18.8023,
    lon: 73.1345,
    popular: false
  },
  {
    id: 'HAMRAPUR',
    code: 'HMRR',
    name: 'Hamrapur',
    aliases: ['HMRR'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Roha)', 'PF 2 (Up Panvel)'],
    lat: 18.7567,
    lon: 73.1234,
    popular: false
  },
  {
    id: 'PEN',
    code: 'PEN',
    name: 'Pen',
    aliases: ['PEN', 'Pen City', 'Ganpati Idols'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Roha)', 'PF 2 (Up Panvel)'],
    lat: 18.7345,
    lon: 73.0987,
    popular: true
  },
  {
    id: 'KASU',
    code: 'KASU',
    name: 'Kasu',
    aliases: ['KASU'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Roha)', 'PF 2 (Up Panvel)'],
    lat: 18.6654,
    lon: 73.1234,
    popular: false
  },
  {
    id: 'NAGOTHANE',
    code: 'NGTN',
    name: 'Nagothane',
    aliases: ['NGTN', 'IPCL Complex', 'RIL Nagothane'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Roha)', 'PF 2 (Up Panvel)'],
    lat: 18.5345,
    lon: 73.1456,
    popular: true
  },
  {
    id: 'NIDI',
    code: 'NIDI',
    name: 'Nidi',
    aliases: ['NIDI'],
    lines: ['central'],
    isInterchange: false,
    interchangeLines: [],
    platforms: ['PF 1 (Down Roha)', 'PF 2 (Up Panvel)'],
    lat: 18.4765,
    lon: 73.1567,
    popular: false
  },
  {
    id: 'ROHA',
    code: 'ROHA',
    name: 'Roha',
    aliases: ['ROHA', 'Roha Terminus', 'Konkan Railway Entry'],
    lines: ['central'],
    isInterchange: true,
    interchangeLines: ['Central Suburban / MEMU Terminus', 'Konkan Railway Interchange'],
    platforms: ['PF 1 (Suburban / MEMU)', 'PF 2 (Express)', 'PF 3 (Express)'],
    lat: 18.4356,
    lon: 73.1189,
    popular: true
  }
];

// Helper: Quick station index lookup by id
const STATIONS_BY_ID = {};
MUMBAI_STATIONS.forEach(s => {
  STATIONS_BY_ID[s.id] = s;
});

// Real platform allocation guides in Mumbai
const PLATFORM_GUIDES = {
  DADAR: {
    central: [
      { pf: 'PF 1', dir: 'Down Slow', dest: 'Kalyan / Titwala / Ambernath / Badlapur / Karjat' },
      { pf: 'PF 2', dir: 'Down Slow', dest: 'Thane / Dombivli / Kalyan' },
      { pf: 'PF 3', dir: 'Up Slow', dest: 'CSMT (All stops)' },
      { pf: 'PF 4', dir: 'Down Fast', dest: 'Kalyan / Titwala / Kasara / Karjat / Khopoli' },
      { pf: 'PF 5', dir: 'Up Fast', dest: 'CSMT (Non-stop / Byculla)' },
      { pf: 'PF 6', dir: 'Down / Terminus', dest: 'Terminating locals & Outstation express' }
    ],
    western: [
      { pf: 'PF 1', dir: 'Down Slow', dest: 'Andheri / Borivali / Bhayandar / Virar' },
      { pf: 'PF 2', dir: 'Up Slow', dest: 'Churchgate (All stops)' },
      { pf: 'PF 3', dir: 'Down Fast', dest: 'Andheri / Borivali / Bhayandar / Vasai / Virar' },
      { pf: 'PF 4', dir: 'Up Fast', dest: 'Churchgate (Stops Mumbai Central)' },
      { pf: 'PF 5', dir: 'Terminus / Down', dest: 'Originating Borivali / Virar fast locals' }
    ]
  },
  KURLA: {
    central: [
      { pf: 'PF 1', dir: 'Down Slow', dest: 'Ghatkopar / Mulund / Thane / Kalyan' },
      { pf: 'PF 2', dir: 'Up Slow', dest: 'Dadar / Byculla / CSMT' },
      { pf: 'PF 3', dir: 'Down Fast', dest: 'Ghatkopar / Mulund / Thane / Dombivli / Kalyan' },
      { pf: 'PF 4', dir: 'Up Fast', dest: 'Dadar / CSMT' },
      { pf: 'PF 5 & 6', dir: 'Terminating', dest: 'Kurla Car Shed & LTT Express' }
    ],
    harbour: [
      { pf: 'PF 7', dir: 'Down Harbour', dest: 'Vashi / Belapur / Panvel' },
      { pf: 'PF 8', dir: 'Up Harbour', dest: 'Vadala Road / CSMT' }
    ]
  },
  ANDHERI: {
    western: [
      { pf: 'PF 1', dir: 'Down Slow', dest: 'Borivali / Bhayandar / Vasai / Virar' },
      { pf: 'PF 2', dir: 'Up Slow', dest: 'Bandra / Dadar / Mumbai Central / Churchgate' },
      { pf: 'PF 3', dir: 'Terminus Slow', dest: 'Originating Slow to Churchgate' },
      { pf: 'PF 4', dir: 'Down Fast', dest: 'Borivali / Vasai / Virar' },
      { pf: 'PF 5', dir: 'Up Fast', dest: 'Bandra / Dadar / Mumbai Central / Churchgate' }
    ],
    harbour: [
      { pf: 'PF 6', dir: 'Down Harbour', dest: 'Goregaon' },
      { pf: 'PF 7', dir: 'Up Harbour', dest: 'Bandra / Vadala Road / CSMT' }
    ]
  },
  THANE: {
    central: [
      { pf: 'PF 1 & 2', dir: 'Slow Terminus', dest: 'Originating Slow to CSMT / Dadar' },
      { pf: 'PF 3', dir: 'Down Slow', dest: 'Diva / Dombivli / Kalyan' },
      { pf: 'PF 4', dir: 'Up Slow', dest: 'Mulund / Bhandup / Ghatkopar / Kurla / CSMT' },
      { pf: 'PF 5', dir: 'Down Fast', dest: 'Dombivli / Kalyan / Kasara / Karjat' },
      { pf: 'PF 6', dir: 'Up Fast', dest: 'Mulund / Ghatkopar / Kurla / Dadar / CSMT' },
      { pf: 'PF 7', dir: 'Fast Terminus', dest: 'Originating Fast to CSMT' }
    ],
    transharbour: [
      { pf: 'PF 9 & 10', dir: 'Trans-Harbour', dest: 'Airoli / Ghansoli / Kopar Khairane / Turbhe / Vashi / Nerul / Panvel' }
    ]
  },
  CSMT: {
    central: [
      { pf: 'PF 1 & 2', dir: 'Harbour Line', dest: 'Vadala / Kurla / Vashi / Belapur / Panvel / Goregaon' },
      { pf: 'PF 3 & 4', dir: 'Down Slow', dest: 'All stations to Thane / Kalyan / Titwala / Badlapur / Karjat' },
      { pf: 'PF 5 & 6', dir: 'Down Fast', dest: 'Byculla / Dadar / Kurla / Ghatkopar / Mulund / Thane / Kalyan' },
      { pf: 'PF 7', dir: 'Special / Fast', dest: 'Peak Hour Fast Services' }
    ]
  },
  BORIVALI: {
    western: [
      { pf: 'PF 1 & 2', dir: 'Terminus Slow', dest: 'Originating Churchgate Slow (Empty rake boarding)' },
      { pf: 'PF 3', dir: 'Down Slow', dest: 'Bhayandar / Vasai / Virar / Dahanu Road' },
      { pf: 'PF 4', dir: 'Up Slow', dest: 'Kandivali / Malad / Andheri / Dadar / Churchgate' },
      { pf: 'PF 5', dir: 'Down Fast', dest: 'Bhayandar / Vasai / Virar' },
      { pf: 'PF 6', dir: 'Up Fast', dest: 'Andheri / Bandra / Dadar / Mumbai Central / Churchgate' },
      { pf: 'PF 7 & 8', dir: 'Fast Terminus', dest: 'Originating Fast to Churchgate (Peak hour)' }
    ]
  }
};

// Master Network Validation Function
function validateRailwayNetwork(stations = MUMBAI_STATIONS, corridors = (typeof CORRIDORS !== 'undefined' ? CORRIDORS : null), stationsById = STATIONS_BY_ID) {
  const issues = [];
  const warnings = [];

  // 1. Check duplicate station IDs and coordinate validity
  const seenIds = new Set();
  const seenCoords = new Map();

  stations.forEach(st => {
    if (seenIds.has(st.id)) {
      issues.push(`Duplicate station ID: ${st.id}`);
    }
    seenIds.add(st.id);

    if (st.lat == null || st.lon == null || isNaN(st.lat) || isNaN(st.lon)) {
      issues.push(`Invalid GPS coordinates for station: ${st.id}`);
    } else {
      const coordKey = `${st.lat.toFixed(4)},${st.lon.toFixed(4)}`;
      if (seenCoords.has(coordKey) && seenCoords.get(coordKey) !== st.id) {
        warnings.push(`Potentially duplicate physical location for ${st.id} and ${seenCoords.get(coordKey)}`);
      }
      seenCoords.set(coordKey, st.id);
    }

    if (!Array.isArray(st.lines) || st.lines.length === 0) {
      issues.push(`Station ${st.id} has empty lines array`);
    }
  });

  // 2. Corridors validation
  if (corridors) {
    for (const [corrKey, stList] of Object.entries(corridors)) {
      if (!Array.isArray(stList) || stList.length < 2) {
        issues.push(`Corridor ${corrKey} has fewer than 2 stations`);
        continue;
      }

      const corrSet = new Set();
      stList.forEach((stId, idx) => {
        if (!stationsById[stId]) {
          issues.push(`Corridor ${corrKey} references nonexistent station ${stId} at index ${idx}`);
        }
        if (corrSet.has(stId)) {
          issues.push(`Corridor ${corrKey} has duplicate station ${stId} at index ${idx}`);
        }
        corrSet.add(stId);
      });
    }

    // 3. Central and Western line separation check
    const westernList = corridors.western || [];
    const centralList = corridors.central_main || [];
    if (westernList.length > 0 && centralList.length > 0) {
      if (westernList.length === centralList.length && westernList.every((id, idx) => id === centralList[idx])) {
        issues.push('CRITICAL: Central and Western accidentally sharing identical station lists');
      }
    }
  }

  const result = {
    valid: issues.length === 0,
    errors: issues,
    warnings: warnings,
    stats: {
      totalStations: stations.length,
      totalCorridors: corridors ? Object.keys(corridors).length : 0
    }
  };

  if (!result.valid) {
    console.error('Railway Network Validation FAILED:', issues);
  } else {
    console.log(`%c[Transit Saathi] Railway Network Validated: ${result.stats.totalStations} stations OK`, 'color: #10B981; font-weight: bold;');
  }

  return result;
}

// Master Network Adjacency Graph Builder
function buildNetworkGraph(corridors, stationsById) {
  const graph = {};

  for (const stId in stationsById) {
    const st = stationsById[stId];
    graph[stId] = {
      id: stId,
      name: st.name,
      code: st.code,
      lines: st.lines || [],
      isInterchange: st.isInterchange || false,
      neighbors: []
    };
  }

  if (corridors) {
    for (const [corrKey, stList] of Object.entries(corridors)) {
      for (let i = 0; i < stList.length - 1; i++) {
        const u = stList[i];
        const v = stList[i + 1];
        if (!graph[u] || !graph[v]) continue;

        if (!graph[u].neighbors.some(n => n.to === v && n.corridor === corrKey)) {
          graph[u].neighbors.push({ to: v, corridor: corrKey, weight: 3 });
        }
        if (!graph[v].neighbors.some(n => n.to === u && n.corridor === corrKey)) {
          graph[v].neighbors.push({ to: u, corridor: corrKey, weight: 3 });
        }
      }
    }
  }

  // Physical interchanges across lines (Foot-Over-Bridge connections)
  const physicalTransfers = [
    { from: 'PRABHADEVI', to: 'PAREL', minutes: 4, label: 'FOB (WR <-> CR)' },
    { from: 'PAREL', to: 'PRABHADEVI', minutes: 4, label: 'FOB (CR <-> WR)' }
  ];
  for (const pt of physicalTransfers) {
    if (graph[pt.from] && graph[pt.to]) {
      if (!graph[pt.from].neighbors.some(n => n.to === pt.to)) {
        graph[pt.from].neighbors.push({ to: pt.to, corridor: 'interchange', weight: pt.minutes, isInterchange: true });
      }
    }
  }

  return graph;
}
