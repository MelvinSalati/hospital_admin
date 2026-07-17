<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Patients\Patient;

class DrugTransaction extends Model
{
    protected $fillable = [
        'drug_id',
        'transaction_type',
        'quantity',
        'balance_after',
        'reference_number',
        'transaction_date',
        'created_by',
        'notes',
        'patient_id',
        'invoice_number',
        'source_department',
        'destination_department',
    ];

    protected $casts = [
        'transaction_date' => 'datetime',
    ];

    public function drug(): BelongsTo
    {
        return $this->belongsTo(Drug::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }
}
