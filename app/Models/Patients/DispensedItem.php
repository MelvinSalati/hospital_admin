<?php

namespace App\Models\Patients;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DispensedItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'prescription_number',
        'drug_id',
        'drug_name',
        'dosage',
        'frequency',
        'route',
        'quantity_dispensed',
        'quantity_prescribed',
        'quantity_remaining',
        'status',
        'notes',
        'reason_not_dispensed',
        'dispensed_by',
        'dispensed_at'
    ];

    protected $casts = [
        'dispensed_at' => 'datetime',
        'quantity_dispensed' => 'integer',
        'dispensed_by' => 'integer',
        'quantity_prescribed' => 'integer',
        'quantity_remaining' => 'integer'
    ];

    public function dispenser()
    {
        return $this->belongsTo(User::class, 'dispensed_by');
    }
}
