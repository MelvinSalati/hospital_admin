<?php

namespace App\Models\Patients;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Prescription extends Model
{
    use SoftDeletes;

    protected $table = 'prescriptions';

    protected $fillable = [
        'visit_token',
        'prescription_number',
        'patient_id',
        'user_id',
        'invoice_id',
        'items', 
        'status',
        'prescribed_date',
        'expiry_date',
        'dispensed_date',
        'clinical_notes',
        'dispensing_notes',
        'admission_number',
        'is_admitted'
    ];

    protected $casts = [
        'items' => 'array',  // Each item has: drug_id, drug_name, dosage, frequency, route, duration, quantity, instructions
        'prescribed_date' => 'date',
        'expiry_date' => 'date',
        'dispensed_date' => 'date',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($prescription) {
            if (!$prescription->prescription_number) {
                $prescription->prescription_number = static::generatePrescriptionNumber();
            }
        });
    }

    public static function generatePrescriptionNumber(): string
    {
        $year = date('Y');
        $month = date('m');
        $lastPrescription = static::whereYear('created_at', $year)
            ->whereMonth('created_at', $month)
            ->orderBy('id', 'desc')
            ->first();

        if ($lastPrescription) {
            $lastNumber = intval(substr($lastPrescription->prescription_number, -4));
            $newNumber = str_pad($lastNumber + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $newNumber = '0001';
        }

        return "RX-{$year}{$month}-{$newNumber}";
    }
    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }
    // public function patient(): BelongsTo
    // {
    //     return $this->belongsTo(Patient::class);
    // }

    public function user(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class);
    }

}