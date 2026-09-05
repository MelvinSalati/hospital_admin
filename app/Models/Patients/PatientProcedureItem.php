<?php

namespace App\Models\Patients;

use Illuminate\Database\Eloquent\Model;
use App\Models\Patients\Patient;
use App\Models\Billing\Invoice;
use App\Models\Services\Service;

class PatientProcedureItem extends Model
{
    protected $table = 'patient_procedure_items';

    protected $fillable = [
        'patient_id',
        'invoice_id',
        'procedure_id',
        'visit_token',
        'item_id',
        'name',
        'quantity',
        'unit',
        'price',
        'total',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'price' => 'decimal:2',
        'total' => 'decimal:2',
    ];

    /*
    |--------------------------------------------------------------------------
    | Patient
    |--------------------------------------------------------------------------
    */

    public function patient()
    {
        return $this->belongsTo(
            Patient::class,
            'patient_id'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Invoice
    |--------------------------------------------------------------------------
    */

    public function invoice()
    {
        return $this->belongsTo(
            Invoice::class,
            'invoice_id'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Procedure / Service
    |--------------------------------------------------------------------------
    */

    public function procedure()
    {
        return $this->belongsTo(
            Service::class,
            'procedure_id'
        );
    }
}
