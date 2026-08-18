<?php

namespace App\Http\Controllers\BulkStores;

use App\Http\Controllers\Controller;
use App\Models\BulkStores\Product;
use App\Models\BulkStores\StockBatch;
use App\Models\BulkStores\StockLedger;
use App\Models\BulkStores\StockMovement;
use App\Models\BulkStores\StockMovementItem;
use App\Models\BulkStores\PurchaseRequisition;
use App\Models\BulkStores\GoodsReceivedNote;
use App\Models\BulkStores\GoodsReceivedItem;
use App\Models\BulkStores\PurchaseOrderItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use App\Mail\GRNEmail;

class ReceivingController extends Controller
{
    // Define status constants matching the ENUM in database
    const GRN_STATUS_DRAFT = 'draft';
    const GRN_STATUS_PENDING_APPROVAL = 'pending_approval';
    const GRN_STATUS_APPROVED = 'approved';
    const GRN_STATUS_REJECTED = 'rejected';
    const GRN_STATUS_CANCELLED = 'cancelled';

    /**
     * Generate GRN Number
     * Format: GRN-YYYYMMDD-XXXX
     */
    protected function generateGRNNumber(): string
    {
        $prefix = 'GRN';
        $year = date('Y');
        $month = date('m');
        $day = date('d');

        // Get last GRN number for today
        $lastGRN = GoodsReceivedNote::whereDate('created_at', today())
            ->orderBy('id', 'desc')
            ->first();

        if ($lastGRN && $lastGRN->grn_number) {
            // Extract the sequence number from the last GRN
            $parts = explode('-', $lastGRN->grn_number);
            $lastNumber = isset($parts[2]) ? intval($parts[2]) : 0;
            $sequence = str_pad($lastNumber + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $sequence = '0001';
        }

        return $prefix . '-' . $year . $month . $day . '-' . $sequence;
    }

    public function receiveProduct(Request $request)
    {
        try {
            DB::beginTransaction();

            // Get data from request
            $items = $request->input('items', []);
            $purchaseRequisitionId = $request->input('purchase_requisition_id');
            $purchaseOrderId = $request->input('purchase_order_id');
            $supplierId = $request->input('supplier_id');
            $departmentId = $request->input('department_id', 1);
            $bulkStoreId = $request->input('bulk_store_id');
            $createdBy = $request->input('created_by', auth()->id());
            $deliveryNoteNumber = $request->input('delivery_note_number');
            $invoiceNumber = $request->input('invoice_number');
            $inspectedBy = $request->input('inspected_by');

            // Get the purchase requisition for reference
            $requisition = PurchaseRequisition::with('items.product')
                ->findOrFail($purchaseRequisitionId);

            // Generate GRN Number
            $grnNumber = $this->generateGRNNumber();

            // Create GRN with correct status value from ENUM
            $grn = GoodsReceivedNote::create([
                'grn_number' => $grnNumber,
                'grn_uuid' => (string) Str::uuid(),
                'purchase_order_id' => $purchaseOrderId,
                'supplier_id' => $supplierId,
                'received_date' => now()->toDateString(),
                'delivery_note_number' => $deliveryNoteNumber,
                'invoice_number' => $invoiceNumber,
                'received_by' => $createdBy,
                'inspected_by' => $inspectedBy,
                'status' => self::GRN_STATUS_PENDING_APPROVAL,
                'approved_by' => null,
                'approved_at' => null,
                'rejection_reason' => null,
                'notes' => $request->input('notes'),
                'quality_notes' => $request->input('quality_notes'),
                'storage_location' => $request->input('storage_location'),
                'attachments' => $request->input('attachments') ? json_encode($request->input('attachments')) : null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Update requisition status
            $requisition->update(['status' => 'received']);

            $receivedRecords = [];
            $productTotals = [];
            $totalAmount = 0;

            foreach ($items as $item) {
                // Find product
                $product = Product::findOrFail($item['product_id']);

                // Calculate total for this item
                $unitPrice = $item['unit_price'] ?? 0;
                $itemTotal = $item['quantity'] * $unitPrice;
                $totalAmount += $itemTotal;

                // Get or find the purchase order item ID
                $purchaseOrderItemId = null;

                // If purchase_order_item_id is provided in the request
                if (isset($item['purchase_order_item_id'])) {
                    // Verify it exists in the database
                    $purchaseOrderItem = PurchaseOrderItem::find($item['purchase_order_item_id']);
                    if ($purchaseOrderItem) {
                        $purchaseOrderItemId = $item['purchase_order_item_id'];
                    }
                }

                dispatch(new \App\Jobs\SendGRNApprovalALertJob([
                    'grn_id' => $grn->id,
                    'grn_uuid' => $grn->grn_uuid,
                    'grn_number' => $grn->grn_number,
                    'user_name' => auth()->user()->name ?? 'User',
                    'user_email' => auth()->user()->email ?? null,
                    'mobile_phone_number' => '260975995249'
                ]));

                // If not found, try to find from purchase requisition items
                if (!$purchaseOrderItemId && $purchaseRequisitionId) {
                    $requisitionItem = $requisition->items()
                        ->where('product_id', $product->id)
                        ->first();

                    if ($requisitionItem) {
                        // Check if there's a corresponding purchase order item
                        $purchaseOrderItem = PurchaseOrderItem::where('purchase_order_id', $purchaseOrderId)
                            ->where('product_id', $product->id)
                            ->first();

                        if ($purchaseOrderItem) {
                            $purchaseOrderItemId = $purchaseOrderItem->id;
                        }
                    }
                }

                // Create GRN Item with optional purchase_order_item_id
                $grnItemData = [
                    'grn_id' => $grn->id,
                    'product_id' => $product->id,
                    'quantity_received' => $item['quantity'],
                    'quantity_accepted' => $item['quantity_accepted'] ?? $item['quantity'],
                    'quantity_rejected' => $item['quantity_rejected'] ?? 0,
                    'batch_number' => $item['batch_number'],
                    'expiry_date' => $item['expiry_date'] ?? null,
                    'manufacturer' => $item['manufacturer'] ?? null,
                    'rejection_reason' => $item['rejection_reason'] ?? null,
                    'quality_status' => $item['quality_status'] ?? 'pending',
                    'notes' => $item['notes'] ?? null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                // Only add purchase_order_item_id if it exists and is valid
                if ($purchaseOrderItemId) {
                    $grnItemData['purchase_order_item_id'] = $purchaseOrderItemId;
                }

                $grnItem = GoodsReceivedItem::create($grnItemData);

                // Create stock batch
                $batch = StockBatch::create([
                    'uuid' => (string) Str::uuid(),
                    'product_id' => $product->id,
                    'batch_number' => $item['batch_number'],
                    'expiry_date' => $item['expiry_date'] ?? null,
                    'quantity' => $item['quantity'],
                    'received_quantity' => $item['quantity'],
                    'remaining_quantity' => $item['quantity'],
                    'purchase_order_item_id' => $purchaseOrderItemId ?? $purchaseRequisitionId,
                    'supplier_id' => $supplierId,
                    'status' => 'active',
                    'location' => $item['location'] ?? null,
                    'notes' => $item['notes'] ?? null,
                    'created_by' => $createdBy,
                ]);

                // Create stock movement
                $movement = StockMovement::create([
                    'movement_uuid' => (string) Str::uuid(),
                    'product_id' => $product->id,
                    'batch_number' => $item['batch_number'],
                    'type' => StockMovement::TYPE_RECEIVING,
                    'quantity' => $item['quantity'],
                    'reason' => 'Stock receiving from supplier - GRN: ' . $grnNumber,
                    'notes' => $item['notes'] ?? null,
                    'performed_by' => $createdBy,
                    'approved_by' => $createdBy,
                    'approved_at' => now(),
                ]);

                // Create stock movement item
                StockMovementItem::create([
                    'uuid' => (string) Str::uuid(),
                    'stock_movement_id' => $movement->id,
                    'product_id' => $product->id,
                    'quantity' => $item['quantity'],
                    'batch_id' => $batch->id,
                    'purchase_order_item_id' => $purchaseOrderItemId ?? $purchaseRequisitionId,
                ]);

                // Track totals for ledger
                if (!isset($productTotals[$product->id])) {
                    $productTotals[$product->id] = [
                        'product_id' => $product->id,
                        'total_quantity' => 0,
                        'total_cost' => 0,
                    ];
                }
                $productTotals[$product->id]['total_quantity'] += $item['quantity'];
                $productTotals[$product->id]['total_cost'] += $itemTotal;

                $receivedRecords[] = [
                    'grn_item' => $grnItem,
                    'batch' => $batch,
                    'movement' => $movement,
                ];
            }

            // Update GRN total amount
            $grn->update(['total_amount' => $totalAmount]);

            // Update stock ledger for each product
            foreach ($productTotals as $productId => $data) {
                $this->updateStockLedger(
                    $productId,
                    $departmentId,
                    $bulkStoreId,
                    $data['total_quantity'],
                    $data['total_cost'],
                    $createdBy
                );
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Products received successfully',
                'data' => [
                    'grn' => $grn,
                    'received_items' => count($receivedRecords),
                    'details' => $receivedRecords,
                    'purchase_requisition_id' => $purchaseRequisitionId,
                ],
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error receiving products', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to receive products: ' . $e->getMessage(),
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred',
            ], 500);
        }
    }

    /**
     * Update Stock Ledger with proper calculations
     */
    protected function updateStockLedger($productId, $departmentId, $bulkStoreId, $quantity, $totalCost, $createdBy)
    {
        $today = now()->toDateString();

        // Get or create today's ledger entry
        $ledger = StockLedger::firstOrCreate(
            [
                'product_id' => $productId,
                'department_id' => $departmentId,
                'ledger_date' => $today,
            ],
            [
                'ledger_uuid' => (string) Str::uuid(),
                'bulk_store_id' => $bulkStoreId,
                'opening_balance' => 0,
                'total_in' => 0,
                'total_out' => 0,
                'closing_balance' => 0,
                'purchases_in' => 0,
                'returns_in' => 0,
                'transfers_in' => 0,
                'adjustments_in' => 0,
                'sales_out' => 0,
                'damage_out' => 0,
                'expiry_out' => 0,
                'transfers_out' => 0,
                'adjustments_out' => 0,
                'movement_count' => 0,
                'unique_batches' => 0,
                'avg_unit_cost' => 0,
                'created_by' => $createdBy,
                'is_verified' => 1,
                'verified_at' => now(),
                'verified_by' => $createdBy,
            ]
        );

        // Get previous day's closing balance
        $previous = StockLedger::where('product_id', $productId)
            ->where('department_id', $departmentId)
            ->where('ledger_date', '<', $today)
            ->orderBy('ledger_date', 'desc')
            ->first();

        $openingBalance = $previous ? $previous->closing_balance : 0;

        // Calculate new average unit cost
        $currentTotalCost = $ledger->opening_balance * $ledger->avg_unit_cost;
        $newTotalCost = $currentTotalCost + $totalCost;
        $newTotalQuantity = $openingBalance + $ledger->total_in + $quantity - $ledger->total_out;
        $avgUnitCost = $newTotalQuantity > 0 ? $newTotalCost / $newTotalQuantity : 0;

        // Update ledger with all calculations
        $ledger->update([
            'opening_balance' => $openingBalance,
            'total_in' => $ledger->total_in + $quantity,
            'purchases_in' => $ledger->purchases_in + $quantity,
            'closing_balance' => $openingBalance + $ledger->total_in + $quantity - $ledger->total_out,
            'movement_count' => $ledger->movement_count + 1,
            'unique_batches' => $ledger->unique_batches + 1,
            'avg_unit_cost' => $avgUnitCost,
            'updated_by' => $createdBy,
            'updated_at' => now(),
        ]);

        return $ledger;
    }

    public function approveGRN(Request $request, $grnId)
    {
        try {
            DB::beginTransaction();

            $grn = GoodsReceivedNote::findOrFail($grnId);

            // Check if already approved
            if ($grn->status === self::GRN_STATUS_APPROVED) {
                return response()->json([
                    'success' => false,
                    'message' => 'GRN is already approved'
                ], 400);
            }

            // Check if GRN is in pending_approval status
            if ($grn->status !== self::GRN_STATUS_PENDING_APPROVAL) {
                return response()->json([
                    'success' => false,
                    'message' => 'GRN must be in pending_approval status to approve'
                ], 400);
            }

            // Update GRN status to approved
            $grn->update([
                'status' => self::GRN_STATUS_APPROVED,
                'approved_by' => auth()->id(),
                'approved_at' => now(),
            ]);

            // Update all GRN items
            GoodsReceivedItem::where('grn_id', $grn->id)->update([
                'quality_status' => 'approved'
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'GRN approved successfully',
                'data' => $grn
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error approving GRN', [
                'error' => $e->getMessage(),
                'grn_id' => $grnId
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to approve GRN: ' . $e->getMessage()
            ], 500);
        }
    }

    public function authorizeGRN(Request $request, $grnId)
    {
        try {
            DB::beginTransaction();

            $grn = GoodsReceivedNote::findOrFail($grnId);

            // Check if already authorized
            if ($grn->authorized) {
                return response()->json([
                    'success' => false,
                    'message' => 'GRN is already authorized'
                ], 400);
            }

            // Check if approved first
            if ($grn->status !== self::GRN_STATUS_APPROVED) {
                return response()->json([
                    'success' => false,
                    'message' => 'GRN must be approved before authorization'
                ], 400);
            }

            // Update GRN authorization
            $grn->update([
                'authorized' => true,
                'authorized_by' => auth()->id(),
                'authorized_at' => now(),
                'status' => self::GRN_STATUS_APPROVED, // Keep as approved
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'GRN authorized successfully',
                'data' => $grn
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error authorizing GRN', [
                'error' => $e->getMessage(),
                'grn_id' => $grnId
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to authorize GRN: ' . $e->getMessage()
            ], 500);
        }
    }

    public function rejectGRN(Request $request, $grnId)
    {
        try {
            DB::beginTransaction();

            $grn = GoodsReceivedNote::findOrFail($grnId);

            // Update GRN status to rejected
            $grn->update([
                'status' => self::GRN_STATUS_REJECTED,
                'rejection_reason' => $request->input('rejection_reason'),
                'approved_by' => auth()->id(),
                'approved_at' => now(),
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'GRN rejected successfully',
                'data' => $grn
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error rejecting GRN', [
                'error' => $e->getMessage(),
                'grn_id' => $grnId
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to reject GRN: ' . $e->getMessage()
            ], 500);
        }
    }

    public function cancelGRN(Request $request, $grnId)
    {
        try {
            DB::beginTransaction();

            $grn = GoodsReceivedNote::findOrFail($grnId);

            // Update GRN status to cancelled
            $grn->update([
                'status' => self::GRN_STATUS_CANCELLED,
                'notes' => $request->input('cancellation_reason') ?? $grn->notes,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'GRN cancelled successfully',
                'data' => $grn
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error cancelling GRN', [
                'error' => $e->getMessage(),
                'grn_id' => $grnId
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to cancel GRN: ' . $e->getMessage()
            ], 500);
        }
    }

    public function sendGRNEmails(Request $request, $grnId)
    {
        try {
            DB::beginTransaction();

            $grn = GoodsReceivedNote::with(['supplier', 'items.product', 'receivedBy', 'approvedBy', 'authorizedBy'])
                ->findOrFail($grnId);

            // Verify GRN is approved and authorized
            if ($grn->status !== self::GRN_STATUS_APPROVED || !$grn->authorized) {
                return response()->json([
                    'success' => false,
                    'message' => 'GRN must be approved and authorized before sending emails'
                ], 400);
            }

            $recipients = $request->input('recipients', []);
            $sentTo = [];

            // Prepare GRN data
            $grnData = $this->prepareGRNData($grn);

            // Send emails to selected recipients
            if (in_array('supplier', $recipients) && $grn->supplier && $grn->supplier->email) {
                Mail::to($grn->supplier->email)->send(new GRNEmail($grnData, 'supplier'));
                $sentTo[] = 'supplier';
                Log::info('GRN email sent to supplier', [
                    'grn_id' => $grnId,
                    'email' => $grn->supplier->email
                ]);
            }

            if (in_array('accounts', $recipients)) {
                $accountsEmail = $request->input('accounts_email') ?? config('hospital.accounts_email');
                if ($accountsEmail) {
                    Mail::to($accountsEmail)->send(new GRNEmail($grnData, 'accounts'));
                    $sentTo[] = 'accounts';
                    Log::info('GRN email sent to accounts', [
                        'grn_id' => $grnId,
                        'email' => $accountsEmail
                    ]);
                }
            }

            if (in_array('pharmacy', $recipients)) {
                $pharmacyEmail = $request->input('pharmacy_email') ?? config('hospital.pharmacy_email');
                if ($pharmacyEmail) {
                    Mail::to($pharmacyEmail)->send(new GRNEmail($grnData, 'pharmacy'));
                    $sentTo[] = 'pharmacy';
                    Log::info('GRN email sent to pharmacy', [
                        'grn_id' => $grnId,
                        'email' => $pharmacyEmail
                    ]);
                }
            }

            // Update GRN with email status
            $grn->update([
                'email_sent_to' => json_encode($sentTo),
                'email_sent_at' => now(),
                'email_sent_by' => auth()->id(),
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'GRN emails sent successfully',
                'data' => [
                    'sent_to' => $sentTo,
                    'grn_number' => $grn->grn_number
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error sending GRN emails', [
                'error' => $e->getMessage(),
                'grn_id' => $grnId,
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to send GRN emails: ' . $e->getMessage()
            ], 500);
        }
    }

    private function prepareGRNData($grn)
    {
        $items = [];
        foreach ($grn->items as $item) {
            $items[] = [
                'product_name' => $item->product->name ?? 'N/A',
                'product_code' => $item->product->code ?? 'N/A',
                'quantity_received' => $item->quantity_received,
                'quantity_accepted' => $item->quantity_accepted,
                'quantity_rejected' => $item->quantity_rejected,
                'batch_number' => $item->batch_number,
                'expiry_date' => $item->expiry_date,
                'manufacturer' => $item->manufacturer,
                'unit_price' => $item->unit_price ?? 0,
                'total' => ($item->quantity_accepted ?? $item->quantity_received) * ($item->unit_price ?? 0),
            ];
        }

        return [
            'grn_number' => $grn->grn_number,
            'grn_date' => $grn->received_date,
            'supplier' => $grn->supplier->name ?? 'N/A',
            'supplier_address' => $grn->supplier->address ?? 'N/A',
            'supplier_phone' => $grn->supplier->phone ?? 'N/A',
            'supplier_email' => $grn->supplier->email ?? 'N/A',
            'delivery_note_number' => $grn->delivery_note_number,
            'invoice_number' => $grn->invoice_number,
            'items' => $items,
            'total_amount' => $grn->total_amount,
            'received_by' => $grn->receivedBy->name ?? 'N/A',
            'inspected_by' => $grn->inspectedBy->name ?? 'N/A',
            'approved_by' => $grn->approvedBy->name ?? 'N/A',
            'approved_at' => $grn->approved_at,
            'authorized_by' => $grn->authorizedBy->name ?? 'N/A',
            'authorized_at' => $grn->authorized_at,
            'quality_notes' => $grn->quality_notes,
            'storage_location' => $grn->storage_location,
            'notes' => $grn->notes,
            'hospital_name' => config('hospital.name', 'Hospital'),
            'hospital_address' => config('hospital.address', ''),
            'hospital_phone' => config('hospital.phone', ''),
            'hospital_email' => config('hospital.email', ''),
            'hospital_logo' => config('hospital.logo', ''),
        ];
    }

    public function getGRNs(Request $request)
    {
        $grns = GoodsReceivedNote::with(['supplier', 'receivedBy', 'approvedBy', 'authorizedBy'])
            ->when($request->status, function ($q) use ($request) {
                $q->where('status', $request->status);
            })
            ->when($request->authorized !== null, function ($q) use ($request) {
                $q->where('authorized', $request->authorized === 'true');
            })
            ->when($request->from_date && $request->to_date, function ($q) use ($request) {
                $q->whereBetween('received_date', [$request->from_date, $request->to_date]);
            })
            ->when($request->supplier_id, function ($q) use ($request) {
                $q->where('supplier_id', $request->supplier_id);
            })
            ->when($request->search, function ($q) use ($request) {
                $q->where('grn_number', 'LIKE', '%' . $request->search . '%')
                    ->orWhere('delivery_note_number', 'LIKE', '%' . $request->search . '%')
                    ->orWhere('invoice_number', 'LIKE', '%' . $request->search . '%');
            })
            ->orderBy('created_at', 'desc')
            ->paginate($request->per_page ?? 20);

        return response()->json([
            'success' => true,
            'data' => $grns
        ]);
    }

    public function getGRN($grnId)
    {
        $grn = GoodsReceivedNote::with([
            'supplier',
            'items.product',
            'items.purchaseOrderItem',
            'receivedBy',
            'inspectedBy',
            'approvedBy',
            'authorizedBy'
        ])->findOrFail($grnId);

        // Get ledger entries for this GRN's products
        $productIds = $grn->items->pluck('product_id')->unique();
        $ledgers = StockLedger::whereIn('product_id', $productIds)
            ->orderBy('ledger_date', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'grn' => $grn,
                'ledgers' => $ledgers
            ]
        ]);
    }

    public function getStockLedger($productId, Request $request)
    {
        $ledgers = StockLedger::with(['product', 'department'])
            ->where('product_id', $productId)
            ->when($request->from_date && $request->to_date, function ($q) use ($request) {
                $q->whereBetween('ledger_date', [$request->from_date, $request->to_date]);
            })
            ->when($request->department_id, function ($q) use ($request) {
                $q->where('department_id', $request->department_id);
            })
            ->orderBy('ledger_date', 'desc')
            ->paginate($request->per_page ?? 30);

        return response()->json([
            'success' => true,
            'data' => $ledgers
        ]);
    }

    public function getBatchDetails($batchId)
    {
        $batch = StockBatch::with(['product', 'supplier', 'purchaseOrderItem'])
            ->findOrFail($batchId);

        // Get ledger entries for this batch's product
        $ledgers = StockLedger::where('product_id', $batch->product_id)
            ->orderBy('ledger_date', 'desc')
            ->limit(10)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'batch' => $batch,
                'recent_ledgers' => $ledgers
            ]
        ]);
    }
}
