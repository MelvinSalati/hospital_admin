<?php

namespace App\Http\Controllers\Pharmacies;

use App\Http\Controllers\Controller;
use App\Models\DrugItem;
use App\Models\BulkStoreRequest;
use App\Models\BulkStoreItem;
use App\Models\DepartmentStock;
use App\Models\StockMovement;
use App\Models\ProductCategory;
use App\Models\UserProfile;
use App\Events\OrderBulkStoreProduct;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class OrderController extends Controller
{
    /**
     * Display the orders page with products and order history.
     */
    public function index(Request $request)
    {
        $search = $request->input('search', '');
        $categoryId = $request->input('category');
        $departmentId = auth()->user()->department_id ?? 1;

        // Simple query with joins
        $products = DrugItem::query()
            ->select(
                'drug_items.*',
                DB::raw('COALESCE(ds.stock_balance, 0) as stock_balance')
            )
            ->leftJoin('department_stocks as ds', function ($join) use ($departmentId) {
                $join->on('drug_items.id', '=', 'ds.product_id')
                    ->where('ds.department_id', '=', $departmentId);
            })
            ->where('drug_items.is_active', 1)
            ->where('drug_items.discontinued', 0)
            ->when($search, function ($q) use ($search) {
                $q->where('drug_items.drug_name', 'LIKE', "%{$search}%")
                    ->orWhere('drug_items.drug_code', 'LIKE', "%{$search}%")
                    ->orWhere('drug_items.barcode', 'LIKE', "%{$search}%");
            })
            ->when($categoryId, fn($q) => $q->where('drug_items.category_id', $categoryId))
            ->orderBy('drug_items.drug_name')
            ->paginate(15)
            ->through(fn($product) => [
                'id' => $product->id,
                'product_name' => $product->drug_name,      // Map to frontend
                'product_code' => $product->drug_code,      // Map to frontend
                'generic_name' => $product->generic_name,
                'barcode' => $product->barcode,
                'category_name' => $product->category?->name,
                'stock_balance' => (int) $product->stock_balance,
                'reorder_level' => $product->reorder_level,
                'selling_price' => $product->selling_price,
                'unit_of_measure' => $product->unit_of_measure,
                'pack_size' => $product->pack_size,
                'dosage_form' => $product->dosage_form,
                'strength' => $product->strength,
            ]);

        // Low stock products
        $lowStockProducts = $products->getCollection()->filter(
            fn($p) => $p['stock_balance'] <= ($p['reorder_level'] ?? 0)
        )->values();

        return inertia('pharmacies/orders', [
            'products' => $products,
            'lowStockProducts' => $lowStockProducts,
            'categories' => \App\Models\DrugCategory::active()->orderBy('name')->get(),
            'filters' => [
                'search' => $search,
                'category' => $categoryId,
            ],
        ]);
    }

    /**
     * Store a new order request from pharmacy to bulk store.
     */
    public function orderStock(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:drug_items,id',
            'quantity' => 'required|integer|min:1',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'notes' => 'nullable|string|max:500',
            'batch_number' => 'nullable|string|max:100',
            'expiry_date' => 'nullable|date',
            'created_by' => 'nullable|integer|exists:users,id',
        ]);

        try {
            DB::beginTransaction();

            // Get the authenticated user or use provided created_by
            $userId = $validated['created_by'];
            // Get department_id from user's profile
            $departmentId = 1;
            //  UserProfile::where('user_id', $request->created_by)->value('department_id');

            // If user has no profile or department, throw error
            if (!$departmentId) {
                return response()->json([
                    'success' => false,
                    'message' => 'User does not have a department assigned in their profile',
                ], 400);
            }

            $product = DrugItem::findOrFail($validated['product_id']);

            // Generate request number
            $requestNumber = 'REQ-' . date('Ymd') . '-' . str_pad(
                BulkStoreRequest::whereDate('created_at', today())->count() + 1,
                4,
                '0',
                STR_PAD_LEFT
            );

            // Calculate total
            $unitPrice = $product->selling_price ?? 0;
            $totalAmount = $validated['quantity'] * $unitPrice;

            // 1. Create Bulk Store Request
            $order = BulkStoreRequest::create([
                'request_number' => $requestNumber,
                'department_id' => $departmentId,
                'request_date' => now(),
                'required_by_date' => now()->addDays(3),
                'status' => 'pending',
                'priority' => $validated['priority'] ?? 'medium',
                'notes' => $validated['notes'] ?? null,
                'required_by' => $userId,
                'is_active' => 1,
            ]);

            // 2. Create Bulk Store Request Item
            $orderItem = BulkStoreItem::create([
                'request_id' => $order->id,
                'product_id' => $validated['product_id'],
                'quantity_requested' => $validated['quantity'],
                'quantity_approved' => 0,
                'quantity_dispatched' => 0,
                'quantity_received' => 0,
                'unit_price' => $unitPrice,
                'total_price' => $totalAmount,
                'batch_number' => $validated['batch_number'] ?? null,
                'expiry_date' => $validated['expiry_date'] ?? null,
                'status' => 'pending',
            ]);

            // 3. Update or Create Department Stock
            $departmentStock = DepartmentStock::where('department_id', $departmentId)
                ->where('product_id', $validated['product_id'])
                ->first();

            $previousStock = $departmentStock ? $departmentStock->stock_balance : 0;
            $newStock = $previousStock + $validated['quantity'];

            if ($departmentStock) {
                // Update existing stock
                $departmentStock->update([
                    'stock_balance' => $newStock,
                    'updated_at' => now(),
                ]);
            } else {
                // Create new stock record
                $departmentStock = DepartmentStock::create([
                    'department_id' => $departmentId,
                    'product_id' => $validated['product_id'],
                    'stock_balance' => $validated['quantity'],
                    'reorder_level' => $product->reorder_level ?? 10,
                    'min_stock' => $product->minimum_stock_level ?? 5,
                    'max_stock' => $product->maximum_stock_level ?? 500,
                    'location' => 'Bulk Store',
                    'is_active' => 1,
                ]);
            }

            // 4. Create Stock Movement Record
            $stockMovement = StockMovement::create([
                'product_id' => $validated['product_id'],
                'department_id' => $departmentId,
                'movement_type' => 'order_placed',
                'quantity' => $validated['quantity'],
                'previous_balance' => $previousStock,
                'new_balance' => $newStock,
                'unit_price' => $unitPrice,
                'total_amount' => $totalAmount,
                'reference_type' => 'bulk_store_request',
                'reference_id' => $order->id,
                'notes' => $validated['notes'] ?? 'Order placed from Bulk Store',
                'performed_by' => $userId,
            ]);

            DB::commit();

            // Broadcast event for real-time notifications
            broadcast(new OrderBulkStoreProduct($order));

            $user  = \App\Models\User::findOrFail($validated['created_by']);
            return response()->json([
                'success' => true,
                'message' => 'Order placed successfully',
                'order' => $order,
                'order_item' => $orderItem,
                'department_stock' => $departmentStock,
                'stock_movement' => $stockMovement,
                'department_id' => $departmentId,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->first_name . ' ' . $user->surname,
                    'email' => $user->email,
                ],
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to place order: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Approve an order.
     */
    public function approve(Request $request, $id)
    {
        try {
            $order = BulkStoreRequest::findOrFail($id);

            if ($order->status !== 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'Order cannot be approved',
                ], 400);
            }

            DB::beginTransaction();

            $order->update([
                'status' => 'approved',
                'approved_by' => Auth::id(),
                'approved_at' => now(),
            ]);

            // Update order items
            $order->items()->update([
                'status' => 'approved',
                'quantity_approved' => DB::raw('quantity_requested'),
            ]);

            DB::commit();

            // Broadcast event for real-time notifications
            broadcast(new OrderBulkStoreProduct($order));

            return response()->json([
                'success' => true,
                'message' => 'Order approved successfully',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to approve order: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Dispatch an order (send from bulk store to department).
     */
    public function dispatch(Request $request, $id)
    {
        try {
            $order = BulkStoreRequest::findOrFail($id);

            if ($order->status !== 'approved') {
                return response()->json([
                    'success' => false,
                    'message' => 'Order cannot be dispatched',
                ], 400);
            }

            DB::beginTransaction();

            $order->update([
                'status' => 'dispatched',
                'dispatched_by' => Auth::id(),
                'dispatched_at' => now(),
            ]);

            // Update order items
            $order->items()->update([
                'status' => 'dispatched',
                'quantity_dispatched' => DB::raw('quantity_approved'),
            ]);

            DB::commit();

            // Broadcast event for real-time notifications
            broadcast(new OrderBulkStoreProduct($order));

            return response()->json([
                'success' => true,
                'message' => 'Order dispatched successfully',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to dispatch order: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Complete an order (receive items in department).
     */
    public function complete(Request $request, $id)
    {
        try {
            $order = BulkStoreRequest::with(['items'])->findOrFail($id);

            if ($order->status !== 'approved' && $order->status !== 'dispatched') {
                return response()->json([
                    'success' => false,
                    'message' => 'Order cannot be completed',
                ], 400);
            }

            DB::beginTransaction();

            $order->update([
                'status' => 'completed',
                'received_by' => Auth::id(),
                'received_at' => now(),
            ]);

            // Update order items and process stock
            foreach ($order->items as $item) {
                $item->update([
                    'status' => 'received',
                    'quantity_received' => $item->quantity_approved,
                ]);

                // Update department stock
                $departmentStock = DepartmentStock::where('department_id', $order->department_id)
                    ->where('product_id', $item->product_id)
                    ->first();

                if ($departmentStock) {
                    $previousStock = $departmentStock->stock_balance;
                    $newStock = $previousStock + $item->quantity_approved;

                    $departmentStock->update([
                        'stock_balance' => $newStock,
                    ]);

                    // Create stock movement for receiving
                    StockMovement::create([
                        'product_id' => $item->product_id,
                        'department_id' => $order->department_id,
                        'movement_type' => 'order_received',
                        'quantity' => $item->quantity_approved,
                        'previous_balance' => $previousStock,
                        'new_balance' => $newStock,
                        'unit_price' => $item->unit_price,
                        'total_amount' => $item->unit_price * $item->quantity_approved,
                        'reference_type' => 'bulk_store_request',
                        'reference_id' => $order->id,
                        'notes' => 'Order received from Bulk Store',
                        'performed_by' => Auth::id(),
                    ]);
                }
            }

            DB::commit();

            // Broadcast event for real-time notifications
            broadcast(new OrderBulkStoreProduct($order));

            return response()->json([
                'success' => true,
                'message' => 'Order completed successfully',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to complete order: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Cancel an order.
     */
    public function cancel(Request $request, $id)
    {
        try {
            $order = BulkStoreRequest::findOrFail($id);

            if ($order->status === 'completed' || $order->status === 'cancelled') {
                return response()->json([
                    'success' => false,
                    'message' => 'Order cannot be cancelled',
                ], 400);
            }

            DB::beginTransaction();

            // If order was already dispatched, revert stock
            if ($order->status === 'dispatched') {
                foreach ($order->items as $item) {
                    $departmentStock = DepartmentStock::where('department_id', $order->department_id)
                        ->where('product_id', $item->product_id)
                        ->first();

                    if ($departmentStock) {
                        $previousStock = $departmentStock->stock_balance;
                        $newStock = $previousStock - $item->quantity_dispatched;

                        $departmentStock->update([
                            'stock_balance' => $newStock,
                        ]);

                        StockMovement::create([
                            'product_id' => $item->product_id,
                            'department_id' => $order->department_id || 1,
                            'movement_type' => 'order_cancelled',
                            'quantity' => -$item->quantity_dispatched,
                            'previous_balance' => $previousStock,
                            'new_balance' => $newStock,
                            'unit_price' => $item->unit_price,
                            'total_amount' => -$item->unit_price * $item->quantity_dispatched,
                            'reference_type' => 'bulk_store_request',
                            'reference_id' => $order->id,
                            'notes' => 'Order cancelled - stock reverted',
                            'performed_by' => Auth::id(),
                        ]);
                    }
                }
            }

            $order->update([
                'status' => 'cancelled',
                'notes' => ($order->notes ? $order->notes . "\n" : '') .
                    'Cancelled by ' . Auth::user()->name . ' at ' . now(),
            ]);

            // Update order items
            $order->items()->update([
                'status' => 'cancelled',
            ]);

            DB::commit();

            // Broadcast event for real-time notifications
            broadcast(new OrderBulkStoreProduct($order));

            return response()->json([
                'success' => true,
                'message' => 'Order cancelled successfully',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to cancel order: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get order details.
     */
    public function show(Request $request, $id)
    {
        $order = BulkStoreRequest::with(['items.product', 'department', 'createdBy', 'approvedBy', 'dispatchedBy', 'receivedBy'])
            ->findOrFail($id);

        return response()->json([
            'order' => [
                'id' => $order->id,
                'order_number' => $order->request_number,
                'request_date' => $order->request_date,
                'status' => $order->status,
                'priority' => $order->priority,
                'total_amount' => $order->total_amount,
                'notes' => $order->notes,
                'created_by' => $order->createdBy?->name,
                'approved_by' => $order->approvedBy?->name,
                'dispatched_by' => $order->dispatchedBy?->name,
                'approved_at' => $order->approved_at,
                'dispatched_at' => $order->dispatched_at,
                'received_at' => $order->received_at,
                'department_name' => $order->department?->name,
                'items' => $order->items->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'product_id' => $item->product_id,
                        'product_name' => $item->product?->drug_name ?? 'N/A',
                        'quantity_requested' => $item->quantity_requested,
                        'quantity_approved' => $item->quantity_approved,
                        'quantity_dispatched' => $item->quantity_dispatched,
                        'quantity_received' => $item->quantity_received,
                        'unit_price' => $item->unit_price,
                        'total_price' => $item->total_price,
                        'batch_number' => $item->batch_number,
                        'expiry_date' => $item->expiry_date,
                        'status' => $item->status,
                    ];
                }),
            ],
        ]);
    }

    /**
     * Get pending orders count.
     */
    public function pendingCount()
    {
        $count = BulkStoreRequest::where('status', 'pending')->count();

        return response()->json([
            'pending_count' => $count,
        ]);
    }

    /**
     * Get order statistics.
     */
    public function statistics()
    {
        $stats = [
            'total_orders' => BulkStoreRequest::where('is_active', 1)->count(),
            'pending_orders' => BulkStoreRequest::where('status', 'pending')->count(),
            'approved_orders' => BulkStoreRequest::where('status', 'approved')->count(),
            'dispatched_orders' => BulkStoreRequest::where('status', 'dispatched')->count(),
            'completed_orders' => BulkStoreRequest::where('status', 'completed')->count(),
            'cancelled_orders' => BulkStoreRequest::where('status', 'cancelled')->count(),
            'total_amount' => BulkStoreRequest::where('is_active', 1)->sum('total_amount'),
            'orders_this_month' => BulkStoreRequest::whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->count(),
        ];

        return response()->json($stats);
    }

    /**
     * Get department stock for a product.
     */
    public function getDepartmentStock(Request $request, $productId)
    {
        $userId = Auth::id();
        $departmentId = UserProfile::where('user_id', $userId)->value('department_id');

        if (!$departmentId) {
            return response()->json([
                'success' => false,
                'message' => 'User has no department assigned',
            ], 400);
        }

        $stock = DepartmentStock::where('department_id', $departmentId)
            ->where('product_id', $productId)
            ->first();

        return response()->json([
            'success' => true,
            'data' => [
                'department_id' => $departmentId,
                'product_id' => $productId,
                'stock_balance' => $stock?->stock_balance ?? 0,
                'reorder_level' => $stock?->reorder_level ?? 10,
                'min_stock' => $stock?->min_stock ?? 5,
                'max_stock' => $stock?->max_stock ?? 500,
            ],
        ]);
    }

    /**
     * Get the current user's department from their profile.
     */
    public function getUserDepartment()
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not authenticated',
            ], 401);
        }

        $userProfile = UserProfile::where('user_id', $user->id)->first();
        $departmentId = $userProfile?->department_id;

        // Get department name
        $departmentName = null;
        if ($departmentId) {
            $department = \App\Models\Department::find($departmentId);
            $departmentName = $department?->name ?? 'Unknown Department';
        }

        return response()->json([
            'success' => true,
            'data' => [
                'user_id' => $user->id,
                'name' => $user->first_name . ' ' . $user->surname,
                'email' => $user->email,
                'department_id' => $departmentId,
                'department_name' => $departmentName,
                'profile' => $userProfile ? [
                    'id' => $userProfile->id,
                    'department_id' => $userProfile->department_id,
                ] : null,
            ],
        ]);
    }
}
