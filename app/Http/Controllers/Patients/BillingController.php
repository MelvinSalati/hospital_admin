<?php

namespace App\Http\Controllers\Patients;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Patients\Invoice;
use Inertia\Inertia;
use Illuminate\Support\Facades\Log;

class BillingController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index($patientId)
    {
        $invoices = Invoice::where(function ($query) {
            $query->where("status", 'unpaid')
                ->orWhere("status", 'draft');
        })
            ->where('patient_id', $patientId)
            ->get()
            ->map(function ($invoice) {
                // Parse items safely - check if it's already an array or JSON string
                $items = [];
                if ($invoice->items) {
                    try {
                        // Check if items is already an array
                        if (is_array($invoice->items)) {
                            $items = $invoice->items;
                        } else {
                            // Try to decode as JSON
                            $decoded = json_decode($invoice->items, true);
                            $items = is_array($decoded) ? $decoded : [];
                        }
                    } catch (\Exception $e) {
                        \Log::error("Failed to parse items for invoice {$invoice->id}: " . $e->getMessage());
                        $items = [];
                    }
                }

                // Map items with calculated totals
                $mappedItems = collect($items)->map(function ($item) {
                    // Safely extract values with defaults
                    $price = (float) ($item['price'] ?? 0);
                    $quantity = (int) ($item['quantity'] ?? 1);

                    // Get name from various possible fields
                    $name = 'Service Item';
                    if (isset($item['drug_name'])) {
                        $name = $item['drug_name'];
                    } elseif (isset($item['service_name'])) {
                        $name = $item['service_name'];
                    } elseif (isset($item['name'])) {
                        $name = $item['name'];
                    }

                    return [
                        'drug_id' => $item['drug_id'] ?? null,
                        'name' => $name,
                        'description' => $item['description'] ?? null,
                        'quantity' => $quantity,
                        'price' => $price,
                        'total' => $price * $quantity,
                    ];
                });

                $totalAmount = $mappedItems->sum('total');

                return [
                    'id' => $invoice->id,
                    'invoice_number' => $invoice->invoice_number ?? 'INV-' . $invoice->id,
                    'status' => $invoice->status,
                    'payment_scheme' => $invoice->payment_scheme ?? 'cash',
                    'issue_date' => $invoice->issue_date ? date('Y-m-d', strtotime($invoice->issue_date)) : date('Y-m-d'),
                    'due_date' => $invoice->due_date ? date('Y-m-d', strtotime($invoice->due_date)) : date('Y-m-d'),
                    'items' => $mappedItems,
                    'total' => $totalAmount,
                    'due_amount' => (float) ($invoice->due_amount ?? $totalAmount),
                    'items_count' => $mappedItems->count(),
                    'prescription_id' => $invoice->prescription_id,
                    'created_at' => $invoice->created_at,
                    'updated_at' => $invoice->updated_at,
                ];
            });

        // Add debug to see what's being returned
        // \Log::info('Invoices found: ' . $invoices->count());

        return Inertia::render('patients/bills', [
            'invoices' => $invoices
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}
