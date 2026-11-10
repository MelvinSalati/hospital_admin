// resources/js/pages/patients/RadiologyImagesDrawer.tsx
import {
    X,
    FileText,
    ScanLine,
    Image as ImageIcon,
    ExternalLink,
    Download,
    CalendarClock,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export interface ImagingFile {
    id: number;
    name: string;
    url: string | null;
    mime: string | null;
    size: number | null;
    type: 'image' | 'dicom' | 'pdf' | 'report' | 'other';
    uploaded_at: string | null;
}

export interface RadiologyOrderWithFiles {
    id: string | number;
    order_number: string;
    service_name: string;
    status: string;
    priority?: string;
    created_at: string;
    items?: any[];
    files?: ImagingFile[];
}

const formatDateTime = (iso?: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const fileIcon = (t: ImagingFile['type']) => {
    if (t === 'image') return <ImageIcon size={16} />;
    if (t === 'dicom') return <ScanLine size={16} />;
    return <FileText size={16} />;
};

const isPreviewableImage = (f: ImagingFile) => {
    if (f.type === 'image') return true;
    if (f.mime?.toLowerCase().startsWith('image/')) return true;
    const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
    return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
};

const isPdf = (f: ImagingFile) =>
    f.type === 'pdf' || f.mime?.toLowerCase() === 'application/pdf';

export default function RadiologyImagesDrawer({
    order,
    isOpen,
    onClose,
}: {
    order: RadiologyOrderWithFiles | null;
    isOpen: boolean;
    onClose: () => void;
}) {
    const [selectedId, setSelectedId] = useState<number | null>(null);

    useEffect(() => {
        if (!isOpen) setSelectedId(null);
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && order) {
            setSelectedId((prev) => prev ?? order.files?.[0]?.id ?? null);
        }
    }, [isOpen, order?.id]);

    if (!order) return null;

    const files = order.files ?? [];
    const selected = files.find((f) => f.id === selectedId) ?? files[0] ?? null;

    return (
        <>
            <div
                className={cn(
                    'fixed inset-0 z-40 bg-slate-900/40 transition-opacity',
                    isOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
                )}
                onClick={onClose}
            />

            <aside
                className={cn(
                    'fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col bg-white shadow-2xl transition-transform',
                    isOpen ? 'translate-x-0' : 'translate-x-full',
                )}
            >
                <header className="flex items-center justify-between border-b border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
                            <ScanLine size={18} />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-slate-900">
                                Radiology Images
                            </h2>
                            <p className="font-mono text-[11px] text-slate-500">
                                {order.order_number} · {order.service_name}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
                    >
                        <X size={18} />
                    </button>
                </header>

                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-3 text-[11px] text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                        <CalendarClock size={11} />
                        {formatDateTime(order.created_at)}
                    </span>
                    <span className="capitalize">
                        Status:{' '}
                        <span className="font-medium">{order.status}</span>
                    </span>
                    {order.priority && order.priority !== 'routine' && (
                        <span className="rounded bg-amber-100 px-2 py-0.5 font-medium text-amber-800 capitalize">
                            {order.priority}
                        </span>
                    )}
                </div>

                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
                    {files.length === 0 ? (
                        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-200 p-10 text-center text-sm text-slate-400">
                            No images uploaded for this order yet.
                        </div>
                    ) : (
                        <>
                            {selected && (
                                <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
                                    {!selected.url ? (
                                        <p className="py-10 text-center text-xs text-slate-400">
                                            File unavailable
                                        </p>
                                    ) : isPreviewableImage(selected) ? (
                                        <img
                                            src={selected.url}
                                            alt={selected.name}
                                            className="mx-auto max-h-[420px] w-auto rounded object-contain"
                                        />
                                    ) : isPdf(selected) ? (
                                        <iframe
                                            src={selected.url}
                                            title={selected.name}
                                            className="h-[420px] w-full rounded border border-slate-200 bg-white"
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 py-10 text-center">
                                            <ScanLine
                                                size={32}
                                                className="text-slate-400"
                                            />
                                            <p className="text-sm font-medium text-slate-700">
                                                {selected.type.toUpperCase()}{' '}
                                                file
                                            </p>
                                            <p className="text-[11px] text-slate-500">
                                                Cannot be previewed in the
                                                browser.
                                            </p>
                                            <a
                                                href={selected.url}
                                                download={selected.name}
                                                className="mt-1 inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                                            >
                                                <Download size={12} /> Download
                                            </a>
                                        </div>
                                    )}
                                    <p className="mt-2 truncate text-center text-[11px] text-slate-500">
                                        {selected.name}
                                    </p>
                                </div>
                            )}

                            <ul className="space-y-2">
                                {files.map((f) => {
                                    const active = selected?.id === f.id;
                                    return (
                                        <li key={f.id}>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setSelectedId(f.id)
                                                }
                                                className={cn(
                                                    'flex w-full items-center gap-3 rounded-lg border bg-white p-2.5 text-left transition',
                                                    active
                                                        ? 'border-blue-300 bg-blue-50 ring-1 ring-blue-200'
                                                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                                                )}
                                            >
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-500">
                                                    {fileIcon(f.type)}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium text-slate-800">
                                                        {f.name}
                                                    </p>
                                                    <p className="text-[11px] text-slate-500">
                                                        {f.type} ·{' '}
                                                        {f.size
                                                            ? `${(f.size / 1024).toFixed(0)} KB`
                                                            : '—'}
                                                        {f.uploaded_at && (
                                                            <>
                                                                {' '}
                                                                ·{' '}
                                                                {formatDateTime(
                                                                    f.uploaded_at,
                                                                )}
                                                            </>
                                                        )}
                                                    </p>
                                                </div>
                                                {f.url && (
                                                    <a
                                                        href={f.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        onClick={(e) =>
                                                            e.stopPropagation()
                                                        }
                                                        className="rounded p-1 text-blue-600 hover:bg-blue-100"
                                                        title="Open in new tab"
                                                    >
                                                        <ExternalLink
                                                            size={14}
                                                        />
                                                    </a>
                                                )}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </>
                    )}
                </div>

                <footer className="border-t border-slate-200 bg-slate-50/60 p-4">
                    <button
                        onClick={onClose}
                        className="w-full rounded-md border border-slate-200 bg-white py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                        Close
                    </button>
                </footer>
            </aside>
        </>
    );
}
