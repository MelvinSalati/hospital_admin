import { router, usePage } from '@inertiajs/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Eye, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';

import PageHeader from '@/components/PageHeader';
import ReusableTable from '@/components/ReusableTable';
import type { Action, Column } from '@/components/ReusableTable';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import Logo from '../../../assets/img/logo.jpg';
/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

interface Department {
    id: string | number;
    name: string;
}

/** 1 = cash, 2 = insurance (same convention as the services page). */
type SchemeType = 1 | 2;

interface Collection {
    id: number;
    collected_at: string;
    patient_name: string;
    invoice_number: string;
    service: string;
    scheme_type: SchemeType;
    payment_method: string;
    amount: number;
    received_by: string;
}

interface PeriodFilters {
    from?: string | null;
    to?: string | null;
}

interface CollectionsProps {
    department?: Department;
    collections?: Collection[];
    filters?: PeriodFilters;
    loading?: boolean;
}

type TabKey = 'all' | 'cash' | 'insurance';
type Preset = 'today' | 'week' | 'month';

/* -------------------------------------------------------------------------- */
/* CONSTANTS                                                                  */
/* -------------------------------------------------------------------------- */

const TABS: { key: TabKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'cash', label: 'Cash' },
    { key: 'insurance', label: 'Insurance' },
];

const SCHEME_BY_TAB: Record<Exclude<TabKey, 'all'>, SchemeType> = {
    cash: 1,
    insurance: 2,
};

const PRESETS: { key: Preset; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
];

/** Put your logo in public/images/logo.png (or change this path). */
const LOGO_URL = Logo;

const HOSPITAL = {
    name: 'Altaf Memorial Hospital',
    address:
        'Plot 21/22 Parerenyatwa Road, Moth, Chipata, Eastern Province, Zambia (opposite Wildlife)',
    phone: 'Tel: +260 97 0684418 / +260 77 6798007',
    email: 'Email: altafmemorialhospital@gmail.com',
    hours: 'Open 24 hours, Monday - Sunday',
};

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

const formatMoney = (value: unknown): string =>
    `ZMW ${Number(value ?? 0).toLocaleString('en-ZM', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

const formatDate = (value: unknown): string => {
    if (!value) {
        return '-';
    }

    const date = new Date(String(value));

    return Number.isNaN(date.getTime())
        ? String(value)
        : date.toLocaleString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
          });
};

/** Local-time YYYY-MM-DD (toISOString would shift the day for UTC+2). */
const toDateInput = (date: Date): string => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${date.getFullYear()}-${month}-${day}`;
};

const formatDay = (value: string): string => {
    const date = new Date(`${value}T00:00:00`);

    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
          });
};

const periodText = (from: string, to: string): string => {
    if (from && to) {
        return from === to
            ? formatDay(from)
            : `${formatDay(from)} to ${formatDay(to)}`;
    }

    if (from) {
        return `From ${formatDay(from)}`;
    }

    if (to) {
        return `Up to ${formatDay(to)}`;
    }

    return 'All dates';
};

const escapeCsv = (value: unknown): string =>
    `"${String(value ?? '').replace(/"/g, '""')}"`;

const slug = (value: string): string =>
    value.toLowerCase().replace(/[^a-z0-9]+/g, '-');

function exportToCsv(rows: Collection[], filename: string) {
    const header = [
        'Date',
        'Patient',
        'Invoice',
        'Service',
        'Scheme',
        'Payment Method',
        'Amount (ZMW)',
        'Received By',
    ];

    const lines = rows.map((row) =>
        [
            formatDate(row.collected_at),
            row.patient_name,
            row.invoice_number,
            row.service,
            row.scheme_type === 2 ? 'Insurance' : 'Cash',
            row.payment_method,
            row.amount,
            row.received_by,
        ]
            .map(escapeCsv)
            .join(','),
    );

    const blob = new Blob([[header.join(','), ...lines].join('\n')], {
        type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
}

/* -------------------------------------------------------------------------- */
/* PDF                                                                        */
/* -------------------------------------------------------------------------- */

interface LoadedLogo {
    dataUrl: string;
    format: 'PNG' | 'JPEG';
    width: number;
    height: number;
}

/** Loads the logo as a data URL. Returns null when it is missing. */
async function loadLogo(src: string): Promise<LoadedLogo | null> {
    try {
        const response = await fetch(src);

        if (!response.ok) {
            return null;
        }

        const blob = await response.blob();

        const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });

        const size = await new Promise<{ width: number; height: number }>(
            (resolve, reject) => {
                const image = new Image();
                image.onload = () =>
                    resolve({
                        width: image.naturalWidth,
                        height: image.naturalHeight,
                    });
                image.onerror = () => reject(new Error('Bad logo image'));
                image.src = dataUrl;
            },
        );

        return {
            dataUrl,
            format: blob.type.includes('png') ? 'PNG' : 'JPEG',
            ...size,
        };
    } catch {
        return null;
    }
}

interface PdfOptions {
    rows: Collection[];
    departmentName: string;
    tabLabel: string;
    from: string;
    to: string;
    filename: string;
}

async function exportToPdf({
    rows,
    departmentName,
    tabLabel,
    from,
    to,
    filename,
}: PdfOptions) {
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    /* ---- Letterhead ---- */
    const logo = await loadLogo(LOGO_URL);
    let textX = margin;

    if (logo) {
        const logoHeight = 22;
        const logoWidth = Math.min((logo.width / logo.height) * logoHeight, 45);

        doc.addImage(
            logo.dataUrl,
            logo.format,
            margin,
            10,
            logoWidth,
            logoHeight,
        );
        textX = margin + logoWidth + 6;
    }

    doc.setTextColor(20, 60, 110);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(HOSPITAL.name, textX, 17);

    doc.setTextColor(70, 70, 70);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(HOSPITAL.address, textX, 23);
    doc.text(`${HOSPITAL.phone}  |  ${HOSPITAL.email}`, textX, 28);
    doc.text(HOSPITAL.hours, textX, 33);

    doc.setDrawColor(20, 60, 110);
    doc.setLineWidth(0.6);
    doc.line(margin, 37, pageWidth - margin, 37);

    /* ---- Report title ---- */
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(`${departmentName} Collections Report`, margin, 46);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(70, 70, 70);
    doc.text(
        `Period: ${periodText(from, to)}    |    Scheme: ${tabLabel}    |    Transactions: ${rows.length}`,
        margin,
        52,
    );
    doc.text(
        `Generated: ${new Date().toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })}`,
        pageWidth - margin,
        52,
        { align: 'right' },
    );

    /* ---- Table ---- */
    const total = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const cashTotal = rows
        .filter((row) => row.scheme_type === 1)
        .reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const insuranceTotal = total - cashTotal;

    autoTable(doc, {
        startY: 56,
        margin: { left: margin, right: margin, bottom: 18 },
        head: [
            [
                '#',
                'Date',
                'Patient',
                'Invoice',
                'Service',
                'Scheme',
                'Method',
                'Amount',
                'Received By',
            ],
        ],
        body: rows.map((row, index) => [
            String(index + 1),
            formatDate(row.collected_at),
            row.patient_name,
            row.invoice_number,
            row.service,
            row.scheme_type === 2 ? 'Insurance' : 'Cash',
            row.payment_method,
            formatMoney(row.amount),
            row.received_by,
        ]),
        foot: [
            [
                {
                    content: 'Cash',
                    colSpan: 7,
                    styles: { halign: 'right' },
                },
                {
                    content: formatMoney(cashTotal),
                    styles: { halign: 'right' },
                },
                '',
            ],
            [
                {
                    content: 'Insurance',
                    colSpan: 7,
                    styles: { halign: 'right' },
                },
                {
                    content: formatMoney(insuranceTotal),
                    styles: { halign: 'right' },
                },
                '',
            ],
            [
                {
                    content: 'TOTAL',
                    colSpan: 7,
                    styles: { halign: 'right' },
                },
                { content: formatMoney(total), styles: { halign: 'right' } },
                '',
            ],
        ],
        showFoot: 'lastPage',
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, lineColor: [210, 215, 225] },
        headStyles: {
            fillColor: [20, 60, 110],
            textColor: 255,
            fontStyle: 'bold',
        },
        footStyles: {
            fillColor: [235, 241, 250],
            textColor: [20, 60, 110],
            fontStyle: 'bold',
        },
        alternateRowStyles: { fillColor: [247, 249, 252] },
        columnStyles: {
            0: { cellWidth: 9, halign: 'center' },
            7: { halign: 'right' },
        },
    });

    /* ---- Footer on every page ---- */
    const pages = doc.getNumberOfPages();

    for (let page = 1; page <= pages; page += 1) {
        doc.setPage(page);
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.2);
        doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(HOSPITAL.name, margin, pageHeight - 7);
        doc.text(
            `Page ${page} of ${pages}`,
            pageWidth - margin,
            pageHeight - 7,
            {
                align: 'right',
            },
        );
    }

    doc.save(filename);
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function Collections({
    department,
    collections = [],
    filters = {},
    loading = false,
}: CollectionsProps) {
    const { url } = usePage();
    const pagePath = url.split('?')[0];
    console.log(collections);
    const [activeTab, setActiveTab] = useState<TabKey>('all');
    const [from, setFrom] = useState<string>(filters.from ?? '');
    const [to, setTo] = useState<string>(filters.to ?? '');
    const [reloading, setReloading] = useState(false);
    const [exportingPdf, setExportingPdf] = useState(false);

    const title = department ? `${department.name} Collections` : 'Collections';

    /* ---------------------------------------------------------------------- */
    /* PERIOD FILTER (reloads automatically when the dates change)            */
    /* ---------------------------------------------------------------------- */

    const loadPeriod = (nextFrom: string, nextTo: string) => {
        if (nextFrom && nextTo && nextFrom > nextTo) {
            return;
        }

        const query: Record<string, string> = {};

        if (nextFrom) {
            query.from = nextFrom;
        }

        if (nextTo) {
            query.to = nextTo;
        }

        router.get(pagePath, query, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            only: ['collections', 'filters'],
            onStart: () => setReloading(true),
            onFinish: () => setReloading(false),
        });
    };

    const changeFrom = (value: string) => {
        setFrom(value);
        loadPeriod(value, to);
    };

    const changeTo = (value: string) => {
        setTo(value);
        loadPeriod(from, value);
    };

    const applyPreset = (preset: Preset) => {
        const now = new Date();
        const start = new Date(now);

        if (preset === 'week') {
            // Monday as the first day of the week
            const offset = (now.getDay() + 6) % 7;
            start.setDate(now.getDate() - offset);
        }

        if (preset === 'month') {
            start.setDate(1);
        }

        const nextFrom = toDateInput(start);
        const nextTo = toDateInput(now);

        setFrom(nextFrom);
        setTo(nextTo);
        loadPeriod(nextFrom, nextTo);
    };

    /* ---------------------------------------------------------------------- */
    /* TABS + TOTALS                                                          */
    /* ---------------------------------------------------------------------- */

    const counts = useMemo(
        () => ({
            all: collections.length,
            cash: collections.filter((row) => row.scheme_type === 1).length,
            insurance: collections.filter((row) => row.scheme_type === 2)
                .length,
        }),
        [collections],
    );

    const visibleRows = useMemo(() => {
        if (activeTab === 'all') {
            return collections;
        }

        return collections.filter(
            (row) => row.scheme_type === SCHEME_BY_TAB[activeTab],
        );
    }, [collections, activeTab]);

    const total = useMemo(
        () =>
            visibleRows.reduce((sum, row) => sum + Number(row.amount || 0), 0),
        [visibleRows],
    );

    const tabActions = TABS.map((tab) => ({
        label: `${tab.label} (${counts[tab.key]})`,
        variant: (activeTab === tab.key ? 'cyan' : 'outline') as
            | 'cyan'
            | 'outline',
        onClick: () => setActiveTab(tab.key),
    }));

    /* ---------------------------------------------------------------------- */
    /* TABLE CONFIG                                                           */
    /* ---------------------------------------------------------------------- */

    const columns: Column<Collection>[] = [
        {
            id: 'collected_at',
            label: 'Date',
            sortable: true,
            filterable: false,
            format: (value) => formatDate(value),
        },
        {
            id: 'token',
            label: 'Visit Token',
            sortable: true,
            filterable: true,
        },
        {
            id: 'patient_name',
            label: 'Patient',
            sortable: true,
            filterable: true,
        },
        {
            id: 'invoice_number',
            label: 'Invoice',
            sortable: true,
            filterable: true,
        },
        {
            id: 'service',
            label: 'Service',
            sortable: true,
            filterable: true,
        },
        {
            id: 'scheme_type',
            label: 'Scheme',
            sortable: true,
            filterable: false,
            format: (value) => (Number(value) === 2 ? 'Insurance' : 'Cash'),
        },

        {
            id: 'amount',
            label: 'Amount',
            sortable: true,
            filterable: false,
            format: (value) => formatMoney(value),
        },
        // {
        //     id: 'received_by',
        //     label: 'Received By',
        //     sortable: true,
        //     filterable: true,
        // },
    ];

    const actions: Action<Collection>[] = [
        // {
        //     label: 'View',
        //     icon: <Eye className="h-4 w-4" />,
        //     color: 'info',
        //     onClick: (row) => router.visit(`/invoices/${row.invoice_number}`),
        // },
    ];

    const baseName = `${slug(department?.name ?? 'collections')}-${activeTab}-collections`;

    const handleExportCsv = () => exportToCsv(visibleRows, `${baseName}.csv`);

    const handleExportPdf = async () => {
        setExportingPdf(true);

        try {
            await exportToPdf({
                rows: visibleRows,
                departmentName: department?.name ?? 'Department',
                tabLabel: TABS.find((tab) => tab.key === activeTab)!.label,
                from,
                to,
                filename: `${baseName}.pdf`,
            });
        } finally {
            setExportingPdf(false);
        }
    };

    /* ---------------------------------------------------------------------- */
    /* RENDER                                                                 */
    /* ---------------------------------------------------------------------- */

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Dashboard', href: '/admin/dashboard' },
                { title: 'Collections', href: '/departments/collections' },
                ...(department
                    ? [
                          {
                              title: department.name,
                              href: `/departments/collections/${department.id}`,
                          },
                      ]
                    : []),
            ]}
        >
            <PageHeader
                icon={<Wallet className="h-5 w-5" />}
                title={title}
                subtitle={`${visibleRows.length} transaction${
                    visibleRows.length === 1 ? '' : 's'
                } | Total ${formatMoney(total)}`}
                actions={tabActions}
            />
            <div className="space-y-4 bg-blue-50 p-4 dark:bg-transparent">
                {/* Single toolbar: period + export */}
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                    <input
                        type="date"
                        aria-label="From date"
                        value={from}
                        max={to || undefined}
                        disabled={reloading}
                        onChange={(event) => changeFrom(event.target.value)}
                        className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    />

                    <span className="text-sm text-gray-400">to</span>

                    <input
                        type="date"
                        aria-label="To date"
                        value={to}
                        min={from || undefined}
                        disabled={reloading}
                        onChange={(event) => changeTo(event.target.value)}
                        className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    />

                    <div className="flex gap-1 border-l border-gray-200 pl-3 dark:border-gray-700">
                        {PRESETS.map((preset) => (
                            <Button
                                key={preset.key}
                                type="button"
                                size="sm"
                                variant="ghost"
                                disabled={reloading}
                                onClick={() => applyPreset(preset.key)}
                            >
                                {preset.label}
                            </Button>
                        ))}
                    </div>

                    <div className="ml-auto flex gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={visibleRows.length === 0}
                            onClick={handleExportCsv}
                        >
                            Export CSV
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            disabled={visibleRows.length === 0 || exportingPdf}
                            onClick={handleExportPdf}
                        >
                            {exportingPdf ? 'Preparing...' : 'Export PDF'}
                        </Button>
                    </div>
                </div>

                <ReusableTable<Collection>
                    key={activeTab}
                    title="Transactions"
                    columns={columns}
                    data={visibleRows}
                    actions={actions}
                    loading={loading || reloading}
                    filterPlaceholder="Search collections..."
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    defaultRowsPerPage={10}
                    defaultOrderBy="collected_at"
                    defaultOrderDirection="desc"
                    emptyMessage="No collections found for this period."
                />
            </div>
        </AppLayout>
    );
}
