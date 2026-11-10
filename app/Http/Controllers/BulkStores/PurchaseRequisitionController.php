<?php

namespace App\Http\Controllers\BulkStores;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Departments\Department;
use App\Models\Budgets\BudgetAllocation;
use App\Models\BulkStores\PurchaseRequisition;
use App\Models\Supplier;
use App\Models\Product;
use App\Models\BulkStores\PurchaseRequisitionItem;
use Illuminate\Support\Facades\DB;


class PurchaseRequisitionController extends Controller
{
    public function purchaseRequesition()
    {
        // Products that are linked to any active pharmacy service
        // via services.commodity_id -> products.id
        $products = DB::table('products')
            ->join('services', 'services.product_uuid', '=', 'products.product_uuid')
            ->whereIn('services.service_category', [
                'Pharmacy',
                'Drugs',
                'Products',
                'Wound Care Supplies',
                'Clinical Supplies',
                'Injection Supplies',
            ])
            ->where('services.is_active', 1)
            ->whereNull('services.deleted_at')
            ->where('products.is_active', 1)
            ->select([
                'products.id',
                'products.product_name',
                'products.product_code',
                'products.generic_name',
                'products.brand_name',
                'products.strength',
                'products.form',
                'products.unit',
                'products.pack_size',
                'products.description as product_description',
                'services.price',
                'services.service_category as service_category',
            ])
            ->distinct()
            ->get()
            ->map(fn($p) => [
                'id'           => $p->id,
                'product_name' => $p->product_name,
                'product_code' => $p->product_code,
                'generic_name' => $p->generic_name,
                'brand_name'   => $p->brand_name,
                'full_name'    => trim(($p->product_name ?? '') . ' ' . ($p->strength ?? '')),
                'strength'     => $p->strength,
                'form'         => $p->form,
                'unit'         => $p->unit,
                'pack_size'    => $p->pack_size,
                'stock'        => null, // left-join inventory table when ready
                'price'        => (float) $p->price,
                'category'     => $p->service_category,
            ]);





        $requisitions = PurchaseRequisition::with([
            'items',
            'department:id,name,code',
            'supplier:id,supplier_name,supplier_code',
        ])
            ->where('status', 'pending')
            ->latest()
            ->get()
            ->map(fn($pr) => [
                'id'              => $pr->id,
                'pr_number'       => $pr->pr_number,
                'department_id'   => $pr->department_id,
                'department'      => $pr->department ? [
                    'name' => $pr->department->name,
                    'code' => $pr->department->code,
                ] : null,
                'budget_code'     => $pr->budget_code,
                'budget_name'     => $pr->budget_name,
                'supplier_id'     => $pr->supplier_id,
                'supplier_name'   => $pr->supplier?->supplier_name,
                'required_date'   => $pr->required_date,
                'priority'        => $pr->priority,
                'justification'   => $pr->justification,
                'status'          => $pr->status,
                'total_amount'    => $pr->estimated_total,
                'created_by'      => $pr->created_by,
                'created_by_name' => $pr->created_by_name ?? null,
                'created_at'      => $pr->created_at?->toIso8601String(),
                'updated_at'      => $pr->updated_at?->toIso8601String(),
                'items'           => $pr->items->map(fn($item) => [
                    'id'                   => $item->id,
                    'product_id'           => $item->product_id,
                    'product_name'         => $item->product_name
                        ?? optional($item->product)->service_name
                        ?? optional($item->product)->product_name,
                    'product_code'         => $item->product_code
                        ?? optional($item->product)->service_code
                        ?? optional($item->product)->product_code,
                    'quantity'             => (int) $item->quantity,
                    'estimated_unit_price' => (float) $item->estimated_unit_price,
                    'total'                => (float) $item->total,
                    'required_by_date'     => $item->required_by_date,
                    'status'               => $item->status ?? 'pending',
                    'notes'                => $item->notes,
                ])->values(),
            ]);

        return Inertia::render('bulkstore/PurchaseRequisition', [
            'departments'  => Department::all(),
            'budgets'      => BudgetAllocation::all(),
            'suppliers'    => Supplier::all(),
            'products'     => $products,
            'requisitions' => $requisitions,
        ]);
    }
    
    // public function index()
    // {
    //     $products = DB::table('services')
    //         ->whereIn('service_category', [
    //             'Drugs',
    //             'Products',
    //             'Wound Care Supplies',
    //             'Clinical Supplies',
    //             'Injection Supplies',
    //         ])
    //         ->where('is_active', 1)
    //         ->whereNull('deleted_at')
    //         ->get()
    //         ->map(fn($service) => [
    //             'id'           => $service->id,
    //             'product_name' => $service->service_name,
    //             'product_code' => $service->service_code,
    //             'full_name'    => $service->service_name,
    //             'strength'     => null,
    //             'form'         => $service->service_category,
    //             'stock'        => null,
    //             'unit'         => $this->parseUnit($service->description),
    //             'price'        => (float) $service->price,
    //         ]);

    //     $requisitions = PurchaseRequisition::with([
    //         'items',              // adjust to your actual relation name
    //         'department:id,name,code',
    //         'supplier:id,supplier_name,supplier_code',
    //     ])
    //         ->where('status', 'pending')
    //         ->latest()
    //         ->get()
    //         ->map(fn($pr) => [
    //             'id'               => $pr->id,
    //             'pr_number'        => $pr->pr_number,
    //             'department_id'    => $pr->department_id,
    //             'department'       => $pr->department ? [
    //                 'name' => $pr->department->name,
    //                 'code' => $pr->department->code,
    //             ] : null,
    //             'budget_code'      => $pr->budget_code,
    //             'budget_name'      => $pr->budget_name,
    //             'supplier_id'      => $pr->supplier_id,
    //             'supplier_name'    => $pr->supplier?->supplier_name,
    //             'required_date'    => $pr->required_date,
    //             'priority'         => $pr->priority,
    //             'justification'    => $pr->justification,
    //             'status'           => $pr->status,
    //             'total_amount'     => $pr->estimated_total,
    //             'created_by'       => $pr->created_by,
    //             'created_by_name'  => $pr->created_by_name ?? null,
    //             'created_at'       => $pr->created_at?->toIso8601String(),
    //             'updated_at'       => $pr->updated_at?->toIso8601String(),
    //             'items'            => $pr->items->map(fn($item) => [
    //                 'id'                    => $item->id,
    //                 'product_id'            => $item->product_id,
    //                 'product_name'          => $item->product_name
    //                     ?? optional($item->product)->service_name
    //                     ?? optional($item->product)->product_name,
    //                 'product_code'          => $item->product_code
    //                     ?? optional($item->product)->service_code
    //                     ?? optional($item->product)->product_code,
    //                 'quantity'              => (int) $item->quantity,
    //                 'estimated_unit_price'  => (float) $item->estimated_unit_price,
    //                 'total'                 => (float) $item->total,
    //                 'required_by_date'      => $item->required_by_date,
    //                 'status'                => $item->status ?? 'pending',
    //                 'notes'                 => $item->notes,
    //             ])->values(),
    //         ]);

    //     return Inertia::render('bulkstore/PurchaseRequisition', [
    //         'departments' => Department::all(),
    //         'budgets'     => BudgetAllocation::all(),
    //         'suppliers'   => Supplier::all(),
    //         'products'    => $products,
    //         'requisitions' => $requisitions,
    //     ]);
    // }

    /**
     * Extract unit from description like "Pack of 100 tablets" -> "Pack"
     */
    private function parseUnit(?string $description): ?string
    {
        if (!$description) {
            return null;
        }
        // Simple heuristic: first word before "of"
        if (preg_match('/^(.*?)\s+of\s+/i', $description, $m)) {
            return trim($m[1]);
        }
        return null;
    }
}
