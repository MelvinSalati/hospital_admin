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

/** 1 = cash (any non-insurance payment), 2 = insurance. */
type SchemeType = 1 | 2;

/** Payment methods that live inside the "Cash" scheme. */
type CashMethod = 'cash' | 'card' | 'mobile_money' | 'bank_transfer';
type MethodFilter = 'all' | CashMethod;

interface Collection {
    id: number;
    collected_at: string;
    patient_name: string;
    token?: string | null;
    invoice_number: string;
    service: string;
    scheme_type: SchemeType;
    /** Display text, e.g. "Mobile Money". */
    payment_method: string;
    /** Raw key from payments.payment_method, e.g. "mobile_money". */
    payment_method_key?: string | null;
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

const CASH_METHODS: { key: CashMethod; label: string }[] = [
    { key: 'cash', label: 'Cash' },
    { key: 'card', label: 'Card' },
    { key: 'mobile_money', label: 'Mobile Money' },
    { key: 'bank_transfer', label: 'Bank Transfer' },
];

const METHOD_CHIPS: { key: MethodFilter; label: string }[] = [
    { key: 'all', label: 'All cash payments' },
    ...CASH_METHODS,
];

const METHOD_LABEL: Record<CashMethod | 'insurance', string> = {
    cash: 'Cash',
    card: 'Card',
    mobile_money: 'Mobile Money',
    bank_transfer: 'Bank Transfer',
    insurance: 'Insurance',
};

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

/**
 * Turns either a raw key ("mobile_money") or display text ("Mobile Money")
 * into a method key. Anything unknown or empty counts as plain cash, which
 * matches how the backend already treats every non-insurance payment.
 */
const normalizeMethod = (value: unknown): CashMethod | 'insurance' => {
    const key = String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '_');

    if (key === 'insurance') {
        return 'insurance';
    }

    if (key === 'card' || key === 'mobile_money' || key === 'bank_transfer') {
        return key;
    }

    return 'cash';
};

/** Method of a cash-scheme row (never returns insurance). */
const getCashMethod = (row: Collection): CashMethod => {
    const method = normalizeMethod(
        row.payment_method_key ?? row.payment_method,
    );

    return method === 'insurance' ? 'cash' : method;
};

/** Method label for any row; insurance rows are left exactly as before. */
const rowMethodLabel = (row: Collection): string =>
    row.scheme_type === 2
        ? METHOD_LABEL.insurance
        : METHOD_LABEL[getCashMethod(row)];

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
            rowMethodLabel(row),
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

    /* ---- Totals ---- */
    const sumOf = (list: Collection[]) =>
        list.reduce((sum, row) => sum + Number(row.amount || 0), 0);

    const cashRows = rows.filter((row) => row.scheme_type === 1);
    const total = sumOf(rows);
    const cashTotal = sumOf(cashRows);
    const insuranceTotal = total - cashTotal;

    // Per-method breakdown of the cash scheme (only methods that have rows)
    const methodTotals = CASH_METHODS.map((method) => {
        const methodRows = cashRows.filter(
            (row) => getCashMethod(row) === method.key,
        );

        return {
            label: method.label,
            count: methodRows.length,
            amount: sumOf(methodRows),
        };
    }).filter((method) => method.count > 0);

    const methodFootRows =
        methodTotals.length > 1
            ? methodTotals.map((method) => [
                  {
                      content: `${method.label}`,
                      colSpan: 7,
                      styles: {
                          halign: 'right' as const,
                          fontStyle: 'normal' as const,
                      },
                  },
                  {
                      content: formatMoney(method.amount),
                      styles: {
                          halign: 'right' as const,
                          fontStyle: 'normal' as const,
                      },
                  },
                  '',
              ])
            : [];

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
            rowMethodLabel(row),
            formatMoney(row.amount),
            row.received_by,
        ]),
        foot: [
            [
                {
                    content: 'Cash payments',
                    colSpan: 7,
                    styles: { halign: 'right' },
                },
                {
                    content: formatMoney(cashTotal),
                    styles: { halign: 'right' },
                },
                '',
            ],
            ...methodFootRows,
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
    const [methodFilter, setMethodFilter] = useState<MethodFilter>('all');
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
    /* TABS + METHOD CHIPS + TOTALS                                           */
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

    /** Counts per method, for cash-scheme rows only (insurance is excluded). */
    const methodCounts = useMemo(() => {
        const result: Record<MethodFilter, number> = {
            all: 0,
            cash: 0,
            card: 0,
            mobile_money: 0,
            bank_transfer: 0,
        };

        collections.forEach((row) => {
            if (row.scheme_type !== 1) {
                return;
            }

            result.all += 1;
            result[getCashMethod(row)] += 1;
        });

        return result;
    }, [collections]);

    const visibleRows = useMemo(() => {
        if (activeTab === 'all') {
            return collections;
        }

        const schemeRows = collections.filter(
            (row) => row.scheme_type === SCHEME_BY_TAB[activeTab],
        );

        if (activeTab === 'cash' && methodFilter !== 'all') {
            return schemeRows.filter(
                (row) => getCashMethod(row) === methodFilter,
            );
        }

        return schemeRows;
    }, [collections, activeTab, methodFilter]);

    const total = useMemo(
        () =>
            visibleRows.reduce((sum, row) => sum + Number(row.amount || 0), 0),
        [visibleRows],
    );

    const changeTab = (tab: TabKey) => {
        setActiveTab(tab);
        // Method chips only exist on the Cash tab, so start clean elsewhere
        setMethodFilter('all');
    };

    const tabActions = TABS.map((tab) => ({
        label: `${tab.label} (${counts[tab.key]})`,
        variant: (activeTab === tab.key ? 'cyan' : 'outline') as
            | 'cyan'
            | 'outline',
        onClick: () => changeTab(tab.key),
    }));

    const activeTabLabel = TABS.find((tab) => tab.key === activeTab)!.label;

    const pdfTabLabel =
        activeTab === 'cash' && methodFilter !== 'all'
            ? `${activeTabLabel} - ${METHOD_LABEL[methodFilter]}`
            : activeTabLabel;

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
            id: 'payment_method',
            label: 'Method',
            sortable: true,
            filterable: true,
            format: (value) => METHOD_LABEL[normalizeMethod(value)],
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

    const baseName = `${slug(department?.name ?? 'collections')}-${activeTab}${
        activeTab === 'cash' && methodFilter !== 'all'
            ? `-${methodFilter.replace(/_/g, '-')}`
            : ''
    }-collections`;

    const handleExportCsv = () => exportToCsv(visibleRows, `${baseName}.csv`);

    const handleExportPdf = async () => {
        setExportingPdf(true);

        try {
            await exportToPdf({
                rows: visibleRows,
                departmentName: department?.name ?? 'Department',
                tabLabel: pdfTabLabel,
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

                {/* Payment method chips: Cash tab only, insurance is untouched */}
                {activeTab === 'cash' && (
                    <div
                        role="group"
                        aria-label="Filter cash payments by method"
                        className="flex flex-wrap items-center gap-2"
                    >
                        {METHOD_CHIPS.map((chip) => {
                            const isActive = methodFilter === chip.key;

                            return (
                                <button
                                    key={chip.key}
                                    type="button"
                                    aria-pressed={isActive}
                                    onClick={() => setMethodFilter(chip.key)}
                                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors focus:ring-2 focus:ring-cyan-400 focus:outline-none ${
                                        isActive
                                            ? 'border-cyan-600 bg-cyan-600 text-white'
                                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
                                    }`}
                                >
                                    {chip.label} ({methodCounts[chip.key]})
                                </button>
                            );
                        })}
                    </div>
                )}

                <ReusableTable<Collection>
                    key={`${activeTab}-${methodFilter}`}
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
