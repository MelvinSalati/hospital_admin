<?php

namespace App\Models\Pharmacies;

use App\Models\DepartmentStockLedgerItem;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class DrugBatch extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'drug_batches';

    protected $fillable = [
        'drug_id',
        'batch_no',
        'expiry_date',
        'manufacture_date',
        'unit_cost',
        'selling_price',
        'supplier_id',
        'status',
    ];

    protected $casts = [
        'expiry_date'       => 'date',
        'manufacture_date'  => 'date',
        'unit_cost'         => 'decimal:2',
        'selling_price'     => 'decimal:2',
    ];

    // ---------- Relationships ----------

    public function drug()
    {
        return $this->belongsTo(Drug::class);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    /** Every department-ledger line that touched this batch */
    public function ledgerItems()
    {
        return $this->hasMany(DepartmentStockLedgerItem::class, 'drug_batch_id');
    }

    // ---------- Scopes ----------

    public function scopeNotExpired($q)
    {
        return $q->where(function ($q) {
            $q->whereNull('expiry_date')
                ->orWhereDate('expiry_date', '>=', now()->toDateString());
        });
    }

    public function scopeExpiringBefore($q, $date)
    {
        return $q->whereDate('expiry_date', '<=', $date);
    }

    /** FEFO ordering — earliest expiry first */
    public function scopeFefo($q)
    {
        return $q->orderByRaw('expiry_date IS NULL, expiry_date ASC');
    }

    // ---------- Helpers ----------

    public function isExpired(): bool
    {
        return $this->expiry_date && $this->expiry_date->isPast();
    }

    public function isExpiringSoon(int $days = 90): bool
    {
        return $this->expiry_date
            && $this->expiry_date->isFuture()
            && $this->expiry_date->diffInDays(now()) <= $days;
    }
}
