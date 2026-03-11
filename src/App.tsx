import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  Users,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  LayoutDashboard,
  ArrowUp,
  ArrowDown,
  Search,
  Filter,
  Download,
  History,
  Moon,
  Sun,
  Lock,
  Unlock,
  KeyRound,
  Trash2,
  FileSpreadsheet,
  ShieldCheck
} from 'lucide-react';

// --- CONFIGURATION ---
const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || '';

const OFFICES = [
  { id: 'HQ', name: 'HQ', country: 'Singapore', tz: 'GMT+8', color: 'bg-indigo-600' }
];

// Date Utilities
const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
};

const formatShortDate = (date: Date) => {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
};

const getNextWorkDay = (date: Date) => {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  while (next.getDay() === 0 || next.getDay() === 6) {
    next.setDate(next.getDate() + 1);
  }
  return next;
};

const getEffectiveToday = (date: Date) => {
  const d = new Date(date);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return d;
};

const TODAY_DATE = getEffectiveToday(new Date());
const NEXT_DAY_DATE = getNextWorkDay(TODAY_DATE);

// Use local date (not UTC) to avoid timezone off-by-one errors (e.g. GMT+8)
const toLocalDateId = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const TODAY_ID = toLocalDateId(TODAY_DATE);
const NEXT_DAY_ID = toLocalDateId(NEXT_DAY_DATE);

const TODAY_LABEL = formatDate(TODAY_DATE);
const NEXT_DAY_LABEL = formatDate(NEXT_DAY_DATE);

const TODAY_SHORT_LABEL = formatShortDate(TODAY_DATE);
const NEXT_DAY_SHORT_LABEL = formatShortDate(NEXT_DAY_DATE);

const toTitleCase = (str: string) => {
  return str
    .toLowerCase()
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatUserId = (id: string) => {
  const cleaned = id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (cleaned.length >= 5) {
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}`;
  }
  return cleaned;
};

const isValidUserId = (id: string) => {
  return /^[A-Z]{2}-\d{3}$/.test(id);
};

const exportToExcel = (data: Leave[], fileName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data.map((item, index) => ({
    'No.': index + 1,
    'ID': item.userId,
    'Name': item.userName,
    'Office': item.office,
    'Type': LEAVE_TYPES[item.type].label,
    'Date': item.date
  })));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Leaves");
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
  saveAs(blob, `${fileName}.xlsx`);
};

const LEAVE_TYPES = {
  MEDICAL: { label: 'Medical Leave', icon: <Stethoscope className="w-5 h-5" />, color: 'bg-red-500', text: 'text-red-600' },
  URGENT: { label: 'Urgent Leave', icon: <AlertCircle className="w-5 h-5" />, color: 'bg-amber-500', text: 'text-amber-600' }
};

interface Leave {
  id: number;
  userId: string;
  userName: string;
  office: string;
  type: keyof typeof LEAVE_TYPES;
  date: string;
}

interface RawLeave {
  id: number | string;
  userId?: string;
  userName?: string;
  office?: string;
  type?: string;
  date?: string;
}

// --- MAIN APP ---
export default function App() {
  const [view, setView] = useState('submit'); // 'dashboard', 'submit', or 'history'
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // Admin Access Management
  const [showAccessManager, setShowAccessManager] = useState(false);
  const [newInviteCode, setNewInviteCode] = useState(import.meta.env.VITE_INVITE_CODE || 'MARKOFF2026');
  const [isUpdatingInvite, setIsUpdatingInvite] = useState(false);

  // Invite-Only State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('mdo_authenticated') === 'true';
  });
  const [showLockScreen, setShowLockScreen] = useState(!isAuthenticated);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteError, setInviteError] = useState(false);

  const handleAuthentication = (e: React.FormEvent) => {
    e.preventDefault();
    const CORRECT_CODE = import.meta.env.VITE_INVITE_CODE || 'MARKOFF2026';
    if (inviteCode.toUpperCase() === CORRECT_CODE.toUpperCase()) {
      setIsAuthenticated(true);
      setShowLockScreen(false);
      localStorage.setItem('mdo_authenticated', 'true');
      setInviteError(false);
    } else {
      setInviteError(true);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const CORRECT_PIN = import.meta.env.VITE_ADMIN_PIN || '123456';
    if (adminPin === CORRECT_PIN) {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setAdminPin('');
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  // Submitter State
  const [userOffice] = useState('HQ');
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch initial data
  useEffect(() => {
    if (!GOOGLE_SCRIPT_URL) return;

    setIsLoading(true);

    // Normalize a single leaf record from Google Sheets.
    // Google Sheets may auto-convert our date strings into Date objects
    // which serialize as UTC ISO timestamps — causing off-by-one day bugs.
    const normalizeLeaf = (raw: RawLeave): Leave => {
      let dateStr: string = raw.date ?? '';
      // If GAS returned a full ISO timestamp (e.g. "2026-03-09T16:00:00.000Z"),
      // parse it as a Date and re-format using LOCAL time so it matches TODAY_ID.
      if (dateStr.length > 10) {
        const d = new Date(dateStr);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        dateStr = `${y}-${m}-${day}`;
      }
      return {
        id: Number(raw.id),
        userId: String(raw.userId ?? '').trim(),
        userName: String(raw.userName ?? '').trim(),
        office: String(raw.office ?? '').trim(),
        type: String(raw.type ?? '').trim() as keyof typeof LEAVE_TYPES,
        date: dateStr.trim(),
      };
    };

    fetch(GOOGLE_SCRIPT_URL)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setLeaves(data.map(normalizeLeaf));
      })
      .catch(err => {
        console.error('Failed to load leaves:', err);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const addLeave = async (type: keyof typeof LEAVE_TYPES, date: string) => {
    const formattedId = formatUserId(userId);
    if (!isValidUserId(formattedId) || !userName.trim() || isSubmitting) return;

    const newLeave = {
      id: Date.now(),
      userId: formattedId,
      userName: toTitleCase(userName),
      office: userOffice,
      type: type,
      date: date
    };

    setIsSubmitting(true);

    // Optimistic UI update
    setLeaves(prev => [...prev, newLeave]);
    setShowSuccess(true);

    if (GOOGLE_SCRIPT_URL) {
      try {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newLeave),
        });
      } catch (err) {
        console.error('Failed to sync to database:', err);
        // Note: With no-cors, we can't reliably read the error, but the request usually succeeds.
      }
    }

    setTimeout(() => {
      setShowSuccess(false);
      setUserId('');
      setUserName('');
      setIsSubmitting(false);
      setView('dashboard');
    }, 1500);
  };

  const updateInviteCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInviteCode.trim() || isUpdatingInvite) return;

    setIsUpdatingInvite(true);

    try {
      if (GOOGLE_SCRIPT_URL) {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update_invite', code: newInviteCode.toUpperCase() }),
        });
      }

      alert(`Invite code successfully updated to: ${newInviteCode.toUpperCase()}\n\nNote: For permanent changes, please update the VITE_INVITE_CODE in your Vercel/Environment settings.`);
      setShowAccessManager(false);
    } catch (err) {
      console.error('Failed to update invite code:', err);
    } finally {
      setIsUpdatingInvite(false);
    }
  };

  const removeLeave = async (id: number) => {
    setLeaves(prev => prev.filter(l => l.id !== id));

    if (GOOGLE_SCRIPT_URL) {
      try {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', id }),
        });
      } catch (err) {
        console.error('Failed to sync deletion to database:', err);
      }
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark' : ''} bg-[#f4f2ee] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-20 transition-colors duration-300`}>
      {/* Navigation */}
      <nav className="bg-[#faf9f6] dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 px-4 py-3 flex items-center justify-between shadow-sm transition-colors duration-300">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 dark:bg-indigo-500 p-2 rounded-lg">
            <LayoutDashboard className="text-white w-5 h-5" />
          </div>
          <h1 className="font-bold text-lg tracking-tight dark:text-white">MDO</h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-full transition-all"
            title="Toggle Dark Mode"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            onClick={() => {
              if (isAdmin) {
                setIsAdmin(false);
                setView('dashboard');
              } else {
                setShowAdminLogin(true);
              }
            }}
            className="p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-full transition-all"
            title={isAdmin ? "Lock (Logout)" : "Admin Login"}
          >
            {isAdmin ? <Unlock size={20} className="text-indigo-500" /> : <Lock size={20} />}
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowAccessManager(true)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2`}
              title="Manage Access"
            >
              <ShieldCheck size={18} className="text-indigo-500" />
              <span className="hidden md:inline">Manage Access</span>
            </button>
          )}
          <button
            onClick={() => setView('dashboard')}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${view === 'dashboard' ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            Overview
          </button>
          <motion.button
            onClick={() => setView('submit')}
            animate={{
              scale: [1, 1.05, 1],
              boxShadow: [
                "0px 0px 0px rgba(79, 70, 229, 0)",
                "0px 0px 20px rgba(79, 70, 229, 0.3)",
                "0px 0px 0px rgba(79, 70, 229, 0)"
              ]
            }}
            transition={{
              repeat: Infinity,
              duration: 2.5,
              ease: "easeInOut"
            }}
            whileHover={{
              scale: 1.1,
              boxShadow: "0px 8px 15px rgba(79, 70, 229, 0.4)"
            }}
            whileTap={{
              scale: 0.95,
              boxShadow: "0px 4px 8px rgba(79, 70, 229, 0.2)"
            }}
            className="px-5 py-2 rounded-full text-sm font-black bg-indigo-600 text-white transition-colors shadow-md"
          >
            Mark Your Day-off
          </motion.button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-6">
        {!GOOGLE_SCRIPT_URL && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-start gap-3 text-amber-800 dark:text-amber-200">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">No Database Connected</p>
              <p className="text-sm opacity-80 mt-1">
                Your Web App URL is not set in the `.env` file. The app is currently running in local-only demo mode.
                Leaves marked will disappear when you refresh the page.
              </p>
            </div>
          </div>
        )}

        {isLoading && leaves.length === 0 ? (
          <div className="flex justify-center items-center py-20 opacity-50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : view === 'dashboard' ? (
          <Dashboard leaves={leaves} onRemove={removeLeave} onGoToHistory={() => setView('history')} isAdmin={isAdmin} />
        ) : view === 'history' && isAdmin ? (
          <HistoryView leaves={leaves} onRemove={removeLeave} onBack={() => setView('dashboard')} isAdmin={isAdmin} />
        ) : (
          <SubmitterInterface
            userId={userId}
            setUserId={setUserId}
            userName={userName}
            setUserName={setUserName}
            onAdd={addLeave}
            showSuccess={showSuccess}
            isSubmitting={isSubmitting}
          />
        )}
      </main>

      {/* Admin Login Modal */}
      {showAdminLogin && (
        <div className="fixed inset-0 flex items-center justify-center bg-[#faf9f6]/95 dark:bg-slate-950/95 backdrop-blur-sm z-50 p-4">
          <form onSubmit={handleAdminLogin} className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl space-y-6 w-full max-w-sm border border-slate-100 dark:border-slate-800 animate-in zoom-in duration-300">
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mb-4">
                <KeyRound className="text-indigo-600 dark:text-indigo-400 w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Access</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Enter PIN to manage leaves</p>
            </div>

            <div>
              <input
                type="password"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                placeholder="Enter PIN"
                autoFocus
                className="w-full text-center tracking-widest text-2xl p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all dark:text-white"
              />
              {pinError && <p className="text-red-500 text-xs text-center mt-2 font-medium">Incorrect PIN</p>}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setShowAdminLogin(false); setPinError(false); setAdminPin(''); }}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-md"
              >
                Unlock
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Access Manager Modal */}
      {showAccessManager && isAdmin && (
        <div className="fixed inset-0 flex items-center justify-center bg-[#faf9f6]/95 dark:bg-slate-950/95 backdrop-blur-sm z-50 p-4">
          <form onSubmit={updateInviteCode} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl space-y-8 w-full max-w-md border border-slate-100 dark:border-slate-800 animate-in zoom-in duration-300">
            <div className="text-center space-y-3">
              <div className="mx-auto w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center mb-4">
                <ShieldCheck className="text-indigo-600 dark:text-indigo-400 w-8 h-8" />
              </div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Access Control</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Manage the application invite code</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Current Invite Code</label>
                <div className="relative group">
                  <input
                    type="text"
                    value={newInviteCode}
                    onChange={(e) => setNewInviteCode(e.target.value)}
                    placeholder="Enter new code"
                    className="w-full text-center tracking-[0.2em] text-2xl font-black p-5 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:border-indigo-500 focus:ring-0 focus:outline-none transition-all dark:text-white"
                  />
                </div>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs uppercase tracking-tight">
                  <AlertCircle size={14} />
                  Persistence Notice
                </div>
                <p className="text-[11px] text-amber-800/70 dark:text-amber-300/60 leading-relaxed font-medium">
                  Changing this here updates the code for current session. To make it permanent, update <strong>VITE_INVITE_CODE</strong> in your Vercel Project Settings.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setShowAccessManager(false)}
                className="flex-1 px-4 py-4 rounded-2xl font-black text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all uppercase tracking-widest text-xs"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isUpdatingInvite}
                className="flex-[2] px-4 py-4 rounded-2xl font-black text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 uppercase tracking-widest text-xs disabled:opacity-50"
              >
                {isUpdatingInvite ? 'Updating...' : 'Update Code'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Invite-Only Lock Screen */}
      {showLockScreen && (
        <div className="fixed inset-0 flex items-center justify-center bg-[#faf9f6] dark:bg-slate-950 backdrop-blur-md z-[100] p-4">
          <div className="absolute inset-0 bg-indigo-600/5 dark:bg-indigo-500/5 animate-pulse pointer-events-none"></div>
          <form onSubmit={handleAuthentication} className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] shadow-2xl space-y-8 w-full max-w-md border border-slate-200 dark:border-slate-800/50 relative overflow-hidden animate-in fade-in zoom-in duration-500">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full -mr-16 -mt-16 blur-3xl"></div>

            <div className="text-center space-y-3 relative">
              <div className="mx-auto w-20 h-20 bg-indigo-600 dark:bg-indigo-500 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-indigo-200 dark:shadow-indigo-900/50 transform -rotate-6">
                <LayoutDashboard className="text-white w-10 h-10" />
              </div>
              <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Mark Your Day-Off</h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium">Private Access only. Please enter your invite code to enter.</p>
            </div>

            <div className="space-y-4">
              <div className="relative group">
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Invite Code"
                  autoFocus
                  className="w-full text-center tracking-[0.2em] text-2xl font-black p-5 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:border-indigo-500 focus:ring-0 focus:outline-none transition-all dark:text-white dark:placeholder-slate-700"
                />
                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent scale-x-0 group-focus-within:scale-x-100 transition-transform duration-500"></div>
              </div>
              {inviteError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-500 text-sm text-center font-bold flex items-center justify-center gap-2"
                >
                  <AlertCircle size={16} />
                  Access Denied: Invalid Code
                </motion.div>
              )}
            </div>

            <motion.button
              type="submit"
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-5 rounded-2xl font-black text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40 text-lg uppercase tracking-wider"
            >
              Enter Dashboard
            </motion.button>

            <div className="text-center">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Powered by Antigravity AI Engine</p>
            </div>
          </form>
        </div>
      )}

      {/* Floating Action Button */}
      {view === 'dashboard' && (
        <motion.button
          onClick={() => setView('submit')}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="fixed bottom-6 right-6 bg-orange-500 text-white p-4 rounded-full shadow-xl hover:bg-orange-600 transition-colors z-50"
        >
          <PlusCircle className="w-6 h-6" />
        </motion.button>
      )}
    </div>
  );
}

// --- SUBMITTER INTERFACE ---
interface SubmitterProps {
  userId: string;
  setUserId: (id: string) => void;
  userName: string;
  setUserName: (name: string) => void;
  onAdd: (type: keyof typeof LEAVE_TYPES, date: string) => void;
  showSuccess: boolean;
  isSubmitting: boolean;
}

function SubmitterInterface({ userId, setUserId, userName, setUserName, onAdd, showSuccess, isSubmitting }: SubmitterProps) {
  return (
    <div className="max-w-md mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center">
        <h2 className="text-3xl font-extrabold tracking-tight mb-2 text-indigo-600 dark:text-indigo-400">Mark Your Day-Off</h2>
        <p className="text-slate-500 dark:text-slate-400">Mark your medical or urgent leave for today or the next work day.</p>
      </div>

      <div className="bg-[#faf9f6] dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-6 transition-colors duration-300">
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Your ID</label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="e.g. AB-123"
            maxLength={6}
            className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all uppercase dark:text-white dark:placeholder-slate-500"
          />
          <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 font-medium">Format: 2 Letters - 3 Numbers (e.g. AB-123)</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Your Name</label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="e.g. Sarah Chen"
            className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all dark:text-white dark:placeholder-slate-500"
          />
        </div>

        <div className="space-y-4 pt-2">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Your Leave Type:</p>

          <div className="grid grid-cols-1 gap-4">
            {/* Medical Option */}
            <div className="group space-y-2">
              <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
                <Stethoscope size={18} /> Medical / Sick Leave
              </div>
              <div className="flex gap-2">
                <button
                  disabled={!isValidUserId(formatUserId(userId)) || !userName || isSubmitting}
                  onClick={() => onAdd('MEDICAL', TODAY_ID)}
                  className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold shadow-md shadow-red-200 hover:bg-red-600 active:scale-95 transition-all disabled:opacity-50 flex flex-col items-center justify-center gap-0.5"
                >
                  <span>Today</span>
                  <span className="text-xs font-medium opacity-90">{TODAY_SHORT_LABEL}</span>
                </button>
                <button
                  disabled={!isValidUserId(formatUserId(userId)) || !userName || isSubmitting}
                  onClick={() => onAdd('MEDICAL', NEXT_DAY_ID)}
                  className="flex-1 bg-red-100 text-red-700 border-2 border-red-200 py-3 rounded-xl font-bold hover:bg-red-200 active:scale-95 transition-all disabled:opacity-50 flex flex-col items-center justify-center gap-0.5"
                >
                  <span>Next Day</span>
                  <span className="text-xs font-medium opacity-90">{NEXT_DAY_SHORT_LABEL}</span>
                </button>
              </div>
            </div>

            {/* Urgent Option */}
            <div className="group space-y-2 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
                <AlertCircle size={18} /> Urgent / Personal
              </div>
              <div className="flex gap-2">
                <button
                  disabled={!isValidUserId(formatUserId(userId)) || !userName || isSubmitting}
                  onClick={() => onAdd('URGENT', TODAY_ID)}
                  className="flex-1 bg-amber-500 text-white py-3 rounded-xl font-bold shadow-md shadow-amber-200 hover:bg-amber-600 active:scale-95 transition-all disabled:opacity-50 flex flex-col items-center justify-center gap-0.5"
                >
                  <span>Today</span>
                  <span className="text-xs font-medium opacity-90">{TODAY_SHORT_LABEL}</span>
                </button>
                <button
                  disabled={!isValidUserId(formatUserId(userId)) || !userName || isSubmitting}
                  onClick={() => onAdd('URGENT', NEXT_DAY_ID)}
                  className="flex-1 bg-amber-100 text-amber-700 border-2 border-amber-200 py-3 rounded-xl font-bold hover:bg-amber-200 active:scale-95 transition-all disabled:opacity-50 flex flex-col items-center justify-center gap-0.5"
                >
                  <span>Next Day</span>
                  <span className="text-xs font-medium opacity-90">{NEXT_DAY_SHORT_LABEL}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showSuccess && (
        <div className="fixed inset-0 flex items-center justify-center bg-[#faf9f6]/80 dark:bg-slate-950/80 backdrop-blur-sm z-50">
          <div className="bg-indigo-500 dark:bg-indigo-600 text-white p-8 rounded-3xl shadow-2xl text-center space-y-4 animate-in zoom-in duration-300">
            <CheckCircle2 size={64} className="mx-auto" />
            <h3 className="text-2xl font-bold">Day-off Marked!</h3>
            <p>Take Care.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// --- DASHBOARD ---
interface DashboardProps {
  leaves: Leave[];
  onRemove: (id: number) => void;
  onGoToHistory: () => void;
  isAdmin: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ leaves, onRemove, onGoToHistory, isAdmin }) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Day-Off Dashboard</h2>
          <p className="text-slate-500 dark:text-slate-400">Track and manage team availability across offices.</p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onGoToHistory}
              className="px-4 py-2 rounded-full text-sm font-bold bg-[#faf9f6] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-500/50 transition-all shadow-sm flex items-center gap-2"
            >
              <History size={16} />
              View History
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Today Column */}
        <div className="space-y-4 bg-indigo-50/50 dark:bg-indigo-950/20 p-4 rounded-[2.5rem] border border-indigo-100/50 dark:border-indigo-900/50 transition-colors duration-300">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-2 uppercase">
              <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-500"></span>
              Today
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-indigo-400 dark:text-indigo-500/80 uppercase tracking-wider">{TODAY_LABEL}</span>
            </div>
          </div>
          {OFFICES.map(office => (
            <OfficeColumn
              key={`${office.id}-today`}
              office={office}
              leaves={leaves.filter(l => l.office === office.id && l.date === TODAY_ID)}
              onRemove={onRemove}
              headerColor="bg-indigo-600"
              onExport={() => exportToExcel(leaves.filter(l => l.office === office.id && l.date === TODAY_ID), `Leaves_Today_${office.id}_${TODAY_ID}`)}
              isAdmin={isAdmin}
            />
          ))}
        </div>

        {/* Next Day Column */}
        <div className="space-y-4 bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-[2.5rem] border border-slate-200/50 dark:border-slate-800/50 transition-colors duration-300">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-300 flex items-center gap-2 uppercase">
              <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500"></span>
              Next Day
            </h3>
            <span className="text-lg font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{NEXT_DAY_LABEL}</span>
          </div>
          {OFFICES.map(office => (
            <OfficeColumn
              key={`${office.id}-next`}
              office={office}
              leaves={leaves.filter(l => l.office === office.id && l.date === NEXT_DAY_ID)}
              onRemove={onRemove}
              headerColor="bg-slate-500"
              isAdmin={isAdmin}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// --- HISTORY VIEW ---
interface HistoryViewProps {
  leaves: Leave[];
  onRemove: (id: number) => void;
  onBack: () => void;
  isAdmin: boolean;
}

const HistoryView: React.FC<HistoryViewProps> = ({ leaves, onRemove, onBack, isAdmin }) => {
  const [filter, setFilter] = useState<'all' | 'this_week'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | keyof typeof LEAVE_TYPES>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [confirm, setConfirm] = useState<{ type: 'delete' | 'export'; leaveId?: number } | null>(null);

  const handleConfirm = () => {
    if (!confirm) return;
    if (confirm.type === 'delete' && confirm.leaveId !== undefined) {
      onRemove(confirm.leaveId);
    } else if (confirm.type === 'export') {
      exportToExcel(sortedLeaves, `Leave_History_${new Date().toISOString().split('T')[0]}`);
    }
    setConfirm(null);
  };

  const filteredLeaves = leaves.filter(l => {
    let dateMatch = true;
    if (filter === 'this_week') {
      const leaveDate = new Date(l.date);
      const today = new Date();
      // Calculate start of current week (Monday)
      const startOfWeek = new Date(today);
      const day = today.getDay(); // 0 is Sunday, 1 is Monday...
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0, 0, 0, 0);

      dateMatch = leaveDate >= startOfWeek;
    } else if (filter === 'all') {
      if (startDate) {
        dateMatch = dateMatch && l.date >= startDate;
      }
      if (endDate) {
        dateMatch = dateMatch && l.date <= endDate;
      }
    }

    const typeMatch = typeFilter === 'all' || l.type === typeFilter;
    const searchMatch = l.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.userId.toLowerCase().includes(searchQuery.toLowerCase());
    return dateMatch && typeMatch && searchMatch;
  });

  const sortedLeaves = [...filteredLeaves].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <PlusCircle size={24} className="rotate-45 text-slate-400" />
          </button>
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Day-Off History</h2>
            <p className="text-slate-500 dark:text-slate-400">Complete record of all Day-off marked.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {isAdmin && (
            <div className="inline-flex bg-slate-200 dark:bg-slate-800 p-1 rounded-full transition-colors duration-300">
              <button
                onClick={() => setConfirm({ type: 'export' })}
                className="px-4 md:px-6 py-2 rounded-full text-sm font-bold bg-[#faf9f6] dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-sm flex items-center gap-2 whitespace-nowrap"
              >
                <Download size={18} />
                Export to Excel
              </button>
            </div>
          )}

          <div className="inline-flex bg-slate-200 dark:bg-slate-800 p-1 rounded-full overflow-x-auto transition-colors duration-300">
            <button
              onClick={() => setFilter('this_week')}
              className={`px-4 md:px-6 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${filter === 'this_week' ? 'bg-[#faf9f6] dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              This Week
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 md:px-6 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${filter === 'all' ? 'bg-[#faf9f6] dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              All History
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-4 bg-[#faf9f6] dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all text-sm dark:text-white dark:placeholder-slate-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-400 dark:text-slate-500" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'all' | keyof typeof LEAVE_TYPES)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all dark:text-white"
            >
              <option value="all">All Leave Types</option>
              <option value="MEDICAL">Medical Leave</option>
              <option value="URGENT">Urgent Leave</option>
            </select>
          </div>
        </div>

        {filter === 'all' && (
          <div className="flex flex-col md:flex-row items-center gap-3 pt-3 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Search Period:</span>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1 md:w-40 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
              />
              <span className="text-slate-300 dark:text-slate-600">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex-1 md:w-40 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
              />
              {(startDate || endDate) && (
                <button
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  title="Clear Period"
                >
                  <PlusCircle size={18} className="rotate-45" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-[#faf9f6] dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors duration-300">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th
                  className="px-6 py-4 cursor-pointer hover:text-indigo-600 transition-colors"
                  onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                >
                  <div className="flex items-center gap-1">
                    Date
                    {sortOrder === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
                  </div>
                </th>
                <th className="px-6 py-4">Staff Name</th>
                <th className="px-6 py-4">Office</th>
                <th className="px-6 py-4">Leave Type</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {sortedLeaves.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-slate-400 dark:text-slate-500">
                    <div className="flex flex-col items-center">
                      <CheckCircle2 size={48} className="mb-2 opacity-20" />
                      <p className="text-sm font-medium">No records found for this period</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedLeaves.map(leave => (
                  <tr key={leave.id} className="hover:bg-indigo-50/40 dark:hover:bg-slate-800/50 transition-all group cursor-default">
                    <td className="px-6 py-4 whitespace-nowrap border-l-4 border-l-transparent group-hover:border-l-indigo-500 dark:group-hover:border-l-indigo-400 transition-all">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-200">
                        {new Date(leave.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold text-xs">
                          {leave.userName.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">{leave.userName}</div>
                          <div className="text-sm text-slate-400 dark:text-slate-500 font-mono">{leave.userId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold text-white ${OFFICES.find(o => o.id === leave.office)?.color || 'bg-slate-400'}`}>
                        {leave.office}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`flex items-center gap-1.5 text-sm font-bold ${LEAVE_TYPES[leave.type].text}`}>
                        {React.cloneElement(LEAVE_TYPES[leave.type].icon as React.ReactElement<{ size: number }>, { size: 14 })}
                        {LEAVE_TYPES[leave.type].label}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {isAdmin && (
                        <button
                          onClick={() => setConfirm({ type: 'delete', leaveId: leave.id })}
                          className="text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          title="Remove Record"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {confirm && (
        <ConfirmModal
          title={confirm.type === 'delete' ? 'Remove Record?' : 'Export History?'}
          message={
            confirm.type === 'delete'
              ? 'This will permanently remove this leave record from history. This action cannot be undone.'
              : 'This will export all currently filtered history records to an Excel file.'
          }
          icon={
            confirm.type === 'delete'
              ? <Trash2 className="text-red-500 w-6 h-6" />
              : <FileSpreadsheet className="text-indigo-500 w-6 h-6" />
          }
          confirmLabel={confirm.type === 'delete' ? 'Yes, Remove' : 'Yes, Export'}
          confirmClass={
            confirm.type === 'delete'
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-indigo-600 hover:bg-indigo-700'
          }
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

// --- CONFIRM MODAL ---
interface ConfirmModalProps {
  title: string;
  message: string;
  icon?: React.ReactNode;
  confirmLabel?: string;
  confirmClass?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({ title, message, icon, confirmLabel = 'Confirm', confirmClass = 'bg-indigo-600 hover:bg-indigo-700', onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm z-[60] p-4">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl space-y-5 w-full max-w-sm border border-slate-100 dark:border-slate-800 animate-in zoom-in duration-200">
        <div className="text-center space-y-3">
          {icon && <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800">{icon}</div>}
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-3 rounded-xl font-bold text-white transition-colors shadow-md ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface OfficeColumnProps {
  office: typeof OFFICES[0];
  leaves: Leave[];
  onRemove: (id: number) => void;
  headerColor?: string;
  onExport?: () => void;
  isAdmin: boolean;
}

const OfficeColumn: React.FC<OfficeColumnProps> = ({ office, leaves, onRemove, headerColor, onExport, isAdmin }) => {
  const [confirm, setConfirm] = useState<{ type: 'delete' | 'export'; leaveId?: number } | null>(null);

  const handleConfirm = () => {
    if (!confirm) return;
    if (confirm.type === 'delete' && confirm.leaveId !== undefined) {
      onRemove(confirm.leaveId);
    } else if (confirm.type === 'export' && onExport) {
      onExport();
    }
    setConfirm(null);
  };

  return (
    <div className="bg-[#faf9f6] dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col min-h-[400px] transition-colors duration-300">
      <div className={`${headerColor || office.color} p-5 rounded-t-3xl text-white`}>
        <div className="flex justify-between items-start mb-1">
          <div>
            <h3 className="text-xl font-bold">{office.name}</h3>
            {office.country && <p className="text-sm opacity-80 uppercase tracking-widest font-bold">{office.country}</p>}
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-base bg-white/20 px-2 py-1 rounded-full font-mono">{office.tz}</span>
          </div>
        </div>
        <div className="flex justify-between items-center mt-2">
          <div className="text-sm opacity-90 flex items-center gap-1">
            <Users size={14} /> {leaves.length} Away
          </div>
          {isAdmin && onExport && (
            <button
              onClick={() => setConfirm({ type: 'export' })}
              className="p-1.5 rounded-lg text-white hover:bg-white/20 transition-colors flex items-center gap-1 text-xs font-bold"
              title="Export to Excel"
            >
              <Download size={14} />
              <span>Export</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-4 flex-grow space-y-3">
        {leaves.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-20 text-slate-300">
            <CheckCircle2 size={48} className="mb-2 opacity-20" />
            <p className="text-sm font-medium">Fully Operational</p>
          </div>
        ) : (
          leaves.map(leave => (
            <div
              key={leave.id}
              className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl group transition-all hover:border-slate-300 dark:hover:border-slate-700"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${LEAVE_TYPES[leave.type].color} text-white`}>
                  {React.cloneElement(LEAVE_TYPES[leave.type].icon as React.ReactElement<{ size: number }>, { size: 16 })}
                </div>
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 leading-none mb-1">{leave.userName}</div>
                  <div className="text-sm text-slate-400 dark:text-slate-500 font-mono mb-1">{leave.userId}</div>
                  <div className={`text-sm font-bold ${LEAVE_TYPES[leave.type].text}`}>
                    {LEAVE_TYPES[leave.type].label}
                  </div>
                </div>
              </div>
              {isAdmin && (
                <button
                  onClick={() => setConfirm({ type: 'delete', leaveId: leave.id })}
                  className="text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  title="Clear status"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {confirm && (
        <ConfirmModal
          title={confirm.type === 'delete' ? 'Remove Record?' : 'Export to Excel?'}
          message={
            confirm.type === 'delete'
              ? 'This will permanently remove this leave record. This action cannot be undone.'
              : `This will export today's leave records for ${office.name} to an Excel file.`
          }
          icon={
            confirm.type === 'delete'
              ? <Trash2 className="text-red-500 w-6 h-6" />
              : <FileSpreadsheet className="text-indigo-500 w-6 h-6" />
          }
          confirmLabel={confirm.type === 'delete' ? 'Yes, Remove' : 'Yes, Export'}
          confirmClass={
            confirm.type === 'delete'
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-indigo-600 hover:bg-indigo-700'
          }
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
