import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

// ============================================
// TYPES
// ============================================

export interface ReportMeta {
    title: string;
    department: string;
    range_label: string;
    from: string;
    to: string;
    generated_at: string;
    report_id: string;
    verify_url: string;
    signature?: string;
}

export interface PatientSeenRow {
    patient_no: string;
    name: string;
    gender: string;
    age: number | string;
    test: string;
    payment_type: string;
    time: string;
}

export interface CashRow {
    receipt_no: string;
    patient_no: string;
    patient_name: string;
    test: string;
    amount: number;
    collected_by: string;
    time: string;
}

export interface InsuranceRow {
    claim_no: string;
    patient_no: string;
    patient_name: string;
    payer: string;
    test: string;
    amount: number;
    time: string;
}

export interface ReportJson {
    meta: ReportMeta;
    summary: {
        total_seen: number;
        cash_patients: number;
        cash_amount: number;
        insurance_patients: number;
        insurance_amount: number;
    };
    patients_seen: PatientSeenRow[];
    cash_payments: CashRow[];
    insurance_payments: InsuranceRow[];
}

// ============================================
// HOSPITAL IDENTITY
// ============================================

const HOSPITAL = {
    name: 'ALTAF MEMORIAL HOSPITAL',
    tagline: 'Laboratory Department',
    addressLine1: 'Plot 21/22, Parerenyatwa Road',
    addressLine2: 'Chipata, Eastern Province, Zambia',
    postal: 'P.O. Box 510316, Chipata',
    phone: '+260 97 068 4418',
    hours: 'Open 24 Hours',
};

// ============================================
// STYLE CONSTANTS
// ============================================

const INK: [number, number, number] = [17, 17, 17];
const MUTED: [number, number, number] = [110, 110, 110];
const RULE: [number, number, number] = [210, 210, 210];
const ACCENT: [number, number, number] = [227, 30, 36];
const BRAND: [number, number, number] = [16, 62, 122];   // deep blue for hospital name

const PAGE_MARGIN = 48;
const LINE_HEIGHT = 14;

const fmtMoney = (n: number | null | undefined) =>
    `ZMW ${Number(n ?? 0).toLocaleString('en-ZM', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

// ============================================
// LETTERHEAD (drawn on every page)
// ============================================

function drawLetterhead(doc: jsPDF, pageW: number) {
    const startY = 34;

    // ---- Hospital name ----
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...BRAND);
    doc.text(HOSPITAL.name, PAGE_MARGIN, startY);

    // ---- Tagline ----
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(HOSPITAL.tagline, PAGE_MARGIN, startY + 13);

    // ---- Contact block (right-aligned, three lines) ----
    const contactLines = [
        `${HOSPITAL.addressLine1}, ${HOSPITAL.addressLine2}`,
        `${HOSPITAL.postal}  ·  Tel: ${HOSPITAL.phone}`,
        HOSPITAL.hours,
    ];
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    contactLines.forEach((line, i) => {
        doc.text(line, pageW - PAGE_MARGIN, startY + i * 10, { align: 'right' });
    });

    // ---- Divider ----
    const ruleY = startY + 40;
    doc.setDrawColor(...BRAND);
    doc.setLineWidth(1.2);
    doc.line(PAGE_MARGIN, ruleY, pageW - PAGE_MARGIN, ruleY);
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.4);
    doc.line(PAGE_MARGIN, ruleY + 3, pageW - PAGE_MARGIN, ruleY + 3);

    return ruleY + 20; // where content should start
}

// ============================================
// MAIN GENERATOR
// ============================================

export async function generateReportPdf(
    data: ReportJson,
    filename = 'laboratory-report.pdf',
): Promise<void> {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
    });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const contentW = pageW - PAGE_MARGIN * 2;

    // ========== PAGE 1: Letterhead + report header ==========
    let y = drawLetterhead(doc, pageW);

    // ---- Right-aligned "Attn" block ----
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...INK);

    const attnLines = [
        `Attn: ${data.meta.department}`,
        `Report Ref: ${data.meta.report_id}`,
        `Period: ${data.meta.range_label}`,
        `Generated: ${data.meta.generated_at}`,
    ];
    attnLines.forEach((line) => {
        doc.text(line, pageW - PAGE_MARGIN, y, { align: 'right' });
        y += LINE_HEIGHT;
    });

    y += 6;

    // ---- Document title ----
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...INK);
    doc.text(data.meta.title, PAGE_MARGIN, y);
    y += 14;

    // ---- Meta line (use 'to' not '→' to avoid encoding issues) ----
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    const metaRow = [
        `Report Date: ${data.meta.generated_at}`,
        `Range: ${data.meta.from} to ${data.meta.to}`,
    ];
    doc.text(metaRow.join('     |     '), PAGE_MARGIN, y);
    y += 20;

    // ---- Summary table ----
    autoTable(doc, {
        startY: y,
        head: [['Summary', 'Patients', 'Amount']],
        body: [
            ['Total Patients Seen', String(data.summary.total_seen), ''],
            ['Cash Payments', String(data.summary.cash_patients), fmtMoney(data.summary.cash_amount)],
            ['Insurance Claims', String(data.summary.insurance_patients), fmtMoney(data.summary.insurance_amount)],
        ],
        foot: [[
            'Total Laboratory Charges',
            String(data.summary.cash_patients + data.summary.insurance_patients),
            fmtMoney(data.summary.cash_amount + data.summary.insurance_amount),
        ]],
        theme: 'plain',
        styles: {
            font: 'helvetica',
            fontSize: 9.5,
            cellPadding: 6,
            textColor: INK,
            lineColor: RULE,
            lineWidth: 0,
        },
        headStyles: {
            fontStyle: 'bold',
            fontSize: 9,
            textColor: INK,
            lineColor: RULE,
            lineWidth: { bottom: 0.75 } as any,
        },
        bodyStyles: {
            lineColor: RULE,
            lineWidth: { bottom: 0.4 } as any,
        },
        footStyles: {
            fontStyle: 'bold',
            textColor: INK,
            lineColor: RULE,
            lineWidth: { top: 0.75, bottom: 0.75 } as any,
        },
        columnStyles: {
            0: { cellWidth: contentW - 200 },
            1: { cellWidth: 80, halign: 'right' },
            2: { cellWidth: 120, halign: 'right' },
        },
        margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    });

    y = (doc as any).lastAutoTable.finalY + 14;

    // ---- "Total Collected" banner ----
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.5);
    doc.line(PAGE_MARGIN, y, pageW - PAGE_MARGIN, y);
    y += 18;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...ACCENT);
    doc.text('Total Collected', PAGE_MARGIN, y);
    doc.setTextColor(...INK);
    doc.setFontSize(15);
    doc.text(
        fmtMoney(data.summary.cash_amount + data.summary.insurance_amount),
        pageW - PAGE_MARGIN,
        y,
        { align: 'right' },
    );
    y += 26;

    // ---- Section renderer ----
    const renderSection = (
        title: string,
        headers: string[],
        rows: (string | number)[][],
        footer?: (string | number)[],
        moneyCol?: number,
    ) => {
        if (!rows.length) return;

        // If near bottom of page, start new page (with letterhead again)
        if (y > pageH - 140) {
            doc.addPage();
            y = drawLetterhead(doc, pageW);
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...INK);
        doc.text(title, PAGE_MARGIN, y);
        y += 12;

        autoTable(doc, {
            startY: y,
            head: [headers],
            body: rows,
            foot: footer ? [footer] : undefined,
            theme: 'plain',
            styles: {
                font: 'helvetica',
                fontSize: 8.5,
                cellPadding: 5,
                textColor: INK,
                lineColor: RULE,
                lineWidth: 0,
                overflow: 'linebreak',
            },
            headStyles: {
                fontStyle: 'bold',
                textColor: INK,
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
                lineColor: RULE,
                lineWidth: { top: 0.75, bottom: 0.75 } as any,
            },
            columnStyles: moneyCol !== undefined
                ? { [moneyCol]: { halign: 'right' } }
                : {},
            margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
        });

        y = (doc as any).lastAutoTable.finalY + 14;
    };

    // --- Patients Seen ---
    renderSection(
        'Patients Seen',
        ['#', 'Patient No.', 'Name', 'Sex', 'Age', 'Test', 'Pay', 'Time'],
        data.patients_seen.map((p, i) => [
            i + 1,
            p.patient_no,
            p.name,
            p.gender,
            p.age,
            p.test,
            p.payment_type.toUpperCase(),
            p.time,
        ]),
    );

    // --- Cash ---
    const cashTotal = data.cash_payments.reduce((s, r) => s + (r.amount || 0), 0);
    renderSection(
        'Cash Payments',
        ['#', 'Receipt No.', 'Patient', 'Test', 'Collected By', 'Time', 'Amount'],
        data.cash_payments.map((r, i) => [
            i + 1,
            r.receipt_no,
            `${r.patient_name} (${r.patient_no})`,
            r.test,
            r.collected_by,
            r.time,
            fmtMoney(r.amount),
        ]),
        ['', '', '', '', '', 'Total', fmtMoney(cashTotal)],
        6,
    );

    // --- Insurance ---
    const insTotal = data.insurance_payments.reduce((s, r) => s + (r.amount || 0), 0);
    renderSection(
        'Insurance Claims',
        ['#', 'Claim No.', 'Patient', 'Payer', 'Test', 'Time', 'Amount'],
        data.insurance_payments.map((r, i) => [
            i + 1,
            r.claim_no,
            `${r.patient_name} (${r.patient_no})`,
            r.payer,
            r.test,
            r.time,
            fmtMoney(r.amount),
        ]),
        ['', '', '', '', '', 'Total', fmtMoney(insTotal)],
        6,
    );

    // ---- QR + authenticity ----
    if (y > pageH - 160) {
        doc.addPage();
        y = drawLetterhead(doc, pageW);
    }

    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.5);
    doc.line(PAGE_MARGIN, y, pageW - PAGE_MARGIN, y);
    y += 16;

    const qrSize = 88;
    const qrDataUrl = await QRCode.toDataURL(data.meta.verify_url, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 240,
        color: { dark: '#111111', light: '#ffffff' },
    });

    doc.addImage(qrDataUrl, 'PNG', PAGE_MARGIN, y, qrSize, qrSize);
    doc.setDrawColor(...RULE);
    doc.rect(PAGE_MARGIN, y, qrSize, qrSize);

    const textX = PAGE_MARGIN + qrSize + 16;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text('Verify this report', textX, y + 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    const verifyLines = [
        'Scan the QR code to confirm this document',
        'was issued by our laboratory system.',
        '',
        `Report ID: ${data.meta.report_id}`,
        `Signature: ${(data.meta.signature ?? '').slice(0, 24)}…`,
        data.meta.verify_url,
    ];
    verifyLines.forEach((line, i) => {
        doc.text(line, textX, y + 30 + i * 11, {
            maxWidth: contentW - qrSize - 16,
        });
    });

    y += qrSize + 20;

    // ---- Footer notice ----
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.5);
    doc.line(PAGE_MARGIN, y, pageW - PAGE_MARGIN, y);
    y += 14;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    const notice =
        `${HOSPITAL.name} · ${HOSPITAL.addressLine1}, ${HOSPITAL.addressLine2} · ` +
        `Tel ${HOSPITAL.phone}. This document is computer-generated. ` +
        `Please contact laboratory support if there are discrepancies.`;
    doc.text(notice, PAGE_MARGIN, y, { maxWidth: contentW });

    // ---- Page footer + letterhead on every page ----
    const pageCount = doc.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        doc.setFontSize(7.5);
        doc.setTextColor(...MUTED);
        doc.text(
            `Page ${p} of ${pageCount}`,
            pageW - PAGE_MARGIN,
            pageH - 24,
            { align: 'right' },
        );
        doc.text(
            `${data.meta.report_id}  |  ${data.meta.range_label}`,
            PAGE_MARGIN,
            pageH - 24,
        );
    }

    doc.save(filename);
}