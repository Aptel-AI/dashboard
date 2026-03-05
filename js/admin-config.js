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

  // Template types available for offices
  templates: {
    'att-b2b': {
      label: 'AT&T B2B',
      file: 'index.html',
      description: 'AT&T Business-to-Business sales dashboard'
    }
    // Future: 'residential': { label: 'Residential', file: 'residential.html', ... }
  }
};
