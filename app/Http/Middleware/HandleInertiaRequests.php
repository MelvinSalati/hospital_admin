<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        $user = $request->user();
        $userProfile = null;

        // Get goods received notes with relationships
        $goodsReceivedNotes = \App\Models\BulkStores\GoodsReceivedNote::with([
            'grnItem',
            'grnItem.product',
            'supplier',
            'receivedBy'
        ])->get();

        // Attach prices to GRN items
        foreach ($goodsReceivedNotes as $grn) {
            foreach ($grn->grnItem as $item) {
                // Get price from approved requisition that became a purchase order
                $requisitionItem = DB::table('purchase_requisition_items as pri')
                    ->join('purchase_requisitions as pr', 'pr.id', '=', 'pri.requisition_id')
                    ->where('pri.product_id', $item->product_id)
                    ->where('pr.supplier_id', $grn->supplier_id)
                    ->orderBy('pr.approved_at', 'desc')
                    ->select(
                        'pri.estimated_unit_price as unit_price',
                        'pri.estimated_total as total_price',
                        'pr.approved_at',
                        'pr.id as requisition_id',
                        'pr.status'
                    )
                    ->first();

                if ($requisitionItem) {
                    // Found price - use it regardless of status since it's in the system
                    $item->unit_price = $requisitionItem->unit_price;
                    $item->total_price = $requisitionItem->total_price;
                    $item->price_source = 'requisition';
                    $item->requisition_id = $requisitionItem->requisition_id;
                    $item->requisition_status = $requisitionItem->status;
                } else {
                    // Try without supplier filter
                    $requisitionItemFallback = DB::table('purchase_requisition_items as pri')
                        ->join('purchase_requisitions as pr', 'pr.id', '=', 'pri.requisition_id')
                        ->where('pri.product_id', $item->product_id)
                        ->orderBy('pr.approved_at', 'desc')
                        ->select(
                            'pri.estimated_unit_price as unit_price',
                            'pri.estimated_total as total_price',
                            'pr.approved_at',
                            'pr.id as requisition_id',
                            'pr.supplier_id',
                            'pr.status'
                        )
                        ->first();

                    if ($requisitionItemFallback) {
                        $item->unit_price = $requisitionItemFallback->unit_price;
                        $item->total_price = $requisitionItemFallback->total_price;
                        $item->price_source = 'requisition_fallback';
                        $item->requisition_id = $requisitionItemFallback->requisition_id;
                        $item->requisition_status = $requisitionItemFallback->status;
                    } else {
                        // Try to get from product as last resort
                        if ($item->product && $item->product->price) {
                            $item->unit_price = $item->product->price;
                            $item->total_price = $item->product->price * (float)$item->quantity_received;
                            $item->price_source = 'product';
                        } else {
                            $item->unit_price = 0;
                            $item->total_price = 0;
                            $item->price_source = 'none';
                        }
                    }
                }
            }
        }

        // If user is authenticated, load their profile
        if ($user) {
            $user->load('profile');
            $userProfile = $user->profile;
        }

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'is_supervisor' => $user->supervisor_id,
                    'is_admin' => $user->is_admin,
                    'user_uuid' => $user->user_uuid ?? null,
                    'profile' => $userProfile ? [
                        'id' => $userProfile->id,
                        'first_name' => $userProfile->first_name,
                        'surname' => $userProfile->surname,
                        'date_of_birth' => $userProfile->date_of_birth,
                        'gender' => $userProfile->gender,
                        'address' => $userProfile->address,
                        'mobile_phone_number' => $userProfile->mobile_phone_number,
                        'certificates' => $userProfile->certificates,
                        'degrees' => $userProfile->degrees,
                        'diplomas' => $userProfile->diplomas,
                        'profession_id' => $userProfile->profession_id,
                        'roles' => $userProfile->roles,
                        'license_expiry_date' => $userProfile->license_expiry_date,
                        'license_number' => $userProfile->license_number,
                        'license_document' => $userProfile->license_document,
                        'created_at' => $userProfile->created_at,
                        'updated_at' => $userProfile->updated_at,
                    ] : null,
                ] : null,
            ],
            'sidebarOpen' => !$request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'goodsReceivedNotes' => $goodsReceivedNotes,
        ];
    }
}
