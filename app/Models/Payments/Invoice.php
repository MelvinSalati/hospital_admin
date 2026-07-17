<?php

namespace App\Models\Payments;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Patients\Patient;
use App\Models\User;
use App\Models\Patients\Prescription;

class Invoice extends Model
{
    use SoftDeletes;

    protected $table = 'invoices';

    protected $fillable = [
        'visit_token',
        'invoice_number',
        'admission_number',
        'patient_id',
        'user_id',
        'prescription_id',
        'customer_name',
        'customer_email',
        'customer_phone',
        'customer_address',
        'subtotal',
        'tax',
        'discount',
        'total',
        'paid_amount',
        'due_amount',
        'currency',
        'payment_scheme',
        'items',        // Billing items with price only
        'issue_date',
        'due_date',
        'paid_date',
        'status',
        'notes',
        'terms',
        'metadata',
        'sent_at',
        'reminder_sent_at',
        'reminder_count',
    ];

    protected $casts = [
        'items' => 'array',  // Each item has: drug_name, price, quantity (for billing), total
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
        'paid_amount' => 'decimal:2',
        'due_amount' => 'decimal:2',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($invoice) {
            if (!$invoice->invoice_number) {
                $invoice->invoice_number = static::generateInvoiceNumber();
            }
        });
    }

    public static function generateInvoiceNumber(): string
    {
        $year = date('Y');
        $month = date('m');
        $lastInvoice = static::whereYear('created_at', $year)
            ->whereMonth('created_at', $month)
            ->orderBy('id', 'desc')
            ->first();

        if ($lastInvoice) {
            $lastNumber = intval(substr($lastInvoice->invoice_number, -4));
            $newNumber = str_pad($lastNumber + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $newNumber = '0001';
        }

        return "INV-{$year}{$month}-{$newNumber}";
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function prescription(): BelongsTo
    {
        return $this->belongsTo(Prescription::class);
    }
}
