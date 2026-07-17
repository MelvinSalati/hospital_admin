<?php

namespace App\Http\Controllers\Patients;

use App\Http\Controllers\Controller;
use App\Models\Patients\Payment;
use App\Models\Patients\PaymentItem;
use App\Models\Patients\Invoice;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Carbon\Carbon;

class PaymentController extends Controller
{
    /**
     * Display the payments page with all necessary data
     */
    public function index($patientId)
    {
        // Get patient information
        $patient = User::with('profile')->findOrFail($patientId);

        // Get invoices for this patient
        $invoices = Invoice::where('patient_id', $patientId)->get();

        // Get payment history with items
        $payments = Payment::with(['items', 'invoice'])
            ->where('patient_id', $patientId)
            ->orderBy('payment_date', 'desc')
            ->get()
            ->map(function ($payment) {
                return [
                    'id' => $payment->id,
                    'patient_id' => $payment->patient_id,
                    'patient_name' => $payment->patient->name ?? 'N/A',
                    'amount' => (float) ($payment->paid_amount ?? 0),
                    'payment_method' => $payment->payment_method ?? 'cash',
                    'payment_date' => $payment->payment_date ? date('Y-m-d H:i:s', strtotime($payment->payment_date)) : date('Y-m-d H:i:s'),
                    'status' => $payment->status ?? 'completed',
                    'invoice_id' => $payment->invoice_id,
                    'invoice_number' => $payment->invoice->invoice_number ?? 'N/A',
                    'description' => 'Payment for invoice ' . ($payment->invoice->invoice_number ?? $payment->invoice_id),
                    'reference_number' => $payment->transaction_reference ?? $payment->payment_number,
                    'service_type' => $payment->items->first()->item_type ?? 'general',
                    'items' => $payment->items->map(function ($item) {
                        return [
                            'name' => $item->item_name ?? 'Unknown',
                            'description' => $item->item_description ?? null,
                            'quantity' => (int) ($item->quantity ?? 1),
                            'price' => (float) ($item->unit_price ?? 0),
                            'total' => (float) ($item->total_price ?? 0),
                            'type' => $item->item_type ?? 'service',
                        ];
                    }),
                ];
            });

        // Get payment methods (you'll need to create this table or adjust based on your schema)
        $paymentMethods = $this->getPatientPaymentMethods($patientId);

        // Get insurance providers (if you have this table)
        $insuranceProviders = $this->getInsuranceProviders();

        return Inertia::render('patients/payments', [
            'patient' => [
                'id' => $patient->id,
                'name' => $patient->name,
                'email' => $patient->email,
                'phone' => $patient->profile->phone ?? 'N/A',
            ],
            'invoices' => $invoices,
            'payments' => $payments,
            'paymentMethods' => $paymentMethods,
            'insuranceProviders' => $insuranceProviders,
        ]);
    }

    /**
     * Get patient payment methods
     * You'll need to create a payment_methods table or adjust this based on your existing schema
     */
    private function getPatientPaymentMethods($patientId)
    {
        // If you have a payment_methods table, query it here
        // For now, return an empty array or sample data
        return [];
    }

    /**
     * Get insurance providers
     * You'll need to create an insurance_providers table or adjust based on your schema
     */
    private function getInsuranceProviders()
    {
        // If you have insurance_providers table, query it here
        // For now, return an empty array
        return [];
    }

    /**
     * Process payment from CheckoutModal
     */
    public function process(Request $request)
    {
        $request->validate([
            'invoice_id' => 'required|exists:invoices,id',
            'patient_id' => 'required|exists:users,id',
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'required|string|in:cash,card,mobile_money,insurance,bank_transfer',
            'payment_date' => 'required|date',
            'amount_tendered' => 'nullable|numeric|min:0',
            'change' => 'nullable|numeric|min:0',
            'received_by' => 'nullable|string|max:255',
            'reference_number' => 'nullable|string|max:255',
            // Card fields
            'card_number' => 'nullable|string|max:255',
            'card_holder' => 'nullable|string|max:255',
            'expiry_date' => 'nullable|string|max:10',
            'cvv' => 'nullable|string|max:10',
            // Mobile Money fields
            'phone_number' => 'nullable|string|max:50',
            'provider' => 'nullable|string|max:255',
            'reference' => 'nullable|string|max:255',
            // Insurance fields
            'insurance_provider' => 'nullable|string|max:255',
            'policy_number' => 'nullable|string|max:255',
            'authorization_code' => 'nullable|string|max:255',
            'claim_notes' => 'nullable|string|max:1000',
            // Bank Transfer fields
            'bank_name' => 'nullable|string|max:255',
            'account_name' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:1000',
        ]);

        try {
            DB::beginTransaction();

            // Find the invoice
            $invoice = Invoice::findOrFail($request->invoice_id);
            $patient = User::findOrFail($request->patient_id);

            // Calculate amounts
            $amount = $request->amount;
            $newPaidAmount = ($invoice->paid_amount ?? 0) + $amount;
            $newDueAmount = max(0, $invoice->total - $newPaidAmount);

            // Determine status
            $status = 'partial';
            if ($newDueAmount <= 0) {
                $status = 'paid';
            }

            // Generate payment number
            $paymentNumber = $this->generatePaymentNumber();

            // Create payment record
            $payment = Payment::create([
                'patient_id' => $request->patient_id,
                'invoice_id' => $invoice->id,
                'payment_number' => $paymentNumber,
                'payment_method' => $request->payment_method,
                'total_amount' => $invoice->total,
                'paid_amount' => $amount,
                'change_amount' => $request->change ?? 0,
                'payment_date' => $request->payment_date ? Carbon::parse($request->payment_date) : now(),
                'status' => 'completed',
                'tendered_amount' => $request->amount_tendered,
                'mobile_money_number' => $request->phone_number,
                'agent_code' => null,
                'transaction_reference' => $request->reference_number ?? $request->reference,
                'payment_confirmed' => true,
                'notes' => $request->notes,
                'receipt_number' => 'RCP-' . date('Ymd') . '-' . str_pad(random_int(1, 9999), 4, '0', STR_PAD_LEFT),
                'received_by' => $request->received_by,
            ]);

            // Create payment items from invoice items
            $invoiceItems = $invoice->items ?? [];
            if (!empty($invoiceItems)) {
                foreach ($invoiceItems as $item) {
                    // Calculate proportional payment for each item
                    $itemTotal = $item['total'] ?? 0;
                    $itemPrice = $item['price'] ?? 0;
                    $itemQuantity = $item['quantity'] ?? 1;
                    $proportionalAmount = ($itemTotal / $invoice->total) * $amount;

                    PaymentItem::create([
                        'patient_id' => $request->patient_id,
                        'invoice_id' => $invoice->id,
                        'payment_id' => $payment->id,
                        'item_type' => $this->determineItemType($item),
                        'item_source_id' => $item['drug_id'] ?? null,
                        'item_name' => $item['name'] ?? 'Unknown Item',
                        'item_description' => $item['description'] ?? null,
                        'quantity' => $itemQuantity,
                        'unit_price' => $itemPrice,
                        'total_price' => $itemTotal,
                        'discount_amount' => $item['discount'] ?? 0,
                        'tax_amount' => $item['tax'] ?? 0,
                        'paid_amount' => $proportionalAmount,
                        'status' => 'paid',
                        'paid_at' => now(),
                    ]);
                }
            } else {
                // If no items, create a generic payment item
                PaymentItem::create([
                    'patient_id' => $request->patient_id,
                    'invoice_id' => $invoice->id,
                    'payment_id' => $payment->id,
                    'item_type' => 'payment',
                    'item_source_id' => null,
                    'item_name' => 'Payment for invoice ' . $invoice->invoice_number,
                    'item_description' => 'Payment processed via ' . $request->payment_method,
                    'quantity' => 1,
                    'unit_price' => $amount,
                    'total_price' => $amount,
                    'discount_amount' => 0,
                    'tax_amount' => 0,
                    'paid_amount' => $amount,
                    'status' => 'paid',
                    'paid_at' => now(),
                ]);
            }

            // Update invoice
            $invoice->update([
                'paid_amount' => $newPaidAmount,
                'due_amount' => $newDueAmount,
                'status' => $status,
                'paid_date' => $status === 'paid' ? now() : $invoice->paid_date,
            ]);

            DB::commit();

            // Return success response with receipt data
            return response()->json([
                'success' => true,
                'message' => 'Payment processed successfully',
                'data' => [
                    'payment' => $payment->load('items'),
                    'invoice' => $invoice,
                    'new_due_amount' => $newDueAmount,
                    'receipt_number' => $payment->receipt_number,
                    'receipt_data' => [
                        'hospital_name' => 'Altaf Memorial Hospital',
                        'hospital_address' => '21/22 Parirenyatwa Road, Moth Area, Chipata, Zambia',
                        'hospital_phone' => '+260 977 679 800',
                        'generated_at' => now()->format('Y-m-d H:i:s'),
                    ]
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Payment processing failed: ' . $e->getMessage() . "\n" . $e->getTraceAsString());

            return response()->json([
                'success' => false,
                'message' => 'Payment processing failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Generate a unique payment number
     */
    private function generatePaymentNumber(): string
    {
        $prefix = 'PAY';
        $year = date('Y');
        $month = date('m');
        $lastPayment = Payment::orderBy('id', 'desc')->first();
        $sequence = $lastPayment ? (int) substr($lastPayment->payment_number, -4) + 1 : 1;

        return $prefix . '-' . $year . $month . '-' . str_pad($sequence, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Determine the type of item based on available data
     */
    private function determineItemType($item): string
    {
        if (isset($item['drug_id']) && $item['drug_id']) {
            return 'medication';
        }

        $name = strtolower($item['name'] ?? '');

        if (strpos($name, 'test') !== false || strpos($name, 'lab') !== false) {
            return 'laboratory';
        }

        if (strpos($name, 'consult') !== false || strpos($name, 'appointment') !== false) {
            return 'consultation';
        }

        if (strpos($name, 'procedure') !== false || strpos($name, 'surgery') !== false) {
            return 'procedure';
        }

        return 'service';
    }

    /**
     * Display the specified payment (API endpoint)
     */
    public function show($patientId, $paymentId)
    {
        $payment = Payment::with(['items', 'invoice', 'patient'])
            ->where('patient_id', $patientId)
            ->where('id', $paymentId)
            ->firstOrFail();

        return response()->json([
            'success' => true,
            'data' => $payment
        ]);
    }

    /**
     * Get payment summary for a patient (API endpoint)
     */
    public function summary($patientId)
    {
        $totalPaid = Payment::where('patient_id', $patientId)
            ->where('status', 'completed')
            ->sum('paid_amount');

        $paymentsByMethod = Payment::where('patient_id', $patientId)
            ->where('status', 'completed')
            ->select('payment_method', DB::raw('SUM(paid_amount) as total'))
            ->groupBy('payment_method')
            ->get();

        $recentPayments = Payment::with('invoice')
            ->where('patient_id', $patientId)
            ->where('status', 'completed')
            ->orderBy('payment_date', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($payment) {
                return [
                    'id' => $payment->id,
                    'amount' => $payment->paid_amount,
                    'payment_method' => $payment->payment_method,
                    'payment_date' => $payment->payment_date,
                    'invoice_number' => $payment->invoice->invoice_number ?? 'N/A',
                ];
            });

        $itemsPurchased = PaymentItem::where('patient_id', $patientId)
            ->where('status', 'paid')
            ->select('item_type', DB::raw('COUNT(*) as count'), DB::raw('SUM(quantity) as total_quantity'))
            ->groupBy('item_type')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'total_paid' => $totalPaid,
                'payments_by_method' => $paymentsByMethod,
                'recent_payments' => $recentPayments,
                'items_purchased' => $itemsPurchased
            ]
        ]);
    }

    /**
     * Generate receipt for a payment (API endpoint)
     */
    public function receipt($patientId, $paymentId)
    {
        $payment = Payment::with(['items', 'invoice', 'patient'])
            ->where('patient_id', $patientId)
            ->where('id', $paymentId)
            ->firstOrFail();

        return response()->json([
            'success' => true,
            'data' => [
                'payment' => $payment,
                'receipt_data' => [
                    'hospital_name' => 'Altaf Memorial Hospital',
                    'hospital_address' => '21/22 Parirenyatwa Road, Moth Area, Chipata, Zambia',
                    'hospital_phone' => '+260 977 679 800',
                    'generated_at' => now()->format('Y-m-d H:i:s'),
                ]
            ]
        ]);
    }
}
