# Mark Your Day-Off (MDO)

MDO is a modern, responsive web application for teams to submit and track short-term leaves (Medical, Urgent/Personal, and Late Arrival) across office locations. It features a simplified, mobile-first dashboard that displays records for **Yesterday**, **Today**, and **Tomorrow**.

---

## 🌟 Key Features

### For All Users
- **Personalized Access** — Secure login using Employee ID (`AA-111` format) and a personal 4-digit PIN.
- **Show / Hide PIN** — Eye icon toggle on all PIN fields for safe, optional visibility.
- **Calendar Day System** — Track availability 7 days a week (including weekends).
- **Country-Specific Public Holidays** — Dynamic holiday indicators mapped to the office's country and timezone.
- **Quick Submission** — Bold, animated **"Mark Off"** button on mobile header for fast, one-tap leave submission.
- **Live Summary** — View team availability at a glance across office locations.
- **PIN Management** — Self-service PIN updates for logged-in users.
- **Mobile First** — Optimized for high-performance mobile scrolling with a clean, app-like interface.
- **1 Leave Per Day Limit** — Each user can only submit one leave per day. Duplicate buttons are disabled and show an **"Already Submitted"** indicator.

### Leave Types

| Type | Color | Dates | Remarks |
|---|---|---|---|
| 🔴 **Medical / Sick Leave** | Red | Today, Tomorrow | Not required |
| 🟡 **Urgent / Personal Leave** | Amber | Today, Tomorrow | ✅ Required |
| 🟣 **Late Arrival** | Violet | Today only | ✅ Required |

### Remarks System
- **Urgent Leave** and **Late Arrival** trigger a remarks modal before submission (max 200 characters).
- Remarks appear as a subtle bubble on each leave card in the Dashboard.
- **⏰ Late Arrival remarks are automatically cleared at 13:00** — the entry stays visible, only the remarks text is removed.
- Remarks are cached in `localStorage` and survive page reloads, even before the GAS backend is updated.

### For Admins Only *(PIN-protected)*
- **Auto Dashboard Redirect** — Admin goes straight to the Dashboard after login.
- **Manage Access** — Add/remove Employee IDs with auto-generated PINs. Searchable, sorted list.
- **Auto-Cleanup** — Leave records older than 7 days are removed from Google Sheets on every new submission.
- **Remove Records** — Hover (desktop) or tap (mobile) a leave card to reveal the delete button.
- **Security Control** — Lock/Unlock admin mode at any time.

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| **React 19** | Core UI framework |
| **Vite** | Build tool & dev server |
| **Tailwind CSS v4** | Utility-first styling |
| **Framer Motion** | Animations & micro-interactions |
| **Lucide React** | Iconography |
| **Google Apps Script** | Serverless backend API |
| **Google Sheets** | Real-time database storage |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18+

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Ada-Ace/Mark-Your-Day-Off.git
   cd Mark-Your-Day-Off
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables** — copy `.env.example` to `.env` and fill in your values:
   ```env
   VITE_APP_TITLE="Mark Your Day-Off"
   VITE_GOOGLE_APPS_SCRIPT_URL="https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec"
   VITE_ADMIN_PIN="MD1431"
   ```

4. **Run locally:**
   ```bash
   npm run dev
   ```

---

## 📊 Dashboard

- **🔵 Today** — Primary section. Shows Medical, Urgent, and Late Arrival entries with remarks bubbles.
- **🌑 Tomorrow** — Dark grey section for upcoming Medical & Urgent leaves.
- **⚪ Yesterday** — Light grey section for the previous day's records.
- **🗓️ Holiday Badges** — Singapore public holidays for 2026 highlighted automatically.
- **💬 Remarks Bubbles** — Inline remarks shown below the leave type label on each card.

---

## 🔒 Security & Admin

### Access System
- Login uses a strict `AA-111` format Employee ID (2 letters + 3 numbers), enforced as you type.
- **Default Employee ID:** `SS-000` · **Default PIN:** `1431`
- Users update their own PIN from the leave submission screen.

### Admin Mode
Click the **🔒 Lock icon** in the nav bar to enter the Admin PIN.
- Admin PIN is set via the `VITE_ADMIN_PIN` environment variable.
- Admin features: **Manage Access** (Shield icon) · **Delete Records** (Trash icon on hover).

---

## 📱 Mobile — Add to Home Screen

1. Open the app URL in **Safari** (iOS) or **Chrome** (Android).
2. Tap **Share → Add to Home Screen** (iOS) or **Menu → Add to Home Screen** (Android).
3. Launch MDO from your home screen for a full-screen, app-like experience.

---

## ☁️ Google Apps Script Backend Setup

### Sheet Structure

| Tab | Columns |
|---|---|
| **`Leaves`** | A: ID · B: Timestamp · C: Employee ID · D: Name · E: Office · F: Type · G: Date · **H: Remarks** |
| **`Users`** | A: Employee ID · B: PIN |

> **Column H (Remarks)** was added in March 2026. Existing rows without it are handled gracefully.

---

### Step 1 — Prepare the Sheets

1. Open your Google Sheet and confirm two tabs exist: **`Leaves`** and **`Users`**.
2. In the **`Users`** tab, seed your default access records:
   - Row 1: `SS-023` | `1431`
   - Row 2: `ST-001` | `1234`

---

### Step 2 — Replace the Script

1. In your Google Sheet click **Extensions → Apps Script**.
2. Select all (`Ctrl+A`), delete, paste the script below, then **Save** (`Ctrl+S`).

```javascript
const LEAVES_SHEET = 'Leaves';
const USERS_SHEET  = 'Users';

function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // --- Leaves ---
  let leaves = [];
  const leafSheet = ss.getSheetByName(LEAVES_SHEET);
  if (leafSheet) {
    const data = leafSheet.getDataRange().getValues();
    if (data.length > 1) {
      leaves = data.slice(1).map(row => {
        let dateVal = row[6];
        if (dateVal instanceof Date) {
          const y = dateVal.getFullYear();
          const m = String(dateVal.getMonth() + 1).padStart(2, '0');
          const d = String(dateVal.getDate()).padStart(2, '0');
          dateVal = `${y}-${m}-${d}`;
        }
        return {
          id:       Number(row[0]),
          userId:   String(row[2]).trim(),
          userName: String(row[3]).trim(),
          office:   String(row[4]).trim(),
          type:     String(row[5]).trim(),
          date:     String(dateVal).trim(),
          remarks:  row[7] ? String(row[7]).trim() : undefined  // Column H
        };
      });
    }
  }

  // --- Users ---
  let users = [];
  const userSheet = ss.getSheetByName(USERS_SHEET);
  if (userSheet) {
    const data = userSheet.getDataRange().getValues();
    users = data
      .map(row => row[0] ? { id: String(row[0]).trim(), pin: String(row[1]).trim() } : null)
      .filter(Boolean);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ leaves, users }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const ss        = SpreadsheetApp.getActiveSpreadsheet();
    const leafSheet = ss.getSheetByName(LEAVES_SHEET);
    const userSheet = ss.getSheetByName(USERS_SHEET);
    const data      = JSON.parse(e.postData.contents);

    // Delete leave
    if (data.action === 'delete' && leafSheet) {
      const rows = leafSheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (Number(rows[i][0]) === Number(data.id)) { leafSheet.deleteRow(i + 1); break; }
      }
      return json({ status: 'deleted' });
    }

    // Add user
    if (data.action === 'add_allowed_id' && userSheet) {
      userSheet.appendRow([data.id, data.pin]);
      return json({ status: 'user_added' });
    }

    // Remove user
    if (data.action === 'remove_allowed_id' && userSheet) {
      const rows = userSheet.getDataRange().getValues();
      for (let i = 0; i < rows.length; i++) {
        if (String(rows[i][0]).trim() === String(data.id).trim()) { userSheet.deleteRow(i + 1); break; }
      }
      return json({ status: 'user_removed' });
    }

    // Update PIN
    if (data.action === 'update_user_pin' && userSheet) {
      const rows = userSheet.getDataRange().getValues();
      for (let i = 0; i < rows.length; i++) {
        if (String(rows[i][0]).trim() === String(data.id).trim()) {
          userSheet.getRange(i + 1, 2).setValue(data.pin); break;
        }
      }
      return json({ status: 'pin_updated' });
    }

    // Add leave record
    // A=id · B=timestamp · C=userId · D=userName · E=office · F=type · G=date · H=remarks
    if (leafSheet) {
      leafSheet.appendRow([
        data.id,
        new Date(),
        data.userId,
        data.userName,
        data.office,
        data.type,
        data.date,
        data.remarks || ''  // Column H — blank if leave type has no remarks
      ]);
      cleanOldLeaves(leafSheet);
    }

    return json({ status: 'success' });

  } catch (error) {
    return json({ status: 'error', message: error.toString() });
  }
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function cleanOldLeaves(leafSheet) {
  try {
    const data = leafSheet.getDataRange().getValues();
    if (data.length <= 1) return;
    const now          = new Date().getTime();
    const SEVEN_DAYS   = 7 * 24 * 60 * 60 * 1000;
    for (let i = data.length - 1; i > 0; i--) {
      if (now - new Date(data[i][1]).getTime() > SEVEN_DAYS) leafSheet.deleteRow(i + 1);
    }
  } catch (e) { console.log('Cleanup failed:', e); }
}
```

---

### Step 3 — Deploy

> ⚠️ **Updating an existing deployment?** Do NOT create a new deployment — that changes the URL. Use the steps below instead.

1. Click **Deploy → Manage deployments**
2. Click the **✏️ Edit (pencil)** icon on your active deployment
3. Set **Version** to **"New version"**
4. Click **Deploy**
5. ✅ Your `.env` URL stays the same — no changes needed

> **First-time deployment?**  
> Click **Deploy → New deployment** · Type: **Web app** · Execute as: **Me** · Access: **Anyone** · Deploy → copy the URL into `VITE_GOOGLE_APPS_SCRIPT_URL` in your `.env`.

---

> 💡 **Haven't updated GAS yet?** No problem — the app caches remarks in `localStorage` so they still appear on the dashboard immediately after submission.

---

## 📂 Project Structure

```
Mark-Your-Day-Off/
├── src/
│   ├── App.tsx        # All components & logic
│   └── index.css      # Design tokens & styles
├── public/            # Static assets & manifest
├── .env               # Secrets — git-ignored
├── .env.example       # Safe template — committed
└── README.md
```

---

## 📄 License
This project is private and intended for internal team use.

---
*Created by Antigravity AI Engine*
