// ═══════════════════════════════════════════════════════
// Aptel Slack Channel Auditor — Configuration
// ═══════════════════════════════════════════════════════

const SLACK_CONFIG = {
  // Cloudflare Worker proxy URL
  workerUrl: 'https://aptel-slack-proxy.aprindle.workers.dev',

  // localStorage keys
  excelStorageKey: 'aptel_slack_excel_data',

  // Excel sheet names
  expectedSheets: {
    people: 'People',
    departments: 'Departments',
    levels: 'Levels',
  },

  // Column header mappings — People sheet
  peopleColumns: {
    name: 'Name',
    email: 'Email',
    slackEmail: 'SlackEmail',
    department: 'Department',   // comma-separated if multiple
    level: 'Level',             // single value: SWAT, Manager, Lead, Member
  },

  // Column header mappings — Departments sheet
  deptColumns: {
    department: 'Department',
    channel: 'Channel',
  },

  // Column header mappings — Levels sheet
  levelColumns: {
    level: 'Level',
    channel: 'Channel',
  },

  // Status labels
  statusLabels: {
    match: 'OK',
    missing: 'Missing',
    extra: 'Extra',
    notFound: 'Not in Slack',
    noMapping: 'No Mapping',
  },

  // Status badge CSS classes
  statusColors: {
    match: 'ok',
    missing: 'missing',
    extra: 'extra',
    notFound: 'not-found',
    noMapping: 'no-role',
  },
};
