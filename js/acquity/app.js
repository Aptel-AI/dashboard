/* ════════════════════════════════════════════════════════
   Acquity prototype — app entry
   Wires header bindings, tab rendering per role, role
   toggle, and boots the router.
   ════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var UI     = global.AcquityUI;
  var State  = global.AcquityState;
  var Router = global.AcquityRouter;
  var icons  = UI.icons;
  var el     = UI.el;

  // Tab definitions per role
  var TABS = {
    recruiter: [
      { path: '/recruiter/profile',   label: 'Profile',    icon: 'user' },
      { path: '/recruiter/directory', label: 'Directory',  icon: 'users' }
    ],
    admin: [
      { path: '/admin/profile',       label: 'Profile',        icon: 'user' },
      { path: '/admin/recruiters',    label: 'Recruiters',     icon: 'users' },
      { path: '/admin/offices',       label: 'Offices',        icon: 'building' },
      { path: '/admin/onboarding',    label: 'Onboarding',     icon: 'plus' },
      { path: '/admin/clock-in-race', label: 'Clock-in Race',  icon: 'timer' },
      { path: '/admin/power-hour',    label: 'Power Hour',     icon: 'flame' },
      { path: '/admin/call-floor',    label: 'Call Floor',     icon: 'phone' }
    ]
  };

  function renderTabs() {
    var role = State.get().role;
    var nav = document.getElementById('acq-tabs');
    if (!nav) return;
    UI.clear(nav);
    TABS[role].forEach(function (t) {
      var href = Router.BASE + t.path;
      var a = el('a', {
        class: 'acq-tab',
        href: href,
        'data-route': '',
        role: 'tab'
      }, [
        icons[t.icon] ? icons[t.icon]() : null,
        t.label
      ]);
      if (location.pathname.indexOf(href) === 0) a.setAttribute('aria-current', 'page');
      nav.appendChild(a);
    });
  }

  function syncHeaderUser() {
    var user = State.get().currentUser;
    document.querySelectorAll('[data-bind="currentUserName"]').forEach(function (n) {
      n.textContent = user.name;
    });
    document.querySelectorAll('[data-bind="currentUserInitials"]').forEach(function (n) {
      n.textContent = UI.initials(user.name);
    });
  }

  function syncRoleToggle() {
    var role = State.get().role;
    document.querySelectorAll('.acq-role-btn').forEach(function (btn) {
      if (btn.dataset.role === role) btn.classList.add('is-active');
      else btn.classList.remove('is-active');
    });
  }

  function bindRoleToggle() {
    document.querySelectorAll('.acq-role-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var newRole = btn.dataset.role;
        if (newRole === State.get().role) return;
        State.setRole(newRole);
        // Navigate to the default landing for that role
        Router.navigate(Router.BASE + Router.DEFAULTS[newRole]);
      });
    });
  }

  function bindKeyboardOnTabs() {
    var nav = document.getElementById('acq-tabs');
    if (!nav) return;
    nav.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      var tabs = Array.prototype.slice.call(nav.querySelectorAll('.acq-tab'));
      var idx = tabs.indexOf(document.activeElement);
      if (idx === -1) return;
      e.preventDefault();
      var next = e.key === 'ArrowRight'
        ? tabs[(idx + 1) % tabs.length]
        : tabs[(idx - 1 + tabs.length) % tabs.length];
      next.focus();
      next.click();
    });
  }

  // Subscribe to state changes — rerender tabs, header, current view
  State.subscribe(function () {
    renderTabs();
    syncHeaderUser();
    syncRoleToggle();
  });

  // Boot
  document.addEventListener('DOMContentLoaded', function () {
    syncHeaderUser();
    renderTabs();
    syncRoleToggle();
    bindRoleToggle();
    bindKeyboardOnTabs();
    Router.start();
  });
})(window);
