// ═══════════════════════════════════════════════════════
// National Consultant Dashboard — App Controller
// Pulls from 4 external Google Sheets, renders owner reviews
// ═══════════════════════════════════════════════════════

const NationalApp = {

  // ── Status code definitions (matching Campaign Tracker) ──
  STATUS_CODES: {
    22: { label: 'Bored Leaders', css: 'sc-22' },
    33: { label: 'Top Leaders Interviewing Only', css: 'sc-33' },
    44: { label: 'Maintaining Not Growing', css: 'sc-44' },
    55: { label: 'Leaders Busy', css: 'sc-55' },
    66: { label: 'Promotion Factory', css: 'sc-66' }
  },

  // ── Recruiting row labels (always the same) ──
  RECRUITING_LABELS: [
    { label: 'Applies Received', isRate: false },
    { label: 'Sent to List', isRate: false },
    { label: '1st Rounds Booked', isRate: false },
    { label: '1st Rounds Showed', isRate: false },
    { label: 'Retention', isRate: true },
    { label: '% Call List Booked', isRate: true },
    { label: '2nd Rounds Booked', isRate: false },
    { label: '2nd Rounds Showed', isRate: false },
    { label: 'Retention', isRate: true },
    { label: 'New Starts Booked', isRate: false },
    { label: 'New Starts Showed', isRate: false },
    { label: 'New Start Retention', isRate: true }
  ],

  state: {
    campaign: 'att-b2b',
    owners: [],
    selectedOwner: null,
    currentTab: 'health',
    session: null,
    campaignTotals: {},
    campaignRecruiting: null
  },

  // ══════════════════════════════════════════════════
  // INIT
  // ══════════════════════════════════════════════════

  async init() {
    console.log('[NationalApp] init');
    this.state.session = this._getSession();
    if (!this.state.session) {
      this._showLogin();
      return;
    }
    this._showLoading('Loading campaign data...');
    document.getElementById('user-name').textContent = this.state.session.name || this.state.session.email;

    try {
      await this.loadCampaignData(this.state.campaign);
      this._hideLoading();
      document.getElementById('dashboard').style.display = 'block';
      this.renderCampaignOverview();
      this.renderOwnersList();
    } catch (err) {
      console.error('[NationalApp] init error:', err);
      this._hideLoading();
      document.getElementById('dashboard').style.display = 'block';
      this.renderCampaignOverview();
      this.renderOwnersList();
    }
  },

  // ══════════════════════════════════════════════════
  // SESSION (simple localStorage — same pattern as admin)
  // ══════════════════════════════════════════════════

  _getSession() {
    try {
      const raw = localStorage.getItem(NATIONAL_CONFIG.sessionKey);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (Date.now() - s.loginTime > NATIONAL_CONFIG.sessionDuration) {
        localStorage.removeItem(NATIONAL_CONFIG.sessionKey);
        return null;
      }
      return s;
    } catch { return null; }
  },

  _saveSession(email, name) {
    const s = { email, name, loginTime: Date.now() };
    localStorage.setItem(NATIONAL_CONFIG.sessionKey, JSON.stringify(s));
    return s;
  },

  logout() {
    localStorage.removeItem(NATIONAL_CONFIG.sessionKey);
    window.location.reload();
  },

  // ══════════════════════════════════════════════════
  // LOGIN (simple email-only for now, no PIN)
  // ══════════════════════════════════════════════════

  _showLogin() {
    const screen = document.getElementById('login-screen');
    screen.style.display = 'flex';
    const btn = document.getElementById('login-btn');
    const input = document.getElementById('login-email');
    const error = document.getElementById('login-error');

    const doLogin = () => {
      let email = input.value.trim().toLowerCase();
      if (!email) { error.textContent = 'Please enter your email'; return; }
      if (NATIONAL_CONFIG.loginAliases[email]) email = NATIONAL_CONFIG.loginAliases[email];
      const name = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      this.state.session = this._saveSession(email, name);
      screen.style.display = 'none';
      this.init();
    };

    btn.addEventListener('click', doLogin);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
    setTimeout(() => input.focus(), 100);
  },

  // ══════════════════════════════════════════════════
  // DATA LOADING
  // ══════════════════════════════════════════════════

  async loadCampaignData(campaignKey) {
    const cfg = NATIONAL_CONFIG.campaigns[campaignKey];
    if (!cfg) throw new Error('Unknown campaign: ' + campaignKey);

    if (NATIONAL_CONFIG.appsScriptUrl) {
      try {
        const url = NATIONAL_CONFIG.appsScriptUrl +
          '?key=' + encodeURIComponent(NATIONAL_CONFIG.apiKey) +
          '&campaign=' + encodeURIComponent(campaignKey);
        const resp = await fetch(url);
        const data = await resp.json();
        if (data.error) throw new Error(data.error);
        this.state.owners = data.owners || [];
        this.state.campaignTotals = data.totals || {};
        this.state.campaignRecruiting = data.campaignRecruiting || null;
        return;
      } catch (err) {
        console.warn('[NationalApp] API fetch failed, using scaffold data:', err.message);
      }
    }

    console.log('[NationalApp] Using scaffold data for', campaignKey);
    this._loadScaffoldData(campaignKey);
  },

  // ── Build recruiting rows from projected + actuals arrays ──
  _buildRows(projected, actuals) {
    return this.RECRUITING_LABELS.map((def, i) => {
      const vals = actuals[i] || [];
      const p = projected[i];
      let total;
      if (def.isRate) {
        const nums = vals.filter(v => typeof v === 'number');
        total = nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : 0;
      } else {
        total = vals.reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
      }
      return { label: def.label, projected: p, values: vals, total, isRate: def.isRate };
    });
  },

  // ── Scaffold data based on actual spreadsheet observations ──
  _loadScaffoldData(campaignKey) {
    const ownerDefs = NATIONAL_CONFIG.owners[campaignKey] || [];
    const weeks = ['Feb-9', 'Feb-16', 'Feb-23', 'Mar-2'];

    // Per-owner demo data (compact: health, status, recruiting projected/actuals, sales, audit)
    const demo = {
      'Jay T': {
        h: { active: 12, leaders: 3, dist: 5, training: 4, prodLW: 18, dtv: 3, goals: 22 },
        sc: 55,
        rLeaders: 3,
        rP: [40, 30, 20, 16, 80, 50, 10, 8, 80, 5, 4, 80],
        rA: [[36,44,32,42],[28,35,25,32],[18,22,15,20],[14,18,12,17],[78,82,80,85],[47,52,42,50],[8,12,7,10],[7,10,5,8],[88,83,71,80],[4,6,3,5],[3,5,3,4],[75,83,100,80]],
        s: { totalSales: 42, newInternet: 18, upgrades: 14, videoSales: 10, abpMix: '72%', gigMix: '45%' },
        a: { reviews: 'A', website: 'B+', social: 'B', seo: 'A-' }
      },
      'Mason': {
        h: { active: 8, leaders: 2, dist: 3, training: 3, prodLW: 14, dtv: 2, goals: 18 },
        sc: 22,
        rLeaders: 2,
        rP: [30, 22, 15, 12, 80, 50, 7, 6, 83, 4, 3, 80],
        rA: [[24,28,20,26],[18,22,15,20],[12,16,10,14],[9,12,7,11],[75,75,70,79],[40,53,33,47],[5,8,4,6],[4,6,3,5],[80,75,75,83],[3,4,2,3],[2,3,2,3],[67,75,100,100]],
        s: { totalSales: 31, newInternet: 14, upgrades: 10, videoSales: 7, abpMix: '68%', gigMix: '38%' },
        a: { reviews: 'B+', website: 'B', social: 'C+', seo: 'B' }
      },
      'Steven Sykes': {
        h: { active: 15, leaders: 4, dist: 6, training: 5, prodLW: 24, dtv: 5, goals: 28 },
        sc: 66,
        rLeaders: 4,
        rP: [55, 42, 28, 22, 80, 50, 14, 11, 80, 7, 6, 83],
        rA: [[52,60,48,58],[40,48,36,44],[26,32,22,30],[22,26,18,24],[85,81,82,80],[47,53,46,52],[12,16,10,14],[10,14,8,12],[83,88,80,86],[6,8,5,7],[5,7,4,6],[83,88,80,86]],
        s: { totalSales: 56, newInternet: 24, upgrades: 18, videoSales: 14, abpMix: '75%', gigMix: '52%' },
        a: { reviews: 'A', website: 'A-', social: 'A', seo: 'A' }
      },
      'Olin Salter': {
        h: { active: 6, leaders: 1, dist: 2, training: 3, prodLW: 8, dtv: 1, goals: 14 },
        sc: 44,
        rLeaders: 1,
        rP: [20, 15, 10, 8, 80, 50, 5, 4, 80, 3, 2, 80],
        rA: [[14,18,12,16],[10,14,8,12],[7,10,6,8],[5,7,4,6],[71,70,67,75],[35,50,30,40],[3,5,2,4],[2,4,2,3],[67,80,100,75],[1,3,1,2],[1,2,1,2],[100,67,100,100]],
        s: { totalSales: 18, newInternet: 8, upgrades: 6, videoSales: 4, abpMix: '62%', gigMix: '30%' },
        a: { reviews: 'C+', website: 'C', social: 'D+', seo: 'C' }
      },
      'Eric Martinez': {
        h: { active: 10, leaders: 2, dist: 4, training: 4, prodLW: 16, dtv: 3, goals: 20 },
        sc: 55,
        rLeaders: 2,
        rP: [35, 26, 18, 14, 80, 50, 9, 7, 80, 5, 4, 80],
        rA: [[30,38,28,34],[24,30,20,26],[16,20,12,18],[12,16,10,14],[75,80,83,78],[46,53,43,50],[7,10,5,8],[6,8,4,7],[86,80,80,88],[4,5,3,4],[3,4,3,4],[75,80,100,100]],
        s: { totalSales: 36, newInternet: 16, upgrades: 12, videoSales: 8, abpMix: '70%', gigMix: '42%' },
        a: { reviews: 'B', website: 'B+', social: 'B-', seo: 'B+' }
      },
      'Natalia Gwarda': {
        h: { active: 9, leaders: 2, dist: 3, training: 4, prodLW: 12, dtv: 2, goals: 16 },
        sc: 33,
        rLeaders: 2,
        rP: [32, 24, 16, 13, 80, 50, 8, 6, 80, 4, 3, 80],
        rA: [[26,34,24,30],[20,26,18,22],[14,18,10,16],[10,14,8,12],[71,78,80,75],[44,53,38,50],[6,9,4,7],[5,7,3,6],[83,78,75,86],[3,5,2,4],[2,4,2,3],[67,80,100,75]],
        s: { totalSales: 28, newInternet: 12, upgrades: 9, videoSales: 7, abpMix: '66%', gigMix: '36%' },
        a: { reviews: 'B-', website: 'C+', social: 'B', seo: 'C+' }
      },
      'Nigel Gilbert': {
        h: { active: 7, leaders: 1, dist: 3, training: 3, prodLW: 10, dtv: 1, goals: 14 },
        sc: 22,
        rLeaders: 1,
        rP: [22, 16, 12, 10, 80, 50, 6, 5, 80, 3, 2, 80],
        rA: [[16,20,14,18],[12,16,10,14],[8,12,7,10],[6,9,5,8],[75,75,71,80],[36,50,32,42],[4,6,3,5],[3,5,2,4],[75,83,67,80],[2,3,1,3],[1,2,1,2],[50,67,100,67]],
        s: { totalSales: 22, newInternet: 10, upgrades: 7, videoSales: 5, abpMix: '64%', gigMix: '32%' },
        a: { reviews: 'C', website: 'C-', social: 'D', seo: 'C-' }
      }
    };

    // Build owner objects
    this.state.owners = ownerDefs.map(def => {
      const d = demo[def.name] || {};
      const h = d.h || {};
      return {
        name: def.name,
        tab: def.tab,
        statusCode: d.sc || null,
        // Office Health
        health: {
          current: {
            active: h.active || 0, leaders: h.leaders || 0, dist: h.dist || 0,
            training: h.training || 0, productionLW: h.prodLW || 0,
            dtv: h.dtv || 0, goals: h.goals || 0
          },
          trend: [
            { date: '2/17', active: (h.active||0)-3, leaders: h.leaders, dist: (h.dist||0)-1, training: (h.training||0)-1, productionLW: (h.prodLW||0)-4, dtv: (h.dtv||0)-1, goals: h.goals },
            { date: '2/24', active: (h.active||0)-1, leaders: h.leaders, dist: h.dist, training: h.training, productionLW: (h.prodLW||0)-2, dtv: h.dtv, goals: h.goals },
            { date: '3/3',  active: h.active, leaders: h.leaders, dist: h.dist, training: h.training, productionLW: h.prodLW, dtv: h.dtv, goals: h.goals }
          ]
        },
        // Recruiting (spreadsheet format)
        recruiting: {
          leaders: d.rLeaders || 0,
          weeks: weeks,
          rows: d.rP ? this._buildRows(d.rP, d.rA) : []
        },
        // Sales
        sales: {
          summary: d.s || { totalSales: 0, newInternet: 0, upgrades: 0, videoSales: 0, abpMix: '—', gigMix: '—' },
          reps: []
        },
        // Audit
        audit: {
          grades: d.a || { reviews: '—', website: '—', social: '—', seo: '—' },
          details: {}
        }
      };
    });

    // Campaign-level totals
    const totals = this.state.owners.reduce((acc, o) => {
      acc.headcount += o.health.current.active;
      acc.leaders += o.health.current.leaders;
      acc.production += o.health.current.productionLW;
      return acc;
    }, { headcount: 0, leaders: 0, production: 0 });

    // Campaign-level recruiting (aggregate all owners)
    const aggP = new Array(12).fill(0);
    const aggA = Array.from({ length: 12 }, () => new Array(4).fill(0));

    this.state.owners.forEach(o => {
      if (!o.recruiting.rows.length) return;
      o.recruiting.rows.forEach((row, ri) => {
        aggP[ri] += row.projected;
        row.values.forEach((v, wi) => { aggA[ri][wi] += v; });
      });
    });

    // For rate rows, compute average instead of sum
    this.RECRUITING_LABELS.forEach((def, i) => {
      if (def.isRate) {
        const cnt = this.state.owners.filter(o => o.recruiting.rows.length).length || 1;
        aggP[i] = Math.round(aggP[i] / cnt);
        aggA[i] = aggA[i].map(v => Math.round(v / cnt));
      }
    });

    this.state.campaignRecruiting = {
      leaders: totals.leaders,
      weeks: weeks,
      rows: this._buildRows(aggP, aggA),
      showLegend: true
    };

    // Aggregate KPI totals
    const firstBookedIdx = 2; // '1st Rounds Booked' row
    const newStartsIdx = 9;   // 'New Starts Booked' row
    const startRetIdx = 11;   // 'New Start Retention' row

    const crRows = this.state.campaignRecruiting.rows;
    this.state.campaignTotals = {
      headcount: totals.headcount,
      firstBooked: crRows[firstBookedIdx] ? crRows[firstBookedIdx].total : 0,
      newStarts: crRows[newStartsIdx] ? crRows[newStartsIdx].total : 0,
      retention: crRows[startRetIdx] ? crRows[startRetIdx].total + '%' : '—',
      production: totals.production
    };
  },

  // ══════════════════════════════════════════════════
  // CAMPAIGN SWITCHING
  // ══════════════════════════════════════════════════

  async switchCampaign(campaignKey) {
    this.state.campaign = campaignKey;
    this.state.selectedOwner = null;
    this._showLoading('Switching campaign...');
    try {
      await this.loadCampaignData(campaignKey);
    } catch (err) {
      console.error('Failed to load campaign:', err);
    }
    this._hideLoading();
    this.renderCampaignOverview();
    this.renderOwnersList();
    document.getElementById('owner-detail').style.display = 'none';
    document.querySelector('.campaign-overview').style.display = '';
    document.querySelector('.owners-section').style.display = '';
  },

  // ══════════════════════════════════════════════════
  // RENDER: Campaign Overview (KPIs + Recruiting Table + Status Codes)
  // ══════════════════════════════════════════════════

  renderCampaignOverview() {
    const t = this.state.campaignTotals || {};
    const cfg = NATIONAL_CONFIG.campaigns[this.state.campaign];
    document.getElementById('campaign-title').textContent = (cfg?.label || 'Campaign') + ' Campaign';
    document.getElementById('overview-date').textContent = 'Week of ' + this._formatCurrentWeek();

    // KPI cards
    document.getElementById('kpi-headcount').textContent = t.headcount || '—';
    document.getElementById('kpi-1st-booked').textContent = t.firstBooked || '—';
    document.getElementById('kpi-starts').textContent = t.newStarts || '—';
    document.getElementById('kpi-retention').textContent = t.retention || '—';
    document.getElementById('kpi-production').textContent = t.production || '—';

    // Campaign-level recruiting table
    this._renderRecruitingTable(this.state.campaignRecruiting, 'campaign-recruiting');

    // Status codes legend
    this._renderStatusLegend('campaign-status-codes');
  },

  // ══════════════════════════════════════════════════
  // RENDER: Owners List (directory-style cards)
  // ══════════════════════════════════════════════════

  renderOwnersList() {
    const container = document.getElementById('owners-list');
    const owners = this.state.owners;

    if (!owners.length) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-state-icon">📊</div>
          <div class="empty-state-text">No owner data available yet.<br>Configure NationalCode.gs to load data.</div>
        </div>`;
      return;
    }

    container.innerHTML = owners.map((o, idx) => {
      const sc = this.STATUS_CODES[o.statusCode];
      const badgeHtml = sc
        ? `<span class="status-badge ${sc.css}">${this._esc(sc.label)}</span>`
        : '';

      return `
        <div class="owner-card" onclick="NationalApp.openOwnerDetail(${idx})">
          <span class="owner-card-name">${this._esc(o.name)}</span>
          ${badgeHtml}
          <div class="owner-card-stats">
            <div class="owner-card-stat">
              <div class="owner-card-stat-value">${o.health.current.active}</div>
              <div class="owner-card-stat-label">Active</div>
            </div>
            <div class="owner-card-stat">
              <div class="owner-card-stat-value">${o.health.current.productionLW}</div>
              <div class="owner-card-stat-label">Prod</div>
            </div>
          </div>
          <span class="owner-card-arrow">→</span>
        </div>`;
    }).join('');
  },

  filterOwners(query) {
    const q = query.toLowerCase();
    const cards = document.querySelectorAll('.owner-card');
    cards.forEach((card, idx) => {
      const owner = this.state.owners[idx];
      if (!owner) return;
      card.style.display = owner.name.toLowerCase().includes(q) ? '' : 'none';
    });
  },

  // ══════════════════════════════════════════════════
  // RENDER: Owner Detail
  // ══════════════════════════════════════════════════

  openOwnerDetail(idx) {
    const owner = this.state.owners[idx];
    if (!owner) return;
    this.state.selectedOwner = owner;
    this.state.currentTab = 'health';

    document.querySelector('.campaign-overview').style.display = 'none';
    document.querySelector('.owners-section').style.display = 'none';
    const detail = document.getElementById('owner-detail');
    detail.style.display = 'block';

    document.getElementById('detail-owner-name').textContent = owner.name;
    const sc = this.STATUS_CODES[owner.statusCode];
    const badge = document.getElementById('detail-owner-badge');
    if (sc) {
      badge.textContent = sc.label;
      badge.className = 'detail-badge status-badge ' + sc.css;
    } else {
      badge.textContent = NATIONAL_CONFIG.campaigns[this.state.campaign]?.label || '';
      badge.className = 'detail-badge';
    }

    document.querySelectorAll('.detail-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.detail-tab[data-tab="health"]').classList.add('active');

    this.renderHealthTab(owner);
    this._showTab('health');
  },

  closeOwnerDetail() {
    this.state.selectedOwner = null;
    document.getElementById('owner-detail').style.display = 'none';
    document.querySelector('.campaign-overview').style.display = '';
    document.querySelector('.owners-section').style.display = '';
  },

  switchDetailTab(tab) {
    this.state.currentTab = tab;
    document.querySelectorAll('.detail-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.detail-tab[data-tab="${tab}"]`).classList.add('active');
    this._showTab(tab);

    const owner = this.state.selectedOwner;
    if (!owner) return;

    switch (tab) {
      case 'health': this.renderHealthTab(owner); break;
      case 'recruiting': this.renderRecruitingTab(owner); break;
      case 'sales': this.renderSalesTab(owner); break;
      case 'audit': this.renderAuditTab(owner); break;
    }
  },

  _showTab(tab) {
    ['health', 'recruiting', 'sales', 'audit'].forEach(t => {
      const el = document.getElementById('tab-' + t);
      if (el) el.style.display = t === tab ? 'block' : 'none';
    });
  },

  // ══════════════════════════════════════════════════
  // RENDER: Health Tab
  // ══════════════════════════════════════════════════

  renderHealthTab(owner) {
    const h = owner.health;

    // KPI cards
    const kpis = document.getElementById('health-kpis');
    kpis.innerHTML = [
      { label: 'Active Reps', value: h.current.active },
      { label: 'Leaders', value: h.current.leaders },
      { label: 'Distribution', value: h.current.dist },
      { label: 'In Training', value: h.current.training },
      { label: 'Production LW', value: h.current.productionLW },
      { label: 'DTV', value: h.current.dtv },
      { label: 'Goals', value: h.current.goals }
    ].map(k => `
      <div class="health-kpi">
        <div class="health-kpi-value">${k.value}</div>
        <div class="health-kpi-label">${k.label}</div>
      </div>
    `).join('');

    // Week-over-week trend table
    const trend = document.getElementById('health-trend');
    if (h.trend.length) {
      trend.innerHTML = `
        <div class="section-label">Week-over-Week Progression</div>
        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th class="num">Active</th>
                <th class="num">Leaders</th>
                <th class="num">Dist</th>
                <th class="num">Training</th>
                <th class="num">Production</th>
                <th class="num">DTV</th>
                <th>Goals</th>
              </tr>
            </thead>
            <tbody>
              ${h.trend.map(r => `
                <tr>
                  <td class="bold">${this._esc(r.date)}</td>
                  <td class="num">${r.active}</td>
                  <td class="num">${r.leaders}</td>
                  <td class="num">${r.dist}</td>
                  <td class="num">${r.training}</td>
                  <td class="num">${r.productionLW}</td>
                  <td class="num">${r.dtv}</td>
                  <td>${this._esc(String(r.goals))}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`;
    } else {
      trend.innerHTML = `
        <div class="section-label">Week-over-Week Progression</div>
        <div class="empty-state">
          <div class="empty-state-text">Trend data will appear once NationalCode.gs is connected.</div>
        </div>`;
    }

    // Status codes legend for this owner
    const statusEl = document.getElementById('health-status');
    const sc = this.STATUS_CODES[owner.statusCode];
    const currentLabel = sc ? `Current: <span class="status-badge ${sc.css}">${owner.statusCode} — ${sc.label}</span>` : '';

    statusEl.innerHTML = `
      <div class="section-label">Leader Status Codes</div>
      ${currentLabel ? `<div style="margin-bottom:10px">${currentLabel}</div>` : ''}
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${Object.entries(this.STATUS_CODES).map(([code, def]) =>
          `<span class="status-badge ${def.css}">${code} — ${def.label}</span>`
        ).join('')}
      </div>`;
  },

  // ══════════════════════════════════════════════════
  // RENDER: Recruiting Tab (spreadsheet-style table)
  // ══════════════════════════════════════════════════

  renderRecruitingTab(owner) {
    const r = owner.recruiting;
    if (!r || !r.rows || !r.rows.length) {
      const el = document.getElementById('owner-recruiting-table');
      if (el) el.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-text">Recruiting data will populate from Campaign Tracker Section 2.</div>
        </div>`;
      return;
    }
    this._renderRecruitingTable(r, 'owner-recruiting-table');
  },

  // ══════════════════════════════════════════════════
  // RENDER: Sales Tab
  // ══════════════════════════════════════════════════

  renderSalesTab(owner) {
    const s = owner.sales;

    const summary = document.getElementById('sales-summary');
    summary.innerHTML = [
      { label: 'Total Sales', value: s.summary.totalSales },
      { label: 'New Internet', value: s.summary.newInternet },
      { label: 'Upgrades', value: s.summary.upgrades },
      { label: 'Video Sales', value: s.summary.videoSales },
      { label: 'ABP Mix %', value: s.summary.abpMix },
      { label: '1Gig+ Mix %', value: s.summary.gigMix }
    ].map(k => `
      <div class="health-kpi">
        <div class="health-kpi-value">${k.value}</div>
        <div class="health-kpi-label">${k.label}</div>
      </div>
    `).join('');

    const repsEl = document.getElementById('sales-reps-table');
    if (s.reps.length) {
      repsEl.innerHTML = `
        <div class="section-label">Rep Sales Breakdown (Tableau)</div>
        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th class="num">New Internet</th>
                <th class="num">Upgrade</th>
                <th class="num">Video</th>
                <th class="num">Sales (All)</th>
                <th class="num">ABP Mix</th>
                <th class="num">1Gig+ Mix</th>
                <th class="num">Tech Install</th>
              </tr>
            </thead>
            <tbody>
              ${s.reps.map(rep => `
                <tr>
                  <td class="bold">${this._esc(rep.name)}</td>
                  <td class="num">${rep.newInternet || 0}</td>
                  <td class="num">${rep.upgrade || 0}</td>
                  <td class="num">${rep.video || 0}</td>
                  <td class="num">${rep.salesAll || 0}</td>
                  <td class="num">${rep.abpMix || '—'}</td>
                  <td class="num">${rep.gigMix || '—'}</td>
                  <td class="num">${rep.techInstall || '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`;
    } else {
      repsEl.innerHTML = `
        <div class="section-label">Rep Sales Breakdown</div>
        <div class="empty-state">
          <div class="empty-state-text">Sales data will populate from Campaign Tracker Section 3 (Tableau).</div>
        </div>`;
    }
  },

  // ══════════════════════════════════════════════════
  // RENDER: Audit Tab (Online Presence)
  // ══════════════════════════════════════════════════

  renderAuditTab(owner) {
    const a = owner.audit;

    const grades = document.getElementById('audit-grades');
    grades.innerHTML = [
      { title: 'Google Reviews', grade: a.grades.reviews, icon: '⭐' },
      { title: 'Website', grade: a.grades.website, icon: '🌐' },
      { title: 'Social Media', grade: a.grades.social, icon: '📱' },
      { title: 'SEO', grade: a.grades.seo, icon: '🔍' }
    ].map(g => `
      <div class="audit-grade-card">
        <div class="audit-grade-title">${g.icon} ${g.title}</div>
        <div class="audit-grade-value ${this._gradeClass(g.grade)}">${g.grade}</div>
      </div>
    `).join('');

    const details = document.getElementById('audit-details');
    if (a.details && Object.keys(a.details).length) {
      details.innerHTML = `
        <div class="section-label">Audit Details</div>
        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Value</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(a.details).map(([key, val]) => `
                <tr>
                  <td class="bold">${this._esc(key)}</td>
                  <td>${this._esc(String(val.value || '—'))}</td>
                  <td>${this._esc(String(val.notes || ''))}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`;
    } else {
      details.innerHTML = `
        <div class="section-label">Audit Details</div>
        <div class="empty-state">
          <div class="empty-state-text">Online presence audit data will populate from the Performance Audit sheet.</div>
        </div>`;
    }
  },

  // ══════════════════════════════════════════════════
  // REUSABLE: Recruiting Table (spreadsheet format)
  // ══════════════════════════════════════════════════

  _renderRecruitingTable(data, containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!data || !data.rows || !data.rows.length) {
      el.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-text">Recruiting table data will populate once connected.</div>
        </div>`;
      return;
    }

    const weeks = data.weeks || [];
    const rows = data.rows || [];
    const leaders = data.leaders || 0;

    let html = '';

    // Leaders info (shown on campaign level with legend)
    if (data.showLegend) {
      html += `<div class="rt-leaders-info"># of Leaders: <span>${leaders}</span></div>`;
    } else {
      html += `<div class="rt-leaders-info"># of Leaders: <span>${leaders}</span></div>`;
    }

    // Table
    html += `<div class="rt-wrap"><table class="rt-table"><thead>`;

    // Group header row
    html += `<tr class="rt-group-row">
      <th></th>
      <th class="rt-group-projected">Projected Weekly<br>Numbers Needed</th>
      <th class="rt-group-actual" colspan="${weeks.length}"></th>
      <th class="rt-group-total">Total / Month<br>Overview</th>
    </tr>`;

    // Date header row
    html += `<tr class="rt-date-row">
      <th></th>
      <th></th>
      ${weeks.map(w => `<th>${this._esc(w)}</th>`).join('')}
      <th></th>
    </tr>`;

    html += `</thead><tbody>`;

    // Data rows
    rows.forEach(row => {
      html += `<tr>`;
      html += `<td>${this._esc(row.label)}</td>`;
      html += `<td class="rt-projected">${this._fmtCell(row.projected, row.isRate)}</td>`;

      // Weekly values with conditional coloring
      row.values.forEach(val => {
        const color = this._cellColor(val, row.projected, row.isRate);
        html += `<td class="${color}">${this._fmtCell(val, row.isRate)}</td>`;
      });

      // Total column
      const totalColor = this._cellColor(
        row.total,
        row.isRate ? row.projected : row.projected * weeks.length,
        row.isRate
      );
      html += `<td class="rt-total ${totalColor}">${this._fmtCell(row.total, row.isRate)}</td>`;

      html += `</tr>`;
    });

    html += `</tbody></table></div>`;
    el.innerHTML = html;
  },

  // ── Status codes legend ──
  _renderStatusLegend(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    // Count owners per status code
    const counts = {};
    this.state.owners.forEach(o => {
      if (o.statusCode) counts[o.statusCode] = (counts[o.statusCode] || 0) + 1;
    });

    el.innerHTML = `
      <div class="section-label">Leader Status Codes</div>
      <div class="status-legend">
        ${Object.entries(this.STATUS_CODES).map(([code, def]) => {
          const cnt = counts[code] || 0;
          return `<span class="status-legend-item ${def.css}">${code} — ${def.label}${cnt ? ' (' + cnt + ')' : ''}</span>`;
        }).join('')}
      </div>`;
  },

  // ══════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════

  _esc(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  },

  _formatCurrentWeek() {
    const d = new Date();
    const mon = d.toLocaleString('en-US', { month: 'short' });
    const day = d.getDate();
    return `${mon} ${day}, ${d.getFullYear()}`;
  },

  // Format cell value (add % suffix for rate rows)
  _fmtCell(val, isRate) {
    if (val === null || val === undefined || val === '—') return '—';
    return isRate ? val + '%' : val;
  },

  // Conditional cell color based on actual vs projected
  _cellColor(actual, projected, isRate) {
    if (actual === null || actual === undefined || actual === '—') return '';
    if (projected === null || projected === undefined || projected === '—') return '';
    const a = parseFloat(actual);
    const p = parseFloat(projected);
    if (isNaN(a) || isNaN(p) || p === 0) return '';

    if (isRate) {
      // Percentage comparison
      if (a >= p) return 'cell-green';
      if (a >= p - 5) return 'cell-yellow';
      if (a >= p - 10) return 'cell-orange';
      return 'cell-red';
    } else {
      // Absolute number comparison
      const ratio = a / p;
      if (ratio >= 1) return 'cell-green';
      if (ratio >= 0.8) return 'cell-yellow';
      if (ratio >= 0.6) return 'cell-orange';
      return 'cell-red';
    }
  },

  _statusColor(code) {
    const sc = this.STATUS_CODES[code];
    return sc ? sc.css : '';
  },

  _gradeClass(grade) {
    if (!grade || grade === '—') return '';
    const g = String(grade).toUpperCase().charAt(0);
    if (g === 'A') return 'grade-a';
    if (g === 'B') return 'grade-b';
    if (g === 'C') return 'grade-c';
    if (g === 'D') return 'grade-d';
    return 'grade-f';
  },

  _showLoading(msg) {
    const s = document.getElementById('loading-screen');
    const t = document.getElementById('loading-text');
    if (s) s.style.display = 'flex';
    if (t && msg) t.textContent = msg;
  },

  _hideLoading() {
    const s = document.getElementById('loading-screen');
    if (s) s.style.display = 'none';
  }
};

// ── Boot ──
document.addEventListener('DOMContentLoaded', () => NationalApp.init());
