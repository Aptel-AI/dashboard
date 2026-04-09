// ═══════════════════════════════════════════════════════
// Aptel Slack Channel Auditor — App Controller
// State management, Excel parsing, Slack fetching,
// comparison logic
// ═══════════════════════════════════════════════════════

const SlackApp = {

  // ── State ──
  state: {
    excelData: null,          // { people: [...], roleMappings: { role: [channels] } }
    slackChannels: [],        // [{ id, name, isPrivate, memberCount, members }]
    slackUsers: [],           // [{ id, name, realName, email, image }]
    slackUserMap: {},          // lowercased email -> user object
    slackChannelMemberMap: {}, // channelName -> Set of userIds
    comparisonResults: [],    // computed mismatch rows
    isLoading: false,
    lastRefresh: null,
    searchQuery: '',
    filterMode: 'all',
  },


  // ═══════════════════════════════════════════
  // Initialization
  // ═══════════════════════════════════════════

  init() {
    console.log('[SlackApp] Initializing...');

    // Check for previously saved Excel data in localStorage
    const saved = localStorage.getItem(SLACK_CONFIG.excelStorageKey);
    if (saved) {
      try {
        this.state.excelData = JSON.parse(saved);
        console.log('[SlackApp] Restored Excel data from localStorage');
        SlackRender.renderExcelInfo(this.state.excelData);
        this.loadSlackData();
      } catch (e) {
        console.warn('[SlackApp] Corrupt localStorage data, clearing');
        localStorage.removeItem(SLACK_CONFIG.excelStorageKey);
      }
    }
    // Otherwise, empty state is already visible via HTML
  },


  // ═══════════════════════════════════════════
  // File Upload Handlers
  // ═══════════════════════════════════════════

  handleFileSelect(event) {
    const file = event.target.files?.[0];
    if (file) this.handleFileUpload(file);
    event.target.value = ''; // allow re-selecting same file
  },

  handleFileDrop(event) {
    const file = event.dataTransfer?.files?.[0];
    if (file) this.handleFileUpload(file);
  },

  async handleFileUpload(file) {
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls'].includes(ext)) {
      SlackRender.showError('Please upload an .xlsx or .xls file');
      return;
    }

    console.log(`[SlackApp] Parsing file: ${file.name}`);
    SlackRender.hideError();

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const excelData = this.parseExcel(workbook);

      if (!excelData.people.length) {
        SlackRender.showError('No people found in the People sheet. Check column headers: Name, Email, Role');
        return;
      }

      if (!Object.keys(excelData.roleMappings).length) {
        SlackRender.showError('No role mappings found in the Roles sheet. Check column headers: Role, Channel');
        return;
      }

      // Save to state and localStorage
      this.state.excelData = excelData;
      localStorage.setItem(SLACK_CONFIG.excelStorageKey, JSON.stringify(excelData));

      console.log(`[SlackApp] Parsed: ${excelData.people.length} people, ${Object.keys(excelData.roleMappings).length} roles`);
      SlackRender.renderExcelInfo(excelData);

      // Auto-fetch Slack data
      this.loadSlackData();

    } catch (err) {
      console.error('[SlackApp] Excel parse error:', err);
      SlackRender.showError(`Failed to parse Excel file: ${err.message}`);
    }
  },


  // ═══════════════════════════════════════════
  // Excel Parsing
  // ═══════════════════════════════════════════

  parseExcel(workbook) {
    const cfg = SLACK_CONFIG;
    const result = { people: [], roleMappings: {} };

    // ── Parse People sheet ──
    const peopleSheet = workbook.Sheets[cfg.expectedSheets.people];
    if (peopleSheet) {
      const rows = XLSX.utils.sheet_to_json(peopleSheet, { defval: '' });
      result.people = rows
        .map(row => ({
          name: String(row[cfg.peopleColumns.name] || '').trim(),
          email: String(row[cfg.peopleColumns.email] || '').trim().toLowerCase(),
          slackEmail: String(row[cfg.peopleColumns.slackEmail] || '').trim().toLowerCase(),
          role: String(row[cfg.peopleColumns.role] || '').trim(),
        }))
        .filter(p => p.name && p.email);
    } else {
      console.warn(`[SlackApp] Sheet "${cfg.expectedSheets.people}" not found. Available: ${workbook.SheetNames.join(', ')}`);
    }

    // ── Parse Roles sheet ──
    const rolesSheet = workbook.Sheets[cfg.expectedSheets.roles];
    if (rolesSheet) {
      const rows = XLSX.utils.sheet_to_json(rolesSheet, { defval: '' });

      if (rows.length > 0) {
        const cols = Object.keys(rows[0]);

        // Auto-detect format:
        // Format A: 2 columns (Role, Channel) — one row per role-channel pair
        // Format B: 3+ columns (Role, Channel1, Channel2, ...) — one row per role
        const isWideFormat = cols.length > 2;

        if (isWideFormat) {
          // Wide format: Role | Channel1 | Channel2 | ...
          const roleCol = cols[0]; // First column is the role
          const channelCols = cols.slice(1);

          for (const row of rows) {
            const role = String(row[roleCol] || '').trim();
            if (!role) continue;

            if (!result.roleMappings[role]) result.roleMappings[role] = [];

            for (const col of channelCols) {
              const ch = this._normalizeChannel(String(row[col] || ''));
              if (ch) result.roleMappings[role].push(ch);
            }
          }
        } else {
          // Narrow format: Role | Channel — one row per pair
          for (const row of rows) {
            const role = String(row[cfg.rolesColumns.role] || '').trim();
            const ch = this._normalizeChannel(String(row[cfg.rolesColumns.channel] || ''));
            if (!role || !ch) continue;

            if (!result.roleMappings[role]) result.roleMappings[role] = [];
            result.roleMappings[role].push(ch);
          }
        }
      }

      // Deduplicate channel lists
      for (const role of Object.keys(result.roleMappings)) {
        result.roleMappings[role] = [...new Set(result.roleMappings[role])];
      }
    } else {
      console.warn(`[SlackApp] Sheet "${cfg.expectedSheets.roles}" not found. Available: ${workbook.SheetNames.join(', ')}`);
    }

    return result;
  },

  // Normalize channel name: strip #, lowercase, trim
  _normalizeChannel(ch) {
    return ch.replace(/^#/, '').toLowerCase().trim();
  },


  // ═══════════════════════════════════════════
  // Slack Data Loading
  // ═══════════════════════════════════════════

  async loadSlackData() {
    if (this.state.isLoading) return;
    this.state.isLoading = true;

    const url = SLACK_CONFIG.workerUrl;
    SlackRender.setStatus('Fetching Slack data...', false);
    SlackRender.renderSkeletonTable();
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) refreshBtn.disabled = true;

    try {
      // Parallel fetch channels + users
      const [channelsRes, usersRes] = await Promise.all([
        fetch(`${url}/channels`).then(r => {
          if (!r.ok) throw new Error(`Channels: ${r.status} ${r.statusText}`);
          return r.json();
        }),
        fetch(`${url}/users`).then(r => {
          if (!r.ok) throw new Error(`Users: ${r.status} ${r.statusText}`);
          return r.json();
        }),
      ]);

      if (channelsRes.error) throw new Error(channelsRes.error);
      if (usersRes.error) throw new Error(usersRes.error);

      this.state.slackChannels = channelsRes.channels || [];
      this.state.slackUsers = usersRes.users || [];
      this.state.lastRefresh = new Date();

      // Build lookup maps
      this._buildLookups();

      console.log(`[SlackApp] Loaded: ${this.state.slackChannels.length} channels, ${this.state.slackUsers.length} users`);

      // Run comparison
      this.computeComparison();

      SlackRender.hideError();
      const time = this.state.lastRefresh.toLocaleTimeString();
      SlackRender.setStatus(`Updated ${time}`, true);

    } catch (err) {
      console.error('[SlackApp] Slack fetch error:', err);
      SlackRender.showError(`Failed to fetch Slack data: ${err.message}`);
      SlackRender.setStatus('Error', false);
      document.getElementById('table-container').innerHTML = '';
    } finally {
      this.state.isLoading = false;
      if (refreshBtn) refreshBtn.disabled = false;
    }
  },

  _buildLookups() {
    // Email -> Slack user
    this.state.slackUserMap = {};
    for (const u of this.state.slackUsers) {
      if (u.email) {
        this.state.slackUserMap[u.email] = u;
      }
    }

    // Channel name -> Set of member user IDs
    this.state.slackChannelMemberMap = {};
    for (const ch of this.state.slackChannels) {
      this.state.slackChannelMemberMap[ch.name.toLowerCase()] = new Set(ch.members || []);
    }
  },


  // ═══════════════════════════════════════════
  // Comparison Engine
  // ═══════════════════════════════════════════

  computeComparison() {
    const { excelData, slackUserMap, slackChannelMemberMap } = this.state;
    if (!excelData) return;

    const results = [];

    for (const person of excelData.people) {
      // Find their Slack user (try slackEmail first, then email)
      const lookupEmail = person.slackEmail || person.email;
      const slackUser = slackUserMap[lookupEmail];

      // Get expected channels from role
      const expectedChannels = excelData.roleMappings[person.role] || [];

      if (!slackUser) {
        // Person not found in Slack
        results.push({
          name: person.name,
          email: person.email,
          role: person.role,
          slackUser: null,
          expectedChannels,
          actualChannels: [],
          matched: [],
          missing: expectedChannels.slice(),
          extra: [],
          status: 'notFound',
        });
        continue;
      }

      if (!expectedChannels.length) {
        // No role mapping defined — gather actual channels for info
        const actual = this._getUserChannels(slackUser.id);
        results.push({
          name: person.name,
          email: person.email,
          role: person.role || '(none)',
          slackUser,
          expectedChannels: [],
          actualChannels: actual,
          matched: [],
          missing: [],
          extra: actual.slice(),
          status: 'noRole',
        });
        continue;
      }

      // Get actual channels this user is in
      const actualChannels = this._getUserChannels(slackUser.id);

      // Compare
      const expectedSet = new Set(expectedChannels);
      const actualSet = new Set(actualChannels);

      const matched = expectedChannels.filter(ch => actualSet.has(ch));
      const missing = expectedChannels.filter(ch => !actualSet.has(ch));
      const extra = actualChannels.filter(ch => !expectedSet.has(ch));

      let status = 'match';
      if (missing.length && extra.length) status = 'extra'; // both issues — show as mismatch
      else if (missing.length) status = 'missing';
      else if (extra.length) status = 'extra';

      results.push({
        name: person.name,
        email: person.email,
        role: person.role,
        slackUser,
        expectedChannels,
        actualChannels,
        matched,
        missing,
        extra,
        status,
      });
    }

    // Sort: mismatches first, then not found, then OK
    const statusOrder = { missing: 0, extra: 1, noRole: 2, notFound: 3, match: 4 };
    results.sort((a, b) => (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5));

    this.state.comparisonResults = results;

    // Render
    SlackRender.renderSummary(results);
    SlackRender.updateFilterCounts(results);
    SlackRender.renderTable(results, this.state.filterMode, this.state.searchQuery);
  },

  // Get all channel names a user ID is a member of
  _getUserChannels(userId) {
    const channels = [];
    for (const ch of this.state.slackChannels) {
      const members = this.state.slackChannelMemberMap[ch.name.toLowerCase()];
      if (members && members.has(userId)) {
        channels.push(ch.name.toLowerCase());
      }
    }
    return channels.sort();
  },


  // ═══════════════════════════════════════════
  // User Actions
  // ═══════════════════════════════════════════

  refresh() {
    if (!this.state.excelData) return;
    this.loadSlackData();
  },

  setFilter(mode) {
    this.state.filterMode = mode;
    SlackRender.setActiveFilter(mode);
    SlackRender.renderTable(this.state.comparisonResults, mode, this.state.searchQuery);
  },

  setSearch(query) {
    this.state.searchQuery = query;
    SlackRender.renderTable(this.state.comparisonResults, this.state.filterMode, query);
  },

  clearExcelData() {
    localStorage.removeItem(SLACK_CONFIG.excelStorageKey);
    this.state.excelData = null;
    this.state.comparisonResults = [];
    this.state.slackChannels = [];
    this.state.slackUsers = [];
    this.state.slackUserMap = {};
    this.state.slackChannelMemberMap = {};
    this.state.filterMode = 'all';
    this.state.searchQuery = '';
    SlackRender.resetToEmpty();
  },

  dismissError() {
    SlackRender.hideError();
  },
};


// ── Boot ──
document.addEventListener('DOMContentLoaded', () => SlackApp.init());
