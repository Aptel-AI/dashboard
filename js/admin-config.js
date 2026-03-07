// ═══════════════════════════════════════════════════════
// Aptel Admin Dashboard — Configuration
// ═══════════════════════════════════════════════════════
// Update these values after creating the Admin Google Sheet
// and deploying AdminCode.gs as a web app.

const ADMIN_CONFIG = {
  // Google Sheet ID for the admin master sheet
  sheetId: '1xdf1yBOh-Vo3VHlYvrlkQ4v4UwRiKvK-12hFOsfnJc0',

  // Deployed AdminCode.gs web app URL
  appsScriptUrl: 'https://script.google.com/macros/s/AKfycbz1WJARKP4YZzZjbWyyBjgrAkUOkJWiMHkcJxr4qV3QwRuBfo6YyleBe2MwV_ruRHWo/exec',

  // API key (must match Script Properties > API_KEY in AdminCode.gs)
  apiKey: 'aptel-admin-2026-secret',

  // Session config
  sessionKey: 'aptel_admin_session',
  sessionDuration: 24 * 60 * 60 * 1000,  // 24 hours

  // Login aliases — shorthand names that expand to full emails
  loginAliases: {
    'alex': 'alex.aspirehr@gmail.com'
  },

  // Admin roles — tiered access control
  adminRoles: {
    'a1': { label: 'Admin',       rank: 1, description: 'Office-scoped access' },
    'a2': { label: 'Org Admin',   rank: 2, description: 'Owner org management' },
    'a3': { label: 'Super Admin', rank: 3, description: 'Full platform access' }
  },

  // Owner levels — hierarchy for office owners (o1-o4)
  ownerLevels: {
    'o1': { label: 'Owner',                rank: 1 },
    'o2': { label: 'Promoting Owner',      rank: 2 },
    'o3': { label: 'Regional Consultant',  rank: 3 },
    'o4': { label: 'National Consultant',  rank: 4 }
  },

  // Template types available for offices
  templates: {
    'att-b2b': {
      label: 'AT&T B2B',
      file: 'index.html',
      description: 'AT&T Business-to-Business sales dashboard'
    }
    // Future: 'residential': { label: 'Residential', file: 'residential.html', ... }
  },

  // ── Campaign Sheet Config (AT&T B2B shared sheet) ──
  // All AT&T B2B offices share a single campaign sheet + Code.gs deployment.
  // When creating a new AT&T B2B office, these values auto-fill the form.
  campaign: {
    'att-b2b': {
      sheetId: '1wxM6Htwfy8LrD_o_C7gmvnZEmkfV3FTCVjJU6IITZFc',
      appsScriptUrl: 'https://script.google.com/macros/s/AKfycbwPx0jfdYdLKurHPlfQhOkYu70vVpirTISYrR3I2EIszVrVaRNwwjBvauSIO69thKFe/exec',
      apiKey: 'elevate-dash-2026-secret'
    }
  }
};
