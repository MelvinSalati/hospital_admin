import React, { useState, useEffect } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import {
  Activity, ArrowUpRight, ArrowDownRight, RefreshCw,
  User, FlaskConical, DollarSign, Bed, Timer, Pill,
  Clock, Eye, Filter, Search, ChevronRight,
  Stethoscope, TrendingUp, AlertTriangle, CheckCircle2,
  CalendarClock, MoreHorizontal, Zap, Users,
  Calendar, FileText, Beaker, Camera, ClipboardList,
  Package, BarChart3, UserPlus
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  LineChart, Line, BarChart, Bar, PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import AppLayout from '@/layouts/app-layout';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Appointment {
  id: number;
  patient_name: string;
  patient_id: number;
  time: string;
  status: 'waiting' | 'in-progress' | 'completed' | 'cancelled' | 'scheduled';
  type: string;
  priority: 'normal' | 'urgent' | 'emergency';
}

interface Prescription { drug_name: string; count: number; percentage: number; }
interface Diagnosis { disease: string; count: number; percentage: number; }
interface DashboardStats {
  today_appointments: number;
  completed_consultations: number;
  pending_appointments: number;
  total_patients_today: number;
  average_consultation_time: number;
  satisfaction_rate: number;
  myAppointments?: number;
  pendingConsultations?: number;
  myPatients?: number;
  pendingLabReviews?: number;
}
interface RecentPatient { id: number; name: string; age: number; diagnosis: string; time: string; status: string; }

// ─── Mock data ────────────────────────────────────────────────────────────────

const mockStats: DashboardStats = {
  today_appointments: 12,
  completed_consultations: 8,
  pending_appointments: 4,
  total_patients_today: 8,
  average_consultation_time: 15,
  satisfaction_rate: 94,
  myAppointments: 8,
  pendingConsultations: 3,
  myPatients: 124,
  pendingLabReviews: 5,
};

const mockAppointments: Appointment[] = [
  { id: 1, patient_name: 'John Doe', patient_id: 1001, time: '09:00 AM', status: 'completed', type: 'Follow-up', priority: 'normal' },
  { id: 2, patient_name: 'Jane Smith', patient_id: 1002, time: '10:00 AM', status: 'in-progress', type: 'Consultation', priority: 'urgent' },
  { id: 3, patient_name: 'Bob Johnson', patient_id: 1003, time: '11:00 AM', status: 'waiting', type: 'Check-up', priority: 'normal' },
  { id: 4, patient_name: 'Alice Brown', patient_id: 1004, time: '01:00 PM', status: 'waiting', type: 'Follow-up', priority: 'emergency' },
  { id: 5, patient_name: 'Charlie Wilson', patient_id: 1005, time: '02:00 PM', status: 'scheduled', type: 'Consultation', priority: 'normal' },
];

const mockPrescriptions: Prescription[] = [
  { drug_name: 'Amoxicillin', count: 45, percentage: 28 },
  { drug_name: 'Paracetamol', count: 38, percentage: 24 },
  { drug_name: 'Lisinopril', count: 25, percentage: 16 },
  { drug_name: 'Metformin', count: 22, percentage: 14 },
  { drug_name: 'Atorvastatin', count: 18, percentage: 11 },
  { drug_name: 'Others', count: 12, percentage: 7 },
];

const mockDiagnoses: Diagnosis[] = [
  { disease: 'Hypertension', count: 32, percentage: 26 },
  { disease: 'Type 2 Diabetes', count: 28, percentage: 23 },
  { disease: 'Upper Resp. Infection', count: 24, percentage: 20 },
  { disease: 'Anxiety Disorder', count: 18, percentage: 15 },
  { disease: 'Asthma', count: 12, percentage: 10 },
  { disease: 'Others', count: 8, percentage: 6 },
];

const mockRecentPatients: RecentPatient[] = [
  { id: 1001, name: 'John Doe', age: 45, diagnosis: 'Hypertension', time: '09:30 AM', status: 'Completed' },
  { id: 1002, name: 'Jane Smith', age: 32, diagnosis: 'Type 2 Diabetes', time: '10:15 AM', status: 'In Progress' },
  { id: 1003, name: 'Bob Johnson', age: 28, diagnosis: 'Upper Respiratory Infection', time: '11:00 AM', status: 'Waiting' },
  { id: 1004, name: 'Alice Brown', age: 52, diagnosis: 'Hypertension', time: '01:30 PM', status: 'Scheduled' },
];

const weeklyData = [
  { day: 'Mon', consultations: 12, prescriptions: 8 },
  { day: 'Tue', consultations: 15, prescriptions: 11 },
  { day: 'Wed', consultations: 10, prescriptions: 7 },
  { day: 'Thu', consultations: 18, prescriptions: 14 },
  { day: 'Fri', consultations: 14, prescriptions: 10 },
  { day: 'Sat', consultations: 8, prescriptions: 5 },
  { day: 'Sun', consultations: 4, prescriptions: 3 },
];

const monthlyData = [
  { month: 'Jan', consultations: 65, prescriptions: 48 },
  { month: 'Feb', consultations: 72, prescriptions: 55 },
  { month: 'Mar', consultations: 85, prescriptions: 68 },
  { month: 'Apr', consultations: 78, prescriptions: 62 },
  { month: 'May', consultations: 92, prescriptions: 75 },
  { month: 'Jun', consultations: 88, prescriptions: 70 },
];

const CHART_COLORS = ['#38bdf8', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#fb923c'];

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Animated counter that ticks up on mount */
function AnimatedValue({ value }: { value: string | number }) {
  const isNumber = typeof value === 'number';
  const [display, setDisplay] = useState(isNumber ? 0 : value);

  useEffect(() => {
    if (!isNumber) return;
    let start = 0;
    const end = value as number;
    if (end === 0) return;
    const step = Math.ceil(end / 30);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setDisplay(end); clearInterval(timer); }
      else setDisplay(start);
    }, 30);
    return () => clearInterval(timer);
  }, [value, isNumber]);

  return <>{display}</>;
}

/** Coloured dot + label status pill */
const StatusPill = ({ status }: { status: string }) => {
  const map: Record<string, { dot: string; bg: string; text: string; label: string }> = {
    completed: { dot: 'bg-emerald-400', bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Completed' },
    'in-progress': { dot: 'bg-sky-400', bg: 'bg-sky-500/10', text: 'text-sky-400', label: 'In Progress' },
    waiting: { dot: 'bg-amber-400', bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Waiting' },
    cancelled: { dot: 'bg-rose-400', bg: 'bg-rose-500/10', text: 'text-rose-400', label: 'Cancelled' },
    scheduled: { dot: 'bg-violet-400', bg: 'bg-violet-500/10', text: 'text-violet-400', label: 'Scheduled' },
    'Completed': { dot: 'bg-emerald-400', bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Completed' },
    'In Progress': { dot: 'bg-sky-400', bg: 'bg-sky-500/10', text: 'text-sky-400', label: 'In Progress' },
    'Waiting': { dot: 'bg-amber-400', bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Waiting' },
    'Scheduled': { dot: 'bg-violet-400', bg: 'bg-violet-500/10', text: 'text-violet-400', label: 'Scheduled' },
  };
  const s = map[status] ?? { dot: 'bg-slate-400', bg: 'bg-slate-500/10', text: 'text-slate-400', label: status };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.bg} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
};

/** Priority badge */
const PriorityBadge = ({ priority }: { priority: string }) => {
  if (priority === 'normal') return null;
  const styles: Record<string, string> = {
    emergency: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
    urgent: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${styles[priority]}`}>
      {priority === 'emergency' && <AlertTriangle className="h-2.5 w-2.5" />}
      {priority}
    </span>
  );
};

// Custom tooltip for Recharts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-xl">
      <p className="mb-1 text-xs font-semibold text-gray-700">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-xs" style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function DoctorDashboard() {
  const { props } = usePage<{ auth: { user: { name: string; roles?: string[] } } }>();
  const [stats] = useState<DashboardStats>(mockStats);
  const [appointments] = useState<Appointment[]>(mockAppointments);
  const [prescriptions] = useState<Prescription[]>(mockPrescriptions);
  const [diagnoses] = useState<Diagnosis[]>(mockDiagnoses);
  const [recentPatients] = useState<RecentPatient[]>(mockRecentPatients);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1000);
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 300000);
    return () => clearInterval(interval);
  }, []);

  const timeGreeting = () => {
    const h = currentTime.getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <AppLayout breadcrumbs={[{ title: 'Doctor', href: '#' }, { title: 'Dashboard', href: '#' }]}>
      <Head title="Doctor Dashboard" />

      <div className="bg-white min-h-screen p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-gray-500 uppercase tracking-widest">
                {currentTime.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 leading-tight">
              {timeGreeting()}, Dr.{' '}
              <span className="text-blue-600">{props.auth?.user?.name ?? 'Smith'}</span>
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {stats.completed_consultations} of {stats.today_appointments} consultations done · {stats.satisfaction_rate}% satisfaction
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={fetchDashboardData}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 text-sm text-white hover:text-gray-900 rounded-lg transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
 {/* Custom Tabs */}
        <div>
          <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
            {['overview', 'appointments', 'patients'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === tab 
                    ? 'text-blue-600 border-blue-600' 
                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'overview' ? 'Overview' : tab === 'appointments' ? 'Appointments' : 'Recent Patients'}
              </button>
            ))}
          </div>

          {/* Overview Tab Content */}
          <div className={activeTab === 'overview' ? 'block' : 'hidden'}>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Most Prescribed Drugs */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Pill className="h-4 w-4 text-pink-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Top Prescribed Drugs</h3>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">This month's medication distribution</p>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={prescriptions} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="drug_name" tick={{ fontSize: 10, fill: '#6b7280' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {prescriptions.map((_, index) => (
                          <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} fillOpacity={0.85} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Most Diagnosed Diseases */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Diagnosis Breakdown</h3>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">Top conditions this month</p>
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="55%" height={220}>
                      <RePieChart>
                        <Pie
                          data={diagnoses}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          dataKey="count"
                          paddingAngle={3}
                        >
                          {diagnoses.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={0} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </RePieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2">
                      {diagnoses.map((d, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="text-xs text-gray-600 truncate flex-1">{d.disease}</span>
                          <span className="text-xs text-gray-500">{d.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Consultation Trends */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-violet-600" />
                      <h3 className="text-sm font-semibold text-gray-900">Consultation Trends</h3>
                    </div>
                    <p className="text-xs text-gray-500">Consultations & prescriptions over time</p>
                  </div>
                  <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                    {(['week', 'month'] as const).map(p => (
                      <button
                        key={p}
                        onClick={() => setSelectedPeriod(p)}
                        className={`px-3 py-1 text-xs rounded-md transition-colors ${
                          selectedPeriod === p 
                            ? 'bg-white text-gray-900 shadow-sm' 
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {p === 'week' ? 'Weekly' : 'Monthly'}
                      </button>
                    ))}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={selectedPeriod === 'week' ? weeklyData : monthlyData}>
                    <defs>
                      <linearGradient id="gradConsult" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradRx" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey={selectedPeriod === 'week' ? 'day' : 'month'} tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#6b7280' }} />
                    <Area type="monotone" dataKey="consultations" stroke="#3b82f6" strokeWidth={2} fill="url(#gradConsult)" name="Consultations" />
                    <Area type="monotone" dataKey="prescriptions" stroke="#10b981" strokeWidth={2} fill="url(#gradRx)" name="Prescriptions" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Appointments Tab Content */}
          <div className={activeTab === 'appointments' ? 'block' : 'hidden'}>
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b border-gray-200">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CalendarClock className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Today's Appointments</h3>
                  </div>
                  <p className="text-xs text-gray-500">{appointments.length} appointments scheduled</p>
                </div>
                <div className="flex gap-2">
                  {[{ icon: Filter, label: 'Filter' }, { icon: Search, label: 'Search' }].map(({ icon: Icon, label }) => (
                    <button key={label} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 bg-gray-100 rounded-lg transition-colors">
                      <Icon className="h-3 w-3" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      {['Patient', 'Time', 'Type', 'Priority', 'Status', ''].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map(appt => (
                      <tr key={appt.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-100 to-violet-100 flex items-center justify-center text-xs font-semibold text-gray-700">
                              {appt.patient_name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm text-gray-900 font-medium">{appt.patient_name}</p>
                              <p className="text-xs text-gray-500">#{appt.patient_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm text-gray-700">{appt.time}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm text-gray-600">{appt.type}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <PriorityBadge priority={appt.priority} />
                          {appt.priority === 'normal' && <span className="text-xs text-gray-400">—</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusPill status={appt.status} />
                        </td>
                        <td className="px-5 py-3.5">
                          <Link href={`/consultations/${appt.id}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-colors">
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Patients Tab Content */}
          <div className={activeTab === 'patients' ? 'block' : 'hidden'}>
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 p-5 border-b border-gray-200">
                <User className="h-4 w-4 text-violet-600" />
                <h3 className="text-sm font-semibold text-gray-900">Recent Patients</h3>
                <span className="ml-auto text-xs text-gray-500">{recentPatients.length} records</span>
              </div>
              <div className="overflow-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      {['Patient', 'Age', 'Diagnosis', 'Time', 'Status', 'Action'].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentPatients.map(p => (
                      <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center text-xs font-semibold text-gray-700">
                              {p.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm text-gray-900 font-medium">{p.name}</p>
                              <p className="text-xs text-gray-500">#{p.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm text-gray-700">{p.age}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm text-gray-600">{p.diagnosis}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm text-gray-700">{p.time}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusPill status={p.status} />
                        </td>
                        <td className="px-5 py-3.5">
                          <Link href={`/patients/${p.id}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-violet-600 transition-colors">
                            View Details
                            <ChevronRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}