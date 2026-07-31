<?php

namespace App\Http\Controllers\BulkStores;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Departments\Department;
use App\Models\Budgets\BudgetAllocation;
use App\Models\Supplier;
use App\Models\Product;


class PurchaseRequisitionController extends Controller
{
    public function  purchaseRequesition(){
        return Inertia::render('bulkstore/PurchaseRequisition',[
            'departments' => Department::all(),
            'budgets'     => BudgetAllocation::all(),
            'suppliers'   => Supplier::all(),
            'products'    => Product::all()
        ]);
    }
}
