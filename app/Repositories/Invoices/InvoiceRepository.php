<?php

namespace App\Repositories\Invoices;

use App\Models\Payments\Invoice;
use App\Models\Payments\Invoices\InvoiceItem;

class InvoiceRepository
{
    /**
     * Get the current invoice for a patient visit.
     */
    public function patientCurrentInvoice(
        string $visitToken,
        int $patientId
    ): ?Invoice {
        return Invoice::where('patient_id', $patientId)
            ->where('visit_token', $visitToken)
            ->first();
    }

    /**
     * Create a new invoice.
     */
    public function newInvoice(array $invoiceDetails): Invoice
    {
        return Invoice::create($invoiceDetails);
    }

    /**
     * Create a new invoice item.
     */
    public function createInvoiceItem(array $itemDetails): InvoiceItem
    {
        return InvoiceItem::create($itemDetails);
    }
}
