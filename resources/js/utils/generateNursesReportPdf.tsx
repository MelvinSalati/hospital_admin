import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

// ============================================
// API TYPES
// ============================================

export type NursesReportEndpoint =
    | 'patients-seen-department'
    | 'patients-cash'
    | 'patients-insurance';

export interface ApiEnvelope<T = any> {
    success: boolean;
    message?: string;
    data: T;
}

export interface ReportPeriod {
    from: string;
    to: string;
    generated_at?: string;
}

// ============================================
// INTERNAL DOCUMENT MODEL
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
    department?: string;
    generatedBy?: string;
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
const HEADER_H = 94;
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

// ============================================
// BUILDERS – one per nurses report
// ============================================

function buildPatientsSeenDepartment(d: any): ReportDocument {
    const summary = d.summary ?? {};
    const byDay: any[] = d.by_day ?? [];
    const byGender: any = d.by_gender ?? {};
    const byAgeGroup: any[] = d.by_age_group ?? [];
    const byNurse: any[] = d.by_nurse ?? [];
    const details: any[] = d.details ?? [];

    // Normalise gender map (could be object or array)
    const genderMap: Record<string, number> = {};
    if (Array.isArray(byGender)) {
        byGender.forEach((g: any) => {
            genderMap[String(g.gender || '').toLowerCase()] = num(g.visits);
        });
    } else {
        Object.entries(byGender).forEach(([k, v]: [string, any]) => {
            genderMap[k.toLowerCase()] = num(v.visits ?? v);
        });
    }

    const sections: Section[] = [
        {
            kind: 'kpis',
            items: [
                {
                    label: 'Total Visits',
                    value: String(num(summary.total_visits)),
                },
                {
                    label: 'Unique Patients',
                    value: String(num(summary.unique_patients)),
                },
                {
                    label: 'Male',
                    value: String(num(summary.male ?? genderMap.male)),
                },
                {
                    label: 'Female',
                    value: String(num(summary.female ?? genderMap.female)),
                },
            ],
        },
    ];

    // By Day
    if (byDay.length) {
        sections.push(
            { kind: 'heading', text: 'Patients by Day' },
            {
                kind: 'table',
                headers: ['Date', 'Visits', 'Patients'],
                rows: byDay.map((r) => [
                    fmtDate(r.date),
                    num(r.visits),
                    num(r.patients),
                ]),
                foot: [
                    'Total',
                    byDay.reduce((a, r) => a + num(r.visits), 0),
                    byDay.reduce((a, r) => a + num(r.patients), 0),
                ],
                align: ['left', 'right', 'right'],
            },
        );
    }

    // By Age Group
    if (byAgeGroup.length) {
        sections.push(
            { kind: 'heading', text: 'Patients by Age Group' },
            {
                kind: 'table',
                headers: ['Age Group', 'Visits'],
                rows: byAgeGroup.map((r) => [
                    r.age_group ?? '-',
                    num(r.visits),
                ]),
                align: ['left', 'right'],
            },
        );
    }

    // By Attending Nurse
    if (byNurse.length) {
        sections.push(
            { kind: 'heading', text: 'Patients by Attending Nurse' },
            {
                kind: 'table',
                headers: ['Nurse', 'Visits', 'Patients'],
                rows: byNurse.map((r) => [
                    r.nurse_name ?? 'Unassigned',
                    num(r.visits),
                    num(r.patients),
                ]),
                foot: [
                    'Total',
                    byNurse.reduce((a, r) => a + num(r.visits), 0),
                    byNurse.reduce((a, r) => a + num(r.patients), 0),
                ],
                align: ['left', 'right', 'right'],
            },
        );
    }

    // Detailed list
    if (details.length) {
        sections.push(
            { kind: 'heading', text: 'Detailed Patient List' },
            {
                kind: 'table',
                headers: [
                    '#',
                    'Date',
                    'Patient',
                    'Gender',
                    'Age',
                    'Nurse',
                    'Status',
                ],
                rows: details.map((r, i) => [
                    i + 1,
                    fmtDate(r.visit_date),
                    r.patient_name ?? '-',
                    cap(r.gender),
                    r.age ?? '-',
                    r.nurse_name ?? 'Unassigned',
                    cap(r.status),
                ]),
                align: [
                    'left',
                    'left',
                    'left',
                    'left',
                    'right',
                    'left',
                    'center',
                ],
                fontSize: 8,
            },
        );
    }

    return {
        title: d.title ?? 'Patients Seen in Department',
        period: {
            from: d.period?.from ?? '',
            to: d.period?.to ?? '',
            generated_at:
                d.period?.generated_at ??
                new Date().toISOString().slice(0, 19).replace('T', ' '),
        },
        sections,
    };
}

function buildPatientsCash(d: any): ReportDocument {
    const summary = d.summary ?? {};
    const dailyTotals: any[] = d.daily_totals ?? [];
    const byProcedure: any[] = d.by_procedure ?? [];
    const details: any[] = d.details ?? [];

    const sections: Section[] = [
        {
            kind: 'kpis',
            items: [
                {
                    label: 'Total Cash',
                    value: fmtMoney(summary.total_cash),
                    tone: 'good',
                },
                {
                    label: 'Visits',
                    value: String(num(summary.total_visits)),
                },
                {
                    label: 'Receipts',
                    value: String(num(summary.total_receipts)),
                },
            ],
        },
    ];

    // Daily cash totals
    if (dailyTotals.length) {
        sections.push(
            { kind: 'heading', text: 'Daily Cash Totals' },
            {
                kind: 'table',
                headers: ['Date', 'Visits', 'Receipts', 'Cash Collected'],
                rows: dailyTotals.map((r) => [
                    fmtDate(r.date),
                    num(r.visits),
                    num(r.receipts),
                    fmtMoney(r.total_cash),
                ]),
                foot: [
                    'Total',
                    dailyTotals.reduce((a, r) => a + num(r.visits), 0),
                    dailyTotals.reduce((a, r) => a + num(r.receipts), 0),
                    fmtMoney(summary.total_cash),
                ],
                align: ['left', 'right', 'right', 'right'],
            },
        );
    }

    // By procedure
    if (byProcedure.length) {
        sections.push(
            { kind: 'heading', text: 'Collections by Procedure' },
            {
                kind: 'table',
                headers: ['Procedure', 'Visits', 'Amount Collected'],
                rows: byProcedure.map((r) => [
                    r.procedure_name ?? 'General / Unspecified',
                    num(r.visits),
                    fmtMoney(r.amount_collected),
                ]),
                foot: [
                    'Total',
                    byProcedure.reduce((a, r) => a + num(r.visits), 0),
                    fmtMoney(
                        byProcedure.reduce(
                            (a, r) => a + num(r.amount_collected),
                            0,
                        ),
                    ),
                ],
                align: ['left', 'right', 'right'],
            },
        );
    }

    // Detailed receipts
    if (details.length) {
        sections.push(
            { kind: 'heading', text: 'Cash Receipts Detail' },
            {
                kind: 'table',
                headers: [
                    '#',
                    'Date',
                    'Patient',
                    'Receipt No.',
                    'Procedure',
                    'Amount',
                ],
                rows: details.map((r, i) => [
                    i + 1,
                    fmtDate(r.visit_date ?? r.paid_at),
                    r.patient_name ?? '-',
                    r.receipt_number ?? '-',
                    r.procedure_name ?? '-',
                    fmtMoney(r.amount ?? r.procedure_amount),
                ]),
                foot: ['', '', '', '', 'Total', fmtMoney(summary.total_cash)],
                align: ['left', 'left', 'left', 'left', 'left', 'right'],
                fontSize: 8,
            },
        );
    }

    return {
        title: d.title ?? 'Patients Seen — Cash Paying',
        period: {
            from: d.period?.from ?? '',
            to: d.period?.to ?? '',
            generated_at:
                d.period?.generated_at ??
                new Date().toISOString().slice(0, 19).replace('T', ' '),
        },
        sections,
    };
}

function buildPatientsInsurance(d: any): ReportDocument {
    const summary = d.summary ?? {};
    const byPayer: any[] = d.by_payer ?? [];
    const byProcedure: any[] = d.by_procedure ?? [];
    const details: any[] = d.details ?? [];

    const sections: Section[] = [
        {
            kind: 'kpis',
            items: [
                {
                    label: 'Total Claimed',
                    value: fmtMoney(summary.total_claimed),
                    tone: 'good',
                },
                {
                    label: 'Visits',
                    value: String(num(summary.total_visits)),
                },
                {
                    label: 'Claims',
                    value: String(num(summary.total_claims)),
                },
            ],
        },
    ];

    // By payer / scheme
    if (byPayer.length) {
        sections.push(
            { kind: 'heading', text: 'Claims by Insurance Provider / Scheme' },
            {
                kind: 'table',
                headers: ['Provider / Scheme', 'Visits', 'Claims', 'Amount'],
                rows: byPayer.map((r) => [
                    r.payer ?? 'Unknown',
                    num(r.visits),
                    num(r.claims),
                    fmtMoney(r.total_claimed),
                ]),
                foot: [
                    'Total',
                    byPayer.reduce((a, r) => a + num(r.visits), 0),
                    byPayer.reduce((a, r) => a + num(r.claims), 0),
                    fmtMoney(summary.total_claimed),
                ],
                align: ['left', 'right', 'right', 'right'],
            },
        );
    }

    // By procedure
    if (byProcedure.length) {
        sections.push(
            { kind: 'heading', text: 'Claims by Procedure' },
            {
                kind: 'table',
                headers: ['Procedure', 'Visits', 'Amount Claimed'],
                rows: byProcedure.map((r) => [
                    r.procedure_name ?? 'General / Unspecified',
                    num(r.visits),
                    fmtMoney(r.amount_claimed),
                ]),
                foot: [
                    'Total',
                    byProcedure.reduce((a, r) => a + num(r.visits), 0),
                    fmtMoney(
                        byProcedure.reduce(
                            (a, r) => a + num(r.amount_claimed),
                            0,
                        ),
                    ),
                ],
                align: ['left', 'right', 'right'],
            },
        );
    }

    // Detailed claims
    if (details.length) {
        sections.push(
            { kind: 'heading', text: 'Insurance Claims Detail' },
            {
                kind: 'table',
                headers: [
                    '#',
                    'Date',
                    'Patient',
                    'Payer',
                    'Claim Ref',
                    'Procedure',
                    'Amount',
                ],
                rows: details.map((r, i) => [
                    i + 1,
                    fmtDate(r.visit_date ?? r.paid_at),
                    r.patient_name ?? '-',
                    r.payer ?? '-',
                    r.claim_reference ?? '-',
                    r.procedure_name ?? '-',
                    fmtMoney(r.amount ?? r.procedure_amount),
                ]),
                foot: [
                    '',
                    '',
                    '',
                    '',
                    '',
                    'Total',
                    fmtMoney(summary.total_claimed),
                ],
                align: [
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
    }

    return {
        title: d.title ?? 'Patients Seen — Insurance',
        period: {
            from: d.period?.from ?? '',
            to: d.period?.to ?? '',
            generated_at:
                d.period?.generated_at ??
                new Date().toISOString().slice(0, 19).replace('T', ' '),
        },
        sections,
    };
}

const BUILDERS: Record<NursesReportEndpoint, (d: any) => ReportDocument> = {
    'patients-seen-department': buildPatientsSeenDepartment,
    'patients-cash': buildPatientsCash,
    'patients-insurance': buildPatientsInsurance,
};

// ============================================
// RENDERER (shared with reception style)
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
    const department = opts.department ?? 'Nursing';
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
    let y = HEADER_H;
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
        `NUR-${(p.from || '').replace(/-/g, '')}-${(p.generated_at || '')
            .replace(/\D/g, '')
            .slice(-6)}`;

    ensureLetterhead();
    y = HEADER_H;

    // Attn block
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    [
        `Attn: ${department}`,
        `Report Ref: ${reportId}`,
        `Period: ${rangeLabel(p)}`,
        `Generated: ${p.generated_at ?? '-'}${
            opts.generatedBy ? `  by ${opts.generatedBy}` : ''
        }`,
    ].forEach((l) => {
        doc.text(l, pageW - PAGE_MARGIN, y, { align: 'right' });
        y += 14;
    });
    y += 6;

    // Title
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

    // Sections
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
                didDrawPage: () => ensureLetterhead(),
            });

            y = (doc as any).lastAutoTable.finalY + 14;
            ensureLetterhead();
        }
    }

    // Verification QR (optional)
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

    // Closing notice
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

    // Page footer
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
 * Generate a PDF for any of the three nurses reports.
 *
 * @param endpoint  patients-seen-department | patients-cash | patients-insurance
 * @param payload   full API response ({ success, data }) or just the `data` object
 */
export async function generateNursesReportPdf(
    endpoint: NursesReportEndpoint | string,
    payload: ApiEnvelope | any,
    filename: string,
    opts?: PdfOptions,
): Promise<void> {
    const data =
        payload?.data && payload?.success !== undefined
            ? payload.data
            : payload;

    const build = BUILDERS[endpoint as NursesReportEndpoint];
    if (!build) {
        throw new Error(`No PDF template registered for "${endpoint}"`);
    }
    if (!data?.period) {
        throw new Error('Report response is missing "period".');
    }

    await renderReportPdf(build(data), filename, {
        department: opts?.department ?? 'Nursing',
        generatedBy: opts?.generatedBy,
    });
}
