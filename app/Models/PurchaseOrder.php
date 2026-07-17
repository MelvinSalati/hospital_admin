<?php

namespace App\Models\BulkStores;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class PurchaseOrder extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'po_uuid',
        'po_number',
        'supplier_id',
        'bulk_store_id',
        'created_by',
        'approved_by',
        'order_date',
        'expected_delivery_date',
        'received_date',
        'total_amount',
        'status',
        'notes',
    ];

    protected $casts = [
        'order_date'             => 'date',
        'expected_delivery_date' => 'date',
        'received_date'          => 'date',
        'total_amount'           => 'decimal:2',
    ];

    // -------------------------------------------------------------------------
    // Boot
    // -------------------------------------------------------------------------

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (self $model) {
            if (empty($model->po_uuid)) {
                $model->po_uuid = (string) Str::uuid();
            }
            if (empty($model->po_number)) {
                // Auto-generate: PO-YYYY-NNNNN
                $year  = now()->format('Y');
                $count = self::whereYear('created_at', $year)->count() + 1;
                $model->po_number = sprintf('PO-%s-%05d', $year, $count);
            }
            if (empty($model->created_by) && auth()->check()) {
                $model->created_by = auth()->id();
            }
        });
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function bulkStore(): BelongsTo
    {
        return $this->belongsTo(BulkStore::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    public function scopeOfStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    public function scopePending($query)
    {
        return $query->whereIn('status', ['draft', 'pending', 'approved', 'partially_received']);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    public function isPending(): bool
    {
        return in_array($this->status, ['draft', 'pending', 'approved', 'partially_received']);
    }

    public function isFullyReceived(): bool
    {
        return $this->status === 'received';
    }

    /**
     * Recalculate and persist total_amount from line items.
     */
    public function recalculateTotal(): void
    {
        $this->update(['total_amount' => $this->items()->sum('total_price')]);
    }
}
