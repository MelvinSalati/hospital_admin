<?php

namespace App\Models\Patients;

use Illuminate\Database\Eloquent\Model;
use App\Models\Patients\Patient;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\User;

class Invoice extends Model
{

    use SoftDeletes;

    protected $table = 'invoices';

    protected $fillable = [
        'prescription_id',
        'visit_token',
        'admission_number',
        'invoice_number',
        'payment_scheme',
        'patient_id',
        'user_id',
        'customer_name',
        'customer_email',
        'customer_phone',
        'customer_address',
        'subtotal',
        'tax',
        'discount',
        'total',
        'currency',
        'issue_date',
        'due_date',
        'due_amount',
        'paid_date',
        'paid_amount',
        'status',
        'notes',
        'terms',
        'items',
        'metadata',
        'sent_at',
        'reminder_sent_at',
        'reminder_count',
    ];

    protected $casts = [
        'items' => 'array',
        'metadata' => 'array',
        'issue_date' => 'date',
        'due_date' => 'date',
        'paid_date' => 'date',
        'sent_at' => 'datetime',
        'reminder_sent_at' => 'datetime',
        'subtotal' => 'decimal:2',
        'tax' => 'decimal:2',
        'discount' => 'decimal:2',
        'total' => 'decimal:2',
        'due_amount' => 'float',
        'paid_amount' => 'float',
        'reminder_count' => 'integer',
    ];

    /**
     * Get the patient associated with the invoice
     */
    public function patient()
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    /**
     * Get the user who created the invoice
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Get the visit token associated with the invoice
     */
    public function visitToken()
    {
        return $this->belongsTo(VisitToken::class, 'visit_token', 'token');
    }

}
