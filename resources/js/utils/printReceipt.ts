/**
 * Thermal receipt printing for prescriptions / dispensing.
 *
 * Save as: resources/js/lib/printReceipt.ts
 *
 * Built for monochrome thermal printers (Epson TM-T20/T82/T88 and similar):
 *  - monospace font, black on white only (no colours, shadows or backgrounds)
 *  - paper width via @page (80mm roll by default, 58mm supported)
 *  - rows are flex lines, so nothing depends on counting characters
 *  - printed through a hidden iframe, so the app page is never touched
 */

// ─── Facility details (edit once, used on every receipt) ─────────────────────

export const RECEIPT_FACILITY = {
    // TODO: replace with your facility / pharmacy name
    name: 'PHARMACY',
    addressLines: [
        'Plot 21/22, Parerenyatwa Road',
        '(also Pererinyatwa Street)',
        'North Area, Chipata',
        'Eastern Province, Zambia',
        'Opposite Wildlife',
    ],
    currency: 'ZMW',
};

// ─── Types ───────────────────────────────────────────────────────────────────

export type PaperWidth = 58 | 80;

export interface ReceiptLine {
    name: string;
    detail?: string;
    /** Prescribed quantity */
    qty: number;
    /** Quantity handed out (dispensing receipts only) */
    dispensedQty?: number;
    price: number;
}

export interface ReceiptData {
    /** 'prescription' = what was prescribed, 'dispensing' = what was handed out */
    type: 'prescription' | 'dispensing';
    number: string;
    patientName?: string;
    patientNumber?: string;
    status?: string;
    priority?: string;
    /** Prescription date, already formatted */
    date?: string;
    lines: ReceiptLine[];
    total: number;
    dispensedBy?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const esc = (value: unknown): string =>
    String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

const money = (n: number): string =>
    `${RECEIPT_FACILITY.currency} ${(Number.isFinite(n) ? n : 0).toFixed(2)}`;

const row = (left: string, right: string, bold = false): string =>
    `<div class="row${bold ? ' b' : ''}"><span>${esc(left)}</span><span class="r">${esc(right)}</span></div>`;

const buildHtml = (data: ReceiptData, paper: PaperWidth): string => {
    // Printable width: 72mm on an 80mm roll, 48mm on a 58mm roll
    const printable = paper === 80 ? 72 : 48;
    const fontSize = paper === 80 ? 11 : 10;
    const title =
        data.type === 'dispensing' ? 'DISPENSING RECEIPT' : 'PRESCRIPTION';
    const printedAt = new Date().toLocaleString('en-GB');

    const lines = data.lines
        .map((l, i) => {
            const qtyText =
                data.type === 'dispensing'
                    ? `Qty ${l.dispensedQty ?? 0} of ${l.qty}`
                    : `Qty ${l.qty}`;
            return `
        <div class="item">
            <div class="b">${i + 1}. ${esc(l.name)}</div>
            ${l.detail ? `<div class="sm">${esc(l.detail)}</div>` : ''}
            ${row(qtyText, money(l.price))}
        </div>`;
        })
        .join('');

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(title)} ${esc(data.number)}</title>
<style>
    @page { size: ${paper}mm auto; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { background: #fff; color: #000; }
    body {
        width: ${printable}mm;
        margin: 0 auto;
        padding: 3mm 0 10mm;
        font-family: "Courier New", Courier, "Lucida Console", monospace;
        font-size: ${fontSize}px;
        line-height: 1.35;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    .c { text-align: center; }
    .b { font-weight: bold; }
    .sm { font-size: ${fontSize - 1}px; }
    .r { text-align: right; white-space: nowrap; }
    .row { display: flex; justify-content: space-between; gap: 2mm; }
    .row > span:first-child { min-width: 0; overflow-wrap: anywhere; }
    .hr { border-top: 1px dashed #000; margin: 2mm 0; }
    .hr.solid { border-top-style: solid; }
    .name { font-size: ${fontSize + 3}px; font-weight: bold; letter-spacing: 0.5px; }
    .title { font-size: ${fontSize + 1}px; font-weight: bold; letter-spacing: 1px; }
    .item { margin-bottom: 1.5mm; break-inside: avoid; }
    .total { font-size: ${fontSize + 2}px; }
    .sign { margin-top: 6mm; }
</style>
</head>
<body>
    <div class="c">
        <div class="name">${esc(RECEIPT_FACILITY.name)}</div>
        ${RECEIPT_FACILITY.addressLines
            .map((l) => `<div class="sm">${esc(l)}</div>`)
            .join('')}
    </div>

    <div class="hr solid"></div>
    <div class="c title">${esc(title)}</div>
    <div class="hr solid"></div>

    ${row('Rx No:', data.number)}
    ${data.patientName ? row('Patient:', data.patientName) : ''}
    ${data.patientNumber ? row('Patient No:', data.patientNumber) : ''}
    ${data.date ? row('Date:', data.date) : ''}
    ${data.priority ? row('Priority:', data.priority.toUpperCase()) : ''}
    ${data.status ? row('Status:', data.status.replace(/_/g, ' ').toUpperCase()) : ''}

    <div class="hr"></div>
    ${lines || '<div class="c">No items</div>'}
    <div class="hr"></div>

    <div class="total">${row('TOTAL', money(data.total), true)}</div>

    <div class="hr"></div>
    ${
        data.type === 'dispensing'
            ? `${data.dispensedBy ? row('Dispensed by:', data.dispensedBy) : ''}
               <div class="sign">Signature: ____________________</div>`
            : `<div class="sign">Pharmacist: ____________________</div>`
    }

    <div class="hr"></div>
    <div class="c sm">Printed: ${esc(printedAt)}</div>
    <div class="c sm">Keep this receipt for your records.</div>
    <div class="c sm">Thank you.</div>
</body>
</html>`;
};

// ─── Public API ──────────────────────────────────────────────────────────────

export function printReceipt(data: ReceiptData, paper: PaperWidth = 80): void {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText =
        'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc || !iframe.contentWindow) {
        iframe.remove();
        return;
    }

    const cleanup = () => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    };

    doc.open();
    doc.write(buildHtml(data, paper));
    doc.close();

    // Give the iframe a moment to lay out before opening the print dialog
    setTimeout(() => {
        const win = iframe.contentWindow;
        if (!win) {
            cleanup();
            return;
        }
        win.onafterprint = cleanup;
        win.focus();
        win.print();
        // Fallback in case afterprint never fires
        setTimeout(cleanup, 60000);
    }, 250);
}
