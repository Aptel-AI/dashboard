// ═══════════════════════════════════════════════════════
// NationalCode.gs — National Consultant Dashboard Data Aggregator
// Reads from 4 external Google Sheets, returns unified JSON.
// Deploy as web app (Execute as: Me, Access: Anyone)
// ═══════════════════════════════════════════════════════

// ── Config ──
const NC_API_KEY = 'national-dash-2026-secret'; // Must match Script Properties > API_KEY

// External sheet IDs
const SHEETS = {
  RECRUITING_WEEKLY:  '1MNLqi8A329444SeZpKbYbcRe3dMxaOPLVdMy-7F1DPk',  // All Campaigns Stats Tracker 2026
  RECRUITING_DAILY:   '1ytTGen_AlzfDPW3HGYU1JKNLz1kfHrrhAFCVnmRS3fg',  // Recruiting Scoreboard Daily
  CAMPAIGN_TRACKER:   '1HvWJYox3JXvxmza63YBWAqKPtUGPFuaV-s-BOfbWGKM',  // ATT Campaign Tracker
  PERFORMANCE_AUDIT:  '15WCMzKnqvyyRMx2ae4tC1a12_-aoSRDh3McOuRAKuHk'   // Performance Audit
};

// Campaign configs
const CAMPAIGNS = {
  'att-b2b': {
    label: 'AT&T B2B',
    sectionHeader: 'AT&T Campaign Totals',   // Header text in recruiting sheets
    campaignTotalsTab: 'Campaign Totals',     // Tab in Campaign Tracker
    owners: [
      { name: 'Jay T',          tab: 'Jay T' },
      { name: 'Mason',          tab: 'Mason' },
      { name: 'Steven Sykes',   tab: 'Steven Sykes' },
      { name: 'Olin Salter',    tab: 'Olin Salter' },
      { name: 'Eric Martinez',  tab: 'Eric Martinez' },
      { name: 'Natalia Gwarda', tab: 'Natalia Gwarda' },
      { name: 'Nigel Gilbert',  tab: 'Nigel Gil' }
    ]
  }
};

// ══════════════════════════════════════════════════
// ENTRY POINT
// ══════════════════════════════════════════════════

function doGet(e) {
  const key = (e && e.parameter && e.parameter.key) || '';
  if (!validateKey(key)) return jsonResp({ error: 'unauthorized' });

  const campaign = (e && e.parameter && e.parameter.campaign) || 'att-b2b';
  const owner = (e && e.parameter && e.parameter.owner) || '';

  try {
    if (owner) {
      // Single owner detail request
      const data = loadOwnerDetail(campaign, owner);
      return jsonResp(data);
    } else {
      // Full campaign overview
      const data = loadCampaignOverview(campaign);
      return jsonResp(data);
    }
  } catch (err) {
    Logger.log('doGet error: ' + err.message + '\n' + err.stack);
    return jsonResp({ error: err.message });
  }
}

function validateKey(key) {
  // Check against script property first, fallback to hardcoded
  const stored = PropertiesService.getScriptProperties().getProperty('API_KEY');
  return key === (stored || NC_API_KEY);
}

function jsonResp(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ══════════════════════════════════════════════════
// LOAD CAMPAIGN OVERVIEW
// Returns all owners with summary data
// ══════════════════════════════════════════════════

function loadCampaignOverview(campaignKey) {
  const cfg = CAMPAIGNS[campaignKey];
  if (!cfg) return { error: 'Unknown campaign: ' + campaignKey };

  const ctSS = SpreadsheetApp.openById(SHEETS.CAMPAIGN_TRACKER);
  const rwSS = SpreadsheetApp.openById(SHEETS.RECRUITING_WEEKLY);

  // 1. Read Campaign Totals tab for aggregate recruiting funnel
  const totals = readCampaignTotals(ctSS, cfg);

  // 2. Read each owner's tab in Campaign Tracker
  const owners = cfg.owners.map(function(ownerDef) {
    try {
      return loadOwnerFromCampaignTracker(ctSS, ownerDef, cfg);
    } catch (err) {
      Logger.log('Error loading owner ' + ownerDef.name + ': ' + err.message);
      return { name: ownerDef.name, tab: ownerDef.tab, error: err.message };
    }
  });

  // 3. Enrich with latest weekly recruiting data
  try {
    enrichWithWeeklyRecruiting(rwSS, owners, cfg);
  } catch (err) {
    Logger.log('Weekly recruiting enrichment error: ' + err.message);
  }

  return {
    campaign: campaignKey,
    label: cfg.label,
    totals: totals,
    owners: owners
  };
}

// ══════════════════════════════════════════════════
// CAMPAIGN TOTALS
// ══════════════════════════════════════════════════

function readCampaignTotals(ss, cfg) {
  var sheet = ss.getSheetByName(cfg.campaignTotalsTab);
  if (!sheet) return {};

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return {};

  // Header-based column lookup
  var headers = data[0].map(function(h) { return String(h).toLowerCase().trim(); });
  var cols = findColumns(headers, {
    name: ['at&t campaign totals', 'name'],
    firstBooked: ['1st rounds booked'],
    firstShowed: ['1st rounds showed'],
    turnedTo2nd: ['turned to 2nd'],
    retention1: findNthRetention(headers, 1),
    conversion: ['conversion'],
    secondBooked: ['2nd rounds booked'],
    secondShowed: ['2nd rounds showed'],
    retention2: findNthRetention(headers, 2),
    newStarts: ['new start scheduled', 'new starts scheduled'],
    newStartsShowed: ['new starts showed'],
    retention3: findNthRetention(headers, 3),
    headcount: ['active selling headcount', 'active headcount']
  });

  // Sum all rep rows for campaign totals
  var totals = {
    headcount: 0, firstBooked: 0, newStarts: 0, retention: '—', production: '—'
  };
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var name = String(row[0] || '').trim();
    if (!name) continue;
    totals.headcount += num(row[cols.headcount]);
    totals.firstBooked += num(row[cols.firstBooked]);
    totals.newStarts += num(row[cols.newStarts]);
  }

  return totals;
}

// ══════════════════════════════════════════════════
// OWNER DATA FROM CAMPAIGN TRACKER
// Reads all 3 sections of an owner's tab
// ══════════════════════════════════════════════════

function loadOwnerFromCampaignTracker(ss, ownerDef, cfg) {
  var sheet = ss.getSheetByName(ownerDef.tab);
  if (!sheet) {
    return {
      name: ownerDef.name, tab: ownerDef.tab,
      health: { current: {}, trend: [] },
      recruiting: { funnel: {}, weekly: [], reps: [] },
      sales: { summary: {}, reps: [] },
      audit: { grades: {}, details: {} }
    };
  }

  var allData = sheet.getDataRange().getValues();

  // Find section boundaries by scanning for known header patterns
  var sections = findSections(allData);

  // SECTION 1: Office Health (Ken's manual input)
  var health = parseSection1(allData, sections.section1Start, sections.section1End);

  // SECTION 2: Recruiting by week
  var recruiting = parseSection2(allData, sections.section2Start, sections.section2End);

  // SECTION 3: Tableau sales data
  var sales = parseSection3(allData, sections.section3Start, sections.section3End);

  return {
    name: ownerDef.name,
    tab: ownerDef.tab,
    health: health,
    recruiting: { funnel: recruiting.totals || {}, weekly: recruiting.weekly || [], reps: [] },
    sales: sales,
    audit: { grades: { reviews: '—', website: '—', social: '—', seo: '—' }, details: {} }
  };
}

// ══════════════════════════════════════════════════
// SECTION DETECTION
// Scans the data for known header patterns to find
// where each of the 3 sections starts and ends.
// ══════════════════════════════════════════════════

function findSections(data) {
  var s1Start = 0, s1End = -1;
  var s2Start = -1, s2End = -1;
  var s3Start = -1, s3End = data.length - 1;

  for (var i = 0; i < data.length; i++) {
    var rowText = data[i].map(function(c) { return String(c).toLowerCase().trim(); }).join('|');

    // Section 1 starts at row 0 (Dates, Active, Leaders...)
    // Section 2 starts when we see "projected weekly" or "actual recruiting"
    if (rowText.indexOf('projected weekly') >= 0 || rowText.indexOf('actual recruiting') >= 0) {
      if (s1End < 0) s1End = i - 1;
      s2Start = i;
    }

    // Section 3 starts when we see Tableau-like headers
    if ((rowText.indexOf('new internet count') >= 0 || rowText.indexOf('sales (all)') >= 0) && s3Start < 0) {
      if (s2Start >= 0 && s2End < 0) s2End = i - 1;
      s3Start = i;
    }
  }

  // Fallbacks
  if (s1End < 0) s1End = (s2Start > 0 ? s2Start - 1 : data.length - 1);
  if (s2Start >= 0 && s2End < 0) s2End = (s3Start > 0 ? s3Start - 1 : data.length - 1);
  if (s3Start < 0) s3Start = data.length; // no section 3

  return {
    section1Start: s1Start, section1End: s1End,
    section2Start: s2Start, section2End: s2End,
    section3Start: s3Start, section3End: s3End
  };
}

// ══════════════════════════════════════════════════
// PARSE SECTION 1: Office Health
// ══════════════════════════════════════════════════

function parseSection1(data, start, end) {
  if (start < 0 || end < start) return { current: {}, trend: [] };

  // Find headers in row 0
  var headers = data[start].map(function(h) { return String(h).toLowerCase().trim(); });
  var colMap = {
    dates: findCol(headers, ['dates', 'date']),
    active: findCol(headers, ['active']),
    leaders: findCol(headers, ['leaders']),
    dist: findCol(headers, ['dist']),
    training: findCol(headers, ['training']),
    productionLW: findCol(headers, ['production lw', 'production']),
    dtv: findCol(headers, ['dtv']),
    goals: findCol(headers, ['production goals', 'goals'])
  };

  var trend = [];
  var lastGoodRow = null;

  for (var i = start + 1; i <= end; i++) {
    var row = data[i];
    var dateVal = row[colMap.dates];
    if (!dateVal) continue;

    var entry = {
      date: formatDate(dateVal),
      active: val(row[colMap.active]),
      leaders: val(row[colMap.leaders]),
      dist: val(row[colMap.dist]),
      training: val(row[colMap.training]),
      productionLW: val(row[colMap.productionLW]),
      dtv: val(row[colMap.dtv]),
      goals: val(row[colMap.goals])
    };
    trend.push(entry);
    lastGoodRow = entry;
  }

  return {
    current: lastGoodRow || { active: '—', leaders: '—', dist: '—', training: '—', productionLW: '—', dtv: '—', goals: '—' },
    trend: trend
  };
}

// ══════════════════════════════════════════════════
// PARSE SECTION 2: Recruiting by Week
// ══════════════════════════════════════════════════

function parseSection2(data, start, end) {
  if (start < 0 || end < start) return { totals: {}, weekly: [] };

  // Find the header row with week dates (e.g., "Feb-2", "Feb-9", etc.)
  var headerRowIdx = -1;
  for (var i = start; i <= Math.min(start + 3, end); i++) {
    var row = data[i];
    for (var j = 0; j < row.length; j++) {
      var cellText = String(row[j]).toLowerCase();
      if (cellText.indexOf('actual') >= 0 || cellText.indexOf('projected') >= 0) {
        headerRowIdx = i;
        break;
      }
    }
    if (headerRowIdx >= 0) break;
  }

  // Look for the metrics rows: "Calls Received", "No List", "Booked", "Showed", etc.
  var weekly = [];
  var totals = {};
  var metricsMap = {};

  for (var i = (headerRowIdx >= 0 ? headerRowIdx + 1 : start); i <= end; i++) {
    var row = data[i];
    var label = String(row[0] || '').trim().toLowerCase();
    if (!label) continue;

    // Map known metric labels
    if (label.indexOf('calls received') >= 0 || label === 'calls received') metricsMap.callsReceived = row;
    else if (label.indexOf('no list') >= 0) metricsMap.noList = row;
    else if (label === 'booked' && !metricsMap.booked) metricsMap.booked = row;
    else if (label === 'showed' && !metricsMap.showed) metricsMap.showed = row;
    else if (label.indexOf('starts booked') >= 0) metricsMap.startsBooked = row;
    else if (label.indexOf('starts showed') >= 0) metricsMap.startsShowed = row;
    else if (label.indexOf('start retention') >= 0) metricsMap.startRetention = row;
    else if (label === 'total' || label.indexOf('month overview') >= 0) metricsMap.total = row;
  }

  return { totals: totals, weekly: [], rawMetrics: metricsMap };
}

// ══════════════════════════════════════════════════
// PARSE SECTION 3: Sales/Tableau Data
// ══════════════════════════════════════════════════

function parseSection3(data, start, end) {
  if (start < 0 || start >= data.length) return { summary: {}, reps: [] };

  // Find header row
  var headers = data[start].map(function(h) { return String(h).toLowerCase().trim(); });
  var colMap = {
    name: findCol(headers, ['name', '']),
    newInternet: findCol(headers, ['new internet count']),
    upgrade: findCol(headers, ['upgrade internet count', 'upgrade internet']),
    video: findCol(headers, ['video sales']),
    salesAll: findCol(headers, ['sales (all)', 'sales all']),
    abpMix: findCol(headers, ['new internet abp mix', 'abp mix']),
    gigMix: findCol(headers, ['new internet 1gig', '1gig+ mix']),
    techInstall: findCol(headers, ['tech install'])
  };

  // If col 0 name wasn't found by header, default to 0
  if (colMap.name < 0) colMap.name = 0;

  var reps = [];
  var sumSales = 0, sumInternet = 0, sumUpgrade = 0, sumVideo = 0;

  for (var i = start + 1; i <= end; i++) {
    var row = data[i];
    var name = String(row[colMap.name] || '').trim();
    if (!name) continue;

    var rep = {
      name: name,
      newInternet: num(row[colMap.newInternet]),
      upgrade: num(row[colMap.upgrade]),
      video: num(row[colMap.video]),
      salesAll: num(row[colMap.salesAll]),
      abpMix: pct(row[colMap.abpMix]),
      gigMix: pct(row[colMap.gigMix]),
      techInstall: pct(row[colMap.techInstall])
    };
    reps.push(rep);
    sumSales += rep.salesAll;
    sumInternet += rep.newInternet;
    sumUpgrade += rep.upgrade;
    sumVideo += rep.video;
  }

  return {
    summary: {
      totalSales: sumSales,
      newInternet: sumInternet,
      upgrades: sumUpgrade,
      videoSales: sumVideo,
      abpMix: '—',
      gigMix: '—'
    },
    reps: reps
  };
}

// ══════════════════════════════════════════════════
// WEEKLY RECRUITING ENRICHMENT
// Reads the latest tab from All Campaigns Stats Tracker
// and enriches owner data with per-rep recruiting numbers
// ══════════════════════════════════════════════════

function enrichWithWeeklyRecruiting(ss, owners, cfg) {
  // Find the most recent tab (tabs are named by date like "2-28-2026" or "03-02-26")
  var allSheets = ss.getSheets();
  if (!allSheets.length) return;

  // Use the first tab (most recent, per user's description)
  var latestSheet = allSheets[0];
  var data = latestSheet.getDataRange().getValues();

  // Find the AT&T section by looking for the section header
  var sectionStart = -1;
  for (var i = 0; i < data.length; i++) {
    var cellText = String(data[i][0] || '').toLowerCase().trim();
    if (cellText.indexOf('at&t campaign') >= 0 || cellText.indexOf('att campaign') >= 0) {
      sectionStart = i;
      break;
    }
  }
  if (sectionStart < 0) return;

  // Read headers from the section header row
  var headers = data[sectionStart].map(function(h) { return String(h).toLowerCase().trim(); });
  var colMap = {
    name: 0,
    firstBooked: findCol(headers, ['1st rounds booked']),
    firstShowed: findCol(headers, ['1st rounds showed']),
    turned2nd: findCol(headers, ['turned to 2nd']),
    conversion: findCol(headers, ['conversion']),
    secondBooked: findCol(headers, ['2nd rounds booked']),
    newStarts: findCol(headers, ['new start scheduled', 'new starts scheduled'])
  };

  // Build a map of rep name → recruiting data
  var repMap = {};
  for (var i = sectionStart + 1; i < data.length; i++) {
    var row = data[i];
    var name = String(row[0] || '').trim();
    if (!name) break; // end of section

    repMap[name.toLowerCase()] = {
      name: name,
      firstBooked: num(row[colMap.firstBooked]),
      firstShowed: num(row[colMap.firstShowed]),
      turned2nd: num(row[colMap.turned2nd]),
      conversion: pct(row[colMap.conversion]),
      secondBooked: num(row[colMap.secondBooked]),
      newStarts: num(row[colMap.newStarts])
    };
  }

  // Match reps to owners via the sales.reps list (rep names appear in both)
  // For now, attach all reps to the campaign data — we'll match by owner tab later
  // TODO: Cross-reference rep names between Campaign Tracker owner tabs and recruiting data
}

// ══════════════════════════════════════════════════
// HELPER: Header-based column finder
// Handles messy sheets where columns move around
// ══════════════════════════════════════════════════

function findCol(headers, patterns) {
  for (var p = 0; p < patterns.length; p++) {
    var pattern = patterns[p].toLowerCase();
    for (var i = 0; i < headers.length; i++) {
      if (headers[i].indexOf(pattern) >= 0) return i;
    }
  }
  return -1;
}

function findColumns(headers, spec) {
  var result = {};
  for (var key in spec) {
    if (Array.isArray(spec[key])) {
      result[key] = findCol(headers, spec[key]);
    } else {
      result[key] = spec[key]; // already resolved (e.g., from findNthRetention)
    }
  }
  return result;
}

// Find the Nth occurrence of "retention" in headers (since there are multiple)
function findNthRetention(headers, n) {
  var count = 0;
  for (var i = 0; i < headers.length; i++) {
    if (headers[i] === 'retention') {
      count++;
      if (count === n) return i;
    }
  }
  return -1;
}

// ══════════════════════════════════════════════════
// HELPER: Value formatters
// ══════════════════════════════════════════════════

function num(v) {
  if (v === null || v === undefined || v === '') return 0;
  var n = Number(v);
  return isNaN(n) ? 0 : n;
}

function val(v) {
  if (v === null || v === undefined || v === '') return '—';
  return String(v);
}

function pct(v) {
  if (v === null || v === undefined || v === '') return '—';
  var s = String(v);
  if (s.indexOf('%') >= 0) return s;
  var n = Number(v);
  if (isNaN(n)) return s;
  // If it's a decimal (0.65), convert to percentage
  if (n > 0 && n <= 1) return Math.round(n * 100) + '%';
  return Math.round(n) + '%';
}

function formatDate(v) {
  if (!v) return '—';
  if (v instanceof Date) {
    return (v.getMonth() + 1) + '-' + v.getDate() + '-' + v.getFullYear();
  }
  return String(v);
}

// ══════════════════════════════════════════════════
// SINGLE OWNER DETAIL (for lazy loading)
// ══════════════════════════════════════════════════

function loadOwnerDetail(campaignKey, ownerName) {
  var cfg = CAMPAIGNS[campaignKey];
  if (!cfg) return { error: 'Unknown campaign' };

  var ownerDef = null;
  for (var i = 0; i < cfg.owners.length; i++) {
    if (cfg.owners[i].name.toLowerCase() === ownerName.toLowerCase() ||
        cfg.owners[i].tab.toLowerCase() === ownerName.toLowerCase()) {
      ownerDef = cfg.owners[i];
      break;
    }
  }
  if (!ownerDef) return { error: 'Owner not found: ' + ownerName };

  var ctSS = SpreadsheetApp.openById(SHEETS.CAMPAIGN_TRACKER);
  var owner = loadOwnerFromCampaignTracker(ctSS, ownerDef, cfg);

  // Also load Performance Audit data for this owner
  try {
    enrichWithAuditData(owner, ownerDef);
  } catch (err) {
    Logger.log('Audit enrichment error: ' + err.message);
  }

  return owner;
}

// ══════════════════════════════════════════════════
// PERFORMANCE AUDIT ENRICHMENT
// ══════════════════════════════════════════════════

function enrichWithAuditData(owner, ownerDef) {
  var ss = SpreadsheetApp.openById(SHEETS.PERFORMANCE_AUDIT);
  var auditSheet = ss.getSheetByName('Audit');
  if (!auditSheet) return;

  var data = auditSheet.getDataRange().getValues();
  if (data.length < 2) return;

  var headers = data[1].map(function(h) { return String(h).toLowerCase().trim(); }); // Row 2 is headers (row 1 is merged)
  var colMap = {
    clientName: findCol(headers, ['client name']),
    businessName: findCol(headers, ['business name']),
    accountManager: findCol(headers, ['account manager']),
    services: findCol(headers, ['services']),
    month: findCol(headers, ['month', 'edit month']),
    rating: findCol(headers, ['rating']),
    reviews: findCol(headers, ['# of reviews', 'number of reviews']),
    notes: findCol(headers, ['notes']),
    seoCheck: findCol(headers, ['seo check'])
  };

  // Search for businesses matching this owner
  // TODO: Need a mapping from owner name → business names in the audit sheet
  // For now, we'll search by partial name match
  var searchName = ownerDef.name.toLowerCase();
  var matches = [];

  for (var i = 2; i < data.length; i++) {
    var row = data[i];
    var client = String(row[colMap.clientName] || '').toLowerCase();
    var business = String(row[colMap.businessName] || '').toLowerCase();
    var manager = String(row[colMap.accountManager] || '').toLowerCase();

    // Match on client name, business name, or account manager
    if (client.indexOf(searchName) >= 0 || business.indexOf(searchName) >= 0 || manager.indexOf(searchName) >= 0) {
      matches.push({
        client: val(row[colMap.clientName]),
        business: val(row[colMap.businessName]),
        services: val(row[colMap.services]),
        rating: val(row[colMap.rating]),
        reviews: val(row[colMap.reviews]),
        notes: val(row[colMap.notes]),
        seo: val(row[colMap.seoCheck])
      });
    }
  }

  // Calculate simple grades from the data
  if (matches.length > 0) {
    var avgRating = 0, totalReviews = 0, ratingCount = 0;
    matches.forEach(function(m) {
      var r = parseFloat(m.rating);
      if (!isNaN(r)) { avgRating += r; ratingCount++; }
      totalReviews += num(m.reviews);
    });
    avgRating = ratingCount > 0 ? (avgRating / ratingCount) : 0;

    owner.audit = {
      grades: {
        reviews: ratingToGrade(avgRating),
        website: '—',
        social: '—',
        seo: '—'
      },
      details: {
        'Avg Rating': { value: avgRating.toFixed(1), notes: ratingCount + ' businesses' },
        'Total Reviews': { value: totalReviews, notes: '' },
        'Businesses Tracked': { value: matches.length, notes: '' }
      }
    };
  }
}

function ratingToGrade(rating) {
  if (rating >= 4.5) return 'A+';
  if (rating >= 4.0) return 'A';
  if (rating >= 3.5) return 'B';
  if (rating >= 3.0) return 'C';
  if (rating >= 2.0) return 'D';
  return 'F';
}
