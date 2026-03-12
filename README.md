# Mark Your Day-Off (MDO)

MDO is a modern, responsive web application for teams to submit and track short-term leaves (Medical & Urgent/Personal) across office locations. It features a simplified, mobile-first dashboard that displays records for **Yesterday**, **Today**, and **Tomorrow**.

---

## 🌟 Key Features

### For All Users
- **Personalized Access** — Secure login using Employee ID (`AA-111` format) and a personal 4-digit PIN.
- **Show / Hide PIN** — Eye icon toggle on all PIN fields for safe, optional visibility.
- **Calendar Day System** — Track availability 7 days a week (including weekends).
- **Country-Specific Public Holidays** — Dynamic holiday indicators mapped precisely to the office's configured country and timezone.
- **Quick Submission** — Bold, animated **"Mark Off"** button on mobile header for fast, one-tap leave submission.
- **Live Summary** — View team availability at a glance across multiple office locations.
- **PIN Management** — Self-service PIN updates for logged-in users.
- **Mobile First** — Optimized for high-performance mobile scrolling with a clean, app-like interface.

### For Admins Only *(PIN-protected)*
- **Auto Dashboard Redirect** — Admin is redirected straight to the **Dashboard** upon successful PIN entry.
- **Manage Access** — ID search field, sorted ascending, with real-time loading spinners during add/remove operations.
- **Auto-Cleanup** — Leave records older than 7 days are automatically removed from Google Sheets on every new submission.
- **Remove Records** — Admins can clear a user's status from the dashboard (via hover on desktop or long-press/view on mobile).
- **Security Control** — Lock/Unlock admin mode to prevent unauthorized record tampering.

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| **React 19** | Core UI framework |
| **Vite** | Build tool & high-speed development |
| **Tailwind CSS v4** | Modern, utility-first styling |
| **Framer Motion** | Premium animations and micro-interactions |
| **Lucide React** | Consistent, high-quality iconography |
| **Google Apps Script** | Serverless backend API |
| **Google Sheets** | Real-time database storage |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (Version 18+) installed.

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

3. **Configure Environment Variables** — Create a `.env` file in the root:
   ```env
   VITE_APP_TITLE="Mark Your Day-Off"
   VITE_GOOGLE_APPS_SCRIPT_URL="https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec"
   VITE_ADMIN_PIN="123456"
   ```

4. **Run Locally:**
   ```bash
   npm run dev
   ```

---

## 📊 Dashboard Experience

The dashboard is designed for high-velocity updates and immediate visibility:

- **🔵 Today Section**: The primary focus of the app, showing real-time availability.
- **🌑 Tomorrow Section**: Dark grey themed section for upcoming leave planning.
- **⚪ Yesterday Section**: Light grey themed section for reviewing the previous day's status.
- **🇸🇬 Holiday Badges**: Specific indicators for Singapore public holidays in 2026 (e.g., National Day, Lunar New Year).

---

## 🔒 Security & Admin

### Access System
- **Login Format**: Users must log in using a strict `AA-111` formatted Employee ID (2 letters, 3 numbers). This is enforced in real-time as users type.
- **Default Employee ID**: `SS-023`
- **Default Access PIN**: `1431`
- Users can update their personal PIN from the leave submission interface.

### Admin Mode
Click the **🔒 Lock icon** (Desktop) or the **Lock icon** in the navigation group to enter the Admin PIN.
- **Admin features**: Manage Access (Shield Check), Delete Records (Trash icon).
- The Admin PIN is managed via the Google Apps Script backend.

---

## 📱 Mobile Optimization

For the "Native App" experience on **iOS** or **Android**:
1. Open the URL in your mobile browser (**Safari** for iOS, **Chrome** for Android).
2. Use the browser's "Share" or "Menu" button.
3. Select **"Add to Home Screen"**.
4. Launch **MDO** from your home screen for a full-screen, clean UI without browser bars.

---

## ☁️ Google Apps Script Backend Setup (Required for Syncing)

To ensure that Employee IDs added via the mobile app are synced to laptops and other devices, you **must update your backend** to store both Leaves and Users. 

### Step 1: Create the Sheets
1. Go to your Google Sheet.
2. Ensure you have two tabs at the bottom:
   - **`Leaves`** 
   - **`Users`**
3. Open the **`Users`** sheet. Add your default access IDs in the first few rows:
   - Row 1: `SS-023` in column A, `1431` in column B
   - Row 2: `ST-001` in column A, `1234` in column B

### Step 2: Update the Script
1. Click **Extensions → Apps Script**.
2. Replace all the code in `Code.gs` with the snippet below:

```javascript
const LEAVES_SHEET = 'Leaves';
const USERS_SHEET = 'Users';

function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Fetch Leaves
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
          id: Number(row[0]),
          userId: String(row[2]).trim(),
          userName: String(row[3]).trim(),
          office: String(row[4]).trim(),
          type: String(row[5]).trim(),
          date: String(dateVal).trim()
        };
      });
    }
  }

  // 2. Fetch Allowed Users
  let users = [];
  const userSheet = ss.getSheetByName(USERS_SHEET);
  if (userSheet) {
    const data = userSheet.getDataRange().getValues();
    // Assuming no header row for Users, or if there is, adjust slice:
    users = data.map(row => {
      if (!row[0]) return null;
      return { id: String(row[0]).trim(), pin: String(row[1]).trim() };
    }).filter(row => row !== null);
  }

  // Return both so devices sync perfectly upon loading the app
  return ContentService.createTextOutput(JSON.stringify({ leaves, users }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const leafSheet = ss.getSheetByName(LEAVES_SHEET);
    const userSheet = ss.getSheetByName(USERS_SHEET);
    
    const data = JSON.parse(e.postData.contents);

    // Handle Delete Leave
    if (data.action === 'delete' && leafSheet) {
      const rows = leafSheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (Number(rows[i][0]) === Number(data.id)) {
          leafSheet.deleteRow(i + 1);
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'deleted' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Handle Add User
    if (data.action === 'add_allowed_id' && userSheet) {
      userSheet.appendRow([data.id, data.pin]);
      return ContentService.createTextOutput(JSON.stringify({ status: 'user_added' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Handle Remove User
    if (data.action === 'remove_allowed_id' && userSheet) {
      const rows = userSheet.getDataRange().getValues();
      for (let i = 0; i < rows.length; i++) {
        if (String(rows[i][0]).trim() === String(data.id).trim()) {
          userSheet.deleteRow(i + 1);
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'user_removed' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Handle Update PIN
    if (data.action === 'update_user_pin' && userSheet) {
      const rows = userSheet.getDataRange().getValues();
      for (let i = 0; i < rows.length; i++) {
        if (String(rows[i][0]).trim() === String(data.id).trim()) {
          userSheet.getRange(i + 1, 2).setValue(data.pin); // column B
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'pin_updated' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Default: Add Leave Record
    if (leafSheet) {
      leafSheet.appendRow([
        data.id,
        new Date(),
        data.userId,
        data.userName,
        data.office,
        data.type,
        data.date
      ]);
      
      // Auto-cleanup records older than 7 days
      cleanOldLeaves(leafSheet);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
        .setMimeType(ContentService.MimeType.JSON);
        
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function cleanOldLeaves(leafSheet) {
  try {
    const data = leafSheet.getDataRange().getValues();
    if (data.length <= 1) return;
    
    const now = new Date().getTime();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    
    // Reverse loop to avoid index shifting safely when deleting rows
    for (let i = data.length - 1; i > 0; i--) {
      const row = data[i];
      // Column B (index 1) contains the timestamp
      const insertDate = new Date(row[1]).getTime();
      if (now - insertDate > SEVEN_DAYS_MS) {
        leafSheet.deleteRow(i + 1); // +1 because rows are 1-indexed
      }
    }
  } catch (e) {
    console.log("Cleanup failed: ", e);
  }
}
```

### Step 3: Deploy
1. Click **Deploy → New deployment**.
2. Run as: **Me**, Access: **Anyone**.
3. **Important:** Whenever you change the code, you must deploy as a **New Version** (Deploy → Manage deployments → Edit Pencil → Select "New version" → Deploy) for changes to take effect!

---

## 📂 Project Structure

```
Mark-Your-Day-Off/
├── src/
│   ├── App.tsx        # Unified component architecture
│   └── index.css      # Design system & Tailwind tokens
├── public/            # Static assets
├── .env               # Private configuration
└── README.md
```

---

## 📄 License
This project is private and intended for internal team use.

---
*Created by Antigravity AI Engine*
