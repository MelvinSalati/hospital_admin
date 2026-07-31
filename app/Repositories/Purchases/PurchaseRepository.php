<?php

namespace App\Repositories\Purchases;

use App\Models\BulkStores\PurchaseRequisition;
use App\Models\BulkStores\PurchaseRequisitionItem;
use App\Repositories\Contracts\Purchases\PurchaseRepositoryInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

class PurchaseRepository implements PurchaseRepositoryInterface
{
    /**
     * Create a new purchase requisition with its items
     */
    public function createPurchaseRequisition(array $data)
    {

        try {
            Log::info([Auth::user()]);

            DB::beginTransaction();

            $requisitionDetails = [
                'pr_number' => $data['pr_number'] ?? \App\Helpers\NumberGenerator::generatePRNumber(),
                'department_id' => $data['department_id'],
                'requested_by' => $data['requested_by'] ?? Auth::id(),
                'request_date' => $data['request_date'] ?? now(),
                'required_date' => $data['required_date'],
                'priority' => $data['priority'],
                'status' => $data['status'] ?? PurchaseRequisition::STATUS_PENDING,
                'justification' => $data['justification'],
                'estimated_total' => $data['estimated_total'] ?? 0,
                'budget_code' => $data['budget_code'],
                'cost_center' => $data['cost_center'] ?? null,
                'supplier_id' => $data['supplier_id'] ?? null,
            ];

           

            // Create the requisition
            $purchaseRequisition = PurchaseRequisition::create($requisitionDetails);

            if (!$purchaseRequisition) {
                throw new \Exception('Failed to create purchase requisition');
            }


            $items = $data['items'] ?? [];

            if (empty($items)) {
                throw new \Exception('No items provided for requisition');
            }

            // Insert items into purchase_requisition_items table
            foreach ($items as $item) {
                $itemDetails = [
                    'requisition_id' => $purchaseRequisition->id,
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'estimated_unit_price' => $item['estimated_unit_price'],
                    // 'estimated_total' => $item['quantity'] * $item['estimated_unit_price'],
                    'required_by_date' => $item['required_by_date'] ?? $data['required_date'] ?? null,
                    'notes' => $item['notes'] ?? null,
                ];

                // 🔍 Debug - Log each item being inserted
                \Log::debug('Creating requisition item:', $itemDetails);

                PurchaseRequisitionItem::create($itemDetails);
            }

            // Update the total amount
            $purchaseRequisition->updateTotal();

            DB::commit();

            // Load relationships for response
            return $purchaseRequisition->load(['items.product', 'department', 'budgetAllocation']);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to create purchase requisition: ' . $e->getMessage(), [
                'requisition_details' => $requisitionDetails ?? $data,
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    /**
     * Get a requisition by ID
     */
    public function getRequisitionById(int $id)
    {
        return PurchaseRequisition::with(['items.product', 'department', 'budgetAllocation', 'requester'])
            ->findOrFail($id);
    }

    /**
     * Get requisition by PR number
     */
    public function getRequisitionByNumber(string $prNumber)
    {
        return PurchaseRequisition::with(['items.product', 'department', 'budgetAllocation', 'requester'])
            ->where('pr_number', $prNumber)
            ->firstOrFail();
    }

    /**
     * Get all requisitions with filters
     */
public function getRequisitions()
{
    return PurchaseRequisition::with(['department', 'items.product', 'supplier', 'requester'])
        ->withCount('items')
        ->withSum('items', 'estimated_total')
        ->whereNotNull('department_id')
        ->orderBy('created_at', 'desc')
        ->get()
        ->map(function($requisition) {
            // Add total_amount to the response
            $requisition->total_amount = $requisition->items_sum_estimated_total ?? 0;
            $requisition->items_count = $requisition->items_count ?? 0;
            return $requisition;
        });
}
    /**
     * Update requisition status
     */
    public function updateRequisitionStatus(int $id, string $status)
    {
        $requisition = PurchaseRequisition::findOrFail($id);
        $requisition->update(['status' => $status]);
        return $requisition->fresh();
    }

    /**
     * Approve requisition
     */
    public function approveRequisition(int $id, int $approvedBy)
    {
        $requisition = PurchaseRequisition::findOrFail($id);

        if ($requisition->status !== PurchaseRequisition::STATUS_PENDING) {
            throw new \Exception('Only pending requisitions can be approved');
        }

        $requisition->update([
            'status' => PurchaseRequisition::STATUS_APPROVED,
            'approved_by' => $approvedBy,
            'approved_at' => now(),
        ]);

        return $requisition->fresh();
    }

    /**
     * Reject requisition
     */
    public function rejectRequisition(int $id, string $reason = null)
    {
        $requisition = PurchaseRequisition::findOrFail($id);

        if ($requisition->status !== PurchaseRequisition::STATUS_PENDING) {
            throw new \Exception('Only pending requisitions can be rejected');
        }

        $requisition->update([
            'status' => PurchaseRequisition::STATUS_REJECTED,
            'justification' => $reason ? "Rejected: {$reason}" : $requisition->justification,
        ]);

        return $requisition->fresh();
    }

    /**
     * Cancel requisition
     */
    public function cancelRequisition(int $id, string $reason = null)
    {
        $requisition = PurchaseRequisition::findOrFail($id);

        if (!$requisition->can_cancel) {
            throw new \Exception('This requisition cannot be cancelled');
        }

        $requisition->update([
            'status' => PurchaseRequisition::STATUS_CANCELLED,
            'justification' => $reason ? "Cancelled: {$reason}" : $requisition->justification,
        ]);

        return $requisition->fresh();
    }

    /**
     * Convert requisition to purchase order
     */
    public function convertToPurchaseOrder(int $id, array $purchaseOrderDetails)
    {
        $requisition = PurchaseRequisition::findOrFail($id);

        if ($requisition->status !== PurchaseRequisition::STATUS_APPROVED) {
            throw new \Exception('Only approved requisitions can be converted to a purchase order');
        }

        // Create purchase order logic here
        // This would typically call the PurchaseOrderRepository

        return $requisition;
    }

    /**
     * Update requisition items
     */
    public function updateRequisitionItems(int $requisitionId, array $items)
    {
        $requisition = PurchaseRequisition::findOrFail($requisitionId);

        if (!$requisition->can_edit) {
            throw new \Exception('This requisition cannot be edited');
        }

        DB::transaction(function () use ($requisition, $items) {
            // Delete existing items
            $requisition->items()->delete();

            // Create new items
            foreach ($items as $item) {
                $itemDetails = [
                    'requisition_id' => $requisition->id,
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'estimated_unit_price' => $item['estimated_unit_price'],
                    'estimated_total' => $item['quantity'] * $item['estimated_unit_price'],
                    'required_by_date' => $item['required_by_date'] ?? $requisition->required_date,
                    'notes' => $item['notes'] ?? null,
                ];

                PurchaseRequisitionItem::create($itemDetails);
            }

            // Update total
            $requisition->updateTotal();
        });

        return $requisition->fresh()->load(['items.product']);
    }

    /**
     * Delete requisition (soft delete)
     */
    public function deleteRequisition(int $id)
    {
        $requisition = PurchaseRequisition::findOrFail($id);

        if ($requisition->status === PurchaseRequisition::STATUS_CONVERTED) {
            throw new \Exception('Converted requisitions cannot be deleted');
        }

        return $requisition->delete();
    }

    /**
     * Get requisition statistics
     */
    public function getRequisitionStats()
    {
        return [
            'total' => PurchaseRequisition::count(),
            'pending' => PurchaseRequisition::pending()->count(),
            'approved' => PurchaseRequisition::approved()->count(),
            'converted' => PurchaseRequisition::converted()->count(),
            'rejected' => PurchaseRequisition::where('status', PurchaseRequisition::STATUS_REJECTED)->count(),
            'cancelled' => PurchaseRequisition::where('status', PurchaseRequisition::STATUS_CANCELLED)->count(),
            'total_amount' => PurchaseRequisition::sum('estimated_total'),
            'pending_amount' => PurchaseRequisition::pending()->sum('estimated_total'),
        ];
    }

    /**
     * Get requisitions by date range
     */
    public function getRequisitionsByDateRange(string $from, string $to)
    {
        return PurchaseRequisition::with(['department', 'requester'])
            ->whereBetween('created_at', [$from, $to])
            ->orderBy('created_at', 'desc')
            ->get();
    }
}

