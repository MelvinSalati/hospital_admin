<?php

namespace App\Http\Controllers\Patients;

use App\Models\Patients\Patient;
use App\Models\Payments\Invoice;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;


class InvoiceController extends Controller
{
    public function index($patientId)
    {
        $patient = Patient::findOrFail($patientId);
        $invoices = $patient->invoices()->orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $invoices
        ]);
    }

    public function show($patientId, $invoiceId)
    {
        $invoice = Invoice::where('patient_id', $patientId)
            ->where('id', $invoiceId)
            ->firstOrFail();

        return response()->json([
            'success' => true,
            'data' => $invoice
        ]);
    }

    public function updateStatus($patientId, $invoiceId, Request $request)
    {
        $request->validate([
            'status' => 'required|in:draft,sent,paid,partial,overdue,cancelled'
        ]);

        $invoice = Invoice::where('patient_id', $patientId)
            ->where('id', $invoiceId)
            ->firstOrFail();

        $invoice->update(['status' => $request->status]);

        return response()->json([
            'success' => true,
            'message' => 'Invoice status updated',
            'data' => $invoice
        ]);
    }

    public function recordPayment($patientId, $invoiceId, Request $request)
    {
        $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'required|string',
            'reference_number' => 'nullable|string',
            'notes' => 'nullable|string'
        ]);

        $invoice = Invoice::where('patient_id', $patientId)
            ->where('id', $invoiceId)
            ->firstOrFail();

        $newPaidAmount = $invoice->paid_amount + $request->amount;
        $status = $newPaidAmount >= $invoice->total ? 'paid' : 'partial';

        $invoice->update([
            'paid_amount' => $newPaidAmount,
            'due_amount' => $invoice->total - $newPaidAmount,
            'status' => $status,
            'paid_date' => $status === 'paid' ? now() : $invoice->paid_date,
            'metadata' => array_merge($invoice->metadata ?? [], [
                'payments' => array_merge($invoice->metadata['payments'] ?? [], [
                    [
                        'amount' => $request->amount,
                        'method' => $request->payment_method,
                        'reference' => $request->reference_number,
                        'notes' => $request->notes,
                        'date' => now()->toISOString(),
                        'received_by' => auth()->id()
                    ]
                ])
            ])
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Payment recorded successfully',
            'data' => $invoice
        ]);
    }

    public function send($patientId, $invoiceId)
    {
        $invoice = Invoice::where('patient_id', $patientId)
            ->where('id', $invoiceId)
            ->firstOrFail();

        // Send email logic here
        // Mail::to($invoice->customer_email)->send(new InvoiceMail($invoice));

        $invoice->update([
            'sent_at' => now(),
            'status' => 'sent'
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Invoice sent successfully'
        ]);
    }

    public function download($patientId, $invoiceId)
    {
        $invoice = Invoice::where('patient_id', $patientId)
            ->where('id', $invoiceId)
            ->firstOrFail();

        // Generate PDF logic here
        // $pdf = PDF::loadView('invoices.pdf', compact('invoice'));

        return response()->json([
            'success' => true,
            'message' => 'Download endpoint - implement PDF generation'
        ]);
    }
}
