<?php

namespace App\Models\Pharmacies;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Pharmacies\DepartmentStockLedger;
use App\Models\Pharmacies\DrugBatch;
use Illuminate\Database\Eloquent\Model;

class DepartmentStockLedgerItem extends Model
{
    use HasFactory;

    protected $table = 'department_stock_ledger_items';

    protected $fillable = [
        'ledger_id',
        'department_id',
        'transaction_type',
        'transaction_date',
        'drug_id',
        'drug_batch_id',
        'quantity_in',
        'quantity_out',
        'balance_after',
        'unit_cost',
        'total_cost',
        'remarks',
    ];


    protected $casts = [
        'transaction_date' => 'datetime',
        'quantity_in'      => 'decimal:3',
        'quantity_out'     => 'decimal:3',
        'balance_after'    => 'decimal:3',
        'unit_cost'        => 'decimal:2',
        'total_cost'       => 'decimal:2',
    ];

    // ---------- Relationships ----------
protected static function booted(): void
{
    static::creating(function (self $item) {
        $in  = (float) ($item->quantity_in  ?? 0);
        $out = (float) ($item->quantity_out ?? 0);

        if ($in <= 0 && $out <= 0) {
            $frames = collect(debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 25))
                ->filter(fn ($f) => isset($f['file']) && str_contains($f['file'], DIRECTORY_SEPARATOR . 'app' . DIRECTORY_SEPARATOR))
                ->map(fn ($f) => ($f['file'] ?? '?') . ':' . ($f['line'] ?? '?'))
                ->values()
                ->all();

            Log::error('Empty ledger item blocked (no quantity_in/out)', [
                'attributes' => $item->getAttributes(),
                'app_frames' => $frames,
            ]);

            throw new \LogicException('Ledger item must have quantity_in or quantity_out > 0.');
        }
    });
}
    public function ledger()
    {
        return $this->belongsTo(DepartmentStockLedger::class, 'ledger_id');
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function drug()
    {
        return $this->belongsTo(Drug::class);
    }

    public function batch()
    {
        return $this->belongsTo(DrugBatch::class, 'drug_batch_id');
    }

    // ---------- Scopes ----------

    public function scopePosted($q)
    {
        return $q->whereHas('ledger', fn($l) => $l->posted());
    }

    public function scopeForDepartment($q, int $departmentId)
    {
        return $q->where('department_id', $departmentId);
    }

    public function scopeForDrug($q, int $drugId)
    {
        return $q->where('drug_id', $drugId);
    }

    public function scopeForBatch($q, int $batchId)
    {
        return $q->where('drug_batch_id', $batchId);
    }

    // ---------- Helpers ----------

    public function isIn(): bool
    {
        return (float) $this->quantity_in > 0;
    }

    public function isOut(): bool
    {
        return (float) $this->quantity_out > 0;
    }
}
