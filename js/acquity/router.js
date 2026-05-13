/* ════════════════════════════════════════════════════════
   Acquity prototype — History API router
   Routes nest under /dashboard/acquity/[role]/[view]
   ════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var BASE = '/dashboard/acquity';
  var DEFAULTS = {
    recruiter: '/recruiter/profile',
    admin:     '/admin/profile'
  };

  // Route table — each entry tests pathname after BASE
  // Handlers receive { role, params } and return a Node.
  var routes = [];

  function register(pattern, handler) {
    // Pattern like '/recruiter/profile' or '/admin/recruiters/:id'
    var keys = [];
    var regex = new RegExp('^' + pattern.replace(/:([a-zA-Z]+)/g, function (_, k) {
      keys.push(k); return '([^/]+)';
    }) + '/?$');
    routes.push({ regex: regex, keys: keys, handler: handler, pattern: pattern });
  }

  function match(path) {
    var rel = path.indexOf(BASE) === 0 ? path.slice(BASE.length) : null;
    if (rel === null) return null;
    if (rel === '' || rel === '/') return { role: null, params: {}, handler: redirectHome };
    for (var i = 0; i < routes.length; i++) {
      var r = routes[i];
      var m = rel.match(r.regex);
      if (m) {
        var params = {};
        r.keys.forEach(function (k, i) { params[k] = decodeURIComponent(m[i + 1]); });
        var role = rel.split('/')[1]; // 'recruiter' | 'admin'
        return { role: role, params: params, handler: r.handler };
      }
    }
    return null;
  }

  function redirectHome() {
    // Replace into default based on current state role
    var role = global.AcquityState.get().role;
    navigate(BASE + DEFAULTS[role], { replace: true });
    return null;
  }

  function navigate(path, opts) {
    opts = opts || {};
    if (opts.replace) {
      history.replaceState({ path: path }, '', path);
    } else {
      history.pushState({ path: path }, '', path);
    }
    render();
  }

  function render() {
    var path = location.pathname;
    var matched = match(path);

    // Direct entry that doesn't match the SPA base (e.g. loaded acquity.php
    // directly during local dev without .htaccess rewrite). Kick to the
    // role's default landing.
    if (!matched) {
      var role = global.AcquityState.get().role;
      return navigate(BASE + DEFAULTS[role], { replace: true });
    }

    // Sync role if URL implies a role different from state
    if (matched.role && matched.role !== global.AcquityState.get().role) {
      global.AcquityState.setRole(matched.role);
    }

    var view = matched.handler({ role: matched.role, params: matched.params, path: path });
    var mount = document.getElementById('acq-view');
    if (!mount) return;
    while (mount.firstChild) mount.removeChild(mount.firstChild);
    if (view) mount.appendChild(view);

    // Reflect active tab
    document.querySelectorAll('#acq-tabs .acq-tab').forEach(function (tab) {
      var href = tab.getAttribute('href');
      if (href && location.pathname.indexOf(href) === 0) {
        tab.setAttribute('aria-current', 'page');
      } else {
        tab.removeAttribute('aria-current');
      }
    });

    // Scroll to top on navigation
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }

  // Click delegation — intercept any anchor with data-route
  function bindClicks() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[data-route], a[href^="/dashboard/acquity/"]');
      if (!a) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var href = a.getAttribute('href');
      if (!href || href.indexOf(BASE) !== 0) return;
      e.preventDefault();
      navigate(href);
    });
  }

  function bindPopstate() {
    window.addEventListener('popstate', function () { render(); });
  }

  function start() {
    bindClicks();
    bindPopstate();
    render();
  }

  global.AcquityRouter = {
    BASE: BASE,
    DEFAULTS: DEFAULTS,
    register: register,
    navigate: navigate,
    render: render,
    start: start
  };
})(window);
