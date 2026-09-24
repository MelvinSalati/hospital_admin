<?php

namespace App\Services\Invoices;

use App\Helpers\NumberGenerator;
use App\Repositories\Invoices\InvoiceRepository;
use App\Services\Patients\PatientService;

class InvoiceService
{
    public function __construct(
        protected InvoiceRepository $invoiceRepository,
        protected PatientService $patientService,
    ) {}

    /**
     * Get the current invoice for the patient visit.
     */
    public function getCurrentInvoice(array $visitDetails): mixed
    {
        return $this->invoiceRepository->patientCurrentInvoice(
            $visitDetails['visit_token'],
            $visitDetails['patient_id']
        );
    }

    /**
     * Get customer details required for the invoice.
     */
    public function customerDetails(int $patientId): array
    {
        $customer = $this->patientService->getCustomerDetails($patientId);

        return [
            'customer_email' => $customer['email'],
            'customer_name'  => trim(
                $customer['first_name'] . ' ' . $customer['last_name']
            ),
            'customer_phone' => $customer['phone_number'],
        ];
    }

    /**
     * Create a new invoice when required and append invoice items.
     */
    public function appendNewInvoice(array $visitDetails): mixed
    {
        $currentInvoice = $this->getCurrentInvoice($visitDetails);

        if ($currentInvoice) {
            foreach ($visitDetails['items'] as $item) {
                $invoiceItem = [
                    'invoice_id'  => $currentInvoice->id,
                    'item_type'   => $item['item_type'],
                    'item_id'     => $item['item_id'] ?? null,
                    'description' => $item['description'],
                    'quantity'    => $item['quantity'],
                    'unit_price'  => $item['unit_price'],
                    'total'       => $item['quantity'] * $item['unit_price'],
                ];

                $this->invoiceRepository->createInvoiceItem($invoiceItem);
            }

            return $currentInvoice->fresh('items');
        }

        $invoiceDetails = array_merge(
            [
                'invoice_number' => NumberGenerator::generate('INV', 'Invoice'),
                'patient_id'     => $visitDetails['patient_id'],
                'visit_token'    => $visitDetails['visit_token'],
                'status'         => 'unpaid',
                'issue_date'     => now()->toDateString(),
            ],
            $this->customerDetails($visitDetails['patient_id'])
        );

        $invoice = $this->invoiceRepository->newInvoice($invoiceDetails);

        foreach ($visitDetails['items'] as $item) {
            $invoiceItem = [
                'invoice_id'  => $invoice->id,
                'item_type'   => $item['item_type'],
                'item_id'     => $item['item_id'] ?? null,
                'description' => $item['description'],
                'quantity'    => $item['quantity'],
                'unit_price'  => $item['unit_price'],
                'total'       => $item['quantity'] * $item['unit_price'],
            ];

            $this->invoiceRepository->createInvoiceItem($invoiceItem);
        }

        return $invoice->fresh('items');
    }
}
