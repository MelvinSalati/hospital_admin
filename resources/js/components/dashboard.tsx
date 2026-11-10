// components/dashboard/DepartmentDashboard.tsx

import { Head, usePage } from '@inertiajs/react';
import {
    Users,
    UserRound,
    UserRoundCheck,
    Clock,
    Activity,
    TrendingUp,
    Building2,
} from 'lucide-react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import PageHeader from '@/components/PageHeader';

// ─── Types ────────────────────────────────────────────────────

export interface DepartmentStats {
    department_name: string;
    seen_today: number;
    males: number;
    females: number;
    in_queue: number;
    average_wait_minutes?: number | null;
    completed_today?: number | null;
    color?: string;
}

export interface DepartmentTrendPoint {
    date: string;
    [departmentName: string]: number | string;
}

export interface CurrentUser {
    name: string;
    role?: string;
    departments: string[];
}

export interface DepartmentDashboardPageProps {
    departmentStats: DepartmentStats[];
    departmentTrend: DepartmentTrendPoint[];
    totals: {
        seen_today: number;
        males: number;
        females: number;
        in_queue: number;
    };
    trendRangeDays?: number;
    currentUser: CurrentUser;
    [key: string]: unknown;
}

// ─── Palette fallback ─────────────────────────────────────────

const PALETTE = [
    '#3b82f6',
    '#8b5cf6',
    '#ec4899',
    '#10b981',
    '#f59e0b',
    '#06b6d4',
    '#ef4444',
    '#84cc16',
];

// ─── Metric Tile ──────────────────────────────────────────────

function MetricTile({
    label,
    value,
    sublabel,
    icon,
    cardBg = 'bg-slate-50',
    borderColor = 'border-slate-200',
    accent = 'text-slate-700',
    iconBg = 'bg-white/70',
    iconColor = 'text-slate-600',
}: {
    label: string;
    value: string | number;
    sublabel?: string;
    icon: React.ReactNode;
    cardBg?: string;
    borderColor?: string;
    accent?: string;
    iconBg?: string;
    iconColor?: string;
}) {
    return (
        <div
            className={cn(
                'rounded-2xl shadow-md transition-shadow hover:shadow-md',
                cardBg,
                borderColor,
            )}
        >
            <CardContent className="flex items-center gap-4 p-4">
                <div
                    className={cn(
                        'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg',
                        iconBg,
                    )}
                >
                    <span className={iconColor}>{icon}</span>
                </div>
                <div className="min-w-0">
                    <p className="truncate text-xs font-medium tracking-wide text-slate-600 uppercase">
                        {label}
                    </p>
                    <p
                        className={cn(
                            'text-2xl font-bold tabular-nums',
                            accent,
                        )}
                    >
                        {value}
                    </p>
                    {sublabel && (
                        <p className="mt-0.5 text-[11px] text-slate-500">
                            {sublabel}
                        </p>
                    )}
                </div>
            </CardContent>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────

export default function DepartmentDashboard() {
    const {
        departmentStats = [],
        departmentTrend = [],
        totals = { seen_today: 0, males: 0, females: 0, in_queue: 0 },
        trendRangeDays = 7,
        currentUser = { name: '', departments: [] },
    } = usePage().props;
    console.log(usePage().props);
    const hasMultiple = (currentUser.departments?.length ?? 0) > 1;

    // ── Doughnuts ─────────────────────────────────────────────
    const genderData = [
        { name: 'Male', value: totals.males, fill: '#3b82f6' },
        { name: 'Female', value: totals.females, fill: '#ec4899' },
    ].filter((d) => d.value > 0);

    const queueData = [
        { name: 'In Queue', value: totals.in_queue, fill: '#f59e0b' },
        { name: 'Seen Today', value: totals.seen_today, fill: '#10b981' },
    ].filter((d) => d.value > 0);

    // ── Bars ──────────────────────────────────────────────────
    const departmentBarData = departmentStats.map((d, i) => ({
        name: d.department_name,
        Seen: d.seen_today,
        Queue: d.in_queue,
        fill: d.color || PALETTE[i % PALETTE.length],
    }));

    const genderBarData = departmentStats.map((d) => ({
        name: d.department_name,
        Males: d.males,
        Females: d.females,
    }));

    // ── Trend ─────────────────────────────────────────────────
    const trendData = departmentTrend.slice(-trendRangeDays);
    const departmentNames = departmentStats.map((d) => d.department_name);

    const scopeLabel = hasMultiple
        ? `${currentUser.departments.length} Departments`
        : (currentUser.departments[0] ?? 'My Department');

    const pageTitle = `${scopeLabel} Dashboard`;
    const pageDescription = `${currentUser.name}${
        currentUser.role ? ` · ${currentUser.role}` : ''
    } · last ${trendRangeDays} days`;

    return (
        <>
            <Head title={pageTitle} />

            <div className="flex h-full min-h-screen flex-1 flex-col gap-5 bg-blue-50 p-5 dark:bg-slate-900">
                {/* ── Header ──────────────────────────────────── */}
                <PageHeader
                    icon={<Building2 className="h-5 w-5 text-blue-600" />}
                    title={pageTitle}
                    subtitle={pageDescription}
                />

                {/* ── Metric Tiles ────────────────────────────── */}
                <section
                    aria-label="Summary metrics"
                    className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
                >
                    <MetricTile
                        label="Seen Today"
                        value={totals.seen_today.toLocaleString()}
                        icon={
                            <UserRoundCheck className="h-5 w-5 text-emerald-600" />
                        }
                        iconBg="bg-emerald-50"
                        accent="text-emerald-700"
                    />
                    <MetricTile
                        label="Currently in Queue"
                        value={totals.in_queue.toLocaleString()}
                        icon={<Clock className="h-5 w-5 text-amber-600" />}
                        iconBg="bg-amber-50"
                        accent="text-amber-700"
                    />
                    <MetricTile
                        label="Males Seen"
                        value={totals.males.toLocaleString()}
                        icon={<UserRound className="h-5 w-5 text-blue-600" />}
                        iconBg="bg-blue-50"
                        accent="text-blue-700"
                    />
                    <MetricTile
                        label="Females Seen"
                        value={totals.females.toLocaleString()}
                        icon={<UserRound className="h-5 w-5 text-pink-600" />}
                        iconBg="bg-pink-50"
                        accent="text-pink-700"
                    />
                </section>

                {/* ── Doughnuts ───────────────────────────────── */}
                <section
                    aria-label="Distribution"
                    className="grid grid-cols-1 gap-4 lg:grid-cols-2"
                >
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Users className="h-4 w-4 text-slate-500" />
                                Gender Distribution
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={genderData}
                                            dataKey="value"
                                            nameKey="name"
                                            innerRadius={60}
                                            outerRadius={95}
                                            paddingAngle={3}
                                            label={({ name, percent }) =>
                                                `${name} ${(percent * 100).toFixed(0)}%`
                                            }
                                        >
                                            {genderData.map((entry, i) => (
                                                <Cell
                                                    key={i}
                                                    fill={entry.fill}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Activity className="h-4 w-4 text-slate-500" />
                                Queue vs Seen
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={queueData}
                                            dataKey="value"
                                            nameKey="name"
                                            innerRadius={60}
                                            outerRadius={95}
                                            paddingAngle={3}
                                            label={({ name, percent }) =>
                                                `${name} ${(percent * 100).toFixed(0)}%`
                                            }
                                        >
                                            {queueData.map((entry, i) => (
                                                <Cell
                                                    key={i}
                                                    fill={entry.fill}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* ── Per-department bars (only when multi) ──── */}
                {hasMultiple && (
                    <section
                        aria-label="Per-department metrics"
                        className="grid grid-cols-1 gap-4 lg:grid-cols-2"
                    >
                        <Card className="border-slate-200 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">
                                    Seen vs Queue by Department
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-80 w-full">
                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >
                                        <BarChart
                                            data={departmentBarData}
                                            margin={{
                                                top: 8,
                                                right: 8,
                                                left: -12,
                                                bottom: 0,
                                            }}
                                        >
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                vertical={false}
                                                stroke="#e2e8f0"
                                            />
                                            <XAxis
                                                dataKey="name"
                                                tick={{ fontSize: 11 }}
                                                interval={0}
                                                angle={-15}
                                                textAnchor="end"
                                                height={55}
                                            />
                                            <YAxis tick={{ fontSize: 11 }} />
                                            <Tooltip
                                                contentStyle={{
                                                    borderRadius: 8,
                                                    fontSize: 12,
                                                }}
                                            />
                                            <Legend
                                                wrapperStyle={{ fontSize: 12 }}
                                            />
                                            <Bar
                                                dataKey="Seen"
                                                fill="#10b981"
                                                radius={[4, 4, 0, 0]}
                                            />
                                            <Bar
                                                dataKey="Queue"
                                                fill="#f59e0b"
                                                radius={[4, 4, 0, 0]}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-slate-200 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">
                                    Gender Split by Department
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-80 w-full">
                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >
                                        <BarChart
                                            data={genderBarData}
                                            margin={{
                                                top: 8,
                                                right: 8,
                                                left: -12,
                                                bottom: 0,
                                            }}
                                        >
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                vertical={false}
                                                stroke="#e2e8f0"
                                            />
                                            <XAxis
                                                dataKey="name"
                                                tick={{ fontSize: 11 }}
                                                interval={0}
                                                angle={-15}
                                                textAnchor="end"
                                                height={55}
                                            />
                                            <YAxis tick={{ fontSize: 11 }} />
                                            <Tooltip
                                                contentStyle={{
                                                    borderRadius: 8,
                                                    fontSize: 12,
                                                }}
                                            />
                                            <Legend
                                                wrapperStyle={{ fontSize: 12 }}
                                            />
                                            <Bar
                                                dataKey="Males"
                                                stackId="gender"
                                                fill="#3b82f6"
                                            />
                                            <Bar
                                                dataKey="Females"
                                                stackId="gender"
                                                fill="#ec4899"
                                                radius={[4, 4, 0, 0]}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </section>
                )}

                {/* ── Trend ───────────────────────────────────── */}
                <section aria-label="Trend">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <TrendingUp className="h-4 w-4 text-slate-500" />
                                Patient Volume · Last {trendRangeDays} Days
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-96 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={trendData}
                                        margin={{
                                            top: 8,
                                            right: 8,
                                            left: -12,
                                            bottom: 0,
                                        }}
                                    >
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            vertical={false}
                                            stroke="#e2e8f0"
                                        />
                                        <XAxis
                                            dataKey="date"
                                            tick={{ fontSize: 11 }}
                                        />
                                        <YAxis tick={{ fontSize: 11 }} />
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: 8,
                                                fontSize: 12,
                                            }}
                                        />
                                        <Legend
                                            wrapperStyle={{ fontSize: 12 }}
                                        />
                                        {departmentNames.map((name, i) => (
                                            <Bar
                                                key={name}
                                                dataKey={name}
                                                stackId="dept"
                                                fill={
                                                    departmentStats[i]?.color ||
                                                    PALETTE[i % PALETTE.length]
                                                }
                                                radius={
                                                    i ===
                                                    departmentNames.length - 1
                                                        ? [4, 4, 0, 0]
                                                        : [0, 0, 0, 0]
                                                }
                                            />
                                        ))}
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* ── Table ───────────────────────────────────── */}
                <section aria-label="Department breakdown">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">
                                {hasMultiple
                                    ? 'Department Breakdown'
                                    : `${currentUser.departments[0] ?? ''} · Today's Snapshot`}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Department</TableHead>
                                            <TableHead className="text-right">
                                                Seen
                                            </TableHead>
                                            <TableHead className="text-right">
                                                In Queue
                                            </TableHead>
                                            <TableHead className="text-right">
                                                Males
                                            </TableHead>
                                            <TableHead className="text-right">
                                                Females
                                            </TableHead>
                                            <TableHead className="text-right">
                                                Avg Wait
                                            </TableHead>
                                            <TableHead className="text-right">
                                                Completed
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {departmentStats.map((d, i) => (
                                            <TableRow key={d.department_name}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                                                            style={{
                                                                backgroundColor:
                                                                    d.color ||
                                                                    PALETTE[
                                                                        i %
                                                                            PALETTE.length
                                                                    ],
                                                            }}
                                                        />
                                                        <span className="font-medium">
                                                            {d.department_name}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    {d.seen_today}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    <Badge
                                                        variant={
                                                            d.in_queue > 5
                                                                ? 'destructive'
                                                                : d.in_queue > 0
                                                                  ? 'secondary'
                                                                  : 'outline'
                                                        }
                                                        className="text-[10px]"
                                                    >
                                                        {d.in_queue}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right text-blue-600 tabular-nums">
                                                    {d.males}
                                                </TableCell>
                                                <TableCell className="text-right text-pink-600 tabular-nums">
                                                    {d.females}
                                                </TableCell>
                                                <TableCell className="text-right text-slate-500 tabular-nums">
                                                    {d.average_wait_minutes !=
                                                    null
                                                        ? `${d.average_wait_minutes}m`
                                                        : '—'}
                                                </TableCell>
                                                <TableCell className="text-right text-emerald-600 tabular-nums">
                                                    {d.completed_today ?? '—'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </section>
            </div>
        </>
    );
}
