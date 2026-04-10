// ═══════════════════════════════════════════════════════
// Aptel Slack Channel Auditor — Render Module
// Pure DOM rendering — no state mutation, no data fetching
// ═══════════════════════════════════════════════════════

const SlackRender = {

  // ── HTML escape ──
  _esc(str) {
    const d = document.createElement('div');
    d.textContent = str ?? '';
    return d.innerHTML;
  },

  // ── Show / hide helpers ──
  show(id) { const el = document.getElementById(id); if (el) el.style.display = ''; },
  hide(id) { const el = document.getElementById(id); if (el) el.style.display = 'none'; },

  // ── Loading screen ──
  showLoading(msg) {
    document.getElementById('loading-text').textContent = msg || 'Loading...';
    this.show('loading-screen');
  },
  hideLoading() { this.hide('loading-screen'); },

  // ── Error banner ──
  showError(msg) {
    document.getElementById('error-msg').textContent = msg;
    this.show('error-banner');
  },
  hideError() { this.hide('error-banner'); },

  // ── Toast notification ──
  showToast(msg, isError) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = isError ? 'toast toast-error' : 'toast';
    el.style.display = '';
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => { el.style.display = 'none'; }, 3000);
  },

  // ── Status pill ──
  setStatus(text, connected) {
    const pill = document.getElementById('status-pill');
    const span = document.getElementById('status-text');
    span.textContent = text;
    pill.className = connected ? 'status-pill connected' : 'status-pill';
  },

  // ── Excel info bar ──
  renderExcelInfo(excelData) {
    if (!excelData) { this.hide('excel-info'); return; }
    const p = excelData.people.length;
    const d = Object.keys(excelData.deptMappings || {}).length;
    const r = Object.keys(excelData.roleMappings || {}).length;
    const allChannels = new Set([
      ...Object.values(excelData.deptMappings || {}).flat(),
      ...Object.values(excelData.roleMappings || {}).flat(),
    ]);
    document.getElementById('excel-info-text').textContent =
      `${p} people, ${d} departments, ${r} role combos, ${allChannels.size} unique channels`;
    this.show('excel-info');
    this.hide('empty-state');
  },


  // ═══════════════════════════════════════════
  // AUDIT PAGE
  // ═══════════════════════════════════════════

  // ── Summary cards ──
  renderSummary(results) {
    if (!results || !results.length) { this.hide('summary-section'); return; }

    const total = results.length;
    const ok = results.filter(r => r.status === 'match').length;
    const mismatches = results.filter(r => r.status === 'missing' || r.status === 'extra').length;
    const notFound = results.filter(r => r.status === 'notFound').length;
    const noRole = results.filter(r => r.status === 'noMapping').length;

    const el = document.getElementById('summary-section');
    el.innerHTML = `
      <div class="stat-card">
        <div class="stat-card-value">${total}</div>
        <div class="stat-card-label">Total People</div>
      </div>
      <div class="stat-card ok">
        <div class="stat-card-value">${ok}</div>
        <div class="stat-card-label">Matched</div>
      </div>
      <div class="stat-card danger">
        <div class="stat-card-value">${mismatches}</div>
        <div class="stat-card-label">Mismatches</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value">${notFound}</div>
        <div class="stat-card-label">Not in Slack</div>
      </div>
      ${noRole ? `
      <div class="stat-card warning">
        <div class="stat-card-value">${noRole}</div>
        <div class="stat-card-label">No Role Mapping</div>
      </div>` : ''}
    `;
    el.style.display = '';
  },

  // ── Filter tab counts ──
  updateFilterCounts(results) {
    if (!results) return;
    const all = results.length;
    const ok = results.filter(r => r.status === 'match').length;
    const mismatches = results.filter(r => r.status === 'missing' || r.status === 'extra').length;
    const notFound = results.filter(r => r.status === 'notFound' || r.status === 'noMapping').length;

    document.getElementById('count-all').textContent = all;
    document.getElementById('count-mismatches').textContent = mismatches;
    document.getElementById('count-ok').textContent = ok;
    document.getElementById('count-not-found').textContent = notFound;
  },

  // ── Active filter highlight ──
  setActiveFilter(mode) {
    document.querySelectorAll('.filter-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.filter === mode);
    });
  },

  // ── Comparison table ──
  renderTable(results, filterMode, searchQuery) {
    const container = document.getElementById('table-container');
    if (!results || !results.length) {
      container.innerHTML = '';
      return;
    }

    let rows = results;
    if (filterMode === 'mismatches') {
      rows = rows.filter(r => r.status === 'missing' || r.status === 'extra');
    } else if (filterMode === 'ok') {
      rows = rows.filter(r => r.status === 'match');
    } else if (filterMode === 'not-found') {
      rows = rows.filter(r => r.status === 'notFound' || r.status === 'noMapping');
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        (r.department || '').toLowerCase().includes(q) ||
        (r.level || '').toLowerCase().includes(q)
      );
    }

    if (!rows.length) {
      container.innerHTML = `
        <div style="text-align:center;padding:60px 20px;color:var(--gray-500);">
          <div style="font-size:24px;margin-bottom:8px;">🔍</div>
          <div style="font-weight:600;">No results match your filters</div>
        </div>`;
      return;
    }

    const html = `
      <table class="slack-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Department</th>
            <th>Level</th>
            <th>Expected Channels</th>
            <th>Actual Channels</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => this._renderRow(r)).join('')}
        </tbody>
      </table>
    `;
    container.innerHTML = html;
    this.show('toolbar');
  },

  _renderRow(r) {
    const statusClass = SLACK_CONFIG.statusColors[r.status] || '';
    const statusLabel = SLACK_CONFIG.statusLabels[r.status] || r.status;
    const expectedPills = this._channelPills(r.expectedChannels, r.matched, r.missing, 'expected');
    const actualPills = this._channelPills(r.actualChannels, r.matched, r.extra, 'actual');

    let detail = '';
    if (r.missing.length) detail += `<span style="color:var(--tomato);font-size:12px;font-weight:600;">+${r.missing.length} missing</span> `;
    if (r.extra.length) detail += `<span style="color:var(--amber);font-size:12px;font-weight:600;">-${r.extra.length} extra</span>`;

    return `
      <tr>
        <td class="name-cell">${this._esc(r.name)}</td>
        <td class="email-cell">${this._esc(r.email)}</td>
        <td class="role-cell">${this._esc(r.department || '')}</td>
        <td class="role-cell">${this._esc(r.level || '')}</td>
        <td><div class="channel-pills">${expectedPills}</div></td>
        <td><div class="channel-pills">${actualPills}</div></td>
        <td>
          <span class="status-badge ${statusClass}">
            <span class="dot"></span>
            ${this._esc(statusLabel)}
          </span>
          ${detail ? `<div style="margin-top:4px">${detail}</div>` : ''}
        </td>
      </tr>
    `;
  },

  _channelPills(channels, matched, highlighted, mode) {
    if (!channels || !channels.length) {
      return '<span style="color:var(--gray-400);font-size:12px;">—</span>';
    }

    return channels.map(ch => {
      let cls = 'pill-ok';
      let icon = '✓';

      if (mode === 'expected' && highlighted.includes(ch)) {
        cls = 'pill-missing';
        icon = '✗';
      } else if (mode === 'actual' && highlighted.includes(ch)) {
        cls = 'pill-extra';
        icon = '?';
      } else if (matched.includes(ch)) {
        cls = 'pill-ok';
        icon = '✓';
      }

      return `<span class="channel-pill ${cls}"><span class="pill-icon">${icon}</span>#${this._esc(ch)}</span>`;
    }).join('');
  },


  // ═══════════════════════════════════════════
  // PEOPLE PAGE
  // ═══════════════════════════════════════════

  renderPeopleTable(people, searchQuery, pendingUpdates) {
    const container = document.getElementById('people-table-container');
    if (!people || !people.length) {
      container.innerHTML = `
        <div style="text-align:center;padding:60px 20px;color:var(--gray-500);">
          <div style="font-size:24px;margin-bottom:8px;">👥</div>
          <div style="font-weight:600;">No people loaded yet</div>
          <div style="font-size:13px;margin-top:4px;">People are auto-populated from Slack on first load.</div>
        </div>`;
      return;
    }

    let rows = people;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.displayDept || '').toLowerCase().includes(q) ||
        (p.level || '').toLowerCase().includes(q)
      );
    }

    // Sort: people with no level first, then alpha
    rows = [...rows].sort((a, b) => {
      if (!a.level && b.level) return -1;
      if (a.level && !b.level) return 1;
      return a.name.localeCompare(b.name);
    });

    container.innerHTML = `
      <table class="slack-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Department</th>
            <th>Level</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(p => {
            const isDirty = pendingUpdates && pendingUpdates.has(p.email);
            const dirtyClass = isDirty ? ' row-dirty' : '';
            const currentLevel = (p.level || '').trim();
            const opts = SLACK_CONFIG.levels.map(l =>
              `<option value="${this._esc(l)}"${l === currentLevel ? ' selected' : ''}>${this._esc(l)}</option>`
            ).join('');
            return `
              <tr class="${dirtyClass}">
                <td class="name-cell">${this._esc(p.name)}</td>
                <td class="email-cell">${this._esc(p.email)}</td>
                <td class="role-cell">${this._esc(p.displayDept || '—')}</td>
                <td>
                  <select class="level-select${isDirty ? ' changed' : ''}"
                          onchange="SlackApp.setPeopleLevel('${this._esc(p.email)}', this.value)">
                    <option value=""${!currentLevel ? ' selected' : ''}>—</option>
                    ${opts}
                  </select>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;

    // Update subtitle
    const sub = document.getElementById('people-subtitle');
    if (sub) sub.textContent = `${people.length} team members`;
  },

  renderPeopleSaveBar(count) {
    const bar = document.getElementById('people-save-bar');
    const text = document.getElementById('save-bar-text');
    if (!bar) return;
    if (count > 0) {
      text.textContent = `${count} unsaved change${count !== 1 ? 's' : ''}`;
      bar.style.display = '';
    } else {
      bar.style.display = 'none';
    }
  },


  // ═══════════════════════════════════════════
  // CHANNELS PAGE
  // ═══════════════════════════════════════════

  renderDeptMappings(deptMappings) {
    const container = document.getElementById('dept-mappings-container');
    if (!container) return;

    const depts = Object.keys(deptMappings || {}).sort();
    if (!depts.length) {
      container.innerHTML = `<p style="color:var(--gray-400);font-size:13px;padding:12px 0;">No department mappings yet. Add one below.</p>`;
      return;
    }

    let html = `
      <table class="mapping-table">
        <thead><tr><th>Department</th><th>Channels</th></tr></thead>
        <tbody>
    `;

    for (const dept of depts) {
      const channels = deptMappings[dept] || [];
      const pills = channels.map(ch => `
        <span class="mapping-pill">
          #${this._esc(ch)}
          <button class="remove-btn" onclick="SlackApp.removeDeptMapping('${this._esc(dept)}','${this._esc(ch)}')" title="Remove">✕</button>
        </span>
      `).join('');

      html += `
        <tr>
          <td class="dept-name">${this._esc(dept)}</td>
          <td>${pills}</td>
        </tr>
      `;
    }

    html += '</tbody></table>';
    container.innerHTML = html;
  },

  renderRoleMappings(roleMappings) {
    const container = document.getElementById('role-mappings-container');
    if (!container) return;

    const keys = Object.keys(roleMappings || {}).sort();
    if (!keys.length) {
      container.innerHTML = `<p style="color:var(--gray-400);font-size:13px;padding:12px 0;">No role mappings yet. Add one below.</p>`;
      return;
    }

    let html = `
      <table class="mapping-table">
        <thead><tr><th>Department</th><th>Level</th><th>Channels</th></tr></thead>
        <tbody>
    `;

    for (const key of keys) {
      const [dept, level] = key.split('|');
      const channels = roleMappings[key] || [];
      const pills = channels.map(ch => `
        <span class="mapping-pill">
          #${this._esc(ch)}
          <button class="remove-btn" onclick="SlackApp.removeRoleMapping('${this._esc(dept)}','${this._esc(level)}','${this._esc(ch)}')" title="Remove">✕</button>
        </span>
      `).join('');

      html += `
        <tr>
          <td class="dept-name">${this._esc(dept)}</td>
          <td class="level-name">${this._esc(level)}</td>
          <td>${pills}</td>
        </tr>
      `;
    }

    html += '</tbody></table>';
    container.innerHTML = html;
  },

  // Populate datalists and level select for the Channels page add forms
  populateChannelsFormData(deptMappings, roleMappings, slackChannels) {
    // Department datalist
    const deptList = document.getElementById('dept-datalist');
    if (deptList) {
      const allDepts = new Set([
        ...Object.keys(deptMappings || {}),
        ...Object.keys(roleMappings || {}).map(k => k.split('|')[0]),
      ]);
      deptList.innerHTML = [...allDepts].sort().map(d =>
        `<option value="${this._esc(d)}">`
      ).join('');
    }

    // Channel datalist
    const chList = document.getElementById('channel-datalist');
    if (chList) {
      const names = (slackChannels || []).map(ch => ch.name.toLowerCase()).sort();
      chList.innerHTML = names.map(n => `<option value="${this._esc(n)}">`).join('');
    }

    // Role level select
    const levelSelect = document.getElementById('add-role-level');
    if (levelSelect && levelSelect.options.length <= 1) {
      for (const l of SLACK_CONFIG.levels) {
        const opt = document.createElement('option');
        opt.value = l;
        opt.textContent = l;
        levelSelect.appendChild(opt);
      }
    }
  },


  // ═══════════════════════════════════════════
  // SHARED
  // ═══════════════════════════════════════════

  // ── Skeleton loading rows ──
  renderSkeletonTable() {
    const container = document.getElementById('table-container');
    const rows = Array.from({ length: 8 }, () => `
      <div class="skeleton-row">
        <div class="skeleton skeleton-cell" style="width:120px"></div>
        <div class="skeleton skeleton-cell" style="width:180px"></div>
        <div class="skeleton skeleton-cell" style="width:80px"></div>
        <div class="skeleton skeleton-cell" style="width:200px"></div>
        <div class="skeleton skeleton-cell" style="width:200px"></div>
        <div class="skeleton skeleton-cell" style="width:80px"></div>
      </div>
    `).join('');

    container.innerHTML = `
      <div style="background:var(--white);border:1px solid var(--gray-100);border-radius:var(--radius);overflow:hidden;">
        <div style="padding:12px 16px;background:var(--gray-50);border-bottom:1px solid var(--gray-100);display:flex;gap:16px;">
          <div class="skeleton" style="width:60px;height:12px"></div>
          <div class="skeleton" style="width:60px;height:12px"></div>
          <div class="skeleton" style="width:40px;height:12px"></div>
          <div class="skeleton" style="width:120px;height:12px"></div>
          <div class="skeleton" style="width:120px;height:12px"></div>
          <div class="skeleton" style="width:60px;height:12px"></div>
        </div>
        ${rows}
      </div>
    `;
  },

  // ── Show error empty state ──
  showEmptyError() {
    this.hide('excel-info');
    this.hide('summary-section');
    this.hide('toolbar');
    document.getElementById('table-container').innerHTML = '';
    this.show('empty-state');
    this.setStatus('Error', false);
  },
};
