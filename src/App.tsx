import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { 
  Users, 
  PlusCircle, 
  CheckCircle2, 
  AlertCircle, 
  Stethoscope, 
  LayoutDashboard,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Filter,
  Download,
  History
} from 'lucide-react';

// --- CONFIGURATION ---
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

const TODAY_ID = TODAY_DATE.toISOString().split('T')[0];
const NEXT_DAY_ID = NEXT_DAY_DATE.toISOString().split('T')[0];

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

// --- MAIN APP ---
export default function App() {
  const [view, setView] = useState('submit'); // 'dashboard', 'submit', or 'history'
  const [leaves, setLeaves] = useState<Leave[]>([
    { id: 1, userId: 'SC-001', userName: 'Sarah Chen', office: 'HQ', type: 'MEDICAL', date: TODAY_ID },
    { id: 2, userId: 'AK-042', userName: 'Ali Khan', office: 'HQ', type: 'URGENT', date: TODAY_ID },
    { id: 3, userId: 'FA-019', userName: 'Fatima Ahmed', office: 'HQ', type: 'MEDICAL', date: NEXT_DAY_ID }
  ]);

  // Submitter State
  const [userOffice, setUserOffice] = useState('HQ');
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const addLeave = (type: keyof typeof LEAVE_TYPES, date: string) => {
    const formattedId = formatUserId(userId);
    if (!isValidUserId(formattedId) || !userName.trim()) return;
    
    const newLeave = {
      id: Date.now(),
      userId: formattedId,
      userName: toTitleCase(userName),
      office: userOffice,
      type: type,
      date: date
    };
    setLeaves([...leaves, newLeave]);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setUserId('');
      setUserName('');
      setView('dashboard');
    }, 1500);
  };

  const removeLeave = (id: number) => {
    setLeaves(leaves.filter(l => l.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <LayoutDashboard className="text-white w-5 h-5" />
          </div>
          <h1 className="font-bold text-lg tracking-tight">MDO</h1>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setView('dashboard')}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${view === 'dashboard' ? 'bg-slate-100 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
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
        {view === 'dashboard' ? (
          <Dashboard leaves={leaves} onRemove={removeLeave} onGoToHistory={() => setView('history')} />
        ) : view === 'history' ? (
          <HistoryView leaves={leaves} onRemove={removeLeave} onBack={() => setView('dashboard')} />
        ) : (
          <SubmitterInterface 
            userId={userId}
            setUserId={setUserId}
            userName={userName}
            setUserName={setUserName}
            onAdd={addLeave}
            showSuccess={showSuccess}
          />
        )}
      </main>

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
}

function SubmitterInterface({ userId, setUserId, userName, setUserName, onAdd, showSuccess }: SubmitterProps) {
  return (
    <div className="max-w-md mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center">
        <h2 className="text-3xl font-extrabold tracking-tight mb-2 text-indigo-600">Mark Your Day-Off</h2>
        <p className="text-slate-500">Mark your medical or urgent leave for today or the next work day.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Your ID</label>
          <input 
            type="text" 
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="e.g. AB-123"
            maxLength={6}
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all uppercase"
          />
          <p className="mt-1 text-[10px] text-slate-400 font-medium">Format: 2 Letters - 3 Numbers (e.g. AB-123)</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Your Name</label>
          <input 
            type="text" 
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="e.g. Sarah Chen"
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
          />
        </div>

        <div className="space-y-4 pt-2">
          <p className="text-sm font-semibold text-slate-700">Your Leave Type:</p>
          
          <div className="grid grid-cols-1 gap-4">
            {/* Medical Option */}
            <div className="group space-y-2">
              <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
                <Stethoscope size={18} /> Medical / Sick Leave
              </div>
              <div className="flex gap-2">
                <button 
                  disabled={!isValidUserId(formatUserId(userId)) || !userName}
                  onClick={() => onAdd('MEDICAL', TODAY_ID)}
                  className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold shadow-md shadow-red-200 hover:bg-red-600 active:scale-95 transition-all disabled:opacity-50 flex flex-col items-center justify-center gap-0.5"
                >
                  <span>Today</span>
                  <span className="text-xs font-medium opacity-90">{TODAY_SHORT_LABEL}</span>
                </button>
                <button 
                  disabled={!isValidUserId(formatUserId(userId)) || !userName}
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
                  disabled={!isValidUserId(formatUserId(userId)) || !userName}
                  onClick={() => onAdd('URGENT', TODAY_ID)}
                  className="flex-1 bg-amber-500 text-white py-3 rounded-xl font-bold shadow-md shadow-amber-200 hover:bg-amber-600 active:scale-95 transition-all disabled:opacity-50 flex flex-col items-center justify-center gap-0.5"
                >
                  <span>Today</span>
                  <span className="text-xs font-medium opacity-90">{TODAY_SHORT_LABEL}</span>
                </button>
                <button 
                  disabled={!isValidUserId(formatUserId(userId)) || !userName}
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
        <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
          <div className="bg-indigo-500 text-white p-8 rounded-3xl shadow-2xl text-center space-y-4 animate-in zoom-in duration-300">
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
}

const Dashboard: React.FC<DashboardProps> = ({ leaves, onRemove, onGoToHistory }) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Day-Off Dashboard</h2>
          <p className="text-slate-500">Track and manage team availability across offices.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={onGoToHistory}
            className="px-4 py-2 rounded-full text-sm font-bold bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm flex items-center gap-2"
          >
            <History size={16} />
            View History
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Today Column */}
        <div className="space-y-4 bg-indigo-50/50 p-4 rounded-[2.5rem] border border-indigo-100/50">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2 uppercase">
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
              Today
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-indigo-400 uppercase tracking-wider">{TODAY_LABEL}</span>
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
            />
          ))}
        </div>

        {/* Next Day Column */}
        <div className="space-y-4 bg-slate-50/50 p-4 rounded-[2.5rem] border border-slate-200/50">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 uppercase">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              Next Day
            </h3>
            <span className="text-lg font-bold text-slate-400 uppercase tracking-wider">{NEXT_DAY_LABEL}</span>
          </div>
          {OFFICES.map(office => (
            <OfficeColumn 
              key={`${office.id}-next`} 
              office={office} 
              leaves={leaves.filter(l => l.office === office.id && l.date === NEXT_DAY_ID)} 
              onRemove={onRemove}
              headerColor="bg-slate-500"
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
}

const HistoryView: React.FC<HistoryViewProps> = ({ leaves, onRemove, onBack }) => {
  const [filter, setFilter] = useState<'all' | 'this_week'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | keyof typeof LEAVE_TYPES>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Day-Off History</h2>
            <p className="text-slate-500">Complete record of all Day-off marked.</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="inline-flex bg-slate-200 p-1 rounded-full">
            <button 
              onClick={() => exportToExcel(sortedLeaves, `Leave_History_${new Date().toISOString().split('T')[0]}`)}
              className="px-4 md:px-6 py-2 rounded-full text-sm font-bold bg-white text-slate-700 hover:text-indigo-600 transition-all shadow-sm flex items-center gap-2 whitespace-nowrap"
            >
              <Download size={18} />
              Export to Excel
            </button>
          </div>
          
          <div className="inline-flex bg-slate-200 p-1 rounded-full overflow-x-auto">
          <button 
            onClick={() => setFilter('this_week')}
            className={`px-4 md:px-6 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${filter === 'this_week' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'}`}
          >
            This Week
          </button>
          <button 
            onClick={() => setFilter('all')}
            className={`px-4 md:px-6 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${filter === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'}`}
          >
            All History
          </button>
        </div>
      </div>
    </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-400" />
            <select 
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
            >
              <option value="all">All Leave Types</option>
              <option value="MEDICAL">Medical Leave</option>
              <option value="URGENT">Urgent Leave</option>
            </select>
          </div>
        </div>

        {filter === 'all' && (
          <div className="flex flex-col md:flex-row items-center gap-3 pt-3 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Search Period:</span>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1 md:w-40 p-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <span className="text-slate-300">to</span>
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex-1 md:w-40 p-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
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
            <tbody className="divide-y divide-slate-100">
              {sortedLeaves.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-slate-400">
                    <div className="flex flex-col items-center">
                      <CheckCircle2 size={48} className="mb-2 opacity-20" />
                      <p className="text-sm font-medium">No records found for this period</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedLeaves.map(leave => (
                  <tr key={leave.id} className="hover:bg-indigo-50/40 transition-all group cursor-default">
                    <td className="px-6 py-4 whitespace-nowrap border-l-4 border-l-transparent group-hover:border-l-indigo-500 transition-all">
                      <div className="text-sm font-medium text-slate-900">
                        {new Date(leave.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                          {leave.userName.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">{leave.userName}</div>
                          <div className="text-sm text-slate-400 font-mono">{leave.userId}</div>
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
                        {React.cloneElement(LEAVE_TYPES[leave.type].icon, { size: 14 } as any)}
                        {LEAVE_TYPES[leave.type].label}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button 
                        onClick={() => onRemove(leave.id)}
                        className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="Remove Record"
                      >
                        <PlusCircle size={18} className="rotate-45" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
}

const OfficeColumn: React.FC<OfficeColumnProps> = ({ office, leaves, onRemove, headerColor, onExport }) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col min-h-[400px]">
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
          {onExport && (
            <button 
              onClick={onExport}
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
              className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl group transition-all hover:border-slate-300"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${LEAVE_TYPES[leave.type].color} text-white`}>
                  {React.cloneElement(LEAVE_TYPES[leave.type].icon, { size: 16 } as any)}
                </div>
                <div>
                  <div className="font-bold text-slate-800 leading-none mb-1">{leave.userName}</div>
                  <div className="text-sm text-slate-400 font-mono mb-1">{leave.userId}</div>
                  <div className={`text-sm font-bold ${LEAVE_TYPES[leave.type].text}`}>
                    {LEAVE_TYPES[leave.type].label}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => onRemove(leave.id)}
                className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                title="Clear status"
              >
                <PlusCircle size={20} className="rotate-45" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
