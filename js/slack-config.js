// ═══════════════════════════════════════════════════════
// Aptel Slack Channel Auditor — Configuration
// ═══════════════════════════════════════════════════════
// Update workerUrl after deploying the Cloudflare Worker.

const SLACK_CONFIG = {
  // Cloudflare Worker proxy URL (set after deploy)
  workerUrl: 'https://aptel-slack-proxy.aprindle.workers.dev',

  // localStorage keys
  excelStorageKey: 'aptel_slack_excel_data',
  sessionKey: 'aptel_slack_session',

  // Excel sheet names to look for
  expectedSheets: {
    people: 'People',
    roles: 'Roles',
  },

  // Column header mappings — People sheet
  peopleColumns: {
    name: 'Name',
    email: 'Email',
    slackEmail: 'SlackEmail',
    role: 'Role',
  },

  // Column header mappings — Roles sheet
  rolesColumns: {
    role: 'Role',
    channel: 'Channel',
  },

  // Status labels for comparison results
  statusLabels: {
    match: 'OK',
    missing: 'Missing',
    extra: 'Extra',
    notFound: 'Not in Slack',
    noRole: 'No Role Mapping',
  },

  // Comparison result styling
  statusColors: {
    match: 'ok',
    missing: 'missing',
    extra: 'extra',
    notFound: 'not-found',
    noRole: 'no-role',
  },
};
