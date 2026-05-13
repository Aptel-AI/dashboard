/* ════════════════════════════════════════════════════════
   Acquity prototype — in-memory state + pub/sub
   Tracks role, current user, and serves as the single
   place to mutate the (mock) dataset so views can react.
   ════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var listeners = [];
  var state = {
    role: 'recruiter',           // 'recruiter' | 'admin'
    currentUser: global.AcquityData.currentUsers.recruiter,
    recruiters: global.AcquityData.recruiters.slice(),
    offices: global.AcquityData.offices.slice(),
    requests: global.AcquityData.requests.slice()
  };

  function notify() {
    listeners.forEach(function (fn) {
      try { fn(state); } catch (e) { /* noop */ }
    });
  }

  function setRole(role) {
    if (role !== 'recruiter' && role !== 'admin') return;
    if (state.role === role) return;
    state.role = role;
    state.currentUser = global.AcquityData.currentUsers[role];
    notify();
  }

  function updateRecruiter(id, patch) {
    var idx = state.recruiters.findIndex(function (r) { return r.id === id; });
    if (idx === -1) return null;
    state.recruiters[idx] = Object.assign({}, state.recruiters[idx], patch);
    notify();
    return state.recruiters[idx];
  }

  function deleteRecruiter(id) {
    state.recruiters = state.recruiters.filter(function (r) { return r.id !== id; });
    notify();
  }

  function addRecruiter(rec) {
    if (!rec.id) rec.id = 'rec-' + Date.now();
    state.recruiters.unshift(rec);
    notify();
    return rec;
  }

  function updateOffice(id, patch) {
    var idx = state.offices.findIndex(function (o) { return o.id === id; });
    if (idx === -1) return null;
    state.offices[idx] = Object.assign({}, state.offices[idx], patch);
    notify();
    return state.offices[idx];
  }

  function updateRequest(id, patch) {
    var idx = state.requests.findIndex(function (r) { return r.id === id; });
    if (idx === -1) return null;
    state.requests[idx] = Object.assign({}, state.requests[idx], patch);
    notify();
    return state.requests[idx];
  }

  function dismissRequest(id) {
    state.requests = state.requests.filter(function (r) { return r.id !== id; });
    notify();
  }

  function subscribe(fn) {
    listeners.push(fn);
    return function () {
      listeners = listeners.filter(function (l) { return l !== fn; });
    };
  }

  global.AcquityState = {
    get: function () { return state; },
    setRole: setRole,
    subscribe: subscribe,
    updateRecruiter: updateRecruiter,
    deleteRecruiter: deleteRecruiter,
    addRecruiter: addRecruiter,
    updateOffice: updateOffice,
    updateRequest: updateRequest,
    dismissRequest: dismissRequest
  };
})(window);
