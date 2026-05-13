/* ════════════════════════════════════════════════════════
   Acquity prototype — recruiter views
   ════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var UI    = global.AcquityUI;
  var Data  = global.AcquityData;
  var State = global.AcquityState;
  var el    = UI.el;
  var icons = UI.icons;

  // ── About Me card (shared with admin profile) ──────────
  function aboutMeCard(user) {
    var rows = [];
    rows.push(row('Name', user.name));
    if (user.nickname) rows.push(row('Nickname', user.nickname));
    rows.push(row('Title', user.title));
    rows.push(row('Upline', user.upline || '—'));
    rows.push(row('Team', user.team || '—'));
    rows.push(row('Start Date', UI.formatDate(user.startDate)));

    var accolades = (user.accolades || []).length
      ? el('div', { class: 'acq-accolades' }, user.accolades.map(UI.accoladeBadge))
      : null;

    return el('div', { class: 'acq-card acq-aboutme' }, [
      el('div', { class: 'acq-aboutme-avatar', text: UI.initials(user.name) }),
      el('div', { class: 'acq-aboutme-name', text: user.name }),
      el('div', { class: 'acq-aboutme-title', text: user.title }),
      el('div', { class: 'acq-aboutme-divider' }),
      rows,
      accolades
    ]);

    function row(label, value) {
      return el('div', { class: 'acq-aboutme-row' }, [
        el('span', { class: 'label', text: label }),
        el('span', { class: 'value', text: value })
      ]);
    }
  }

  // ── PROFILE ────────────────────────────────────────────
  function renderProfile() {
    var user = State.get().currentUser;
    var stats = Data.weeklyStats;

    var statsHead = el('div', { class: 'acq-stats-head' }, [
      el('div', { class: 'acq-card-title' }, [icons.pulse(), 'This Week']),
      el('div', { class: 'acq-stats-range', text: stats.rangeLabel })
    ]);

    var statsGrid = el('div', { class: 'acq-stats-grid' }, stats.tiles.map(UI.statTile));

    var rightCol = el('div', { class: 'acq-card acq-card-pad-lg' }, [
      statsHead,
      statsGrid
    ]);

    var grid = el('div', { class: 'acq-profile-grid' }, [
      aboutMeCard(user),
      rightCol
    ]);

    return el('div', {}, [
      UI.pageHead('My Profile', "Here's how your week is shaping up."),
      grid
    ]);
  }

  // ── DIRECTORY (placeholder per spec) ───────────────────
  function renderDirectory() {
    return el('div', {}, [
      UI.pageHead('Directory', 'Find teammates, recruiters, and call center leads.'),
      UI.placeholder(
        'Directory prototype coming soon',
        'A prebuilt directory prototype will plug into this view. It will support search, team grouping, and click-through to recruiter profiles.'
      )
    ]);
  }

  // Register routes
  global.AcquityRouter.register('/recruiter/profile',   renderProfile);
  global.AcquityRouter.register('/recruiter/directory', renderDirectory);

  // Expose shared bits for admin views
  global.AcquityViewsShared = {
    aboutMeCard: aboutMeCard
  };
})(window);
