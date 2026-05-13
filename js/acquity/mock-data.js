/* ════════════════════════════════════════════════════════
   Acquity prototype — mock data
   Shape mirrors the expected API contract so the retrofit
   is a swap of this file for live fetches.
   ════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  // ── Offices ─────────────────────────────────────────────
  var offices = [
    { id: 'off-22989', officeId: '22989', initials: 'DL', company: '10X Solutions, Inc.',     owner: "D'Mari Longmire", market: 'Jackson, TN',     active: true,  status: '2 mo',  goals: defaultGoals() },
    { id: 'off-22962', officeId: '22962', initials: 'AM', company: 'Mahmood Marketing',       owner: 'Arsalan Mahmood',  market: 'Toronto, ON',    active: true,  status: '8 mo',  goals: defaultGoals(180, 40) },
    { id: 'off-22233', officeId: '22233', initials: 'AS', company: 'Arsh Recruiting Group',   owner: 'Arsh Deep Singh',  market: 'Brampton, ON',   active: true,  status: '5 mo',  goals: defaultGoals() },
    { id: 'off-22333', officeId: '22333', initials: 'JM', company: 'Malhotra Enterprises',    owner: 'Jujhar Singh',     market: 'Vancouver, BC',  active: true,  status: '11 mo', goals: defaultGoals(220, 55) },
    { id: 'off-23540', officeId: '23540', initials: 'VT', company: '108 Marketing, Inc.',     owner: 'Vasin Thurman',    market: 'Dallas, TX',     active: true,  status: '3 mo',  goals: defaultGoals() },
    { id: 'off-21801', officeId: '21801', initials: 'KP', company: 'Pacific Northwest Group', owner: 'Kelsey Park',      market: 'Seattle, WA',    active: true,  status: '14 mo', goals: defaultGoals(240, 60) },
    { id: 'off-21102', officeId: '21102', initials: 'HC', company: 'Hudson Consulting',       owner: 'Henry Cole',       market: 'New York, NY',   active: false, status: 'paused', goals: defaultGoals() },
    { id: 'off-20899', officeId: '20899', initials: 'RM', company: 'Riverbend Marketing',     owner: 'Reya Mathews',     market: 'Atlanta, GA',    active: true,  status: '7 mo',  goals: defaultGoals() },
    { id: 'off-20445', officeId: '20445', initials: 'OS', company: 'Olympus Solutions',       owner: 'Omar Said',        market: 'Phoenix, AZ',    active: true,  status: '4 mo',  goals: defaultGoals() },
    { id: 'off-19874', officeId: '19874', initials: 'TG', company: 'Trinity Growth Co.',      owner: 'Talia Green',      market: 'Chicago, IL',    active: true,  status: '9 mo',  goals: defaultGoals(190, 48) }
  ];

  function defaultGoals(callGoal, bookingGoal) {
    return {
      activity: [
        { key: 'avg_opens',     name: 'Average Opens',     desc: 'Daily average open candidates', goal: 50,                current: '' },
        { key: 'avg_calls',     name: 'Average Calls Daily', desc: 'Total outbound calls per day', goal: callGoal || 200,   current: '' },
        { key: 'list_booked',   name: 'Call List % Booked', desc: 'Percentage of call list with bookings', goal: 50,        current: '' }
      ],
      conversion: [
        { key: 'conv_rate',     name: 'Conversion Rate',   desc: 'Overall conversion percentage', goal: 50,                current: '' },
        { key: 'first_show',    name: '1st Show Rate',     desc: '1st round interview show rate',  goal: bookingGoal || 50, current: '' },
        { key: 'retention',     name: 'Retention',         desc: '2nd round retention percentage', goal: 60,                current: '' }
      ]
    };
  }

  // ── Recruiters ──────────────────────────────────────────
  var recruiters = [
    rec('rec-001','Carley Martin','Carl','Recruiter','Puneet Chanana','Team Onyx','2025-08-12',['off-22989','off-22962']),
    rec('rec-002','Puneet Chanana','','Team Lead','Director — Latam','Team Onyx','2024-03-04',['off-22989']),
    rec('rec-003','Arsalan Mahmood','Ars','Senior Recruiter','Director — Latam','Team Jade','2024-09-22',['off-22962'], ['Top Closer','100 Club']),
    rec('rec-004','Dan Lee','Danny','Recruiter','Arsalan Mahmood','Team Jade','2025-11-03',['off-22962']),
    rec('rec-005','Arsh Deep Singh','','Team Lead','Director — Latam','Team Jade','2025-01-08',['off-22233']),
    rec('rec-006','Shikha Flora','Flo','Recruiter','Arsh Deep Singh','Team Jade','2026-02-14',['off-22233']),
    rec('rec-007','Jujhar Singh Malhotra','JSM','Team Lead','Director — Latam','Team Ruby','2024-06-20',['off-22333']),
    rec('rec-008','Jas Supreme','','Senior Recruiter','Jujhar Singh Malhotra','Team Ruby','2024-12-01',['off-22333'], ['100 Club']),
    rec('rec-009','Recruiting Supreme','','Recruiter','Jujhar Singh Malhotra','Team Ruby','2025-09-15',['off-22333']),
    rec('rec-010','Vasin Thurman','V','Team Lead','Director — Latam','Team Onyx','2025-04-30',['off-23540']),
    rec('rec-011','Holly Schmidt','','Recruiter','Vasin Thurman','Team Onyx','2026-01-20',['off-23540']),
    rec('rec-012','Kelsey Park','Kels','Senior Recruiter','Director — Latam','Team Onyx','2024-11-11',['off-21801'], ['Rookie of the Year','Top Closer']),
    rec('rec-013','Henry Cole','Hank','Recruiter','Kelsey Park','Team Onyx','2025-12-08',['off-21102']),
    rec('rec-014','Reya Mathews','','Senior Recruiter','Director — Latam','Team Ruby','2024-10-02',['off-20899'], ['100 Club']),
    rec('rec-015','Omar Said','O','Recruiter','Reya Mathews','Team Ruby','2026-03-04',['off-20445']),
    rec('rec-016','Talia Green','Tal','Senior Recruiter','Director — Latam','Team Jade','2025-02-18',['off-19874'], ['Top Closer'])
  ];

  function rec(id, name, nickname, title, upline, team, startDate, officeIds, accolades) {
    return {
      id: id,
      name: name,
      nickname: nickname || '',
      title: title,
      upline: upline,
      team: team,
      startDate: startDate,
      officeIds: officeIds || [],
      accolades: accolades || [],
      avatar: null
    };
  }

  // ── Weekly stats (current user) ─────────────────────────
  var weeklyStats = {
    rangeLabel: 'Mon, May 5 — Fri, May 9',
    tiles: [
      { key: 'calls',       label: 'Calls Made',         value: 1284,   delta: { dir: 'up',   text: '+142' } },
      { key: 'booked',      label: 'Interviews Booked',  value: 86,     delta: { dir: 'up',   text: '+9' } },
      { key: 'showed',      label: 'Interviews Showed',  value: 54,     delta: { dir: 'down', text: '-3' } },
      { key: 'removed',     label: 'Removed',            value: 31,     delta: { dir: 'flat', text: 'no change' } },
      { key: 'contactRate', label: 'Contact Rate',       value: '27.4%',delta: { dir: 'up',   text: '+1.8%' } },
      { key: 'firstConv',   label: '1st Round Conv',     value: '62.8%',delta: { dir: 'up',   text: '+4.1%' } },
      { key: 'secondConv',  label: '2nd Round Conv',     value: '48.5%',delta: { dir: 'down', text: '-2.2%' } },
      { key: 'newStarts',   label: 'New Starts',         value: 12,     delta: { dir: 'up',   text: '+4' } }
    ]
  };

  // ── Requests (admin Profile board) ──────────────────────
  var requests = [
    req('req-001', 'rec-007', 'Add new hire',          'Jas Supreme onboarded a new recruit yesterday — needs a full profile + access.', 'Open',        '2h ago'),
    req('req-002', 'rec-002', 'Update office goals',   'Bump Avg Calls Daily goal to 250 for 10X Solutions — D\'Mari approved.',           'In Progress', '5h ago'),
    req('req-003', 'rec-005', 'Reassign recruiter',    'Move Shikha Flora from Team Jade to Team Ruby — coverage rebalance.',              'Open',        'yesterday'),
    req('req-004', 'rec-010', 'Reset password',        'Holly Schmidt locked out of dashboard after 5 failed logins.',                     'Open',        'yesterday'),
    req('req-005', 'rec-003', 'Add new hire',          'New recruit Maya Lopez starts Monday — please create profile + assign 10X.',       'Done',        '2 days ago'),
    req('req-006', 'rec-012', 'Update office goals',   'Pacific Northwest Group conversion goal needs to drop to 45% (market shift).',     'In Progress', '2 days ago'),
    req('req-007', 'rec-014', 'Reassign recruiter',    'Omar Said should report directly to me, not via Reya — confirmed with the team.',  'Open',        '3 days ago'),
    req('req-008', 'rec-007', 'Reset password',        'Recruiting Supreme can\'t access the audit board — likely SSO sync issue.',         'Open',        '3 days ago')
  ];

  function req(id, requesterId, type, description, status, time) {
    return { id: id, requesterId: requesterId, type: type, description: description, status: status, timestamp: time };
  }

  // ── Current users (one per role) ────────────────────────
  var currentUsers = {
    recruiter: {
      id: 'rec-001',
      name: 'Carley Martin',
      nickname: 'Carl',
      title: 'Recruiter',
      upline: 'Puneet Chanana',
      team: 'Team Onyx',
      startDate: '2025-08-12',
      role: 'recruiter',
      officeIds: ['off-22989','off-22962'],
      accolades: ['Rookie of the Year', '100 Club', 'Onboarded']
    },
    admin: {
      id: 'adm-001',
      name: 'Alex Prindle',
      nickname: '',
      title: 'Acquity Admin',
      upline: 'Director — Latam',
      team: 'Belize Operations',
      startDate: '2024-01-15',
      role: 'admin',
      officeIds: [],
      accolades: ['President\'s Club', 'Belize Lead', 'First 30 Days']
    }
  };

  // ── Teams (derived list for dropdowns) ──────────────────
  var teams = [
    { id: 'team-onyx', name: 'Team Onyx',  lead: 'Puneet Chanana' },
    { id: 'team-jade', name: 'Team Jade',  lead: 'Arsalan Mahmood' },
    { id: 'team-ruby', name: 'Team Ruby',  lead: 'Jujhar Singh Malhotra' }
  ];

  var titles = ['Recruiter','Senior Recruiter','Team Lead','Onboarder','Acquity Admin'];

  // Expose
  global.AcquityData = {
    offices: offices,
    recruiters: recruiters,
    weeklyStats: weeklyStats,
    requests: requests,
    currentUsers: currentUsers,
    teams: teams,
    titles: titles,
    defaultGoals: defaultGoals,

    // Lookups
    getOfficeById: function (id) { return offices.find(function (o) { return o.id === id; }); },
    getRecruiterById: function (id) { return recruiters.find(function (r) { return r.id === id; }); },
    getRequestById: function (id) { return requests.find(function (r) { return r.id === id; }); }
  };
})(window);
