<?php
// app/Services/BillingService.php

namespace App\Services;

use App\Repositories\BillingRepository;
use App\Repositories\PatientRepository;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Illuminate\Container\Attributes\DB;

class BillingService
{
    protected $billingRepository;
    protected $patientRepository;

    public function __construct(
        BillingRepository $billingRepository,
        PatientRepository $patientRepository
    ) {
        $this->billingRepository = $billingRepository;
        $this->patientRepository = $patientRepository;
    }

    /**
     * Get all bills with filters
     */
    public function getBillsList(array $filters = [])
    {
        $perPage = $filters['per_page'] ?? 15;
        return $this->billingRepository->getBillsList($filters, $perPage);
    }

    /**
     * Get bill details
     */
    public function getBillDetails($id)
    {
        $bill = $this->billingRepository->find($id);

        if (!$bill) {
            throw new \Exception('Bill not found');
        }

        return $this->billingRepository->getBillDetails($id);
    }

    /**
     * Create new bill
     */
    public function createBill(array $data)
    {
        // Validate data
        $validator = Validator::make($data, [
            'patient_id' => 'required|integer|exists:patients,id',
            'billable_type' => 'nullable|string',
            'billable_id' => 'nullable|integer',
            'bill_type' => 'required|string',
            'subtotal' => 'required|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'tax_amount' => 'nullable|numeric|min:0',
            'other_charges' => 'nullable|numeric|min:0',
            'total_amount' => 'required|numeric|min:0',
            'paid_amount' => 'nullable|numeric|min:0',
            'payment_mode' => 'required|in:Cash,Cheque,Insurance,Credit Card,Mobile Money',
            'items' => 'required|array|min:1',
            'items.*.item_name' => 'required|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.total' => 'required|numeric|min:0',
            'notes' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        // Check patient exists
        $patient = DB::table('patients')->find($data['patient_id']);
        if (!$patient) {
            throw new \Exception('Patient not found');
        }

        return $this->billingRepository->createBill($data);
    }

    /**
     * Process payment for bill
     */
    public function processPayment($billId, array $paymentData)
    {
        // Validate payment data
        $validator = Validator::make($paymentData, [
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'required|in:Cash,Cheque,Insurance,Credit Card,Mobile Money',
            'transaction_id' => 'nullable|string',
            'cheque_number' => 'nullable|string|required_if:payment_method,Cheque',
            'cheque_date' => 'nullable|date|required_if:payment_method,Cheque',
            'bank_name' => 'nullable|string|required_if:payment_method,Cheque',
            'mobile_money_number' => 'nullable|string|required_if:payment_method,Mobile Money',
            'mobile_money_provider' => 'nullable|string|required_if:payment_method,Mobile Money',
            'notes' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        $bill = $this->billingRepository->find($billId);

        if (!$bill) {
            throw new \Exception('Bill not found');
        }

        if ($bill->payment_status === 'paid') {
            throw new \Exception('Bill is already paid');
        }

        if ($paymentData['amount'] > $bill->due_amount) {
            throw new \Exception('Payment amount exceeds due amount');
        }

        return $this->billingRepository->processPayment($billId, $paymentData);
    }

    /**
     * Get revenue report
     */
    public function getRevenueReport($fromDate, $toDate, $groupBy = 'day')
    {
        return $this->billingRepository->getRevenueReport($fromDate, $toDate, $groupBy);
    }

    /**
     * Get outstanding bills
     */
    public function getOutstandingBills()
    {
        return $this->billingRepository->getOutstandingBills();
    }

    /**
     * Get patient bills
     */
    public function getPatientBills($patientId)
    {
        $patient = DB::table('patients')->find($patientId);

        if (!$patient) {
            throw new \Exception('Patient not found');
        }

        return $this->billingRepository->findWhere([
            'patient_id' => $patientId
        ]);
    }

    /**
     * Generate invoice PDF
     */
    public function generateInvoice($billId)
    {
        $billData = $this->getBillDetails($billId);

        // Generate PDF using DomPDF or similar
        // $pdf = PDF::loadView('invoices.template', $billData);
        // return $pdf->download('invoice-' . $billData['bill']['bill_number'] . '.pdf');

        return $billData;
    }

    /**
     * Void bill
     */
    public function voidBill($billId, $reason = null)
    {
        $bill = $this->billingRepository->find($billId);

        if (!$bill) {
            throw new \Exception('Bill not found');
        }

        if ($bill->payment_status === 'paid') {
            throw new \Exception('Cannot void a paid bill');
        }

        DB::table('bills')
            ->where('id', $billId)
            ->update([
                'payment_status' => 'cancelled',
                'cancellation_reason' => $reason,
                'cancelled_at' => now(),
                'updated_at' => now()
            ]);

        // Void all related payments
        DB::table('payments')
            ->where('bill_id', $billId)
            ->update([
                'status' => 'cancelled',
                'updated_at' => now()
            ]);

        return $this->billingRepository->find($billId);
    }
}
