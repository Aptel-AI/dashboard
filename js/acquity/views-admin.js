/* ════════════════════════════════════════════════════════
   Acquity prototype — admin views
   Tabs: Profile (Request Board), Recruiters, Offices,
         Onboarding, Clock-in Race, Power Hour, Call Floor
   ════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var UI    = global.AcquityUI;
  var Data  = global.AcquityData;
  var State = global.AcquityState;
  var Router= global.AcquityRouter;
  var el    = UI.el;
  var icons = UI.icons;

  // ════════════════════════════════════════════════════════
  // ADMIN PROFILE — About Me + Request Board
  // ════════════════════════════════════════════════════════
  function renderAdminProfile() {
    var user = State.get().currentUser;
    var requests = State.get().requests;

    var board = el('div', { class: 'acq-card acq-card-pad-lg' }, [
      el('div', { class: 'acq-card-head' }, [
        el('div', { class: 'acq-card-title' }, [icons.inbox(), 'Request Board']),
        el('div', { class: 'acq-card-sub', text: requests.length + ' active' })
      ]),
      el('div', { class: 'acq-request-list' },
        requests.length === 0
          ? [el('div', { class: 'acq-placeholder' }, [
              icons.inbox(),
              el('div', { class: 'title', text: 'No active requests' }),
              el('div', { class: 'body', text: 'Managers will submit requests here. Done.' })
            ])]
          : requests.map(renderRequest)
      )
    ]);

    var grid = el('div', { class: 'acq-profile-grid' }, [
      global.AcquityViewsShared.aboutMeCard(user),
      board
    ]);

    return el('div', {}, [
      UI.pageHead('Profile', 'Active requests from the field, all in one place.'),
      grid
    ]);
  }

  function renderRequest(req) {
    var requester = Data.getRecruiterById(req.requesterId) || { name: 'Unknown' };
    var pillKind = req.status === 'Open' ? 'open'
                 : req.status === 'In Progress' ? 'progress'
                 : req.status === 'Done' ? 'done' : 'dismiss';

    var actions = [];
    if (req.status === 'Open') {
      actions.push(UI.button('Mark In Progress', { variant: 'secondary', size: 'sm', onClick: function () {
        State.updateRequest(req.id, { status: 'In Progress' });
        UI.toast('Request marked in progress', 'success');
        Router.render();
      }}));
    }
    if (req.status !== 'Done') {
      actions.push(UI.button('Mark Done', { variant: 'primary', size: 'sm', onClick: function () {
        State.updateRequest(req.id, { status: 'Done' });
        UI.toast('Request marked done', 'success');
        Router.render();
      }}));
    }
    actions.push(UI.button('Dismiss', { variant: 'ghost', size: 'sm', onClick: function () {
      State.dismissRequest(req.id);
      UI.toast('Request dismissed');
      Router.render();
    }}));

    return el('div', { class: 'acq-request' }, [
      el('div', { class: 'acq-request-avatar', text: UI.initials(requester.name) }),
      el('div', { class: 'acq-request-body' }, [
        el('div', { class: 'acq-request-meta' }, [
          el('strong', { text: requester.name }),
          el('span', { text: '·' }),
          el('span', { class: 'acq-request-tag', text: req.type }),
          el('span', { text: '·' }),
          el('span', { text: req.timestamp })
        ]),
        el('div', { class: 'acq-request-text', text: req.description })
      ]),
      el('div', { class: 'acq-request-actions' }, [
        UI.pill(req.status, pillKind),
        el('div', { class: 'acq-request-action-row' }, actions)
      ])
    ]);
  }

  // ════════════════════════════════════════════════════════
  // RECRUITERS — list + edit
  // ════════════════════════════════════════════════════════
  var recruiterFilter = { q: '', team: '', office: '' };

  function renderRecruiters() {
    var teams = Data.teams.map(function (t) { return t.name; });
    var offices = State.get().offices;
    var recs = State.get().recruiters;

    var grid = el('div', { class: 'acq-card-grid', id: 'acq-recruiter-grid' });
    paintRecruiterGrid(grid, recs, offices);

    var search = el('div', { class: 'acq-search' }, [
      icons.search(),
      el('input', {
        type: 'search',
        placeholder: 'Search by name…',
        value: recruiterFilter.q,
        oninput: function (e) {
          recruiterFilter.q = e.target.value;
          paintRecruiterGrid(grid, State.get().recruiters, State.get().offices);
        }
      })
    ]);

    var teamSelect = el('select', {
      class: 'acq-filter-select',
      onchange: function (e) {
        recruiterFilter.team = e.target.value;
        paintRecruiterGrid(grid, State.get().recruiters, State.get().offices);
      }
    }, [
      el('option', { value: '', text: 'All teams' })
    ].concat(teams.map(function (t) {
      return el('option', { value: t, text: t });
    })));

    var officeSelect = el('select', {
      class: 'acq-filter-select',
      onchange: function (e) {
        recruiterFilter.office = e.target.value;
        paintRecruiterGrid(grid, State.get().recruiters, State.get().offices);
      }
    }, [
      el('option', { value: '', text: 'All offices' })
    ].concat(offices.map(function (o) {
      return el('option', { value: o.id, text: o.company });
    })));

    var toolbar = el('div', { class: 'acq-toolbar' }, [search, teamSelect, officeSelect]);

    return el('div', {}, [
      UI.pageHead('Recruiters', 'Every recruiter, their team, and their office assignments.', null),
      toolbar,
      grid
    ]);
  }

  function paintRecruiterGrid(node, recs, offices) {
    var q = recruiterFilter.q.trim().toLowerCase();
    var team = recruiterFilter.team;
    var office = recruiterFilter.office;
    var filtered = recs.filter(function (r) {
      if (q && r.name.toLowerCase().indexOf(q) === -1 && (r.nickname || '').toLowerCase().indexOf(q) === -1) return false;
      if (team && r.team !== team) return false;
      if (office && r.officeIds.indexOf(office) === -1) return false;
      return true;
    });

    UI.clear(node);
    if (filtered.length === 0) {
      node.appendChild(UI.placeholder('No matches', 'Try a different search or clear filters.'));
      return;
    }
    filtered.forEach(function (r) {
      var officeChips = r.officeIds.slice(0, 3).map(function (id) {
        var o = offices.find(function (x) { return x.id === id; });
        return el('span', { class: 'acq-chip acq-chip-gray', text: o ? o.company : id });
      });
      if (r.officeIds.length > 3) {
        officeChips.push(el('span', { class: 'acq-chip acq-chip-gray', text: '+' + (r.officeIds.length - 3) }));
      }

      var tile = el('a', {
        class: 'acq-tile',
        href: '/dashboard/acquity/admin/recruiters/' + r.id,
        'data-route': '',
        role: 'button'
      }, [
        UI.avatar(r.name),
        el('div', { class: 'acq-tile-body' }, [
          el('div', { class: 'acq-tile-name' }, [
            r.name,
            r.nickname ? el('span', { style: { color: 'var(--acq-ink-faint)', fontWeight: 500, marginLeft: '6px' }, text: '"' + r.nickname + '"' }) : null
          ]),
          el('div', { class: 'acq-tile-meta', text: r.title + ' · ' + r.team }),
          el('div', { class: 'acq-tile-chips' }, officeChips)
        ])
      ]);
      node.appendChild(tile);
    });
  }

  function renderRecruiterEdit(ctx) {
    var rec = Data.getRecruiterById(ctx.params.id) || State.get().recruiters.find(function (r) { return r.id === ctx.params.id; });
    if (!rec) {
      return el('div', {}, [
        UI.pageHead('Recruiter not found', 'That recruiter ID does not exist.'),
        UI.button('Back to Recruiters', { variant: 'secondary', icon: icons.chevronLeft, onClick: function () { Router.navigate('/dashboard/acquity/admin/recruiters'); }})
      ]);
    }

    // Working copy
    var draft = Object.assign({}, rec, { officeIds: rec.officeIds.slice() });
    var offices = State.get().offices;

    function field(label, key, opts) {
      opts = opts || {};
      var input = el('input', {
        type: opts.type || 'text',
        value: draft[key] || '',
        oninput: function (e) { draft[key] = e.target.value; }
      });
      return el('div', { class: 'acq-field' + (opts.full ? ' acq-field-full' : '') }, [
        el('label', {}, [label, opts.required ? el('span', { class: 'req', text: '*' }) : null]),
        input
      ]);
    }

    function selectField(label, key, options) {
      var select = el('select', {
        onchange: function (e) { draft[key] = e.target.value; }
      }, options.map(function (opt) {
        var val = typeof opt === 'string' ? opt : opt.value;
        var text = typeof opt === 'string' ? opt : opt.text;
        return el('option', { value: val, selected: val === draft[key], text: text });
      }));
      return el('div', { class: 'acq-field' }, [
        el('label', { text: label }),
        select
      ]);
    }

    // Office multi-select (simple add/remove)
    var officesWrap = el('div', { class: 'acq-multiselect' });
    function paintOfficeChips() {
      UI.clear(officesWrap);
      draft.officeIds.forEach(function (oid) {
        var o = offices.find(function (x) { return x.id === oid; });
        if (!o) return;
        officesWrap.appendChild(el('span', { class: 'acq-multiselect-chip' }, [
          o.company,
          el('button', {
            type: 'button',
            'aria-label': 'Remove ' + o.company,
            onclick: function () {
              draft.officeIds = draft.officeIds.filter(function (x) { return x !== oid; });
              paintOfficeChips();
            }
          }, ['×'])
        ]));
      });
      // Add-office picker
      var available = offices.filter(function (o) { return draft.officeIds.indexOf(o.id) === -1; });
      if (available.length) {
        var picker = el('select', {
          class: 'acq-filter-select',
          style: { padding: '4px 28px 4px 10px', fontSize: '12px' },
          onchange: function (e) {
            if (e.target.value) {
              draft.officeIds.push(e.target.value);
              paintOfficeChips();
            }
          }
        }, [el('option', { value: '', text: '+ Add office' })].concat(
          available.map(function (o) { return el('option', { value: o.id, text: o.company }); })
        ));
        officesWrap.appendChild(picker);
      }
    }
    paintOfficeChips();

    var form = el('div', { class: 'acq-card acq-card-pad-lg' }, [
      el('div', { class: 'acq-form-grid' }, [
        field('Name', 'name', { required: true }),
        field('Nickname', 'nickname'),
        selectField('Title', 'title', Data.titles),
        selectField('Team', 'team', Data.teams.map(function (t) { return { value: t.name, text: t.name }; })),
        field('Upline', 'upline'),
        field('Start Date', 'startDate', { type: 'date' }),
        el('div', { class: 'acq-field acq-field-full' }, [
          el('label', { text: 'Office assignments' }),
          officesWrap
        ]),
        el('div', { class: 'acq-field acq-field-full' }, [
          el('label', { text: 'Profile picture' }),
          el('input', { type: 'file', accept: 'image/*' })
        ])
      ])
    ]);

    var head = el('div', { class: 'acq-edit-head' }, [
      el('a', {
        class: 'acq-edit-back',
        href: '/dashboard/acquity/admin/recruiters',
        'data-route': '',
        'aria-label': 'Back to recruiters'
      }, [icons.chevronLeft()]),
      UI.avatar(draft.name, { size: 56 }),
      el('div', { class: 'acq-edit-headline' }, [
        el('h2', { text: draft.name }),
        el('div', { class: 'eyebrow', text: 'Recruiter Profile' })
      ]),
      el('div', { class: 'acq-edit-actions' }, [
        UI.button('Delete', {
          variant: 'danger', icon: icons.trash,
          onClick: function () {
            if (confirm('Delete ' + rec.name + '? This is mock data; it will return on refresh.')) {
              State.deleteRecruiter(rec.id);
              UI.toast('Recruiter deleted');
              Router.navigate('/dashboard/acquity/admin/recruiters');
            }
          }
        }),
        UI.button('Cancel', { variant: 'secondary', onClick: function () {
          Router.navigate('/dashboard/acquity/admin/recruiters');
        }}),
        UI.button('Save Changes', { icon: icons.save, onClick: function () {
          State.updateRecruiter(rec.id, draft);
          UI.toast('Changes saved', 'success');
          Router.navigate('/dashboard/acquity/admin/recruiters');
        }})
      ])
    ]);

    return el('div', {}, [
      UI.pageHead(rec.name, 'Edit recruiter profile'),
      head,
      form
    ]);
  }

  // ════════════════════════════════════════════════════════
  // OFFICES — list + edit (Market Goals)
  // ════════════════════════════════════════════════════════
  function renderOffices() {
    var offices = State.get().offices;
    var grid = el('div', { class: 'acq-card-grid' }, offices.map(officeTile));

    return el('div', {}, [
      UI.pageHead('Offices', 'Client offices, market goals, and current performance.'),
      grid
    ]);
  }

  function officeTile(o) {
    return el('a', {
      class: 'acq-tile',
      href: '/dashboard/acquity/admin/offices/' + o.id,
      'data-route': '',
      role: 'button'
    }, [
      el('div', { class: 'acq-tile-avatar', text: o.initials }),
      el('div', { class: 'acq-tile-body' }, [
        el('div', { class: 'acq-tile-name', text: o.company }),
        el('div', { class: 'acq-tile-meta', text: o.market }),
        el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' } }, [
          el('span', { class: 'acq-status-dot' + (o.active ? '' : ' inactive'), text: o.active ? 'Active' : 'Paused' }),
          el('span', { class: 'acq-tile-corner', text: 'ID ' + o.officeId })
        ])
      ])
    ]);
  }

  function renderOfficeEdit(ctx) {
    var orig = State.get().offices.find(function (o) { return o.id === ctx.params.id; });
    if (!orig) {
      return el('div', {}, [
        UI.pageHead('Office not found', 'That office ID does not exist.'),
        UI.button('Back to Offices', { variant: 'secondary', icon: icons.chevronLeft, onClick: function () { Router.navigate('/dashboard/acquity/admin/offices'); }})
      ]);
    }
    var draft = JSON.parse(JSON.stringify(orig));

    function goalRow(g, kind) {
      return el('div', { class: 'acq-goal-row' }, [
        el('div', { class: 'goal-label' }, [
          el('span', { class: 'goal-name', text: g.name }),
          el('span', { class: 'goal-desc', text: g.desc })
        ]),
        el('div', { class: 'goal-input' }, [
          el('span', { text: 'Goal' }),
          el('input', {
            type: 'number', value: g.goal,
            oninput: function (e) { g.goal = e.target.value === '' ? '' : Number(e.target.value); }
          })
        ]),
        el('div', { class: 'goal-input' }, [
          el('span', { text: 'Current' }),
          g.current === '' || g.current == null
            ? el('div', { class: 'goal-empty', text: '—' })
            : el('input', { type: 'number', value: g.current, oninput: function (e) { g.current = e.target.value === '' ? '' : Number(e.target.value); } })
        ])
      ]);
    }

    // Left identity card
    var leftCard = el('div', { class: 'acq-card' }, [
      el('div', { style: { display: 'flex', gap: '14px', alignItems: 'center' } }, [
        el('div', { class: 'acq-tile-avatar', style: { width: '64px', height: '64px', fontSize: '22px' }, text: draft.initials }),
        el('div', {}, [
          el('div', { style: { fontSize: '18px', fontWeight: 700 }, text: draft.company }),
          el('div', { style: { fontSize: '12.5px', color: 'var(--acq-ink-dim)', marginTop: '4px' }, text: '📍 ' + draft.market }),
          el('div', { style: { marginTop: '8px' } }, [
            el('span', { class: 'acq-status-dot' + (draft.active ? '' : ' inactive'), text: draft.active ? 'Active' : 'Paused' })
          ])
        ])
      ]),
      el('div', { class: 'acq-aboutme-divider' }),
      el('div', { class: 'acq-form-grid', style: { gridTemplateColumns: '1fr' } }, [
        labeled('Office ID', el('input', { value: draft.officeId, oninput: function (e) { draft.officeId = e.target.value; }})),
        labeled('Company Name', el('input', { value: draft.company, oninput: function (e) { draft.company = e.target.value; }})),
        labeled('Owner Name', el('input', { value: draft.owner, oninput: function (e) { draft.owner = e.target.value; }})),
        labeled('Market', el('input', { value: draft.market, oninput: function (e) { draft.market = e.target.value; }}))
      ])
    ]);

    function labeled(label, input) {
      return el('div', { class: 'acq-field' }, [el('label', { text: label }), input]);
    }

    // Right goals card
    var rightCard = el('div', { class: 'acq-card acq-card-pad-lg' }, [
      el('div', { class: 'acq-card-head' }, [
        el('div', {}, [
          el('div', { class: 'acq-card-title', text: 'Market Goals' }),
          el('div', { class: 'acq-card-sub', text: "Set targets for this office's key metrics" })
        ])
      ]),
      el('div', { class: 'acq-form-section-title' }, [icons.pulse(), 'Activity Metrics']),
      draft.goals.activity.map(function (g) { return goalRow(g); }),
      el('div', { class: 'acq-form-section-title', style: { marginTop: '24px' } }, [icons.flame(), 'Conversion Metrics']),
      draft.goals.conversion.map(function (g) { return goalRow(g); })
    ]);

    var head = el('div', { class: 'acq-edit-head' }, [
      el('a', {
        class: 'acq-edit-back',
        href: '/dashboard/acquity/admin/offices',
        'data-route': '',
        'aria-label': 'Back to offices'
      }, [icons.chevronLeft()]),
      el('div', { class: 'acq-edit-id-badge', text: String(parseInt(draft.officeId.replace(/\D/g, ''), 10) % 100 || 1) }),
      el('div', { class: 'acq-edit-headline' }, [
        el('h2', { text: draft.company }),
        el('div', { class: 'eyebrow', text: 'Office Profile' })
      ]),
      el('div', { class: 'acq-edit-actions' }, [
        UI.button('View Dashboard', { variant: 'secondary', icon: icons.eye, onClick: function () {
          UI.toast('Office dashboard not wired in this prototype.');
        }}),
        UI.button('Delete', { variant: 'danger', icon: icons.trash, onClick: function () {
          UI.toast('Delete is mocked — refresh to restore.');
        }}),
        UI.button('Save Changes', { icon: icons.save, onClick: function () {
          State.updateOffice(orig.id, draft);
          UI.toast('Office saved', 'success');
          Router.navigate('/dashboard/acquity/admin/offices');
        }})
      ])
    ]);

    var grid = el('div', { class: 'acq-profile-grid' }, [leftCard, rightCard]);

    return el('div', {}, [
      UI.pageHead(draft.company, 'Edit client profile'),
      head,
      grid
    ]);
  }

  // ════════════════════════════════════════════════════════
  // ONBOARDING — new-hire intake form
  // ════════════════════════════════════════════════════════
  function renderOnboarding() {
    var draft = {
      name: '', nickname: '', email: '', title: 'Recruiter',
      team: Data.teams[0].name, startDate: '', officeIds: [], notes: ''
    };

    function fld(label, key, opts) {
      opts = opts || {};
      return el('div', { class: 'acq-field' + (opts.full ? ' acq-field-full' : '') }, [
        el('label', {}, [label, opts.required ? el('span', { class: 'req', text: '*' }) : null]),
        opts.type === 'textarea'
          ? el('textarea', { placeholder: opts.placeholder || '', oninput: function (e) { draft[key] = e.target.value; }})
          : el('input', {
              type: opts.type || 'text',
              placeholder: opts.placeholder || '',
              oninput: function (e) { draft[key] = e.target.value; }
            })
      ]);
    }

    function selFld(label, key, options, required) {
      return el('div', { class: 'acq-field' }, [
        el('label', {}, [label, required ? el('span', { class: 'req', text: '*' }) : null]),
        el('select', {
          onchange: function (e) { draft[key] = e.target.value; }
        }, options.map(function (o) {
          var v = typeof o === 'string' ? o : o.value;
          var t = typeof o === 'string' ? o : o.text;
          return el('option', { value: v, selected: v === draft[key], text: t });
        }))
      ]);
    }

    var officeBox = el('div', { class: 'acq-multiselect' });
    function paintOffices() {
      UI.clear(officeBox);
      var offices = State.get().offices;
      draft.officeIds.forEach(function (oid) {
        var o = offices.find(function (x) { return x.id === oid; });
        if (!o) return;
        officeBox.appendChild(el('span', { class: 'acq-multiselect-chip' }, [
          o.company,
          el('button', { type: 'button', onclick: function () {
            draft.officeIds = draft.officeIds.filter(function (x) { return x !== oid; });
            paintOffices();
          }}, ['×'])
        ]));
      });
      var avail = offices.filter(function (o) { return draft.officeIds.indexOf(o.id) === -1; });
      if (avail.length) {
        officeBox.appendChild(el('select', {
          class: 'acq-filter-select',
          style: { padding: '4px 28px 4px 10px', fontSize: '12px' },
          onchange: function (e) { if (e.target.value) { draft.officeIds.push(e.target.value); paintOffices(); } }
        }, [el('option', { value: '', text: '+ Assign office' })].concat(
          avail.map(function (o) { return el('option', { value: o.id, text: o.company }); })
        )));
      }
    }
    paintOffices();

    var form = el('form', {
      class: 'acq-card acq-card-pad-lg',
      onsubmit: function (e) {
        e.preventDefault();
        if (!draft.name || !draft.email || !draft.title || !draft.team || !draft.startDate) {
          UI.toast('Please fill in all required fields', 'error');
          return;
        }
        var rec = {
          id: 'rec-' + Date.now(),
          name: draft.name, nickname: draft.nickname, title: draft.title,
          team: draft.team, upline: '',
          startDate: draft.startDate, officeIds: draft.officeIds.slice(),
          accolades: [], avatar: null, email: draft.email, notes: draft.notes
        };
        State.addRecruiter(rec);
        UI.toast(draft.name + ' added to the roster', 'success');
        Router.navigate('/dashboard/acquity/admin/recruiters');
      }
    }, [
      el('div', { class: 'acq-form-section-title' }, [icons.user(), 'Personal Info']),
      el('div', { class: 'acq-form-grid' }, [
        fld('Full Name',   'name',     { required: true,  placeholder: 'Jane Doe' }),
        fld('Nickname',    'nickname',                     { placeholder: 'Optional' }),
        fld('Email',       'email',    { required: true,  type: 'email', placeholder: 'jane@aptel.com' }),
        selFld('Title',    'title',    Data.titles, true)
      ]),
      el('div', { class: 'acq-form-section-title' }, [icons.users(), 'Role & Team']),
      el('div', { class: 'acq-form-grid' }, [
        selFld('Team / Upline', 'team', Data.teams.map(function (t) { return { value: t.name, text: t.name + ' (' + t.lead + ')' }; }), true),
        fld('Start Date', 'startDate', { required: true, type: 'date' }),
        el('div', { class: 'acq-field acq-field-full' }, [
          el('label', { text: 'Office assignments' }),
          officeBox
        ]),
        el('div', { class: 'acq-field acq-field-full' }, [
          el('label', { text: 'Profile picture' }),
          el('input', { type: 'file', accept: 'image/*' })
        ]),
        fld('Notes', 'notes', { full: true, type: 'textarea', placeholder: 'Anything we should know about this hire?' })
      ]),
      el('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' } }, [
        UI.button('Cancel', { variant: 'secondary', onClick: function () { Router.navigate('/dashboard/acquity/admin/profile'); }}),
        UI.button('Add Recruiter', { type: 'submit', icon: icons.plus })
      ])
    ]);

    return el('div', {}, [
      UI.pageHead('Onboarding', 'Add a new hire to the Acquity roster.'),
      form
    ]);
  }

  // ════════════════════════════════════════════════════════
  // PLACEHOLDERS
  // ════════════════════════════════════════════════════════
  function renderClockInRace() {
    return el('div', {}, [
      UI.pageHead('Clock-in Race', 'Daily clock-in competition across the floor.'),
      UI.placeholder('Coming soon', 'Live clock-in leaderboard, by team and by recruiter. Will hook into the existing attendance feed.')
    ]);
  }
  function renderPowerHour() {
    return el('div', {}, [
      UI.pageHead('Power Hour', 'Hour-by-hour blitz scoring.'),
      UI.placeholder('Coming soon', 'Real-time scoreboard for power-hour blitz windows. Will use the live calls stream.')
    ]);
  }
  function renderCallFloor() {
    return el('div', {}, [
      UI.pageHead('Call Floor', 'Live view of the Belize call floor.'),
      UI.placeholder('Coming soon', 'Floor map with active/idle seats, calls in progress, and recruiter status.')
    ]);
  }

  // ════════════════════════════════════════════════════════
  // ROUTES
  // ════════════════════════════════════════════════════════
  Router.register('/admin/profile',           renderAdminProfile);
  Router.register('/admin/recruiters',        renderRecruiters);
  Router.register('/admin/recruiters/:id',    renderRecruiterEdit);
  Router.register('/admin/offices',           renderOffices);
  Router.register('/admin/offices/:id',       renderOfficeEdit);
  Router.register('/admin/onboarding',        renderOnboarding);
  Router.register('/admin/clock-in-race',     renderClockInRace);
  Router.register('/admin/power-hour',        renderPowerHour);
  Router.register('/admin/call-floor',        renderCallFloor);
})(window);
