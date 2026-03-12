# Mark Your Day-Off (MDO)

MDO is a modern, responsive web application for teams to submit and track short-term leaves (Medical & Urgent/Personal) across office locations. It features a simplified, mobile-first dashboard that displays records for **Yesterday**, **Today**, and **Tomorrow**.

---

## 🌟 Key Features

### For All Users
- **Personalized Access** — Secure login using Employee ID and a personal 4-digit PIN.
- **Calendar Day System** — Track availability 7 days a week (including weekends).
- **Public Holiday Awareness** — Integrated **2026 Singapore Public Holidays** with automatic dashboard indicators.
- **Quick Submission** — Mark yourself as away for *Today* or *Tomorrow* with a single tap.
- **Live Summary** — View team availability at a glance across multiple office locations.
- **PIN Management** — Self-service PIN updates for logged-in users.
- **Mobile First** — Optimized for high-performance mobile scrolling with a clean, app-like interface.

### For Admins Only *(PIN-protected)*
- **Manage Access** — Admins can manage staff IDs and PINs directly from the **Manage Access** interface.
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
   VITE_DEFAULT_OFFICE="HQ"
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
- **Default Employee ID**: `SS023`
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
