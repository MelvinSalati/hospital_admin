<?php

namespace App\Http\Controllers\BulkStores;

use App\Http\Controllers\Controller;
use App\Models\BulkStores\GoodsReceivedNote;
use App\Models\BulkStores\GrnItem;
use App\Models\BulkStores\GrnApproval;
use App\Models\Supplier;
use App\Models\BulkStores\PurchaseRequisition;
use App\Models\OTP;
use App\Models\Product;
use App\Models\StockBatch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;


class GoodsReceivedNoteController extends Controller
{

    public function approveGRN($grnCode){
        return Inertia::render('bulkstore/ApproveGRN',[
            'grnId' => $grnCode
        ]);
    }
    /**
     * Display a listing of GRNs.
     */
    public function index(Request $request)
    {
      
    } 

    public function authorizeApprovalCode(Request $request, $userId){
        $isAllowed = \App\Models\User::where('id', $userId)->first();
        $userPermission = $isAllowed->can_approve_grn;

        // 


        if ($userPermission) {

            if ($isAllowed->approval_code == $request->approval_code) {

                $otp = \App\Helpers\NumberGenerator::generateOTP(
                    \Carbon\Carbon::now(),
                    'approval',
                    4,
                    15
                );

                $phoneNumber = \App\Models\UserProfile::where(
                    'user_id',
                    $userId
                )->first()->mobile_phone_number;

                $message = "Your GRN approval code is: {$otp}\n"
                    . "This code will expire in 15 minutes.\n"
                    . "Please enter this code to approve the GRN.";

                // Send OTP
                dispatch(new \App\Jobs\SendOTPJob($message, $phoneNumber)); 

                return response()->json(
                    [
                        'valid' => true,
                        'message'=> $message
                    ]
                );
            }
        } else {
            return response()->json([
                'valid' => false,
                'message' => $isAllowed,
                'user'  => $userId
            ]);
        }
    }

    public function verifyOtp(Request $request, $otp){ 

        $otp  = OTP::where('code', $otp)->first(); 
        $isExpired   = $otp && $otp->expires_at < now(); 

        if(!$isExpired){
            $grn = GoodsReceivedNote::findOrFail($request->grn_id); 
            $approve    = $grn->update(['status' => 'approved']);
            $message    = 'GRN approved successfully.';
        } else {
            $message = "GRN could not be approved.";
        }

        return response()->json([
            'message' => $message,
            'valid' => true
        ],200);
    }

    /**
     * Get GRN by purchase requisition ID.
     */
    public function getByRequisition($requisitionId)
    {
        $grn = GoodsReceivedNote::with([
            'supplier',
            'purchaseOrder',
            'items.product',
            'approvals'
        ])->where('purchase_order_id', $requisitionId)->first();

        if (!$grn) {
            return response()->json([
                'message' => 'No GRN found for this requisition'
            ], 404);
        }

        return response()->json([
            'grn' => $grn
        ]);
    }

    /**
     * Generate GRN from receiving stock.
     */
    public function generateFromReceiving(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'purchase_requisition_id' => 'required|exists:purchase_requisitions,id',
            'supplier_id' => 'required|exists:suppliers,id',
            'department_id' => 'nullable|exists:departments,id',
            'received_date' => 'required|date',
            'delivery_note_number' => 'nullable|string|max:255',
            'invoice_number' => 'nullable|string|max:255',
            'received_by' => 'required|string|max:255',
            'inspected_by' => 'nullable|string|max:255',
            'storage_location' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'quality_notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.batch_number' => 'required|string|max:255',
            'items.*.expiry_date' => 'required|date|after:today',
            'items.*.manufacturing_date' => 'nullable|date',
            'items.*.location' => 'nullable|string',
            'items.*.notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            DB::beginTransaction();

            // Generate GRN number with timestamp
            $grnNumber = $this->generateGrnNumber();

            // Get the purchase requisition
            $requisition = PurchaseRequisition::findOrFail($request->purchase_requisition_id);

            // Create GRN
            $grn = GoodsReceivedNote::create([
                'grn_number' => $grnNumber,
                'grn_uuid' => (string) Str::uuid(),
                'purchase_order_id' => $request->purchase_requisition_id,
                'supplier_id' => $request->supplier_id,
                'received_date' => $request->received_date,
                'delivery_note_number' => $request->delivery_note_number,
                'invoice_number' => $request->invoice_number,
                'received_by' => $request->received_by,
                'inspected_by' => $request->inspected_by,
                'status' => 'draft', // Draft until approved
                'storage_location' => $request->storage_location,
                'notes' => $request->notes,
                'quality_notes' => $request->quality_notes,
                'attachments' => $request->attachments ?? [],
                'transport_company' => $request->transport_company ?? null,
                'truck_number' => $request->truck_number ?? null,
                'trailer_number' => $request->trailer_number ?? null,
                'driver_name' => $request->driver_name ?? null,
                'origin' => $request->origin ?? null,
                'warehouse' => $request->warehouse ?? null,
            ]);

            // Create GRN items
            foreach ($request->items as $item) {
                GrnItem::create([
                    'grn_id' => $grn->id,
                    'requisition_item_id' => $item['requisition_item_id'],
                    'product_id' => $item['product_id'],
                    'quantity_received' => $item['quantity'],
                    'quantity_good_condition' => $item['quantity'],
                    'quantity_damaged' => 0,
                    'quantity_missing' => 0,
                    'batch_number' => $item['batch_number'],
                    'expiry_date' => $item['expiry_date'],
                    'manufacturing_date' => $item['manufacturing_date'] ?? null,
                    'location' => $item['location'] ?? $request->storage_location,
                    'notes' => $item['notes'] ?? null,
                    'status' => 'pending',
                ]);
            }

            // Create approval record
            GrnApproval::create([
                'grn_id' => $grn->id,
                'status' => 'pending',
                'notes' => 'GRN created from receiving stock',
                'created_by' => $request->received_by,
            ]);

            DB::commit();

            // Load relationships for response
            $grn->load(['items.product', 'supplier', 'approvals']);

            return response()->json([
                'success' => true,
                'message' => 'Stock received and GRN created successfully',
                'grn' => $grn
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('GRN Generation Failed: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate GRN',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Approve GRN.
     */
    public function approve(Request $request, $id)
    {
        $grn = GoodsReceivedNote::with(['items'])->findOrFail($id);

        if ($grn->status !== 'draft') {
            return response()->json([
                'message' => 'Only draft GRNs can be approved'
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'approved_by' => 'required|string|max:255',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            DB::beginTransaction();

            // Update GRN status
            $grn->update([
                'status' => 'approved',
                'approved_by' => $request->approved_by,
                'approved_at' => now(),
            ]);

            // Update approval record
            $approval = $grn->approvals()->latest()->first();
            if ($approval) {
                $approval->update([
                    'status' => 'approved',
                    'approved_by' => $request->approved_by,
                    'approved_at' => now(),
                    'notes' => $request->notes ?? $approval->notes,
                ]);
            }

            // Update GRN items status
            foreach ($grn->items as $item) {
                $item->update(['status' => 'received']);
            }

            // Create stock batches
            foreach ($grn->items as $item) {
                StockBatch::create([
                    'product_id' => $item->product_id,
                    'grn_id' => $grn->id,
                    'grn_item_id' => $item->id,
                    'batch_number' => $item->batch_number,
                    'quantity' => $item->quantity_received,
                    'available_quantity' => $item->quantity_received,
                    'expiry_date' => $item->expiry_date,
                    'manufacturing_date' => $item->manufacturing_date,
                    'location' => $item->location ?? $grn->storage_location,
                    'status' => 'available',
                    'notes' => $item->notes,
                ]);
            }

            DB::commit();

            $grn->load(['items.product', 'supplier', 'approvals']);

            return response()->json([
                'success' => true,
                'message' => 'GRN approved and stock updated successfully',
                'grn' => $grn
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('GRN Approval Failed: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to approve GRN',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reject GRN.
     */
    public function reject(Request $request, $id)
    {
        $grn = GoodsReceivedNote::findOrFail($id);

        if ($grn->status !== 'draft') {
            return response()->json([
                'message' => 'Only draft GRNs can be rejected'
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'rejection_reason' => 'required|string',
            'rejected_by' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            DB::beginTransaction();

            $grn->update([
                'status' => 'rejected',
                'rejection_reason' => $request->rejection_reason,
            ]);

            // Update approval record
            $approval = $grn->approvals()->latest()->first();
            if ($approval) {
                $approval->update([
                    'status' => 'rejected',
                    'rejected_by' => $request->rejected_by,
                    'rejected_at' => now(),
                    'rejection_reason' => $request->rejection_reason,
                ]);
            }

            // Update GRN items
            foreach ($grn->items as $item) {
                $item->update(['status' => 'rejected']);
            }

            DB::commit();

            $grn->load(['items.product', 'supplier', 'approvals']);

            return response()->json([
                'success' => true,
                'message' => 'GRN rejected successfully',
                'grn' => $grn
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('GRN Rejection Failed: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to reject GRN',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified GRN.
     */
    public function show($id)
    {
        $grn = GoodsReceivedNote::with([
            'supplier',
            'purchaseOrder',
            'approvals',
            'items.product'
        ])->findOrFail($id);

        return response()->json($grn);
    }

    /**
     * Get GRN by number.
     */
    public function getByNumber($grnNumber)
    {
        $grn = GoodsReceivedNote::with([
            'supplier',
            'purchaseOrder',
            'approvals',
            'items.product'
        ])->where('grn_number', $grnNumber)->firstOrFail();

        return response()->json($grn);
    }

    /**
     * Generate unique GRN number with timestamp.
     * Format: GRN-YYYYMMDD-HHMMSS-XXXX
     */
    private function generateGrnNumber()
    {
        $timestamp = now()->format('Ymd-His');
        $random = Str::upper(Str::random(4));

        return "GRN-{$timestamp}-{$random}";
    }

    /**
     * Print GRN.
     */
    public function printGrn($id)
    {
        $grn = GoodsReceivedNote::with([
            'supplier',
            'purchaseOrder',
            'approvals',
            'items.product'
        ])->findOrFail($id);

        return response()->json([
            'grn' => $grn,
            'print_url' => route('grn.print', $grn->id)
        ]);
    }

    /**
     * Update GRN.
     */
    public function update(Request $request, $id)
    {
        $grn = GoodsReceivedNote::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'delivery_note_number' => 'nullable|string|max:255',
            'invoice_number' => 'nullable|string|max:255',
            'storage_location' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'quality_notes' => 'nullable|string',
            'attachments' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $grn->update($request->all());

        return response()->json([
            'message' => 'GRN updated successfully',
            'data' => $grn->load(['items.product', 'supplier', 'approvals'])
        ]);
    }

    /**
     * Delete GRN.
     */
    public function destroy($id)
    {
        $grn = GoodsReceivedNote::findOrFail($id);

        // Only allow deletion of draft GRNs
        if ($grn->status !== 'draft') {
            return response()->json([
                'message' => 'Only draft GRNs can be deleted'
            ], 422);
        }

        $grn->delete();

        return response()->json([
            'message' => 'GRN deleted successfully'
        ]);
    }

    /**
     * Get GRN statistics.
     */
    public function stats()
    {
        $stats = [
            'total' => GoodsReceivedNote::count(),
            'draft' => GoodsReceivedNote::where('status', 'draft')->count(),
            'pending' => GoodsReceivedNote::where('status', 'pending')->count(),
            'approved' => GoodsReceivedNote::where('status', 'approved')->count(),
            'rejected' => GoodsReceivedNote::where('status', 'rejected')->count(),
            'total_items' => GrnItem::count(),
            'total_quantity' => GrnItem::sum('quantity_received'),
        ];

        return response()->json($stats);
    }
}
