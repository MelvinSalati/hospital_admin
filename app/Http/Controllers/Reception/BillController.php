<?php

namespace App\Http\Controllers\Reception;

use App\Http\Controllers\Controller;
use App\Models\Payments\Invoice;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BillController extends Controller
{
    public function index(){
        return  Inertia::render('receptions/bill',$this->pendingBills());
    }

    public function payments(){
        return  Inertia::render('receptions/payment',$this->paymentsDetails());
    }

    protected function paymentsDetails(){
        return [
            'payments' => Invoice::with('patient')->where('status', 'paid')->limit(6)->get()
        ];
    }

    public function insurance(){
        return  Inertia::render('receptions/insurance',$this->insuranceDetails());
    } 
    protected function insuranceDetails(){
        return [
            'insurance' => Invoice::with('patient')
            ->where('payment_scheme','<>','cash')
            ->where('payment_scheme','<>', null)->where('status', 'paid')->limit(6)->get()
        ];
    }

    public function pendingBills () : array {
        return [
            'bills' => [
                [
                    'id' => 1,
                    'patient_name' => 'John Doe',
                    'amount' => 100.00,
                    'status' => 'Pending',
                ],
                [
                    'id' => 2,
                    'patient_name' => 'Jane Smith',
                    'amount' => 200.00,
                    'status' => 'Pending',
                ],
            ]
        ];
    }
}
