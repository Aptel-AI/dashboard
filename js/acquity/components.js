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
    // Elite — once-a-year-or-rarer recognition
    'Rookie of the Year':   'medallion',
    'Employee of the Year': 'medallion',
    'President\'s Club':    'medallion',
    'Hall of Fame':         'medallion',

    // Notable — earned through repeated performance
    '100 Club':             'ribbon',
    'Top Closer':           'ribbon',
    'Employee of the Quarter': 'ribbon',
    'Belize Lead':          'ribbon',
    'Streak Master':        'ribbon',

    // Token — onboarding / participation
    'Onboarded':            'token',
    'First 30 Days':        'token',
    'Welcome Aboard':       'token',
    'Employee of the Month':'token'
  };

  function accoladeTier(name) {
    if (ACCOLADE_TIERS[name]) return ACCOLADE_TIERS[name];
    // Heuristic fallback for unmapped names
    var lower = name.toLowerCase();
    if (lower.indexOf('year') !== -1 || lower.indexOf('president') !== -1) return 'medallion';
    if (lower.indexOf('quarter') !== -1 || lower.indexOf('top') !== -1) return 'ribbon';
    return 'token';
  }

  function accoladeBadge(input) {
    var name = typeof input === 'string' ? input : input.name;
    var tier = typeof input === 'string' ? accoladeTier(name) : (input.tier || accoladeTier(name));
    var iconName = tier === 'medallion' ? 'crown' : tier === 'ribbon' ? 'star' : 'check';

    var children = [
      el('span', { class: 'acq-accolade-icon' }, [icons[iconName]()]),
      name
    ];
    if (tier === 'medallion') {
      children.push(el('span', { class: 'acq-accolade-medallion-star', 'aria-hidden': 'true', text: '★' }));
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
