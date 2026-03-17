// ═══════════════════════════════════════════════════════
// ELEVATE — Google Apps Script for Roster Write-Back
// ═══════════════════════════════════════════════════════
//
// SETUP INSTRUCTIONS:
// 1. Open your Google Sheet → Extensions → Apps Script
// 2. Paste this entire file into the script editor
// 3. Click Deploy → New Deployment
// 4. Select type: "Web app"
// 5. Execute as: "Me" (your Google account)
// 6. Who has access: "Anyone"
// 7. Click Deploy and copy the Web App URL
// 8. Paste the URL into js/config.js → appsScriptUrl
//
// SHEET REQUIREMENTS:
// The "Active Reps" tab must have these column headers (row 1):
//   Name | Role | Team | PIN | Active | Date Added
//
// ═══════════════════════════════════════════════════════

const ROSTER_TAB = "Active Reps";

// ── Column header names (must match the sheet) ──
const COL = {
  name:      "Name",
  role:      "Role",
  team:      "Team",
  pin:       "PIN",
  active:    "Active",
  dateAdded: "Date Added"
};

/**
 * Handle incoming POST requests from the ELEVATE dashboard.
 * Payload format: { action: string, name: string, ...data }
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ROSTER_TAB);
    if (!sheet) {
      return jsonResponse({ ok: false, error: "Sheet tab '" + ROSTER_TAB + "' not found" });
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    switch (action) {
      case "updateRole":
        return handleUpdateField(sheet, headers, payload.name, COL.role, payload.role);

      case "updateTeam":
        return handleUpdateField(sheet, headers, payload.name, COL.team, payload.team);

      case "updatePin":
        return handleUpdateField(sheet, headers, payload.name, COL.pin, payload.pin);

      case "deactivate":
        return handleUpdateField(sheet, headers, payload.name, COL.active, "FALSE");

      case "reactivate":
        return handleUpdateField(sheet, headers, payload.name, COL.active, "TRUE");

      case "add":
        return handleAddPerson(sheet, headers, payload);

      default:
        return jsonResponse({ ok: false, error: "Unknown action: " + action });
    }
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

/**
 * Handle GET requests (health check / test)
 */
function doGet(e) {
  return jsonResponse({
    ok: true,
    message: "ELEVATE Roster API is running",
    timestamp: new Date().toISOString()
  });
}

// ── Update a single field for a person by name ──
function handleUpdateField(sheet, headers, name, columnName, value) {
  const nameCol = headers.indexOf(COL.name);
  const targetCol = headers.indexOf(columnName);

  if (nameCol === -1) {
    return jsonResponse({ ok: false, error: "'" + COL.name + "' column not found in headers" });
  }
  if (targetCol === -1) {
    return jsonResponse({ ok: false, error: "'" + columnName + "' column not found in headers" });
  }

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][nameCol]).trim().toLowerCase() === String(name).trim().toLowerCase()) {
      // Found the person — update the cell (i+1 because sheets are 1-indexed)
      sheet.getRange(i + 1, targetCol + 1).setValue(value);
      return jsonResponse({ ok: true, action: "updated", name: name, field: columnName, value: value });
    }
  }

  return jsonResponse({ ok: false, error: "Person '" + name + "' not found in roster" });
}

// ── Add a new person to the roster ──
function handleAddPerson(sheet, headers, payload) {
  const nameCol = headers.indexOf(COL.name);

  if (nameCol === -1) {
    return jsonResponse({ ok: false, error: "'" + COL.name + "' column not found in headers" });
  }

  // Check if person already exists
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][nameCol]).trim().toLowerCase() === String(payload.name).trim().toLowerCase()) {
      return jsonResponse({ ok: false, error: "Person '" + payload.name + "' already exists" });
    }
  }

  // Build the new row based on header order
  const newRow = headers.map(function(header) {
    switch (header) {
      case COL.name:      return payload.name || "";
      case COL.role:      return payload.role || "rep";
      case COL.team:      return payload.team || "Unassigned";
      case COL.pin:       return payload.pin || "";
      case COL.active:    return "TRUE";
      case COL.dateAdded: return new Date().toISOString().split("T")[0];
      default:            return "";
    }
  });

  sheet.appendRow(newRow);

  return jsonResponse({ ok: true, action: "added", name: payload.name });
}

// ── Helper: Return JSON response ──
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
