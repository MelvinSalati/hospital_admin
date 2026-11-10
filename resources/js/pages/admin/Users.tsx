import {
    AlertTriangle,
    Bell,
    Info,
    Loader2,
    ScrollText,
    Send,
    ShieldOff,
    UsersIcon,
    Zap,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'react-hot-toast';
import Container from '@/components/container';
import PageHeader from '@/components/PageHeader';
import ReusableTable from '@/components/ReusableTable';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import AppLayout from '@/layouts/app-layout';
import Http from '@/utils/Http';

// ============================================
// TYPES
// ============================================

interface SystemUser {
    id: number;
    name: string;
    email: string;
    serial_number?: string | number;
    mobile_phone_number?: string;
    department_name?: string;
    // Backend may send an array, a JSON string, a plain string, or null
    roles?: unknown;
    read?: boolean;
}

interface AuditLog {
    id: number;
    action: string;
    description?: string;
    ip_address?: string;
    created_at: string;
}

// ============================================
// HELPERS
// ============================================

const getErrorMessage = (error: unknown, fallback: string) => {
    const e = error as { response?: { data?: { message?: string } } };
    return e?.response?.data?.message ?? fallback;
};

const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
        ? '—'
        : d.toLocaleString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
          });
};

const formatRelative = (iso: string) => {
    const time = new Date(iso).getTime();
    if (Number.isNaN(time)) return '—';
    const minutes = Math.max(0, Math.floor((Date.now() - time) / 60_000));
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return formatDateTime(iso);
};

/**
 * Always returns string[] no matter what the backend sends:
 *  ['nurse', 'admin']            -> ['nurse', 'admin']
 *  [{ name: 'nurse' }]           -> ['nurse']
 *  '["nurse","admin"]' (JSON)    -> ['nurse', 'admin']
 *  'nurse, admin'                -> ['nurse', 'admin']
 *  { 0: 'nurse' }                -> ['nurse']
 *  null / undefined              -> []
 */
const normalizeRoles = (roles: unknown): string[] => {
    if (roles === null || roles === undefined || roles === '') return [];

    if (typeof roles === 'string') {
        const text = roles.trim();
        if (text.startsWith('[') || text.startsWith('{')) {
            try {
                return normalizeRoles(JSON.parse(text));
            } catch {
                // not valid JSON, fall through to comma split
            }
        }
        return text
            .split(',')
            .map((r) => r.replace(/^[\s'"\[]+|[\s'"\]]+$/g, ''))
            .filter(Boolean);
    }

    const list: unknown[] = Array.isArray(roles)
        ? roles
        : typeof roles === 'object'
          ? Object.values(roles as Record<string, unknown>)
          : [];

    return list
        .map((r) =>
            typeof r === 'string'
                ? r.trim()
                : ((r as { name?: string })?.name ?? ''),
        )
        .filter(Boolean);
};

const capitalize = (s: string) =>
    s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

const getInitials = (name: string) =>
    (name ?? '')
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || '?';

// ============================================
// ROLE BADGE — mature tinted palette
// ============================================

const ROLE_STYLES = [
    {
        bg: 'bg-sky-50',
        text: 'text-sky-800',
        ring: 'ring-sky-200',
        dot: 'bg-sky-600',
        darkBg: 'dark:bg-sky-950/40',
        darkText: 'dark:text-sky-300',
        darkRing: 'dark:ring-sky-800',
    },
    {
        bg: 'bg-teal-50',
        text: 'text-teal-800',
        ring: 'ring-teal-200',
        dot: 'bg-teal-600',
        darkBg: 'dark:bg-teal-950/40',
        darkText: 'dark:text-teal-300',
        darkRing: 'dark:ring-teal-800',
    },
    {
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        ring: 'ring-amber-200',
        dot: 'bg-amber-600',
        darkBg: 'dark:bg-amber-950/40',
        darkText: 'dark:text-amber-300',
        darkRing: 'dark:ring-amber-800',
    },
    {
        bg: 'bg-indigo-50',
        text: 'text-indigo-800',
        ring: 'ring-indigo-200',
        dot: 'bg-indigo-500',
        darkBg: 'dark:bg-indigo-950/40',
        darkText: 'dark:text-indigo-300',
        darkRing: 'dark:ring-indigo-800',
    },
    {
        bg: 'bg-emerald-50',
        text: 'text-emerald-800',
        ring: 'ring-emerald-200',
        dot: 'bg-emerald-600',
        darkBg: 'dark:bg-emerald-950/40',
        darkText: 'dark:text-emerald-300',
        darkRing: 'dark:ring-emerald-800',
    },
    {
        bg: 'bg-cyan-50',
        text: 'text-cyan-800',
        ring: 'ring-cyan-200',
        dot: 'bg-cyan-600',
        darkBg: 'dark:bg-cyan-950/40',
        darkText: 'dark:text-cyan-300',
        darkRing: 'dark:ring-cyan-800',
    },
    {
        bg: 'bg-orange-50',
        text: 'text-orange-800',
        ring: 'ring-orange-200',
        dot: 'bg-orange-600',
        darkBg: 'dark:bg-orange-950/40',
        darkText: 'dark:text-orange-300',
        darkRing: 'dark:ring-orange-800',
    },
    {
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        ring: 'ring-slate-200',
        dot: 'bg-slate-500',
        darkBg: 'dark:bg-slate-800',
        darkText: 'dark:text-slate-300',
        darkRing: 'dark:ring-slate-700',
    },
] as const;

// Same role name always maps to the same style
const getRoleStyle = (role: string) => {
    let hash = 0;
    for (const ch of role.toLowerCase()) {
        hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    }
    return ROLE_STYLES[hash % ROLE_STYLES.length];
};

function RoleBadge({ role, muted }: { role: string; muted?: boolean }) {
    const s = getRoleStyle(role);
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${s.bg} ${s.text} ${s.ring} ${s.darkBg} ${s.darkText} ${s.darkRing} ${
                muted ? 'line-through decoration-slate-400 opacity-70' : ''
            }`}
        >
            <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
            {capitalize(role)}
        </span>
    );
}

// Audit entries get a small muted dot depending on the kind of action
const getAuditDot = (action: string) => {
    const a = (action ?? '').toLowerCase();
    if (/(delete|remove|revoke|deactivat|fail|denied)/.test(a))
        return 'bg-red-700';
    if (/(create|add|register|grant|assign)/.test(a)) return 'bg-emerald-700';
    if (/(update|edit|change|modif|reset)/.test(a)) return 'bg-amber-600';
    if (/(login|logout|sign|auth|session)/.test(a)) return 'bg-sky-600';
    return 'bg-slate-400';
};

const sectionLabel =
    'text-xs font-medium tracking-wider text-slate-500 uppercase';

// ============================================
// ROW ACTION BUTTON — mature tinted tones
// ============================================

type ActionTone = 'default' | 'info' | 'warning' | 'danger';

const ACTION_TONES: Record<ActionTone, string> = {
    default:
        'text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:hover:text-slate-100',
    info: 'text-sky-700 bg-sky-50 hover:bg-sky-100 hover:text-sky-900 dark:text-sky-300 dark:bg-sky-950/50 dark:hover:bg-sky-900/60 dark:hover:text-sky-200',
    warning:
        'text-amber-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-900 dark:text-amber-300 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 dark:hover:text-amber-200',
    danger: 'text-red-700 bg-red-50 hover:bg-red-100 hover:text-red-900 dark:text-red-400 dark:bg-red-950/50 dark:hover:bg-red-900/60 dark:hover:text-red-300',
};

function ActionButton({
    label,
    onClick,
    children,
    tone = 'default',
}: {
    label: string;
    onClick: () => void;
    children: ReactNode;
    tone?: ActionTone;
}) {
    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            title={label}
            aria-label={label}
            onClick={onClick}
            className={`h-8 w-8 rounded-md transition-colors ${ACTION_TONES[tone]}`}
        >
            {children}
        </Button>
    );
}

// ============================================
// DRAWER SHELL (shared by all three drawers)
// ============================================

type DrawerAccent = 'slate' | 'teal' | 'red';

const DRAWER_ACCENTS: Record<DrawerAccent, string> = {
    slate: 'border-t-slate-700',
    teal: 'border-t-teal-700',
    red: 'border-t-red-800',
};

function DrawerShell({
    open,
    onClose,
    locked,
    accent,
    icon,
    title,
    description,
    children,
    footer,
}: {
    open: boolean;
    onClose: () => void;
    locked?: boolean;
    accent: DrawerAccent;
    icon: ReactNode;
    title: string;
    description: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
}) {
    return (
        <Sheet open={open} onOpenChange={(o) => !o && !locked && onClose()}>
            <SheetContent
                side="right"
                className={`flex w-full flex-col gap-0 border-t-2 bg-slate-50 p-0 sm:max-w-md ${DRAWER_ACCENTS[accent]}`}
            >
                <SheetHeader className="shrink-0 border-b border-slate-200 bg-white px-6 py-5 pr-12 text-left">
                    <div className="flex items-center gap-3.5">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 ring-1 ring-slate-200 ring-inset">
                            {icon}
                        </span>
                        <div className="min-w-0">
                            <SheetTitle className="text-base leading-tight font-semibold text-slate-900">
                                {title}
                            </SheetTitle>
                            <SheetDescription className="mt-0.5 text-sm text-slate-500">
                                {description}
                            </SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
                    {children}
                </div>

                {footer && (
                    <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-4">
                        {footer}
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}

function UserCard({ user }: { user: SystemUser }) {
    const roles = normalizeRoles(user.roles);
    return (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-medium text-white">
                    {getInitials(user.name)}
                </span>
                <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                        {user.name}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                        {user.email}
                    </p>
                    {user.department_name && (
                        <p className="mt-0.5 truncate text-xs text-slate-400">
                            {user.department_name}
                        </p>
                    )}
                </div>
            </div>
            {roles.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
                    {roles.map((r) => (
                        <RoleBadge key={r} role={r} />
                    ))}
                </div>
            )}
        </div>
    );
}

// ============================================
// AUDIT LOGS DRAWER
// ============================================

function AuditLogsDrawer({
    user,
    onClose,
}: {
    user: SystemUser | null;
    onClose: () => void;
}) {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!user) return;
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setLogs([]);
            try {
                // TODO: adjust endpoint
                const res = await Http.get(
                    `/admin/users/${user.id}/audit-logs`,
                );
                const data = res.data?.logs;
                if (!cancelled) setLogs(Array.isArray(data) ? data : []);
            } catch (error) {
                if (!cancelled)
                    toast.error(
                        getErrorMessage(error, 'Failed to load audit logs'),
                    );
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [user]);

    return (
        <DrawerShell
            open={!!user}
            onClose={onClose}
            accent="slate"
            icon={<ScrollText className="h-5 w-5" />}
            title="Audit logs"
            description="Recent activity on this account"
            footer={
                <Button variant="outline" className="w-full" onClick={onClose}>
                    Close
                </Button>
            }
        >
            {user && <UserCard user={user} />}

            <div>
                <div className="mb-3 flex items-center justify-between">
                    <h4 className={sectionLabel}>Activity</h4>
                    {!loading && (
                        <span className="text-xs text-slate-500 tabular-nums">
                            {logs.length}{' '}
                            {logs.length === 1 ? 'entry' : 'entries'}
                        </span>
                    )}
                </div>

                {loading ? (
                    <div className="space-y-2.5">
                        {[0, 1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="animate-pulse rounded-lg border border-slate-200 bg-white p-3"
                            >
                                <div className="h-3 w-1/3 rounded bg-slate-200" />
                                <div className="mt-2 h-3 w-4/5 rounded bg-slate-100" />
                            </div>
                        ))}
                    </div>
                ) : logs.length === 0 ? (
                    <div className="flex flex-col items-center rounded-lg border border-dashed border-slate-300 bg-white px-4 py-12 text-center">
                        <ScrollText className="mb-2 h-6 w-6 text-slate-400" />
                        <p className="text-sm font-medium text-slate-700">
                            No audit entries yet
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                            Activity for this user will appear here.
                        </p>
                    </div>
                ) : (
                    <ol className="relative ml-1.5 border-l border-slate-200">
                        {logs.map((log) => (
                            <li
                                key={log.id}
                                className="relative pb-3 pl-5 last:pb-0"
                            >
                                <span
                                    className={`absolute top-4 -left-[5px] h-2.5 w-2.5 rounded-full ring-4 ring-slate-50 ${getAuditDot(log.action)}`}
                                />
                                <div className="rounded-lg border border-slate-200 bg-white p-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="text-sm font-medium text-slate-900">
                                            {log.action}
                                        </p>
                                        <span
                                            title={formatDateTime(
                                                log.created_at,
                                            )}
                                            className="shrink-0 text-xs text-slate-400 tabular-nums"
                                        >
                                            {formatRelative(log.created_at)}
                                        </span>
                                    </div>
                                    {log.description && (
                                        <p className="mt-1 text-sm text-slate-600">
                                            {log.description}
                                        </p>
                                    )}
                                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                                        <span>
                                            {formatDateTime(log.created_at)}
                                        </span>
                                        {log.ip_address && (
                                            <span className="font-mono text-slate-500">
                                                {log.ip_address}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ol>
                )}
            </div>
        </DrawerShell>
    );
}

// ============================================
// REVOKE PERMISSIONS DRAWER
// ============================================

function RevokeDrawer({
    user,
    onClose,
    onDone,
}: {
    user: SystemUser | null;
    onClose: () => void;
    onDone: () => void;
}) {
    const [submitting, setSubmitting] = useState(false);
    const [understood, setUnderstood] = useState(false);

    useEffect(() => {
        setUnderstood(false);
    }, [user]);

    const roles = user ? normalizeRoles(user.roles) : [];

    const confirm = async () => {
        if (!user || !understood) return;
        setSubmitting(true);
        try {
            // TODO: adjust endpoint
            const res = await Http.post(
                `/admin/users/${user.id}/revoke-permissions`,
            );
            if (res.data?.success === false) {
                toast.error(
                    res.data?.message ?? 'Could not revoke permissions',
                );
                return;
            }
            toast.success(`Permissions revoked for ${user.name}`);
            onDone();
            onClose();
        } catch (error) {
            toast.error(getErrorMessage(error, 'Could not revoke permissions'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <DrawerShell
            open={!!user}
            onClose={onClose}
            locked={submitting}
            accent="red"
            icon={<ShieldOff className="h-5 w-5" />}
            title="Revoke permissions"
            description="Remove this user's access"
            footer={
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        className="flex-1"
                        onClick={onClose}
                        disabled={submitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={confirm}
                        disabled={!understood || submitting}
                        className="flex-1 bg-red-800 text-white hover:bg-red-900 disabled:opacity-40"
                    >
                        {submitting ? (
                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : (
                            <ShieldOff className="mr-1.5 h-4 w-4" />
                        )}
                        Revoke access
                    </Button>
                </div>
            }
        >
            {user && <UserCard user={user} />}

            <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50/60 p-4">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
                <div className="text-sm text-red-950">
                    <p className="font-medium">This takes effect immediately</p>
                    <ul className="mt-1.5 list-disc space-y-1 pl-4 text-red-900/80">
                        <li>All roles and direct permissions are removed.</li>
                        <li>The user loses access to restricted pages.</li>
                        <li>The change is recorded in the audit log.</li>
                    </ul>
                </div>
            </div>

            <div>
                <h4 className={`mb-2 ${sectionLabel}`}>
                    Roles that will be removed
                </h4>
                {roles.length === 0 ? (
                    <p className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-500">
                        No roles assigned. Only direct permissions will be
                        cleared.
                    </p>
                ) : (
                    <div className="flex flex-wrap gap-1.5 rounded-lg border border-slate-200 bg-white p-3">
                        {roles.map((r) => (
                            <RoleBadge key={r} role={r} muted />
                        ))}
                    </div>
                )}
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300">
                <input
                    type="checkbox"
                    checked={understood}
                    onChange={(e) => setUnderstood(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-red-800"
                />
                <span className="text-sm text-slate-600">
                    I understand that{' '}
                    <span className="font-medium text-slate-900">
                        {user?.name}
                    </span>{' '}
                    will lose all access until permissions are granted again.
                </span>
            </label>
        </DrawerShell>
    );
}

// ============================================
// SEND NOTIFICATION DRAWER
// ============================================

type NotifyTarget = SystemUser | 'all' | null;
type Priority = 'info' | 'important' | 'urgent';

const PRIORITIES: Record<
    Priority,
    { label: string; icon: ReactNode; dot: string; bar: string }
> = {
    info: {
        label: 'Info',
        icon: <Info className="h-4 w-4" />,
        dot: 'bg-sky-600',
        bar: 'border-l-sky-600',
    },
    important: {
        label: 'Important',
        icon: <AlertTriangle className="h-4 w-4" />,
        dot: 'bg-amber-600',
        bar: 'border-l-amber-600',
    },
    urgent: {
        label: 'Urgent',
        icon: <Zap className="h-4 w-4" />,
        dot: 'bg-red-700',
        bar: 'border-l-red-700',
    },
};

const TEMPLATES = [
    {
        label: 'Maintenance',
        title: 'Scheduled maintenance',
        message:
            'The system will be unavailable for a short maintenance window. Please save your work before then.',
    },
    {
        label: 'Action required',
        title: 'Action required',
        message:
            'Please review your pending approvals and complete them today.',
    },
    {
        label: 'Reminder',
        title: 'Friendly reminder',
        message:
            'This is a reminder to update your records before the end of the week.',
    },
];

const TITLE_MAX = 120;
const MESSAGE_MAX = 1000;

function NotifyDrawer({
    target,
    onClose,
}: {
    target: NotifyTarget;
    onClose: () => void;
}) {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [priority, setPriority] = useState<Priority>('info');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (target) {
            setTitle('');
            setMessage('');
            setPriority('info');
        }
    }, [target]);

    const isAll = target === 'all';
    const user = target && target !== 'all' ? target : null;
    const canSend = title.trim().length > 0 && message.trim().length > 0;

    const send = async () => {
        if (!target || !canSend) return;
        setSubmitting(true);
        try {
            // TODO: adjust endpoint / payload
            const res = await Http.post('/admin/notifications/send', {
                all: isAll,
                user_ids: user ? [user.id] : undefined,
                title: title.trim(),
                message: message.trim(),
                priority,
            });
            if (res.data?.success === false) {
                toast.error(res.data?.message ?? 'Could not send notification');
                return;
            }
            toast.success('Notification sent');
            onClose();
        } catch (error) {
            toast.error(getErrorMessage(error, 'Could not send notification'));
        } finally {
            setSubmitting(false);
        }
    };

    const fieldClass =
        'w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 focus:outline-none';

    return (
        <DrawerShell
            open={!!target}
            onClose={onClose}
            locked={submitting}
            accent="teal"
            icon={<Bell className="h-5 w-5" />}
            title="Send notification"
            description={
                isAll ? 'Broadcast to all users' : 'Message a single user'
            }
            footer={
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        className="flex-1"
                        onClick={onClose}
                        disabled={submitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={send}
                        disabled={!canSend || submitting}
                        className="flex-1 bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40"
                    >
                        {submitting ? (
                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="mr-1.5 h-4 w-4" />
                        )}
                        {isAll ? 'Send to all' : 'Send'}
                    </Button>
                </div>
            }
        >
            {/* recipient */}
            {isAll ? (
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-white">
                        <UsersIcon className="h-5 w-5" />
                    </span>
                    <div>
                        <p className="text-sm font-medium text-slate-900">
                            All system users
                        </p>
                        <p className="text-xs text-slate-500">
                            Everyone with an account will receive this.
                        </p>
                    </div>
                </div>
            ) : (
                user && <UserCard user={user} />
            )}

            {/* priority */}
            <div>
                <h4 className={`mb-2 ${sectionLabel}`}>Priority</h4>
                <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-200/70 p-1">
                    {(Object.keys(PRIORITIES) as Priority[]).map((key) => {
                        const p = PRIORITIES[key];
                        const selected = priority === key;
                        return (
                            <button
                                key={key}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => setPriority(key)}
                                className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium transition ${
                                    selected
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <span
                                    className={`h-1.5 w-1.5 rounded-full ${p.dot}`}
                                />
                                {p.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* templates */}
            <div>
                <h4 className={`mb-2 ${sectionLabel}`}>Quick templates</h4>
                <div className="flex flex-wrap gap-1.5">
                    {TEMPLATES.map((t) => (
                        <button
                            key={t.label}
                            type="button"
                            onClick={() => {
                                setTitle(t.title);
                                setMessage(t.message);
                            }}
                            className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* fields */}
            <div className="space-y-4">
                <div>
                    <div className="mb-1.5 flex items-center justify-between">
                        <label htmlFor="notify-title" className={sectionLabel}>
                            Title
                        </label>
                        <span className="text-xs text-slate-400 tabular-nums">
                            {title.length}/{TITLE_MAX}
                        </span>
                    </div>
                    <input
                        id="notify-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        maxLength={TITLE_MAX}
                        placeholder="e.g. Scheduled maintenance"
                        className={fieldClass}
                    />
                </div>
                <div>
                    <div className="mb-1.5 flex items-center justify-between">
                        <label
                            htmlFor="notify-message"
                            className={sectionLabel}
                        >
                            Message
                        </label>
                        <span className="text-xs text-slate-400 tabular-nums">
                            {message.length}/{MESSAGE_MAX}
                        </span>
                    </div>
                    <textarea
                        id="notify-message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={5}
                        maxLength={MESSAGE_MAX}
                        placeholder="Write your message…"
                        className={`${fieldClass} resize-none`}
                    />
                </div>
            </div>

            {/* live preview */}
            <div>
                <h4 className={`mb-2 ${sectionLabel}`}>Preview</h4>
                <div
                    className={`flex gap-3 rounded-lg border border-l-4 border-slate-200 bg-white p-3.5 ${PRIORITIES[priority].bar}`}
                >
                    <span className="mt-0.5 shrink-0 text-slate-500">
                        {PRIORITIES[priority].icon}
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                            {title.trim() || 'Notification title'}
                        </p>
                        <p className="mt-0.5 text-sm break-words text-slate-500">
                            {message.trim() || 'Your message will appear here.'}
                        </p>
                    </div>
                </div>
            </div>
        </DrawerShell>
    );
}

// ============================================
// PAGE
// ============================================

export default function Users() {
    const [usersAll, setUsersAll] = useState<SystemUser[]>([]);
    const [loading, setLoading] = useState(false);

    const [auditUser, setAuditUser] = useState<SystemUser | null>(null);
    const [revokeUser, setRevokeUser] = useState<SystemUser | null>(null);
    const [notifyTarget, setNotifyTarget] = useState<NotifyTarget>(null);

    const getUsers = async () => {
        try {
            setLoading(true);
            const response = await Http.get('/admin/all-users');
            if (response.data.success) {
                setUsersAll(
                    Array.isArray(response.data.users)
                        ? response.data.users
                        : [],
                );
            }
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        getUsers();
    }, []);

    const textClass = 'text-sm text-slate-700 dark:text-slate-300';

    const columns = [
        {
            id: 'serial_number',
            label: 'SN',
            minWidth: 50,
            sortable: true,
            format: (_value: unknown, row: SystemUser) => (
                <p className={textClass}>{row.serial_number}</p>
            ),
        },
        {
            id: 'employee_number',
            label: 'Mobile Phone Number',
            minWidth: 160,
            sortable: true,
            format: (_value: unknown, row: SystemUser) => (
                <p className={textClass}>{row.mobile_phone_number}</p>
            ),
        },
        {
            id: 'user_details',
            label: 'Personal Information',
            minWidth: 220,
            sortable: true,
            format: (_value: unknown, row: SystemUser) => (
                <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {row.name}
                    </p>
                    <span className="text-xs text-slate-400">{row.email}</span>
                </div>
            ),
        },
        {
            id: 'department',
            label: 'Department',
            minWidth: 160,
            sortable: true,
            format: (_value: unknown, row: SystemUser) => (
                <p className={textClass}>{row.department_name}</p>
            ),
        },
        {
            id: 'roles',
            label: 'Roles',
            minWidth: 160,
            sortable: true,
            format: (_value: unknown, row: SystemUser) => {
                const names = normalizeRoles(row.roles);
                if (names.length === 0) {
                    return (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200 ring-inset dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                            General
                        </span>
                    );
                }
                return (
                    <div className="flex flex-wrap gap-1.5">
                        {names.map((role) => (
                            <RoleBadge key={role} role={role} />
                        ))}
                    </div>
                );
            },
        },
        {
            id: 'last_logged_in',
            label: 'Last Logged In',
            minWidth: 140,
            sortable: true,
            format: () => <p className={textClass}>---</p>,
        },
        // {
        //     id: 'actions',
        //     label: 'Actions',
        //     minWidth: 130,
        //     sortable: false,
        //     format: (_value: unknown, row: SystemUser) => (
        //         <div className="flex items-center gap-1">
        //             <ActionButton
        //                 label="View audit logs"
        //                 tone="info"
        //                 onClick={() => setAuditUser(row)}
        //             >
        //                 <ScrollText className="h-4 w-4" />
        //             </ActionButton>
        //             <ActionButton
        //                 label="Send notification"
        //                 tone="warning"
        //                 onClick={() => setNotifyTarget(row)}
        //             >
        //                 <Bell className="h-4 w-4" />
        //             </ActionButton>
        //             <ActionButton
        //                 label="Revoke permissions"
        //                 tone="danger"
        //                 onClick={() => setRevokeUser(row)}
        //             >
        //                 <ShieldOff className="h-4 w-4" />
        //             </ActionButton>
        //         </div>
        //     ),
        // },
    ];

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Admin', href: '/' },
                { title: 'Registered Users', href: '/' },
            ]}
        >
            <div className="bg-slate-100">
                <Container>
                    <PageHeader
                        title="Users Management"
                        icon={<UsersIcon />}
                        subtitle="Manage all system users, roles and permissions"
                    >
                        <div className="self-center">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setNotifyTarget('all')}
                                className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                            >
                                <Bell className="h-3.5 w-3.5 sm:mr-1.5" />
                                <span className="hidden sm:inline">
                                    Notify all users
                                </span>
                            </Button>
                        </div>
                    </PageHeader>

                    <ReusableTable
                        title="Users Management"
                        columns={columns}
                        data={usersAll}
                        loading={loading}
                    />
                </Container>
            </div>

            <AuditLogsDrawer
                user={auditUser}
                onClose={() => setAuditUser(null)}
            />
            <RevokeDrawer
                user={revokeUser}
                onClose={() => setRevokeUser(null)}
                onDone={getUsers}
            />
            <NotifyDrawer
                target={notifyTarget}
                onClose={() => setNotifyTarget(null)}
            />
        </AppLayout>
    );
}
