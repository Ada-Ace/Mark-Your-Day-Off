# Mark Your Day-Off (MDO)

MDO is a modern, responsive web application for teams to submit and track short-term leaves (Medical & Urgent/Personal) across office locations. It is backed by a Google Apps Script / Google Sheets database and features a role-based access system to separate regular users from administrators.

---

## Features

### For All Users
- **Quick Leave Submission** — Mark yourself as away for *Today* or the *Next Work Day* (Medical or Urgent Leave).
- **Live Dashboard** — See who is away today and the next working day across all offices.
- **Dark Mode** — Toggle between a comfortable warm light theme and a sleek dark theme.
- **Timezone-Aware** — Dates are computed using local time (not UTC), ensuring accuracy for GMT+8 and other non-UTC timezones.

### For Admins Only *(PIN-protected)*
- **View History** — Browse the full record of all submitted leaves with search, filter, and sort.
- **Filter by Date Range / Leave Type** — Narrow down records with flexible filters.
- **Export to Excel** — Download the current view to a `.xlsx` file.
- **Delete Records** — Permanently remove incorrect or outdated records (synced to Google Sheets).
- **Confirmation Prompts** — Every admin action (delete, export) requires a confirmation step to prevent accidents.

---

## Tech Stack

| Technology | Purpose |
|---|---|
| React + TypeScript | Core UI framework |
| Vite | Build tool & dev server |
| Tailwind CSS v4 | Styling |
| Framer Motion | Animations |
| Lucide React | Icons |
| SheetJS + FileSaver.js | Excel export |
| Google Apps Script | Serverless backend API |
| Google Sheets | Database |

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) installed on your machine.

### Installation

1. **Navigate into the project folder:**
   ```bash
   cd Mark-Your-Day-Off
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables** — Open `.env` and fill in your values:
   ```env
   VITE_APP_TITLE="Mark Your Day-Off"
   VITE_GOOGLE_APPS_SCRIPT_URL="https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec"
   VITE_DEFAULT_OFFICE="HQ"
   VITE_ADMIN_PIN="your_pin_here"
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   > **Windows PowerShell tip:** If you get a script execution error, use `cmd /c npm run dev` instead.

5. **Open the app** at the URL shown in your terminal (e.g. `http://localhost:5173`).

---

## Google Apps Script Backend Setup

### Step 1 — Create the Spreadsheet
1. Go to [sheets.google.com](https://sheets.google.com) and create a new spreadsheet.
2. Rename the first sheet tab to **`Leaves`**.

### Step 2 — Add the Script
1. In the spreadsheet, click **Extensions → Apps Script**.
2. A new tab opens with the script editor. **Select all** (`Ctrl+A`) and **delete** the placeholder code.
3. Paste the complete script below and press **`Ctrl+S`** to save.

### Step 3 — Deploy as Web App
1. Click **Deploy → New deployment**.
2. Click the ⚙️ gear icon and select **Web app**.
3. Set **Execute as:** `Me` and **Who has access:** `Anyone`.
4. Click **Deploy** and copy the provided **Web App URL**.
5. Paste the URL into your `.env` as `VITE_GOOGLE_APPS_SCRIPT_URL`.

> **To update an existing deployment:** Deploy → Manage deployments → Edit (✏️) → New version → Deploy.

---

### Complete `Code.gs` Script

```javascript
const SHEET_NAME = 'Leaves';

// Fetch all leave records
function doGet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return ContentService.createTextOutput(JSON.stringify([]))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const rows = data.slice(1);
  const leaves = rows.map(row => {
    let dateVal = row[6];
    // Google Sheets stores dates as Date objects, not strings.
    // Format manually as YYYY-MM-DD to avoid timezone offset issues.
    if (dateVal instanceof Date) {
      const y = dateVal.getFullYear();
      const m = String(dateVal.getMonth() + 1).padStart(2, '0');
      const d = String(dateVal.getDate()).padStart(2, '0');
      dateVal = `${y}-${m}-${d}`;
    }
    return {
      id: Number(row[0]),
      userId: String(row[2]).trim(),
      userName: String(row[3]).trim(),
      office: String(row[4]).trim(),
      type: String(row[5]).trim(),
      date: String(dateVal).trim()
    };
  });

  return ContentService.createTextOutput(JSON.stringify(leaves))
    .setMimeType(ContentService.MimeType.JSON);
}

// Add or delete a leave record
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const data = JSON.parse(e.postData.contents);

    // DELETE action
    if (data.action === 'delete') {
      const rows = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (Number(rows[i][0]) === Number(data.id)) {
          sheet.deleteRow(i + 1); // Rows are 1-indexed; +1 accounts for header
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'deleted' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ADD action (default)
    sheet.appendRow([
      data.id,
      new Date(),
      data.userId,
      data.userName,
      data.office,
      data.type,
      data.date
    ]);

    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

---

## Admin Access

Click the **🔒 Lock icon** in the top navigation bar to open the Admin PIN prompt.

- Once authenticated, the following are unlocked: **View History**, **Export to Excel**, **Delete Records**.
- Every admin action requires a **confirmation dialog** before executing.
- Click the **🔓 Unlock icon** to log out of admin mode.

The Admin PIN is stored in your `.env` file as `VITE_ADMIN_PIN`.

---

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_APP_TITLE` | Application display title |
| `VITE_GOOGLE_APPS_SCRIPT_URL` | Your deployed GAS Web App URL |
| `VITE_DEFAULT_OFFICE` | Default office code (e.g. `HQ`) |
| `VITE_ADMIN_PIN` | PIN to unlock admin-only features |

> **Note:** After changing any `.env` value, restart the dev server (`npm run dev`) for changes to take effect.

---

## Project Structure

```
Mark-Your-Day-Off/
├── src/
│   ├── App.tsx        # All views, components, and state management
│   └── index.css      # Global styles and Tailwind configuration
├── .env               # Environment variables (never commit to Git!)
├── .gitignore         # Excludes .env and node_modules
├── vite.config.ts     # Vite build configuration
└── README.md
```

---

## Customization

Edit the top of `src/App.tsx` to add more offices or leave types:

```typescript
const OFFICES = [
  { id: 'HQ',  name: 'HQ',    country: 'Singapore', tz: 'GMT+8',  color: 'bg-indigo-600' },
  { id: 'KL',  name: 'KL',    country: 'Malaysia',  tz: 'GMT+8',  color: 'bg-violet-600' },
  { id: 'JKT', name: 'Jakarta', country: 'Indonesia', tz: 'GMT+7', color: 'bg-rose-600'   },
];
```
