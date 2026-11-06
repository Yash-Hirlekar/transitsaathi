// Transit Saathi - Timetable Engine
// Generates realistic Mumbai Suburban schedules, fast/slow patterns, platforms, and live statuses

const TimetableEngine = (function() {

  // Average transit minutes between consecutive stations
  const AVG_MINS_PER_STOP = {
    western_slow: 2.8,
    western_fast: 1.8,
    central_slow: 3.0,
    central_fast: 2.0,
    harbour: 2.7,
    transharbour: 3.2,
    vasai_diva: 4.8,
    nerul_uran: 3.5,
    panvel_roha: 5.5
  };

  // Helper: Format minutes into HH:MM AM/PM
  function minutesToTimeStr(totalMinutes) {
    let normalized = ((Math.floor(totalMinutes) % 1440) + 1440) % 1440;
    let hours = Math.floor(normalized / 60);
    let mins = normalized % 60;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 becomes 12
    const minsStr = mins < 10 ? '0' + mins : mins;
    const hoursStr = hours < 10 ? '0' + hours : hours;
    return `${hoursStr}:${minsStr} ${ampm}`;
  }

  // Parse time string "08:42 PM" to minutes from midnight
  function timeStrToMinutes(timeStr) {
    if (!timeStr) return 0;
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!match) return 0;
    let hours = parseInt(match[1], 10);
    const mins = parseInt(match[2], 10);
    const ampm = match[3] ? match[3].toUpperCase() : 'AM';
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return hours * 60 + mins;
  }

  // Get current local Mumbai minutes (True IST UTC+5:30)
  function getMumbaiCurrentMinutes() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const ist = new Date(utc + (330 * 60000));
    return ist.getHours() * 60 + ist.getMinutes();
  }

  // Ordered list of station IDs on each corridor
  const CORRIDORS = {
    western: [
      'CHURCHGATE', 'MARINE_LINES', 'CHARNI_ROAD', 'GRANT_ROAD', 'MUMBAI_CENTRAL',
      'MAHALAXMI', 'LOWER_PAREL', 'PRABHADEVI', 'DADAR', 'MATUNGA_ROAD',
      'MAHIM_JN', 'BANDRA', 'KHAR_ROAD', 'SANTACRUZ', 'VILE_PARLE',
      'ANDHERI', 'JOGESHWARI', 'RAM_MANDIR', 'GOREGAON', 'MALAD',
      'KANDIVALI', 'BORIVALI', 'DAHISAR', 'MIRA_ROAD', 'BHAYANDAR',
      'NAIGAON', 'VASAI_ROAD', 'NALLASOPARA', 'VIRAR', 'VAITARNA',
      'SAPHALE', 'KELVE_ROAD', 'PALGHAR', 'UMROLI', 'BOISAR',
      'VANGAON', 'DAHANU_ROAD'
    ],
    central_main: [
      'CSMT', 'MASJID', 'SANDHURST_ROAD', 'BYCULLA', 'CHINCHPOKLI',
      'CURREY_ROAD', 'PAREL', 'DADAR', 'MATUNGA', 'SION',
      'KURLA', 'VIDYAVIHAR', 'GHATKOPAR', 'VIKHROLI', 'KANJURMARG',
      'BHANDUP', 'NAHUR', 'MULUND', 'THANE', 'KALVA',
      'MUMBRA', 'DIVA_JN', 'KOPAR', 'DOMBIVLI', 'THAKURLI', 'KALYAN'
    ],
    central_kasara: [
      'KALYAN', 'SHAHAD', 'AMBIVLI', 'TITWALA', 'KHADAVLI', 'VASIND',
      'ASANGAON', 'ATGAON', 'THANSIT', 'KHARDI', 'UMBERMALI', 'KASARA'
    ],
    central_karjat: [
      'KALYAN', 'VITHALWADI', 'ULHASNAGAR', 'AMBERNATH', 'BADLAPUR',
      'VANGANI', 'SHELU', 'NERAL', 'BHIVPURI_ROAD', 'KARJAT',
      'PALASDHARI', 'KELAVLI', 'DOLAVLI', 'LOWJEE', 'KHOPOLI'
    ],
    harbour_main: [
      'CSMT', 'MASJID', 'SANDHURST_ROAD', 'DOCKYARD_ROAD', 'REAY_ROAD',
      'COTTON_GREEN', 'SEWRI', 'VADALA_ROAD', 'GTB_NAGAR', 'CHUNABHATTI',
      'KURLA', 'TILAK_NAGAR', 'CHEMBUR', 'GOVANDI', 'MANKHURD',
      'VASHI', 'SANPADA', 'JUINAGAR', 'NERUL', 'SEAWOODS',
      'BELAPUR_CBD', 'KHARGHAR', 'MANSAROVAR', 'KHANDESHWAR', 'PANVEL'
    ],
    harbour_goregaon: [
      'CSMT', 'MASJID', 'SANDHURST_ROAD', 'DOCKYARD_ROAD', 'REAY_ROAD',
      'COTTON_GREEN', 'SEWRI', 'VADALA_ROAD', 'KINGS_CIRCLE', 'MAHIM_JN',
      'BANDRA', 'KHAR_ROAD', 'SANTACRUZ', 'VILE_PARLE', 'ANDHERI',
      'JOGESHWARI', 'RAM_MANDIR', 'GOREGAON'
    ],
    transharbour: [
      'THANE', 'DIGHA_GAON', 'AIROLI', 'RABALE', 'GHANSOLI',
      'KOPAR_KHAIRANE', 'TURBHE', 'SANPADA', 'VASHI', 'JUINAGAR', 'NERUL', 'PANVEL'
    ],
    vasai_diva: [
      'VASAI_ROAD', 'JUCHANDRA', 'KAMAN_ROAD', 'KHARBAV', 'BHIWANDI_ROAD', 'KOPAR', 'DIVA_JN'
    ],
    nerul_uran: [
      'NERUL', 'SEAWOODS', 'SAGAR_SANGAM', 'TARGHAR', 'BAMANDONGRI', 'KHARKOPAR', 'SHEMTIKHAR', 'NHAVA_SHEVA', 'DRONAGIRI', 'URAN'
    ],
    panvel_roha: [
      'PANVEL', 'SOMATNE', 'RASAYANI', 'APTA', 'JITE', 'HAMRAPUR', 'PEN', 'KASU', 'NAGOTHANE', 'NIDI', 'ROHA'
    ]
  };

  // Check if a station is on a given corridor
  function getStationIndexInCorridor(stationId, corridorKey) {
    const list = CORRIDORS[corridorKey];
    return list ? list.indexOf(stationId) : -1;
  }

  // Determine line for pair of stations
  function findDirectLine(fromId, toId) {
    // 1. Western
    const wFrom = getStationIndexInCorridor(fromId, 'western');
    const wTo = getStationIndexInCorridor(toId, 'western');
    if (wFrom !== -1 && wTo !== -1 && wFrom !== wTo) {
      return { line: 'western', corridor: 'western', fromIdx: wFrom, toIdx: wTo };
    }

    // 2. Central Main Line
    const cFrom = getStationIndexInCorridor(fromId, 'central_main');
    const cTo = getStationIndexInCorridor(toId, 'central_main');
    if (cFrom !== -1 && cTo !== -1 && cFrom !== cTo) {
      return { line: 'central', corridor: 'central_main', fromIdx: cFrom, toIdx: cTo };
    }

    // 2b. Central Kasara Branch
    const kasaraFrom = getStationIndexInCorridor(fromId, 'central_kasara');
    const kasaraTo = getStationIndexInCorridor(toId, 'central_kasara');
    if (kasaraFrom !== -1 && kasaraTo !== -1 && kasaraFrom !== kasaraTo) {
      return { line: 'central', corridor: 'central_kasara', fromIdx: kasaraFrom, toIdx: kasaraTo };
    }
    const cKasaraFrom = getCentralKasaraCompositeIndex(fromId);
    const cKasaraTo = getCentralKasaraCompositeIndex(toId);
    if (cKasaraFrom !== -1 && cKasaraTo !== -1 && cKasaraFrom !== cKasaraTo) {
      return { line: 'central', corridor: 'central_kasara_composite', fromIdx: cKasaraFrom, toIdx: cKasaraTo };
    }

    // 2c. Central Karjat / Khopoli Branch
    const karjatFrom = getStationIndexInCorridor(fromId, 'central_karjat');
    const karjatTo = getStationIndexInCorridor(toId, 'central_karjat');
    if (karjatFrom !== -1 && karjatTo !== -1 && karjatFrom !== karjatTo) {
      return { line: 'central', corridor: 'central_karjat', fromIdx: karjatFrom, toIdx: karjatTo };
    }
    const cKarjatFrom = getCentralKarjatCompositeIndex(fromId);
    const cKarjatTo = getCentralKarjatCompositeIndex(toId);
    if (cKarjatFrom !== -1 && cKarjatTo !== -1 && cKarjatFrom !== cKarjatTo) {
      return { line: 'central', corridor: 'central_karjat_composite', fromIdx: cKarjatFrom, toIdx: cKarjatTo };
    }

    // 3. Harbour Main
    const hFrom = getStationIndexInCorridor(fromId, 'harbour_main');
    const hTo = getStationIndexInCorridor(toId, 'harbour_main');
    if (hFrom !== -1 && hTo !== -1 && hFrom !== hTo) {
      return { line: 'harbour', corridor: 'harbour_main', fromIdx: hFrom, toIdx: hTo };
    }

    // 4. Harbour Goregaon branch
    const hgFrom = getStationIndexInCorridor(fromId, 'harbour_goregaon');
    const hgTo = getStationIndexInCorridor(toId, 'harbour_goregaon');
    if (hgFrom !== -1 && hgTo !== -1 && hgFrom !== hgTo) {
      return { line: 'harbour', corridor: 'harbour_goregaon', fromIdx: hgFrom, toIdx: hgTo };
    }

    // 5. Trans-Harbour
    const thFrom = getStationIndexInCorridor(fromId, 'transharbour');
    const thTo = getStationIndexInCorridor(toId, 'transharbour');
    if (thFrom !== -1 && thTo !== -1 && thFrom !== thTo) {
      return { line: 'transharbour', corridor: 'transharbour', fromIdx: thFrom, toIdx: thTo };
    }

    // 6. Vasai Road - Diva Junction Cross-Corridor
    const vdFrom = getStationIndexInCorridor(fromId, 'vasai_diva');
    const vdTo = getStationIndexInCorridor(toId, 'vasai_diva');
    if (vdFrom !== -1 && vdTo !== -1 && vdFrom !== vdTo) {
      return { line: 'central', corridor: 'vasai_diva', fromIdx: vdFrom, toIdx: vdTo };
    }

    // 7. Nerul / Seawoods - Uran Cross-Corridor
    const nuFrom = getStationIndexInCorridor(fromId, 'nerul_uran');
    const nuTo = getStationIndexInCorridor(toId, 'nerul_uran');
    if (nuFrom !== -1 && nuTo !== -1 && nuFrom !== nuTo) {
      return { line: 'harbour', corridor: 'nerul_uran', fromIdx: nuFrom, toIdx: nuTo };
    }

    // 8. Panvel - Roha Cross-Corridor
    const prFrom = getStationIndexInCorridor(fromId, 'panvel_roha');
    const prTo = getStationIndexInCorridor(toId, 'panvel_roha');
    if (prFrom !== -1 && prTo !== -1 && prFrom !== prTo) {
      return { line: 'central', corridor: 'panvel_roha', fromIdx: prFrom, toIdx: prTo };
    }

    return null;
  }

  function getCentralKasaraCompositeIndex(stationId) {
    const mainIdx = CORRIDORS.central_main.indexOf(stationId);
    if (mainIdx !== -1) return mainIdx;
    const kasaraIdx = CORRIDORS.central_kasara.indexOf(stationId);
    if (kasaraIdx > 0) return CORRIDORS.central_main.length - 1 + kasaraIdx;
    return -1;
  }

  function getCentralKarjatCompositeIndex(stationId) {
    const mainIdx = CORRIDORS.central_main.indexOf(stationId);
    if (mainIdx !== -1) return mainIdx;
    const karjatIdx = CORRIDORS.central_karjat.indexOf(stationId);
    if (karjatIdx > 0) return CORRIDORS.central_main.length - 1 + karjatIdx;
    return -1;
  }

  // Get realistic platform for station on a line and direction
  function getRealisticPlatform(stationId, line, isDown, isFast) {
    const station = STATIONS_BY_ID[stationId];
    if (!station) return 'PF 1';

    if (stationId === 'CSMT') {
      if (line === 'harbour') return isDown ? 'PF 1' : 'PF 2';
      return isFast ? 'PF 5' : 'PF 3';
    }
    if (stationId === 'CHURCHGATE') {
      return isFast ? 'PF 3' : 'PF 1';
    }
    if (stationId === 'DADAR') {
      if (line === 'western') {
        if (isDown) return isFast ? 'PF 3' : 'PF 1';
        return isFast ? 'PF 4' : 'PF 2';
      } else {
        if (isDown) return isFast ? 'PF 4' : 'PF 1';
        return isFast ? 'PF 5' : 'PF 3';
      }
    }
    if (stationId === 'KURLA') {
      if (line === 'harbour') return isDown ? 'PF 7' : 'PF 8';
      if (isDown) return isFast ? 'PF 3' : 'PF 1';
      return isFast ? 'PF 4' : 'PF 2';
    }
    if (stationId === 'THANE') {
      if (line === 'transharbour') return 'PF 9';
      if (isDown) return isFast ? 'PF 5' : 'PF 3';
      return isFast ? 'PF 6' : 'PF 4';
    }
    if (stationId === 'ANDHERI') {
      if (line === 'harbour') return isDown ? 'PF 6' : 'PF 7';
      if (isDown) return isFast ? 'PF 4' : 'PF 1';
      return isFast ? 'PF 5' : 'PF 2';
    }
    if (stationId === 'BORIVALI') {
      if (isDown) return isFast ? 'PF 5' : 'PF 3';
      return isFast ? 'PF 6' : 'PF 4';
    }
    if (stationId === 'PANVEL') {
      return line === 'transharbour' ? 'PF 3' : 'PF 1';
    }

    // Default heuristics: Odd platform for Down, Even platform for Up
    if (isDown) {
      return isFast ? 'PF 3' : 'PF 1';
    } else {
      return isFast ? 'PF 4' : 'PF 2';
    }
  }

  // Realistic status determination (simulating live suburban running)
  function getRealisticStatus(trainSeedMinute) {
    // Deterministic pseudo-random based on train seed minute
    const hash = ((trainSeedMinute * 9301 + 49297) % 233280) / 233280;
    if (hash < 0.70) {
      return { code: 'ON_TIME', label: 'ON TIME', delayMin: 0, class: 'status-ontime' };
    } else if (hash < 0.90) {
      const delay = Math.floor(hash * 20) % 6 + 2; // 2 to 7 mins
      return { code: 'DELAYED', label: `DELAYED · ${delay} MIN`, delayMin: delay, class: 'status-delayed' };
    } else if (hash < 0.96) {
      const delay = Math.floor(hash * 30) % 9 + 8; // 8 to 16 mins
      return { code: 'DELAYED', label: `DELAYED · ${delay} MIN`, delayMin: delay, class: 'status-delayed' };
    } else {
      return { code: 'DELAYED', label: 'DELAYED · 3 MIN', delayMin: 3, class: 'status-delayed' };
    }
  }

  // Check if a station is a valid fast stop on a line
  function isStationFastStop(stationId, line) {
    if (line === 'western') {
      return FAST_STOPS_WESTERN.includes(stationId);
    }
    if (line === 'central') {
      return FAST_STOPS_CENTRAL.includes(stationId);
    }
    return true; // Harbour doesn't have regular fast trains
  }

  // Build route stops between any origin and terminus
  function buildStopsBetween(originId, termId, line, isFast, startMinutes) {
    let stationList = [];
    if (line === 'western') {
      stationList = CORRIDORS.western;
    } else if (line === 'transharbour') {
      stationList = CORRIDORS.transharbour;
    } else if (line === 'harbour') {
      if (CORRIDORS.nerul_uran.includes(originId) || CORRIDORS.nerul_uran.includes(termId)) {
        stationList = CORRIDORS.nerul_uran;
      } else if (termId === 'GOREGAON' || originId === 'GOREGAON' || (CORRIDORS.harbour_goregaon.includes(termId) && !CORRIDORS.harbour_main.includes(termId))) {
        stationList = CORRIDORS.harbour_goregaon;
      } else {
        stationList = CORRIDORS.harbour_main;
      }
    } else {
      // Central or cross-corridors
      if (CORRIDORS.vasai_diva.includes(originId) && CORRIDORS.vasai_diva.includes(termId)) {
        stationList = CORRIDORS.vasai_diva;
      } else if (CORRIDORS.panvel_roha.includes(originId) && CORRIDORS.panvel_roha.includes(termId)) {
        stationList = CORRIDORS.panvel_roha;
      } else if (CORRIDORS.central_kasara.includes(termId) || CORRIDORS.central_kasara.includes(originId)) {
        if (CORRIDORS.central_kasara.includes(originId) && CORRIDORS.central_kasara.includes(termId)) {
          stationList = CORRIDORS.central_kasara;
        } else {
          stationList = [...CORRIDORS.central_main, ...CORRIDORS.central_kasara.slice(1)];
        }
      } else if (CORRIDORS.central_karjat.includes(termId) || CORRIDORS.central_karjat.includes(originId)) {
        if (CORRIDORS.central_karjat.includes(originId) && CORRIDORS.central_karjat.includes(termId)) {
          stationList = CORRIDORS.central_karjat;
        } else {
          stationList = [...CORRIDORS.central_main, ...CORRIDORS.central_karjat.slice(1)];
        }
      } else {
        stationList = CORRIDORS.central_main;
      }
    }

    const origIdx = stationList.indexOf(originId);
    const termIdx = stationList.indexOf(termId);
    if (origIdx === -1 || termIdx === -1) return [];

    const isDown = origIdx < termIdx;
    const step = isDown ? 1 : -1;

    const stops = [];
    let currentMin = startMinutes;

    for (let i = origIdx; isDown ? i <= termIdx : i >= termIdx; i += step) {
      const sId = stationList[i];
      const sData = STATIONS_BY_ID[sId];
      if (!sData) continue;

      const isStopSkipped = isFast && !isStationFastStop(sId, line);

      const pf = getRealisticPlatform(sId, line, isDown, isFast);

      stops.push({
        stationId: sId,
        stationName: sData.name,
        stationCode: sData.code,
        arrivalTime: minutesToTimeStr(currentMin),
        departureTime: minutesToTimeStr(currentMin + (sId === originId || sId === termId ? 0 : 0.5)),
        rawMinutes: currentMin,
        platform: pf,
        isSkipped: isStopSkipped,
        isInterchange: sData.isInterchange,
        interchangeLines: sData.interchangeLines || []
      });

      if (!isStopSkipped) {
        let pace = 2.8;
        if (AVG_MINS_PER_STOP[`${line}_fast`] && isFast) {
          pace = AVG_MINS_PER_STOP[`${line}_fast`];
        } else if (AVG_MINS_PER_STOP[`${line}_slow`]) {
          pace = AVG_MINS_PER_STOP[`${line}_slow`];
        } else if (AVG_MINS_PER_STOP[line]) {
          pace = AVG_MINS_PER_STOP[line];
        }
        currentMin += pace;
      } else {
        currentMin += 1.2; // Quick fly-through
      }
    }

    return stops;
  }

  // Generate trains for a direct corridor
  function generateDirectTrains(fromId, toId, lineInfo, baseTimeMinutes, count = 20) {
    const fromStation = STATIONS_BY_ID[fromId];
    const toStation = STATIONS_BY_ID[toId];
    if (!fromStation || !toStation) return [];

    const isDown = lineInfo.fromIdx < lineInfo.toIdx;
    const lineKey = lineInfo.line;

    // Pick typical destinations based on line and direction
    let destinations = [];
    let origins = [];

    if (lineKey === 'western') {
      if (isDown) {
        // Down trains heading North from Churchgate / Dadar / Andheri towards Borivali, Virar, Dahanu
        origins = ['CHURCHGATE', 'DADAR', 'ANDHERI', 'BORIVALI'];
        destinations = ['BORIVALI', 'VIRAR', 'VASAI_ROAD', 'BHAYANDAR', 'DAHANU_ROAD', 'GOREGAON', 'ANDHERI'];
      } else {
        // Up trains heading South towards Churchgate
        origins = ['DAHANU_ROAD', 'VIRAR', 'BORIVALI', 'BHAYANDAR', 'VASAI_ROAD', 'GOREGAON', 'ANDHERI'];
        destinations = ['CHURCHGATE', 'DADAR', 'MUMBAI_CENTRAL', 'BANDRA'];
      }
    } else if (lineInfo.corridor === 'vasai_diva') {
      if (isDown) {
        origins = ['VASAI_ROAD'];
        destinations = ['DIVA_JN', 'BHIWANDI_ROAD', 'KOPAR'];
      } else {
        origins = ['DIVA_JN', 'BHIWANDI_ROAD'];
        destinations = ['VASAI_ROAD'];
      }
    } else if (lineInfo.corridor === 'nerul_uran') {
      if (isDown) {
        origins = ['NERUL', 'SEAWOODS'];
        destinations = ['URAN', 'KHARKOPAR'];
      } else {
        origins = ['URAN', 'KHARKOPAR'];
        destinations = ['NERUL', 'SEAWOODS'];
      }
    } else if (lineInfo.corridor === 'panvel_roha') {
      if (isDown) {
        origins = ['PANVEL'];
        destinations = ['ROHA', 'PEN'];
      } else {
        origins = ['ROHA', 'PEN'];
        destinations = ['PANVEL'];
      }
    } else if (lineKey === 'central') {
      if (isDown) {
        // Down trains heading towards Thane, Kalyan, Kasara, Karjat
        origins = ['CSMT', 'DADAR', 'KURLA', 'THANE', 'KALYAN'];
        destinations = ['THANE', 'KALYAN', 'DOMBIVLI', 'TITWALA', 'ASANGAON', 'KASARA', 'AMBERNATH', 'BADLAPUR', 'KARJAT', 'KHOPOLI'];
      } else {
        // Up trains heading towards CSMT
        origins = ['KASARA', 'ASANGAON', 'TITWALA', 'KHOPOLI', 'KARJAT', 'BADLAPUR', 'AMBERNATH', 'KALYAN', 'DOMBIVLI', 'THANE'];
        destinations = ['CSMT', 'DADAR', 'KURLA', 'THANE'];
      }
    } else if (lineKey === 'harbour') {
      if (isDown) {
        origins = ['CSMT', 'VADALA_ROAD'];
        destinations = (toId === 'GOREGAON' || toId === 'ANDHERI' || toId === 'BANDRA')
          ? ['GOREGAON', 'ANDHERI', 'BANDRA']
          : ['PANVEL', 'BELAPUR_CBD', 'VASHI', 'MANKHURD'];
      } else {
        origins = ['PANVEL', 'BELAPUR_CBD', 'VASHI', 'GOREGAON', 'ANDHERI'];
        destinations = ['CSMT', 'VADALA_ROAD', 'BANDRA'];
      }
    } else if (lineKey === 'transharbour') {
      if (isDown) {
        origins = ['THANE'];
        destinations = ['PANVEL', 'VASHI', 'NERUL'];
      } else {
        origins = ['PANVEL', 'VASHI', 'NERUL'];
        destinations = ['THANE'];
      }
    }

    // Filter destinations: destination must be at or beyond `toId`
    // Ensure origin is at or before `fromId`
    const trains = [];
    let startMin = Math.floor(baseTimeMinutes / 3) * 3; // Align to 3-min slots

    // Fast train capability check for corridor
    const canHaveFast = (lineKey === 'western' || lineKey === 'central') &&
      isStationFastStop(fromId, lineKey) &&
      isStationFastStop(toId, lineKey);

    let trainSeq = 1;
    for (let slot = 0; slot < 60; slot++) {
      const trainDepMinutes = startMin + slot * (slot % 2 === 0 ? 3.5 : 4.5);
      if (trainDepMinutes < baseTimeMinutes - 2) continue;

      // Decide if Fast or Slow
      let isFast = false;
      if (canHaveFast) {
        // Fast trains alternate: every 2nd or 3rd train
        isFast = (slot % 2 === 1);
      }

      // Pick destination
      const destId = destinations[(slot + trainSeq) % destinations.length];
      const origId = origins[(slot * 2) % origins.length];
      const destStation = STATIONS_BY_ID[destId] || toStation;
      const origStation = STATIONS_BY_ID[origId] || fromStation;

      // Full stops list
      const fullStops = buildStopsBetween(origId, destId, lineKey, isFast, trainDepMinutes - 15);
      if (!fullStops || fullStops.length === 0) continue;

      // Find our fromStation and toStation within this train's stops
      const fromStop = fullStops.find(s => s.stationId === fromId && !s.isSkipped);
      const toStop = fullStops.find(s => s.stationId === toId && !s.isSkipped);

      if (!fromStop || !toStop) continue;
      if (fromStop.rawMinutes >= toStop.rawMinutes) continue; // Must be in traveling direction

      const journeyDurationMin = Math.round(toStop.rawMinutes - fromStop.rawMinutes);
      // Count stops between from and to (excluding skipped)
      const fromIdx = fullStops.indexOf(fromStop);
      const toIdx = fullStops.indexOf(toStop);
      let activeStopsCount = 0;
      for (let s = fromIdx + 1; s <= toIdx; s++) {
        if (!fullStops[s].isSkipped) activeStopsCount++;
      }

      const status = getRealisticStatus(Math.floor(fromStop.rawMinutes));
      const departureTimeStr = minutesToTimeStr(fromStop.rawMinutes + (status.delayMin || 0));
      const arrivalTimeStr = minutesToTimeStr(toStop.rawMinutes + (status.delayMin || 0));

      const trainId = `${lineKey.substring(0, 2).toUpperCase()}-${Math.floor(fromStop.rawMinutes * 7 % 8999 + 1000)}`;

      trains.push({
        id: trainId,
        line: lineKey,
        lineName: MUMBAI_RAIL_LINES[lineKey].name,
        type: isFast ? 'FAST' : 'SLOW',
        isFast: isFast,
        originId: origId,
        originName: origStation.name,
        destinationId: destId,
        destinationName: destStation.name,
        destinationCode: destStation.code,
        departureTime: departureTimeStr,
        arrivalTime: arrivalTimeStr,
        rawDepartureMinutes: fromStop.rawMinutes + (status.delayMin || 0),
        durationMinutes: journeyDurationMin,
        stopsCount: activeStopsCount,
        platform: fromStop.platform,
        destPlatform: toStop.platform,
        status: status,
        stops: fullStops,
        fromStationId: fromId,
        toStationId: toId
      });

      trainSeq++;
      if (trains.length >= count) break;
    }

    // Sort chronologically by departure
    trains.sort((a, b) => a.rawDepartureMinutes - b.rawDepartureMinutes);
    return trains;
  }

  // Find 1-Hop Interchange Journey between disconnected lines
  function findInterchangeJourney(fromId, toId, baseTimeMinutes) {
    const fromStation = STATIONS_BY_ID[fromId];
    const toStation = STATIONS_BY_ID[toId];
    if (!fromStation || !toStation) return null;

    // Common Mumbai Suburban Interchange Hubs
    const INTERCHANGE_HUBS = [
      'DADAR', 'KURLA', 'THANE', 'KALYAN', 'VASHI', 'NERUL', 'PANVEL',
      'ANDHERI', 'BANDRA', 'VADALA_ROAD', 'DIVA_JN', 'VASAI_ROAD', 'SANPADA', 'JUINAGAR'
    ];
    let bestHub = null;

    for (const hubId of INTERCHANGE_HUBS) {
      if (hubId === fromId || hubId === toId) continue;
      const leg1Direct = findDirectLine(fromId, hubId);
      const leg2Direct = findDirectLine(hubId, toId);
      if (leg1Direct && leg2Direct) {
        bestHub = hubId;
        break;
      }
    }

    if (!bestHub) return null;

    const hubStation = STATIONS_BY_ID[bestHub];
    const leg1Trains = generateDirectTrains(fromId, bestHub, findDirectLine(fromId, bestHub), baseTimeMinutes, 6);
    if (!leg1Trains.length) return null;

    const firstLeg = leg1Trains[0];
    const transferBufferMins = 6; // Commuter transfer time across foot-over-bridge
    const leg2StartMin = firstLeg.rawDepartureMinutes + firstLeg.durationMinutes + transferBufferMins;

    const leg2Trains = generateDirectTrains(bestHub, toId, findDirectLine(bestHub, toId), leg2StartMin, 6);
    if (!leg2Trains.length) return null;

    const secondLeg = leg2Trains[0];

    return {
      isInterchange: true,
      hubId: bestHub,
      hubName: hubStation.name,
      leg1: firstLeg,
      leg2: secondLeg,
      totalDurationMinutes: (secondLeg.rawDepartureMinutes + secondLeg.durationMinutes) - firstLeg.rawDepartureMinutes,
      departureTime: firstLeg.departureTime,
      arrivalTime: secondLeg.arrivalTime
    };
  }

  // Public: Find trains between fromId and toId at given or current time
  function findTrains(fromId, toId, requestedTimeStr = null) {
    if (!fromId || !toId || fromId === toId) return { type: 'ERROR', error: 'Invalid stations' };

    const baseMinutes = requestedTimeStr ? timeStrToMinutes(requestedTimeStr) : getMumbaiCurrentMinutes();
    const directLine = findDirectLine(fromId, toId);

    if (directLine) {
      const trains = generateDirectTrains(fromId, toId, directLine, baseMinutes, 25);
      return {
        type: 'DIRECT',
        from: STATIONS_BY_ID[fromId],
        to: STATIONS_BY_ID[toId],
        line: directLine.line,
        trains: trains
      };
    } else {
      // Find 1-Hop transfer
      const interchange = findInterchangeJourney(fromId, toId, baseMinutes);
      if (interchange) {
        return {
          type: 'INTERCHANGE',
          from: STATIONS_BY_ID[fromId],
          to: STATIONS_BY_ID[toId],
          journey: interchange
        };
      }
      return { type: 'NO_ROUTE', message: 'No direct suburban route found.' };
    }
  }

  // Public: Get live station departures board (all upcoming trains from a station)
  function getStationDepartures(stationId, baseTimeMinutes = null, filterLine = 'ALL', filterType = 'ALL') {
    const station = STATIONS_BY_ID[stationId];
    if (!station) return [];

    const currentMin = baseTimeMinutes !== null ? baseTimeMinutes : getMumbaiCurrentMinutes();
    const results = [];

    // Check each line serving this station
    station.lines.forEach(lineKey => {
      if (filterLine !== 'ALL' && filterLine !== lineKey) return;

      // Pick outward destinations for this station on this line
      let termOptions = [];
      if (lineKey === 'western') {
        termOptions = ['VIRAR', 'BORIVALI', 'BHAYANDAR', 'CHURCHGATE', 'ANDHERI', 'GOREGAON', 'DAHANU_ROAD'];
      } else if (lineKey === 'central') {
        termOptions = ['KALYAN', 'THANE', 'DOMBIVLI', 'CSMT', 'TITWALA', 'KASARA', 'BADLAPUR', 'KARJAT'];
      } else if (lineKey === 'harbour') {
        termOptions = ['PANVEL', 'BELAPUR_CBD', 'VASHI', 'CSMT', 'GOREGAON', 'BANDRA'];
      } else if (lineKey === 'transharbour') {
        termOptions = ['PANVEL', 'VASHI', 'THANE'];
      }

      termOptions.forEach(termId => {
        if (termId === stationId) return;
        const dirLine = findDirectLine(stationId, termId);
        if (dirLine) {
          const tList = generateDirectTrains(stationId, termId, dirLine, currentMin, 4);
          tList.forEach(t => {
            if (filterType === 'ALL' || t.type === filterType) {
              results.push(t);
            }
          });
        }
      });
    });

    // Remove duplicates with same departure and destination
    const seen = new Set();
    const unique = [];
    results.forEach(t => {
      const key = `${t.departureTime}_${t.destinationId}_${t.type}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(t);
      }
    });

    unique.sort((a, b) => a.rawDepartureMinutes - b.rawDepartureMinutes);
    return unique.slice(0, 30);
  }

  // Query isolated train data array for a specific suburban rail line
  function getLineIsolatedTrains(lineKey, baseMinutes = null) {
    const curMin = baseMinutes !== null ? baseMinutes : getMumbaiCurrentMinutes();
    const normalized = (lineKey || '').toLowerCase();
    const lineCorridorKey = (normalized === 'wr' ? 'western' : (normalized === 'cr' ? 'central' : (normalized === 'hr' ? 'harbour' : (normalized === 'th' ? 'transharbour' : normalized))));
    
    let keyCorridorPairs = [];
    if (lineCorridorKey === 'central') {
      keyCorridorPairs = [
        { from: 'CSMT', to: 'KALYAN' },
        { from: 'CSMT', to: 'KASARA' },
        { from: 'CSMT', to: 'KHOPOLI' },
        { from: 'KALYAN', to: 'CSMT' },
        { from: 'KASARA', to: 'CSMT' },
        { from: 'KHOPOLI', to: 'CSMT' },
        { from: 'DADAR', to: 'THANE' }
      ];
    } else if (lineCorridorKey === 'western') {
      keyCorridorPairs = [
        { from: 'CHURCHGATE', to: 'VIRAR' },
        { from: 'CHURCHGATE', to: 'DAHANU_ROAD' },
        { from: 'CHURCHGATE', to: 'BORIVALI' },
        { from: 'VIRAR', to: 'CHURCHGATE' },
        { from: 'DAHANU_ROAD', to: 'CHURCHGATE' },
        { from: 'BORIVALI', to: 'CHURCHGATE' },
        { from: 'DADAR', to: 'BORIVALI' }
      ];
    } else if (lineCorridorKey === 'harbour') {
      keyCorridorPairs = [
        { from: 'CSMT', to: 'PANVEL' },
        { from: 'CSMT', to: 'GOREGAON' },
        { from: 'CSMT', to: 'VASHI' },
        { from: 'PANVEL', to: 'CSMT' },
        { from: 'GOREGAON', to: 'CSMT' },
        { from: 'VASHI', to: 'CSMT' }
      ];
    } else if (lineCorridorKey === 'transharbour') {
      keyCorridorPairs = [
        { from: 'THANE', to: 'PANVEL' },
        { from: 'THANE', to: 'VASHI' },
        { from: 'PANVEL', to: 'THANE' },
        { from: 'VASHI', to: 'THANE' }
      ];
    } else {
      return [];
    }

    const trains = [];
    keyCorridorPairs.forEach(pair => {
      const lineInfo = findDirectLine(pair.from, pair.to);
      if (lineInfo) {
        const batch = generateDirectTrains(pair.from, pair.to, lineInfo, curMin, 8);
        trains.push(...batch);
      }
    });

    // Deduplicate by train departure time and destination
    const seen = new Set();
    const isolated = [];
    trains.forEach(t => {
      const key = `${t.id}_${t.departureTime}_${t.destinationId}`;
      if (!seen.has(key)) {
        seen.add(key);
        isolated.push(t);
      }
    });

    isolated.sort((a, b) => a.rawDepartureMinutes - b.rawDepartureMinutes);
    return isolated.slice(0, 40);
  }

  // Network graph instance built from master corridors
  const networkGraph = (typeof buildNetworkGraph === 'function' && typeof STATIONS_BY_ID !== 'undefined')
    ? buildNetworkGraph(CORRIDORS, STATIONS_BY_ID)
    : null;

  return {
    findTrains,
    getStationDepartures,
    getLineIsolatedTrains,
    minutesToTimeStr,
    timeStrToMinutes,
    getMumbaiCurrentMinutes,
    findDirectLine,
    findInterchangeJourney,
    buildStopsBetween,
    generateDirectTrains,
    CORRIDORS,
    MUMBAI_RAIL_LINES,
    networkGraph
  };

})();
