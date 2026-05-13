/* ════════════════════════════════════════════════════════
   Acquity prototype — shared components / helpers
   Pure rendering helpers. No state. No routing.
   ════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  // ── DOM helpers ────────────────────────────────────────
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === 'class')        node.className = v;
        else if (k === 'html')    node.innerHTML = v;
        else if (k === 'text')    node.textContent = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
        else if (k.indexOf('on') === 0 && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'dataset') Object.keys(v).forEach(function (dk) { node.dataset[dk] = v[dk]; });
        else node.setAttribute(k, v);
      });
    }
    if (children) appendChildren(node, children);
    return node;
  }

  function appendChildren(node, children) {
    (Array.isArray(children) ? children : [children]).forEach(function (child) {
      if (child == null || child === false) return;
      if (typeof child === 'string' || typeof child === 'number') {
        node.appendChild(document.createTextNode(String(child)));
      } else if (child instanceof Node) {
        node.appendChild(child);
      } else if (Array.isArray(child)) {
        appendChildren(node, child);
      }
    });
  }

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  // ── Strings ────────────────────────────────────────────
  function initials(name) {
    if (!name) return '—';
    var parts = String(name).trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function formatDate(iso) {
    if (!iso) return '';
    var d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // ── Icons (inline SVG, currentColor) ───────────────────
  function svg(d, opts) {
    opts = opts || {};
    var ns = 'http://www.w3.org/2000/svg';
    var s = document.createElementNS(ns, 'svg');
    s.setAttribute('viewBox', opts.viewBox || '0 0 24 24');
    s.setAttribute('fill', 'none');
    s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', opts.stroke || '2');
    s.setAttribute('stroke-linecap', 'round');
    s.setAttribute('stroke-linejoin', 'round');
    s.setAttribute('aria-hidden', 'true');
    if (Array.isArray(d)) {
      d.forEach(function (p) {
        var path = document.createElementNS(ns, 'path');
        path.setAttribute('d', p);
        s.appendChild(path);
      });
    } else {
      var path = document.createElementNS(ns, 'path');
      path.setAttribute('d', d);
      s.appendChild(path);
    }
    return s;
  }

  var icons = {
    user:     function () { return svg(['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8']); },
    users:    function () { return svg(['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8', 'M23 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75']); },
    grid:     function () { return svg(['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M14 14h7v7h-7z', 'M3 14h7v7H3z']); },
    building: function () { return svg(['M3 21h18', 'M5 21V7l8-4v18', 'M19 21V11l-6-4', 'M9 9v.01', 'M9 12v.01', 'M9 15v.01', 'M9 18v.01']); },
    clipboard:function () { return svg(['M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2', 'M9 3h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z']); },
    plus:     function () { return svg(['M12 5v14', 'M5 12h14']); },
    chevronLeft: function () { return svg('M15 18l-6-6 6-6'); },
    search:   function () { return svg(['M21 21l-4.35-4.35', 'M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16z']); },
    timer:    function () { return svg(['M12 8v4l3 2', 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z']); },
    flame:    function () { return svg('M8.5 14.5A2.5 2.5 0 0 0 11 17c1.4 0 2.5-1.1 2.5-2.5 0-1.5-1-2.5-2-3.5L9 9c-1-1-1-2.5 0-3.5C10 4.5 11.5 4 13 5.5c1.5 1.5 1 3 0 4-1.5 1.5-3 3-3 5 0 3 3 5 5 5 4 0 7-3 7-7s-3-7-7-7c-3 0-6 2-6 6'); },
    phone:    function () { return svg('M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z'); },
    save:     function () { return svg(['M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z', 'M17 21v-8H7v8', 'M7 3v5h8']); },
    trash:    function () { return svg(['M3 6h18', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2', 'M10 11v6', 'M14 11v6']); },
    eye:      function () { return svg(['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z']); },
    inbox:    function () { return svg(['M22 12h-6l-2 3h-4l-2-3H2', 'M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z']); },
    pulse:    function () { return svg('M22 12h-4l-3 9L9 3l-3 9H2'); },
    star:     function () { return svg('M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z', { stroke: 2.5 }); },
    crown:    function () { return svg(['M2 6l5 5 5-7 5 7 5-5v12H2z']); },
    sparkle:  function () { return svg(['M12 2v6', 'M12 16v6', 'M2 12h6', 'M16 12h6', 'M5 5l4 4', 'M15 15l4 4', 'M5 19l4-4', 'M15 9l4-4']); },
    check:    function () { return svg('M5 12l5 5L20 7'); }
  };

  // ── Accolade badge ─────────────────────────────────────
  // Tier mapping: rare/elite accolades get the medallion treatment,
  // mid-tier get the ribbon, everyday recognitions stay quiet.
  // Add new accolades here (or accept { name, tier } object form).
  var ACCOLADE_TIERS = {
    // Elite — once-a-year-or-rarer recognition (ornate frame)
    'Rookie of the Year':   'frame',
    'Employee of the Year': 'frame',
    'President\'s Club':    'frame',
    'Hall of Fame':         'frame',

    // Notable — earned through repeated performance (scrollwork)
    '100 Club':             'scroll',
    'Top Closer':           'scroll',
    'Employee of the Quarter': 'scroll',
    'Belize Lead':          'scroll',
    'Streak Master':        'scroll',

    // Token — onboarding / participation (plain pill)
    'Onboarded':            'token',
    'First 30 Days':        'token',
    'Welcome Aboard':       'token',
    'Employee of the Month':'token'
  };

  function accoladeTier(name) {
    if (ACCOLADE_TIERS[name]) return ACCOLADE_TIERS[name];
    var lower = name.toLowerCase();
    if (lower.indexOf('year') !== -1 || lower.indexOf('president') !== -1) return 'frame';
    if (lower.indexOf('quarter') !== -1 || lower.indexOf('top') !== -1) return 'scroll';
    return 'token';
  }

  // ── Scrollwork flourish (Tier 2 cartouche, single side) ─
  // Used twice: once left, once right (right is mirrored via CSS).
  // Stylized antique cartouche scrolls — three lobes top/middle/bottom
  // tapering outward to a curl tip.
  function flourishSVG() {
    var ns = 'http://www.w3.org/2000/svg';
    var s = document.createElementNS(ns, 'svg');
    s.setAttribute('viewBox', '0 0 34 38');
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML =
      // Top lobe — leaf curl
      '<path d="M 6 18 C 8 8, 14 4, 20 6 C 24 7, 24 12, 20 13 C 16 14, 11 15, 6 18 Z" fill="currentColor"/>' +
      // Center horizontal scroll — pointed leaf
      '<path d="M 0 19 C 4 17, 10 16, 16 17 C 22 18, 28 19, 32 21 C 28 21, 22 21, 16 20 C 10 20, 4 20, 0 19 Z" fill="currentColor"/>' +
      // Bottom lobe — leaf curl (mirror of top)
      '<path d="M 6 20 C 8 30, 14 34, 20 32 C 24 31, 24 26, 20 25 C 16 24, 11 23, 6 20 Z" fill="currentColor"/>' +
      // Outer tip — small curl drop
      '<circle cx="32.5" cy="19" r="1.6" fill="currentColor"/>' +
      // Accent dots flanking the tip
      '<circle cx="28" cy="13" r="1.1" fill="currentColor" opacity="0.85"/>' +
      '<circle cx="28" cy="25" r="1.1" fill="currentColor" opacity="0.85"/>';
    return s;
  }

  // ── Ornate horizontal frame (Tier 3) ─────────────────────
  // Stylized Victorian picture frame: outer scalloped oval,
  // inner double-line, top/bottom cartouches, side flourishes,
  // 4 corner scrolls. Gold gradient fill.
  function frameSVG() {
    var ns = 'http://www.w3.org/2000/svg';
    var s = document.createElementNS(ns, 'svg');
    s.setAttribute('viewBox', '0 0 320 110');
    s.setAttribute('preserveAspectRatio', 'none');
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = [
      // Gradients
      '<defs>',
      '  <linearGradient id="acq-frame-gold" x1="0%" y1="0%" x2="100%" y2="100%">',
      '    <stop offset="0%"  stop-color="#fde68a"/>',
      '    <stop offset="35%" stop-color="#f59e0b"/>',
      '    <stop offset="70%" stop-color="#b45309"/>',
      '    <stop offset="100%" stop-color="#7c2d12"/>',
      '  </linearGradient>',
      '  <linearGradient id="acq-frame-gold-hl" x1="0%" y1="0%" x2="0%" y2="100%">',
      '    <stop offset="0%"  stop-color="#fef3c7"/>',
      '    <stop offset="100%" stop-color="#d97706"/>',
      '  </linearGradient>',
      '</defs>',

      // Drop shadow (soft)
      '<ellipse cx="160" cy="58" rx="148" ry="42" fill="#7c2d12" opacity="0.15"/>',

      // ── OUTER frame band (oval ring with double-stroke) ──
      // Use even-odd fill rule to carve out the inner oval
      '<path fill="url(#acq-frame-gold)" fill-rule="evenodd" stroke="#7c2d12" stroke-width="0.5" d="',
      '  M 160 6 ',
      '  C 240 6, 312 24, 312 55 ',
      '  C 312 86, 240 104, 160 104 ',
      '  C 80 104, 8 86, 8 55 ',
      '  C 8 24, 80 6, 160 6 Z ',
      // Inner cutout (smaller oval — text area)
      '  M 160 22 ',
      '  C 230 22, 296 36, 296 55 ',
      '  C 296 74, 230 88, 160 88 ',
      '  C 90 88, 24 74, 24 55 ',
      '  C 24 36, 90 22, 160 22 Z',
      '"/>',

      // Inner thin line border (decorative inset)
      '<ellipse cx="160" cy="55" rx="132" ry="31" fill="none" stroke="#7c2d12" stroke-width="0.8" opacity="0.7"/>',
      '<ellipse cx="160" cy="55" rx="129" ry="29" fill="none" stroke="#fef3c7" stroke-width="0.6" opacity="0.5"/>',

      // ── TOP CENTER CARTOUCHE (12 o'clock) ──
      '<g fill="url(#acq-frame-gold-hl)" stroke="#7c2d12" stroke-width="0.5">',
      '  <path d="M 160 0 C 156 2, 154 4, 152 6 C 150 4, 146 4, 144 6 C 142 8, 144 10, 146 10 C 150 10, 154 9, 156 8 C 158 9, 162 9, 164 8 C 166 9, 170 10, 174 10 C 176 10, 178 8, 176 6 C 174 4, 170 4, 168 6 C 166 4, 164 2, 160 0 Z"/>',
      '  <circle cx="160" cy="7" r="2"/>',
      '</g>',

      // ── BOTTOM CENTER CARTOUCHE (6 o'clock) ──
      '<g fill="url(#acq-frame-gold-hl)" stroke="#7c2d12" stroke-width="0.5">',
      '  <path d="M 160 110 C 156 108, 154 106, 152 104 C 150 106, 146 106, 144 104 C 142 102, 144 100, 146 100 C 150 100, 154 101, 156 102 C 158 101, 162 101, 164 102 C 166 101, 170 100, 174 100 C 176 100, 178 102, 176 104 C 174 106, 170 106, 168 104 C 166 106, 164 108, 160 110 Z"/>',
      '  <circle cx="160" cy="103" r="2"/>',
      '</g>',

      // ── LEFT SIDE FLOURISH (9 o'clock) ──
      '<g fill="url(#acq-frame-gold-hl)" stroke="#7c2d12" stroke-width="0.5">',
      '  <path d="M 8 55 C 2 53, 0 55, 2 58 C 4 60, 7 59, 8 57 Z"/>',
      '  <path d="M 8 50 C 4 48, 2 50, 4 53 C 6 54, 8 53, 8 51 Z"/>',
      '  <path d="M 8 60 C 4 62, 2 60, 4 57 C 6 56, 8 57, 8 59 Z"/>',
      '</g>',

      // ── RIGHT SIDE FLOURISH (3 o'clock) ──
      '<g fill="url(#acq-frame-gold-hl)" stroke="#7c2d12" stroke-width="0.5">',
      '  <path d="M 312 55 C 318 53, 320 55, 318 58 C 316 60, 313 59, 312 57 Z"/>',
      '  <path d="M 312 50 C 316 48, 318 50, 316 53 C 314 54, 312 53, 312 51 Z"/>',
      '  <path d="M 312 60 C 316 62, 318 60, 316 57 C 314 56, 312 57, 312 59 Z"/>',
      '</g>',

      // ── 4 CORNER SCROLLS ──
      // Top-left
      '<g fill="url(#acq-frame-gold-hl)" stroke="#7c2d12" stroke-width="0.5">',
      '  <path d="M 50 14 C 44 10, 38 14, 42 20 C 46 18, 50 17, 52 16 Z"/>',
      '  <circle cx="44" cy="16" r="1.4"/>',
      '</g>',
      // Top-right
      '<g fill="url(#acq-frame-gold-hl)" stroke="#7c2d12" stroke-width="0.5">',
      '  <path d="M 270 14 C 276 10, 282 14, 278 20 C 274 18, 270 17, 268 16 Z"/>',
      '  <circle cx="276" cy="16" r="1.4"/>',
      '</g>',
      // Bottom-left
      '<g fill="url(#acq-frame-gold-hl)" stroke="#7c2d12" stroke-width="0.5">',
      '  <path d="M 50 96 C 44 100, 38 96, 42 90 C 46 92, 50 93, 52 94 Z"/>',
      '  <circle cx="44" cy="94" r="1.4"/>',
      '</g>',
      // Bottom-right
      '<g fill="url(#acq-frame-gold-hl)" stroke="#7c2d12" stroke-width="0.5">',
      '  <path d="M 270 96 C 276 100, 282 96, 278 90 C 274 92, 270 93, 268 94 Z"/>',
      '  <circle cx="276" cy="94" r="1.4"/>',
      '</g>',

      // ── Inner "matte" parchment area ──
      '<ellipse cx="160" cy="55" rx="125" ry="26" fill="#fef3c7" opacity="0.85"/>',
      '<ellipse cx="160" cy="55" rx="125" ry="26" fill="none" stroke="#d97706" stroke-width="0.4"/>'
    ].join('');
    return s;
  }

  function accoladeBadge(input) {
    var name = typeof input === 'string' ? input : input.name;
    var tier = typeof input === 'string' ? accoladeTier(name) : (input.tier || accoladeTier(name));
    var iconName = tier === 'frame' ? 'crown' : tier === 'scroll' ? 'star' : 'check';

    var body = el('span', { class: 'acq-accolade-body' }, [
      el('span', { class: 'acq-accolade-icon' }, [icons[iconName]()]),
      name
    ]);

    var children;
    if (tier === 'scroll') {
      children = [
        el('span', { class: 'acq-flourish acq-flourish--left' }, [flourishSVG()]),
        body,
        el('span', { class: 'acq-flourish acq-flourish--right' }, [flourishSVG()])
      ];
    } else if (tier === 'frame') {
      children = [
        el('span', { class: 'acq-frame-bg' }, [frameSVG()]),
        body
      ];
    } else {
      children = [body];
    }

    return el('span', {
      class: 'acq-accolade acq-accolade--' + tier,
      role: 'img',
      'aria-label': 'Accolade: ' + name
    }, children);
  }

  // ── Avatar ─────────────────────────────────────────────
  function avatar(name, opts) {
    opts = opts || {};
    return el('div', {
      class: 'acq-tile-avatar' + (opts.cornerClass ? ' ' + opts.cornerClass : ''),
      style: opts.size ? { width: opts.size + 'px', height: opts.size + 'px', fontSize: Math.round(opts.size * 0.36) + 'px' } : null
    }, initials(name));
  }

  // ── Stat tile ──────────────────────────────────────────
  function statTile(t) {
    var delta;
    if (t.delta) {
      var sym = t.delta.dir === 'up' ? '▲' : t.delta.dir === 'down' ? '▼' : '—';
      delta = el('div', { class: 'acq-stat-delta ' + t.delta.dir }, [sym + ' ', t.delta.text]);
    }
    return el('div', { class: 'acq-stat' }, [
      el('div', { class: 'acq-stat-label', text: t.label }),
      el('div', { class: 'acq-stat-value', text: String(t.value) }),
      delta
    ]);
  }

  // ── Toast ──────────────────────────────────────────────
  function toast(message, type) {
    var region = document.getElementById('acq-toast-region');
    if (!region) return;
    var t = el('div', { class: 'acq-toast' + (type ? ' ' + type : '') }, [message]);
    region.appendChild(t);
    setTimeout(function () {
      t.style.opacity = '0';
      t.style.transition = 'opacity 0.18s ease';
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 220);
    }, 3000);
  }

  // ── Placeholder ("coming soon") ────────────────────────
  function placeholder(title, body) {
    return el('div', { class: 'acq-placeholder' }, [
      icons.timer(),
      el('div', { class: 'title', text: title }),
      el('div', { class: 'body', text: body })
    ]);
  }

  // ── Section / card scaffolds ───────────────────────────
  function pageHead(title, subtitle, right) {
    var head = el('div', { class: 'acq-page-head' }, [
      el('h1', { text: title }),
      subtitle ? el('p', { text: subtitle }) : null
    ]);
    if (right) {
      var wrap = el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' } });
      head.style.marginBottom = '0';
      wrap.appendChild(head);
      wrap.appendChild(right);
      return wrap;
    }
    return head;
  }

  function card(opts, children) {
    var head = null;
    if (opts.title || opts.headRight) {
      head = el('div', { class: 'acq-card-head' }, [
        opts.title ? el('div', { class: 'acq-card-title' }, [
          opts.icon ? opts.icon() : null,
          opts.title
        ]) : null,
        opts.headRight || null
      ]);
    }
    return el('div', { class: 'acq-card' + (opts.padLg ? ' acq-card-pad-lg' : '') }, [
      head,
      children
    ]);
  }

  // ── Buttons ────────────────────────────────────────────
  function button(label, opts) {
    opts = opts || {};
    var cls = 'acq-btn ';
    if (opts.variant === 'secondary') cls += 'acq-btn-secondary';
    else if (opts.variant === 'danger') cls += 'acq-btn-danger';
    else if (opts.variant === 'ghost')  cls += 'acq-btn-ghost';
    else cls += 'acq-btn-primary';
    if (opts.size === 'sm') cls += ' acq-btn-sm';
    var children = [];
    if (opts.icon) children.push(opts.icon());
    children.push(label);
    return el('button', {
      class: cls,
      type: opts.type || 'button',
      onclick: opts.onClick,
      title: opts.title
    }, children);
  }

  // ── Status pill ────────────────────────────────────────
  function pill(label, kind) {
    return el('span', { class: 'acq-pill acq-pill-' + kind, text: label });
  }

  // Expose
  global.AcquityUI = {
    el: el,
    clear: clear,
    icons: icons,
    initials: initials,
    formatDate: formatDate,
    avatar: avatar,
    statTile: statTile,
    toast: toast,
    placeholder: placeholder,
    pageHead: pageHead,
    card: card,
    button: button,
    pill: pill,
    accoladeBadge: accoladeBadge,
    accoladeTier: accoladeTier
  };
})(window);
