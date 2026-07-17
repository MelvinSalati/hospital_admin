/**
 * POSpro-style receipt + invoice templates for Bills component.
 *
 * ── RECEIPT (after payment) ───────────────────────────────────────────────────
 * import { buildPOSproReceiptHTML } from './POSproReceiptTemplate';
 *
 * const printReceipt = (invoice, paymentDetails, patientInfo = {}) => {
 *     const w = window.open('', '_blank');
 *     if (!w) { alert('Please allow pop-ups'); return; }
 *     w.document.write(buildPOSproReceiptHTML(invoice, paymentDetails, patientInfo));
 *     w.document.close();
 * };
 *
 * ── INVOICE (before payment) ──────────────────────────────────────────────────
 * import { buildPOSproInvoiceHTML } from './POSproReceiptTemplate';
 *
 * const printInvoice = (invoice) => {
 *     const w = window.open('', '_blank');
 *     if (!w) { alert('Please allow pop-ups'); return; }
 *     w.document.write(buildPOSproInvoiceHTML(invoice, patientId));
 *     w.document.close();
 * };
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (amount) =>
    new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
    }).format(amount || 0);

const fmtDate = (d) =>
    new Date(d).toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });

const fmtTime = (d) =>
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

const parseItems = (invoice) => {
    try {
        const raw = invoice.items;
        if (!raw) return [];
        return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
        return [];
    }
};

const paymentLabel = (method) => {
    const map = {
        cash: 'Cash',
        mobile_money: 'Mobile Money',
        card: 'Card',
        bank_transfer: 'Bank Transfer',
    };
    return map[method] || (method ? method.replace(/_/g, ' ') : 'Cash');
};

// ZMW currency formatter (for invoices — pre-payment)
const fmtZMW = (amount) =>
    new Intl.NumberFormat('en-ZM', {
        style: 'currency',
        currency: 'ZMW',
        minimumFractionDigits: 2,
    }).format(amount || 0);

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background: #f4f4f4;
        display: flex;
        justify-content: center;
        padding: 28px 16px;
        min-height: 100vh;
    }

    .inv {
        width: 100%;
        max-width: 760px;
        background: #fff;
        border: 1px solid #ddd;
        border-radius: 6px;
        overflow: hidden;
        height: fit-content;
    }

    /* ── Title bar ── */
    .inv-title {
        text-align: center;
        font-size: 22px;
        font-weight: 700;
        padding: 18px 0;
        border-bottom: 1px solid #ddd;
        letter-spacing: 0.02em;
    }

    /* ── Header: logo | meta ── */
    .inv-header {
        display: grid;
        grid-template-columns: 1fr 1fr;
        border-bottom: 1px solid #ddd;
    }
    .inv-logo-cell {
        padding: 16px 20px;
        border-right: 1px solid #ddd;
        display: flex;
        align-items: center;
        gap: 12px;
    }
    .logo-circle {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: #D85A30;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }
    .logo-inner {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        border: 3px solid #fff;
    }
    .logo-text { line-height: 1.3; }
    .logo-name { font-size: 15px; font-weight: 700; color: #111; }
    .logo-tag  { font-size: 11px; color: #888; font-style: italic; }

    .inv-meta {
        display: grid;
        grid-template-columns: 1fr 1fr;
    }
    .inv-meta-cell {
        padding: 12px 16px;
        border-bottom: 1px solid #ddd;
        border-right: 1px solid #ddd;
    }
    .inv-meta-cell:nth-child(even) { border-right: none; }
    .inv-meta-cell.span2 {
        grid-column: 1 / -1;
        border-bottom: none;
        border-right: none;
    }
    .meta-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px; }
    .meta-val   { font-size: 13px; font-weight: 600; color: #222; }

    .badge {
        display: inline-block;
        font-size: 11px;
        font-weight: 600;
        padding: 2px 10px;
        border-radius: 20px;
        background: #e6f7ee;
        color: #0F6E56;
        border: 1px solid #9de0c4;
    }

    /* ── Party rows ── */
    .inv-parties {
        display: grid;
        grid-template-columns: 1fr 1fr;
        border-bottom: 1px solid #ddd;
    }
    .inv-party { padding: 16px 20px; }
    .inv-party + .inv-party { border-left: 1px solid #ddd; }
    .party-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #888; margin-bottom: 6px; }
    .party-name  { font-size: 14px; font-weight: 700; color: #111; margin-bottom: 4px; }
    .party-detail { font-size: 12px; color: #555; line-height: 1.6; }

    /* ── Items table ── */
    .inv-table {
        width: 100%;
        border-collapse: collapse;
    }
    .inv-table thead tr { background: #f9f9f9; }
    .inv-table th {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-weight: 600;
        color: #555;
        padding: 10px 20px;
        text-align: left;
        border-bottom: 1px solid #ddd;
    }
    .inv-table th.r { text-align: right; }
    .inv-table th.c { text-align: center; }
    .inv-table td {
        font-size: 13px;
        padding: 11px 20px;
        border-bottom: 1px solid #eee;
        color: #222;
        vertical-align: middle;
    }
    .inv-table td.r { text-align: right; }
    .inv-table td.c { text-align: center; }
    .inv-table tbody tr:last-child td { border-bottom: none; }

    /* ── Footer: note + totals ── */
    .inv-footer {
        display: grid;
        grid-template-columns: 1fr auto;
        border-top: 1px solid #ddd;
    }
    .inv-note {
        padding: 16px 20px;
        border-right: 1px solid #ddd;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        gap: 6px;
    }
    .inv-note p   { font-size: 12px; color: #777; font-style: italic; }
    .inv-note .paid { font-size: 13px; font-weight: 600; color: #222; }

    .inv-totals { padding: 16px 20px; min-width: 250px; }
    .total-row {
        display: flex;
        justify-content: space-between;
        gap: 28px;
        font-size: 13px;
        color: #555;
        margin-bottom: 5px;
    }
    .total-row.strong {
        font-size: 14px;
        font-weight: 700;
        color: #111;
        border-top: 1px solid #ddd;
        padding-top: 7px;
        margin-top: 4px;
    }
    .total-row.due { color: #A32D2D; font-weight: 700; }
    .tval { font-variant-numeric: tabular-nums; }

    /* ── Signatures ── */
    .inv-sigs {
        display: grid;
        grid-template-columns: 1fr 1fr;
        border-top: 1px solid #ddd;
    }
    .inv-sig { padding: 12px 20px 16px; }
    .inv-sig + .inv-sig { border-left: 1px solid #ddd; text-align: right; }
    .sig-line {
        border-top: 1px solid #bbb;
        margin-top: 32px;
        padding-top: 5px;
        font-size: 11px;
        color: #888;
    }

    /* ── Warranty ── */
    .inv-warranty {
        background: #f9f9f9;
        border-top: 1px solid #ddd;
        padding: 10px 20px;
        font-size: 11px;
        color: #888;
    }
    .inv-warranty strong { font-weight: 700; color: #555; }

    @media print {
        body { background: #fff; padding: 0; }
        .inv { border: none; border-radius: 0; max-width: 100%; }
    }
`;

// ─── HTML builder ─────────────────────────────────────────────────────────────

export function buildPOSproReceiptHTML(invoice, paymentDetails, patientInfo = {}) {
    const items       = parseItems(invoice);
    const now         = new Date();
    const method      = paymentDetails.method || 'cash';
    const amountDue   = paymentDetails.amountDue || 0;
    const discount    = paymentDetails.discount || 0;
    const tendered    = paymentDetails.tenderedAmount;
    const change      = paymentDetails.changeAmount || 0;
    const txRef       = paymentDetails.transactionId || '';
    const mobileNum   = paymentDetails.mobileMoneyNumber || '';

    // Subtotal from items or fall back to amountDue
    const subtotal = items.length
        ? items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0)
        : amountDue;

    const due = tendered != null ? Math.max(0, amountDue - tendered) : 0;

    const rowsHTML = items.length
        ? items.map((item, idx) => `
            <tr>
                <td class="c" style="color:#aaa;">${idx + 1}</td>
                <td style="font-weight:600;">${item.name || item.description || 'Healthcare Service'}</td>
                <td class="c">${item.quantity || 1}</td>
                <td class="r">${fmt((item.price || 0))}</td>
                <td class="r">${fmt((item.price || 0) * (item.quantity || 1))}</td>
            </tr>`)
            .join('')
        : `<tr>
                <td class="c" style="color:#aaa;">1</td>
                <td style="font-weight:600;">Healthcare Services</td>
                <td class="c">1</td>
                <td class="r">${fmt(amountDue)}</td>
                <td class="r">${fmt(amountDue)}</td>
           </tr>`;

    const extraTotals = method === 'cash' && tendered != null ? `
        <div class="total-row"><span>Received Amount</span><span class="tval">${fmt(tendered)}</span></div>
        ${due > 0 ? `<div class="total-row due"><span>Due</span><span class="tval">${fmt(due)}</span></div>` : ''}
        ${change > 0 ? `<div class="total-row"><span>Change</span><span class="tval">${fmt(change)}</span></div>` : ''}
    ` : method === 'mobile_money' ? `
        <div class="total-row"><span>Mobile No.</span><span class="tval">${mobileNum || 'N/A'}</span></div>
        ${txRef ? `<div class="total-row"><span>Txn Ref</span><span class="tval">${txRef}</span></div>` : ''}
    ` : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Receipt — ${invoice.invoice_number || `INV-${invoice.id}`}</title>
    <style>${CSS}</style>
</head>
<body>
<div class="inv">

    <div class="inv-title">Tax Invoice</div>

    <div class="inv-header">
        <div class="inv-logo-cell">
            <div class="logo-circle"><div class="logo-inner"></div></div>
            <div class="logo-text">
                <div class="logo-name">Altaf Memorial Hospital</div>
                <div class="logo-tag">Quality Healthcare Services</div>
            </div>
        </div>
        <div class="inv-meta">
            <div class="inv-meta-cell">
                <div class="meta-label">Invoice No.</div>
                <div class="meta-val">${invoice.invoice_number || `INV-${invoice.id}`}</div>
            </div>
            <div class="inv-meta-cell">
                <div class="meta-label">Invoice Date</div>
                <div class="meta-val">${fmtDate(now)}, ${fmtTime(now)}</div>
            </div>
            <div class="inv-meta-cell span2">
                <div class="meta-label">Mode / Terms of Payment</div>
                <div class="meta-val"><span class="badge">${paymentLabel(method)}</span></div>
            </div>
        </div>
    </div>

    <div class="inv-parties">
        <div class="inv-party">
            <div class="party-label">Main Branch</div>
            <div class="party-name">Altaf Memorial Hospital</div>
            <div class="party-detail">
                21/22 Parirenyatwa Road, Moth Area<br>
                Chipata, Eastern Province, Zambia<br>
                Tel: +260 977 679 800
            </div>
        </div>
        <div class="inv-party">
            <div class="party-label">Bill To</div>
            <div class="party-name">${patientInfo.name || invoice.patient_name || 'Patient'}</div>
            <div class="party-detail">
                ${patientInfo.address || invoice.patient_address || '—'}<br>
                Phone: ${patientInfo.phone || invoice.patient_phone || 'N/A'}<br>
                Email: ${patientInfo.email || invoice.patient_email || 'N/A'}
            </div>
        </div>
    </div>

    <table class="inv-table">
        <thead>
            <tr>
                <th class="c" style="width:44px;">SL</th>
                <th>Item Description</th>
                <th class="c" style="width:60px;">Qty</th>
                <th class="r" style="width:120px;">Taxable Value</th>
                <th class="r" style="width:140px;">Total Price (incl. tax)</th>
            </tr>
        </thead>
        <tbody>${rowsHTML}</tbody>
    </table>

    <div class="inv-footer">
        <div class="inv-note">
            <p>Note: Thank you for choosing Altaf Memorial Hospital.</p>
            <div class="paid">Paid By: ${paymentLabel(method)}</div>
        </div>
        <div class="inv-totals">
            <div class="total-row"><span>Subtotal</span><span class="tval">${fmt(subtotal)}</span></div>
            <div class="total-row"><span>GST / VAT</span><span class="tval">${fmt(0)}</span></div>
            <div class="total-row"><span>Shipping Charge</span><span class="tval">${fmt(0)}</span></div>
            <div class="total-row"><span>Discount</span><span class="tval">${fmt(discount)}</span></div>
            <div class="total-row strong"><span>Total Amount</span><span class="tval">${fmt(amountDue)}</span></div>
            <div class="total-row"><span>Rounding (+/-)</span><span class="tval">${fmt(0)}</span></div>
            <div class="total-row strong"><span>Payable Amount</span><span class="tval">${fmt(amountDue)}</span></div>
            ${extraTotals}
        </div>
    </div>

    <div class="inv-sigs">
        <div class="inv-sig"><div class="sig-line">Customer Signature</div></div>
        <div class="inv-sig"><div class="sig-line">Authorized Signature</div></div>
    </div>

    <div class="inv-warranty">
        <strong>Warranty Void</strong> — Any damaged by misuse, mishandling, unauthorized repair, water, burn, or short circuit.
    </div>

</div>
<script>
    window.onload = function () {
        window.print();
        setTimeout(function () { window.close(); }, 1200);
    };
<\/script>
</body>
</html>`;
}

// ─── Invoice builder (pre-payment / "Print Invoice" button) ───────────────────

export function buildPOSproInvoiceHTML(invoice, patientId = '') {
    const items    = parseItems(invoice);
    const subtotal = items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
    const total    = parseFloat(invoice.total) || subtotal;
    const scheme   = invoice.payment_scheme || 'cash';

    const statusBadgeColor = {
        paid:      { bg: '#e6f7ee', color: '#0F6E56', border: '#9de0c4' },
        completed: { bg: '#e6f7ee', color: '#0F6E56', border: '#9de0c4' },
        pending:   { bg: '#fff8e6', color: '#856404', border: '#ffd97d' },
        draft:     { bg: '#fdecea', color: '#A32D2D', border: '#f5a5a5' },
        unpaid:    { bg: '#fdecea', color: '#A32D2D', border: '#f5a5a5' },
    };
    const s = statusBadgeColor[(invoice.status || 'draft').toLowerCase()] || statusBadgeColor.draft;
    const statusStyle = `background:${s.bg};color:${s.color};border:1px solid ${s.border};`;

    const rowsHTML = items.length
        ? items.map((item, idx) => `
            <tr>
                <td class="c" style="color:#aaa;">${idx + 1}</td>
                <td>
                    <strong>${item.name || item.description || 'Medical Service'}</strong>
                    ${item.description && item.name
                        ? `<br><small style="color:#888;">${item.description}</small>`
                        : ''}
                </td>
                <td class="c">${item.quantity || 1}</td>
                <td class="r">${fmtZMW(item.price || 0)}</td>
                <td class="r">${fmtZMW((item.price || 0) * (item.quantity || 1))}</td>
            </tr>`)
            .join('')
        : `<tr><td colspan="5" style="text-align:center;color:#aaa;padding:20px;">No items available</td></tr>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice — ${invoice.invoice_number || `INV-${invoice.id}`}</title>
    <style>${CSS}</style>
</head>
<body>
<div class="inv">

    <div class="inv-title">Invoice</div>

    <div class="inv-header">
        <div class="inv-logo-cell">
            <div class="logo-circle"><div class="logo-inner"></div></div>
            <div class="logo-text">
                <div class="logo-name">Altaf Memorial Hospital</div>
                <div class="logo-tag">Quality Healthcare Services</div>
            </div>
        </div>
        <div class="inv-meta">
            <div class="inv-meta-cell">
                <div class="meta-label">Invoice No.</div>
                <div class="meta-val">${invoice.invoice_number || `INV-${invoice.id}`}</div>
            </div>
            <div class="inv-meta-cell">
                <div class="meta-label">Issue Date</div>
                <div class="meta-val">${fmtDate(invoice.issue_date)}</div>
            </div>
            <div class="inv-meta-cell">
                <div class="meta-label">Due Date</div>
                <div class="meta-val">${fmtDate(invoice.due_date)}</div>
            </div>
            <div class="inv-meta-cell">
                <div class="meta-label">Status</div>
                <div class="meta-val">
                    <span class="badge" style="${statusStyle}">
                        ${invoice.status === 'draft' ? 'Unpaid' : (invoice.status || 'Draft')}
                    </span>
                </div>
            </div>
            <div class="inv-meta-cell span2">
                <div class="meta-label">Payment Scheme</div>
                <div class="meta-val"><span class="badge">${paymentLabel(scheme)}</span></div>
            </div>
        </div>
    </div>

    <div class="inv-parties">
        <div class="inv-party">
            <div class="party-label">Main Branch</div>
            <div class="party-name">Altaf Memorial Hospital</div>
            <div class="party-detail">
                21/22 Parirenyatwa Road, Moth Area<br>
                Chipata, Eastern Province, Zambia<br>
                Tel: +260 977 679 800
            </div>
        </div>
        <div class="inv-party">
            <div class="party-label">Bill To</div>
            <div class="party-name">Patient ID: ${patientId || '—'}</div>
            <div class="party-detail">
                ${invoice.patient_name || '—'}<br>
                ${invoice.patient_address || '—'}<br>
                Phone: ${invoice.patient_phone || 'N/A'}
            </div>
        </div>
    </div>

    <table class="inv-table">
        <thead>
            <tr>
                <th class="c" style="width:44px;">SL</th>
                <th>Item Description</th>
                <th class="c" style="width:60px;">Qty</th>
                <th class="r" style="width:140px;">Unit Price (ZMW)</th>
                <th class="r" style="width:140px;">Total (ZMW)</th>
            </tr>
        </thead>
        <tbody>${rowsHTML}</tbody>
    </table>

    <div class="inv-footer">
        <div class="inv-note">
            <p>Note: Thank you for choosing Altaf Memorial Hospital.</p>
            <p style="margin-top:4px;">Get well soon!</p>
        </div>
        <div class="inv-totals">
            <div class="total-row"><span>Subtotal</span><span class="tval">${fmtZMW(subtotal)}</span></div>
            <div class="total-row"><span>Tax (VAT)</span><span class="tval">${fmtZMW(0)}</span></div>
            <div class="total-row"><span>Discount</span><span class="tval">${fmtZMW(invoice.discount || 0)}</span></div>
            <div class="total-row strong"><span>Total Amount</span><span class="tval">${fmtZMW(total)}</span></div>
        </div>
    </div>

    <div class="inv-sigs">
        <div class="inv-sig"><div class="sig-line">Customer Signature</div></div>
        <div class="inv-sig"><div class="sig-line">Authorized Signature</div></div>
    </div>

    <div class="inv-warranty">
        <strong>Warranty Void</strong> — Any damaged by misuse, mishandling, unauthorized repair, water, burn, or short circuit.
    </div>

</div>
<script>
    window.onload = function () {
        window.print();
        setTimeout(function () { window.close(); }, 1200);
    };
<\/script>
</body>
</html>`;
}