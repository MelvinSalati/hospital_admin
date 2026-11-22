<?php

namespace App\Models\Finance;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class FinanceRevenue extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'revenue_no',
        'revenue_date',
        'category_id',
        'source_type',
        'payer_name',
        'amount',
        'payment_method',
        'reference_number',
        'description',
        'receipt_path',
        'receipt_original_name',
        'status',
        'created_by',
        'cancelled_by',
        'cancelled_at',
        'cancellation_reason',
    ];

    protected $casts = [
        'revenue_date' => 'date',
        'amount'       => 'decimal:2',
        'cancelled_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $revenue) {
            $revenue->revenue_no ??= 'REV-' . now()->format('Ym') . '-' . Str::upper(Str::random(6));
        });
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(FinanceCategory::class, 'category_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function canceller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }

    /** Shape sent to the React page. */
    public function toFrontend(): array
    {
        return [
            'id'                    => $this->id,
            'revenue_no'            => $this->revenue_no,
            'revenue_date'          => $this->revenue_date?->format('Y-m-d'),
            'category_id'           => $this->category_id,
            'category_name'         => $this->category?->name,
            'source_type'           => $this->source_type,
            'payer_name'            => $this->payer_name,
            'amount'                => number_format((float) $this->amount, 2, '.', ''),
            'payment_method'        => $this->payment_method,
            'reference_number'      => $this->reference_number,
            'description'           => $this->description,
            'receipt_path'          => $this->receipt_path,
            'receipt_original_name' => $this->receipt_original_name,
            'status'                => $this->status,
            'created_by'            => $this->created_by,
            'creator_name'          => $this->creator?->name,
            'cancelled_by'          => $this->cancelled_by,
            'canceller_name'        => $this->canceller?->name,
            'cancelled_at'          => $this->cancelled_at?->toIso8601String(),
            'cancellation_reason'   => $this->cancellation_reason,
            'created_at'            => $this->created_at?->toIso8601String(),
            'updated_at'            => $this->updated_at?->toIso8601String(),
        ];
    }
}
