import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

// ============================================
// API TYPES (what the backend returns)
// ============================================

export type ReportEndpoint =
    | 'daily-revenue'
    | 'billing-invoicing'
    | 'insurance';

export interface ApiEnvelope<T = any> {
    success: boolean;
    message?: string;
    data: T;
}

export interface ReportPeriod {
    from: string;
    to: string;
    generated_at: string;
}

// ============================================
// INTERNAL DOCUMENT MODEL
// Every report is normalised into this, then rendered by ONE renderer.
// To add a new report: write a builder that returns a ReportDocument.
// ============================================

type Align = 'left' | 'right' | 'center';

interface Kpi {
    label: string;
    value: string;
    tone?: 'default' | 'good' | 'warn' | 'bad';
}

type Section =
    | { kind: 'kpis'; items: Kpi[] }
    | { kind: 'heading'; text: string; sub?: string }
    | {
          kind: 'table';
          headers: string[];
          rows: (string | number)[][];
          foot?: (string | number)[];
          align?: Align[];
          statusCol?: number;
          fontSize?: number;
      };

export interface ReportDocument {
    title: string;
    period: ReportPeriod;
    sections: Section[];
    verify_url?: string;
    report_id?: string;
    signature?: string;
}

export interface PdfOptions {
    department?: string; // shown in "Attn"
    generatedBy?: string; // optional user name
}

// ============================================
// HOSPITAL IDENTITY
// ============================================

const HOSPITAL = {
    name: 'ALTAF MEMORIAL HOSPITAL',
    addressLine1: 'Plot 21/22, Parerenyatwa Road',
    addressLine2: 'Chipata, Eastern Province, Zambia',
    postal: 'P.O. Box 510316, Chipata',
    phone: '+260 97 068 4418',
    hours: 'Open 24 Hours',
};

// ============================================
// STYLE
// ============================================

type RGB = [number, number, number];
const INK: RGB = [17, 17, 17];
const MUTED: RGB = [110, 110, 110];
const RULE: RGB = [210, 210, 210];
const ACCENT: RGB = [227, 30, 36];
const BRAND: RGB = [16, 62, 122];
const SOFT: RGB = [244, 246, 250];
const GOOD: RGB = [21, 128, 61];
const WARN: RGB = [180, 110, 0];
const BAD: RGB = [185, 28, 28];

const PAGE_MARGIN = 48;
const HEADER_H = 94; // content start Y after letterhead
const FOOTER_H = 44;

// ============================================
// FORMAT HELPERS
// ============================================

const num = (n: unknown) => Number(n ?? 0) || 0;

const fmtMoney = (n: unknown) =>
    `ZMW ${num(n).toLocaleString('en-ZM', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

const fmtDate = (s?: string | null) => {
    if (!s) return '-';
    const d = new Date(s.length === 10 ? `${s}T00:00:00` : s.replace(' ', 'T'));
    if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

const fmtTime = (s?: string | null) => {
    if (!s) return '-';
    const d = new Date(s.replace(' ', 'T'));
    if (isNaN(d.getTime())) return s;
    return d.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
    });
};

const rangeLabel = (p: ReportPeriod) =>
    p.from === p.to
        ? fmtDate(p.from)
        : `${fmtDate(p.from)} to ${fmtDate(p.to)}`;

const cap = (s?: string | null) =>
    s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : '-';

// Items can be drugs OR services (different shapes) -> normalise
const itemName = (i: any) =>
    i.service_name ?? i.drug_name ?? i.name ?? i.description ?? 'Item';
const itemCategory = (i: any) =>
    i.service_category ?? i.category ?? (i.drug_id ? 'Pharmacy' : '-');
const itemQty = (i: any) => num(i.quantity ?? 1) || 1;
const itemAmount = (i: any) => num(i.total ?? i.price ?? i.amount);
const itemUnit = (i: any) =>
    i.unit_price != null ? num(i.unit_price) : itemAmount(i) / itemQty(i);

// ============================================
// BUILDERS – one per report (payload.data -> ReportDocument)
// ============================================

function buildBilling(d: any): ReportDocument {
    const s = d.summary ?? {};
    const invoices: any[] = d.invoices ?? [];

    const sections: Section[] = [
        {
            kind: 'kpis',
            items: [
                { label: 'Invoices', value: String(num(s.total_invoices)) },
                { label: 'Total Billed', value: fmtMoney(s.total_billed) },
                {
                    label: 'Total Paid',
                    value: fmtMoney(s.total_paid),
                    tone: 'good',
                },
                {
                    label: 'Outstanding',
                    value: fmtMoney(s.total_outstanding),
                    tone: num(s.total_outstanding) > 0 ? 'bad' : 'default',
                },
            ],
        },
        {
            kind: 'kpis',
            items: [
                {
                    label: 'Paid',
                    value: String(num(s.paid_invoices)),
                    tone: 'good',
                },
                {
                    label: 'Partial',
                    value: String(num(s.partial_invoices)),
                    tone: 'warn',
                },
                {
                    label: 'Unpaid',
                    value: String(num(s.unpaid_invoices)),
                    tone: 'bad',
                },
            ],
        },
        { kind: 'heading', text: 'Invoices' },
        {
            kind: 'table',
            headers: [
                '#',
                'Invoice No.',
                'Date',
                'Patient',
                'Scheme',
                'Total',
                'Paid',
                'Balance',
                'Status',
            ],
            rows: invoices.map((inv, i) => [
                i + 1,
                inv.invoice_number,
                fmtDate(inv.invoice_date),
                `${inv.patient_name}\n${inv.patient_number}`,
                cap(inv.payment_scheme),
                fmtMoney(inv.total),
                fmtMoney(inv.paid_amount),
                fmtMoney(inv.balance),
                cap(inv.status),
            ]),
            foot: [
                '',
                '',
                '',
                '',
                'Totals',
                fmtMoney(s.total_billed),
                fmtMoney(s.total_paid),
                fmtMoney(s.total_outstanding),
                '',
            ],
            align: [
                'left',
                'left',
                'left',
                'left',
                'left',
                'right',
                'right',
                'right',
                'center',
            ],
            statusCol: 8,
            fontSize: 8,
        },
    ];

    sections.push(
        ...itemisedSections(invoices, (inv) => ({
            title: `${inv.invoice_number}  ·  ${inv.patient_name}`,
            sub: `${fmtDate(inv.invoice_date)}  ·  ${cap(inv.payment_scheme)}  ·  ${cap(inv.status)}`,
            items: inv.items ?? [],
            discount: num(inv.discount),
            tax: num(inv.tax),
            total: num(inv.total),
        })),
    );

    return {
        title: d.title ?? 'Billing & Invoicing Report',
        period: d.period,
        sections,
    };
}

function buildDailyRevenue(d: any): ReportDocument {
    // Defensive: adjust keys here once you've seen the real payload.
    const rows: any[] = d.payments ?? d.receipts ?? d.transactions ?? [];
    const total =
        d.summary?.total_collected ??
        d.summary?.total ??
        rows.reduce((a, r) => a + num(r.amount), 0);

    const byMethod: Record<string, { count: number; amount: number }> = {};
    rows.forEach((r) => {
        const m = cap(r.payment_method ?? r.method ?? 'cash');
        byMethod[m] ??= { count: 0, amount: 0 };
        byMethod[m].count += 1;
        byMethod[m].amount += num(r.amount);
    });

    const sections: Section[] = [
        {
            kind: 'kpis',
            items: [
                {
                    label: 'Total Collected',
                    value: fmtMoney(total),
                    tone: 'good',
                },
                {
                    label: 'Transactions',
                    value: String(d.summary?.total_transactions ?? rows.length),
                },
                {
                    label: 'Payment Methods',
                    value: String(Object.keys(byMethod).length),
                },
            ],
        },
    ];

    if (Object.keys(byMethod).length) {
        sections.push(
            { kind: 'heading', text: 'Collections by Payment Method' },
            {
                kind: 'table',
                headers: ['Method', 'Transactions', 'Amount'],
                rows: Object.entries(byMethod).map(([m, v]) => [
                    m,
                    v.count,
                    fmtMoney(v.amount),
                ]),
                foot: ['Total', rows.length, fmtMoney(total)],
                align: ['left', 'right', 'right'],
            },
        );
    }

    sections.push(
        { kind: 'heading', text: 'Payments Received' },
        {
            kind: 'table',
            headers: [
                '#',
                'Receipt No.',
                'Time',
                'Patient',
                'Description',
                'Method',
                'Cashier',
                'Amount',
            ],
            rows: rows.map((r, i) => [
                i + 1,
                r.receipt_number ?? r.receipt_no ?? r.invoice_number ?? '-',
                fmtTime(r.paid_at ?? r.time ?? r.created_at),
                `${r.patient_name ?? '-'}${r.patient_number ? `\n${r.patient_number}` : ''}`,
                r.description ?? r.service_name ?? '-',
                cap(r.payment_method ?? r.method),
                r.cashier ?? r.collected_by ?? '-',
                fmtMoney(r.amount),
            ]),
            foot: ['', '', '', '', '', '', 'Total', fmtMoney(total)],
            align: [
                'left',
                'left',
                'left',
                'left',
                'left',
                'left',
                'left',
                'right',
            ],
            fontSize: 8,
        },
    );

    return {
        title: d.title ?? 'Daily Revenue Collection Report',
        period: d.period,
        sections,
    };
}

function buildInsurance(d: any): ReportDocument {
    // Defensive: adjust keys here once you've seen the real payload.
    const claims: any[] = d.claims ?? d.invoices ?? d.patients ?? [];
    const claimTotal = (c: any) => num(c.total ?? c.claim_amount ?? c.amount);
    const grand =
        d.summary?.total_claims ??
        d.summary?.total_amount ??
        claims.reduce((a, c) => a + claimTotal(c), 0);

    const byProvider: Record<string, { count: number; amount: number }> = {};
    claims.forEach((c) => {
        const p = c.insurance_provider ?? c.provider ?? c.payer ?? 'Unknown';
        byProvider[p] ??= { count: 0, amount: 0 };
        byProvider[p].count += 1;
        byProvider[p].amount += claimTotal(c);
    });

    const sections: Section[] = [
        {
            kind: 'kpis',
            items: [
                { label: 'Patients / Claims', value: String(claims.length) },
                {
                    label: 'Insurers',
                    value: String(Object.keys(byProvider).length),
                },
                { label: 'Claims Due', value: fmtMoney(grand), tone: 'good' },
            ],
        },
    ];

    if (Object.keys(byProvider).length) {
        sections.push(
            { kind: 'heading', text: 'Claims by Insurance Provider' },
            {
                kind: 'table',
                headers: ['Provider', 'Claims', 'Amount'],
                rows: Object.entries(byProvider).map(([p, v]) => [
                    p,
                    v.count,
                    fmtMoney(v.amount),
                ]),
                foot: ['Total', claims.length, fmtMoney(grand)],
                align: ['left', 'right', 'right'],
            },
        );
    }

    sections.push(
        { kind: 'heading', text: 'Claims Summary' },
        {
            kind: 'table',
            headers: [
                '#',
                'Patient',
                'Provider',
                'Member No.',
                'Service Date',
                'Invoice No.',
                'Amount',
            ],
            rows: claims.map((c, i) => [
                i + 1,
                `${c.patient_name}\n${c.patient_number ?? ''}`,
                c.insurance_provider ?? c.provider ?? c.payer ?? '-',
                c.member_number ?? c.policy_number ?? '-',
                fmtDate(c.service_date ?? c.invoice_date),
                c.invoice_number ?? '-',
                fmtMoney(claimTotal(c)),
            ]),
            foot: ['', '', '', '', '', 'Total', fmtMoney(grand)],
            align: ['left', 'left', 'left', 'left', 'left', 'left', 'right'],
            fontSize: 8,
        },
    );

    sections.push(
        ...itemisedSections(claims, (c) => ({
            title: `${c.patient_name}  ·  ${c.insurance_provider ?? c.provider ?? c.payer ?? ''}`,
            sub: `${fmtDate(c.service_date ?? c.invoice_date)}  ·  ${c.invoice_number ?? ''}`,
            items: c.items ?? c.services ?? [],
            discount: num(c.discount),
            tax: num(c.tax),
            total: claimTotal(c),
        })),
    );

    return {
        title: d.title ?? 'Insurance Billing & Claims Report',
        period: d.period,
        sections,
    };
}

// Shared "itemised detail" block: one small table per invoice/claim
function itemisedSections(
    list: any[],
    pick: (x: any) => {
        title: string;
        sub: string;
        items: any[];
        discount: number;
        tax: number;
        total: number;
    },
): Section[] {
    const out: Section[] = [];
    const withItems = list.map(pick).filter((x) => x.items.length);
    if (!withItems.length) return out;

    out.push({ kind: 'heading', text: 'Itemised Detail' });

    withItems.forEach((x) => {
        out.push({ kind: 'heading', text: x.title, sub: x.sub });
        const foot: (string | number)[][] = [];
        out.push({
            kind: 'table',
            headers: ['Item', 'Category', 'Qty', 'Unit Price', 'Amount'],
            rows: x.items.map((i) => [
                itemName(i),
                itemCategory(i),
                itemQty(i),
                fmtMoney(itemUnit(i)),
                fmtMoney(itemAmount(i)),
            ]),
            foot: ['', '', '', 'Invoice Total', fmtMoney(x.total)],
            align: ['left', 'left', 'right', 'right', 'right'],
            fontSize: 8,
        });
        void foot;
    });
    return out;
}

const BUILDERS: Record<ReportEndpoint, (d: any) => ReportDocument> = {
    'daily-revenue': buildDailyRevenue,
    'billing-invoicing': buildBilling,
    insurance: buildInsurance,
};

// ============================================
// RENDERER
// ============================================

function drawLetterhead(doc: jsPDF, pageW: number, department: string) {
    const startY = 34;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...BRAND);
    doc.text(HOSPITAL.name, PAGE_MARGIN, startY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(`${department} Department`, PAGE_MARGIN, startY + 13);

    const lines = [
        `${HOSPITAL.addressLine1}, ${HOSPITAL.addressLine2}`,
        `${HOSPITAL.postal}  ·  Tel: ${HOSPITAL.phone}`,
        HOSPITAL.hours,
    ];
    doc.setFontSize(8);
    lines.forEach((l, i) =>
        doc.text(l, pageW - PAGE_MARGIN, startY + i * 10, { align: 'right' }),
    );

    const ruleY = startY + 40;
    doc.setDrawColor(...BRAND);
    doc.setLineWidth(1.2);
    doc.line(PAGE_MARGIN, ruleY, pageW - PAGE_MARGIN, ruleY);
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.4);
    doc.line(PAGE_MARGIN, ruleY + 3, pageW - PAGE_MARGIN, ruleY + 3);
}

const toneColor = (t?: Kpi['tone']): RGB =>
    t === 'good' ? GOOD : t === 'warn' ? WARN : t === 'bad' ? BAD : INK;

export async function renderReportPdf(
    report: ReportDocument,
    filename: string,
    opts: PdfOptions = {},
): Promise<void> {
    const department = opts.department ?? 'Reception';
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
    });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const contentW = pageW - PAGE_MARGIN * 2;

    const drawn = new Set<number>();
    const ensureLetterhead = () => {
        const p = doc.getCurrentPageInfo().pageNumber;
        if (!drawn.has(p)) {
            drawn.add(p);
            drawLetterhead(doc, pageW, department);
        }
    };
    const ensureSpace = (need: number) => {
        if (y + need > pageH - FOOTER_H) {
            doc.addPage();
            ensureLetterhead();
            y = HEADER_H;
        }
    };

    const p = report.period;
    const reportId =
        report.report_id ??
        `RPT-${p.from.replace(/-/g, '')}-${p.generated_at.replace(/\D/g, '').slice(-6)}`;

    ensureLetterhead();
    let y = HEADER_H;

    // ---- Attn block ----
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    [
        `Attn: ${department}`,
        `Report Ref: ${reportId}`,
        `Period: ${rangeLabel(p)}`,
        `Generated: ${p.generated_at}${opts.generatedBy ? `  by ${opts.generatedBy}` : ''}`,
    ].forEach((l) => {
        doc.text(l, pageW - PAGE_MARGIN, y, { align: 'right' });
        y += 14;
    });
    y += 6;

    // ---- Title ----
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...INK);
    doc.text(report.title, PAGE_MARGIN, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(`Range: ${p.from} to ${p.to}`, PAGE_MARGIN, y);
    y += 20;

    // ---- Sections ----
    for (const sec of report.sections) {
        if (sec.kind === 'kpis') {
            const n = sec.items.length;
            const gap = 8;
            const w = (contentW - gap * (n - 1)) / n;
            const h = 44;
            ensureSpace(h + 12);
            sec.items.forEach((k, i) => {
                const x = PAGE_MARGIN + i * (w + gap);
                doc.setFillColor(...SOFT);
                doc.setDrawColor(...RULE);
                doc.setLineWidth(0.5);
                doc.roundedRect(x, y, w, h, 3, 3, 'FD');
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                doc.setTextColor(...MUTED);
                doc.text(k.label.toUpperCase(), x + 10, y + 16);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(12);
                doc.setTextColor(...toneColor(k.tone));
                doc.text(k.value, x + 10, y + 34, { maxWidth: w - 16 });
            });
            y += h + 12;
        }

        if (sec.kind === 'heading') {
            ensureSpace(sec.sub ? 70 : 60);
            if (!sec.sub) y += 6;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(sec.sub ? 9.5 : 11);
            doc.setTextColor(...(sec.sub ? BRAND : INK));
            doc.text(sec.text, PAGE_MARGIN, y);
            y += 12;
            if (sec.sub) {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                doc.setTextColor(...MUTED);
                doc.text(sec.sub, PAGE_MARGIN, y);
                y += 6;
            }
        }

        if (sec.kind === 'table') {
            if (!sec.rows.length) {
                doc.setFont('helvetica', 'italic');
                doc.setFontSize(9);
                doc.setTextColor(...MUTED);
                doc.text(
                    'No records for the selected period.',
                    PAGE_MARGIN,
                    y + 10,
                );
                y += 24;
                continue;
            }

            const columnStyles: Record<number, any> = {};
            sec.align?.forEach((a, i) => (columnStyles[i] = { halign: a }));

            autoTable(doc, {
                startY: y,
                head: [sec.headers],
                body: sec.rows,
                foot: sec.foot ? [sec.foot] : undefined,
                showFoot: 'lastPage',
                theme: 'plain',
                styles: {
                    font: 'helvetica',
                    fontSize: sec.fontSize ?? 8.5,
                    cellPadding: 5,
                    textColor: INK,
                    lineColor: RULE,
                    lineWidth: 0,
                    overflow: 'linebreak',
                },
                headStyles: {
                    fontStyle: 'bold',
                    textColor: INK,
                    fillColor: SOFT,
                    lineColor: RULE,
                    lineWidth: { bottom: 0.75 } as any,
                },
                bodyStyles: {
                    lineColor: RULE,
                    lineWidth: { bottom: 0.3 } as any,
                },
                footStyles: {
                    fontStyle: 'bold',
                    textColor: INK,
                    fillColor: [255, 255, 255],
                    lineColor: RULE,
                    lineWidth: { top: 0.75, bottom: 0.75 } as any,
                },
                columnStyles,
                margin: {
                    left: PAGE_MARGIN,
                    right: PAGE_MARGIN,
                    top: HEADER_H,
                    bottom: FOOTER_H,
                },
                didParseCell: (h) => {
                    if (
                        sec.statusCol !== undefined &&
                        h.section === 'body' &&
                        h.column.index === sec.statusCol
                    ) {
                        const v = String(h.cell.raw).toLowerCase();
                        h.cell.styles.fontStyle = 'bold';
                        h.cell.styles.textColor =
                            v === 'paid'
                                ? GOOD
                                : v.startsWith('part')
                                  ? WARN
                                  : BAD;
                    }
                },
                didDrawPage: () => ensureLetterhead(),
            });

            y = (doc as any).lastAutoTable.finalY + 14;
            // autoTable may have added pages; keep our page tracking in sync
            ensureLetterhead();
        }
    }

    // ---- Verification (only if backend supplies verify_url) ----
    if (report.verify_url) {
        ensureSpace(130);
        doc.setDrawColor(...RULE);
        doc.setLineWidth(0.5);
        doc.line(PAGE_MARGIN, y, pageW - PAGE_MARGIN, y);
        y += 16;

        const qr = await QRCode.toDataURL(report.verify_url, {
            errorCorrectionLevel: 'M',
            margin: 1,
            width: 240,
            color: { dark: '#111111', light: '#ffffff' },
        });
        const size = 80;
        doc.addImage(qr, 'PNG', PAGE_MARGIN, y, size, size);
        const tx = PAGE_MARGIN + size + 16;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...INK);
        doc.text('Verify this report', tx, y + 14);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...MUTED);
        [
            'Scan the QR code to confirm this document was issued by our system.',
            `Report ID: ${reportId}`,
            report.signature
                ? `Signature: ${report.signature.slice(0, 24)}…`
                : '',
            report.verify_url,
        ]
            .filter(Boolean)
            .forEach((l, i) =>
                doc.text(l, tx, y + 30 + i * 11, {
                    maxWidth: contentW - size - 16,
                }),
            );
        y += size + 20;
    }

    // ---- Closing notice ----
    ensureSpace(40);
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.5);
    doc.line(PAGE_MARGIN, y, pageW - PAGE_MARGIN, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(
        `${HOSPITAL.name} · ${HOSPITAL.addressLine1}, ${HOSPITAL.addressLine2} · Tel ${HOSPITAL.phone}. ` +
            `This document is computer-generated. Please contact ${department.toLowerCase()} support if there are discrepancies.`,
        PAGE_MARGIN,
        y,
        { maxWidth: contentW },
    );

    // ---- Page footer on every page ----
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...MUTED);
        doc.text(`Page ${i} of ${pages}`, pageW - PAGE_MARGIN, pageH - 24, {
            align: 'right',
        });
        doc.text(`${reportId}  |  ${rangeLabel(p)}`, PAGE_MARGIN, pageH - 24);
    }

    doc.save(filename);
}

// ============================================
// PUBLIC ENTRY POINT
// ============================================

/**
 * @param endpoint  the report's route segment (daily-revenue | billing-invoicing | insurance)
 * @param payload   the FULL response body ({success, message, data}) or just its `data`
 */
export async function generateReceptionReportPdf(
    endpoint: ReportEndpoint | string,
    payload: ApiEnvelope | any,
    filename: string,
    opts?: PdfOptions,
): Promise<void> {
    const data =
        payload?.data && payload?.success !== undefined
            ? payload.data
            : payload;
    const build = BUILDERS[endpoint as ReportEndpoint];
    if (!build) throw new Error(`No PDF template registered for "${endpoint}"`);
    if (!data?.period) throw new Error('Report response is missing "period".');

    await renderReportPdf(build(data), filename, opts);
}
