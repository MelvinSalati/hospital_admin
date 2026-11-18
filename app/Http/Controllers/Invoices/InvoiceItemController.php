<?php

namespace App\Http\Controllers\Invoices;

use App\Http\Controllers\Controller;
use App\Services\Invoice\InvoiceService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class InvoiceItemController extends Controller
{
    /**
     * POST patients/{patientId}/remove/item/{invoiceId}
     *
     * Body: kind + the item's identifiers (service_name and/or service_id / id /
     * imaging_order_item_id / patient_procedure_item_id / created_at), reason?
     *
     * No approval code: the removal is recorded in audit_logs with the user, role,
     * IP, the removed item, the before/after totals and the optional reason.
     */
    public function destroy(Request $request, int $patientId, int $invoiceId, InvoiceService $invoices)
    {
        $data = $request->validate([
            'kind'                      => ['required', Rule::in([
                'laboratory',
                'imaging',
                'pharmacy',
                'procedure',
                'theater',
                'dental',
                'opthamology',
                'other',
            ])],
            'service_id'                => ['nullable', 'integer'],
            'service_name'              => ['nullable', 'string', 'max:255'],
            'id'                        => ['nullable', 'integer'],
            'imaging_order_item_id'     => ['nullable', 'integer'],
            'patient_procedure_item_id' => ['nullable', 'integer'],
            'created_at'                => ['nullable', 'string', 'max:30'],
            'reason'                    => ['nullable', 'string', 'max:500'],
        ]);

        $criteria = array_filter(
            collect($data)->only([
                'kind',
                'service_id',
                'service_name',
                'id',
                'imaging_order_item_id',
                'patient_procedure_item_id',
                'created_at',
            ])->all(),
            fn($v) => $v !== null && $v !== ''
        );

        if (count($criteria) < 2) {
            throw ValidationException::withMessages([
                'item' => 'Send at least one item identifier (service_name, service_id or id) with the kind.',
            ]);
        }

        $result = $invoices->removeItem($invoiceId, $criteria, $data['reason'] ?? null);

        if ($request->expectsJson() && ! $request->header('X-Inertia')) {
            return response()->json([
                'message'        => 'Item removed',
                'invoice'        => $result['invoice'],
                'source_kind'    => $result['source_kind'],
                'source_removed' => $result['source'] !== null,
            ]);
        }

        return back()->with('success', 'Item removed from invoice');
    }
}
