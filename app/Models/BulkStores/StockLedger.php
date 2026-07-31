<?php
// app/Models/StockLedger.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class StockLedger extends Model
{
    protected $table = 'stock_ledger';

    protected $fillable = [
        'department_id',
        'product_id',
        'bulk_store_id',
        'ledger_date',
        'opening_balance',
        'total_in',
        'total_out',
        'closing_balance',
        'purchases_in',
        'returns_in',
        'transfers_in',
        'adjustments_in',
        'sales_out',
        'damage_out',
        'expiry_out',
        'transfers_out',
        'adjustments_out',
        'movement_count',
        'unique_batches',
        'avg_unit_cost',
        'is_verified',
        'verified_at',
        'verified_by',
        'notes',
        'metadata',
    ];

    protected $casts = [
        'ledger_date' => 'date',
        'opening_balance' => 'integer',
        'total_in' => 'integer',
        'total_out' => 'integer',
        'closing_balance' => 'integer',
        'purchases_in' => 'integer',
        'returns_in' => 'integer',
        'transfers_in' => 'integer',
        'adjustments_in' => 'integer',
        'sales_out' => 'integer',
        'damage_out' => 'integer',
        'expiry_out' => 'integer',
        'transfers_out' => 'integer',
        'adjustments_out' => 'integer',
        'movement_count' => 'integer',
        'unique_batches' => 'integer',
        'avg_unit_cost' => 'decimal:2',
        'is_verified' => 'boolean',
        'verified_at' => 'datetime',
        'metadata' => 'array',
    ];

    // ============================================
    // BOOT METHOD - Auto Audit
    // ============================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            $model->created_by = $model->created_by ?? Auth::id();
            $model->created_at = $model->created_at ?? now();
        });

        static::updating(function ($model) {
            $model->updated_by = Auth::id();
            $model->updated_at = now();
            
            // Track all changes in history
            self::trackChanges($model);
        });
    }

    // ============================================
    // TRACK CHANGES
    // ============================================

    protected static function trackChanges($model)
    {
        $changes = $model->getDirty();
        $excludeFields = ['updated_at', 'updated_by', 'verified_at', 'verified_by'];
        
        foreach ($changes as $field => $newValue) {
            if (in_array($field, $excludeFields)) {
                continue;
            }
            
            $oldValue = $model->getOriginal($field);
            
            // Only track if value actually changed
            if ($oldValue != $newValue) {
                StockLedgerHistory::create([
                    'ledger_id' => $model->id,
                    'field_changed' => $field,
                    'old_value' => $oldValue,
                    'new_value' => $newValue,
                    'reason' => 'System update',
                    'changed_by' => Auth::id(),
                ]);
            }
        }
    }

    // ============================================
    // RELATIONSHIPS
    // ============================================

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function bulkStore()
    {
        return $this->belongsTo(BulkStore::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function verifier()
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function history()
    {
        return $this->hasMany(StockLedgerHistory::class)->orderBy('created_at', 'desc');
    }

    // ============================================
    // ACCESSORS
    // ============================================

    public function getTotalActivityAttribute()
    {
        return $this->total_in + $this->total_out;
    }

    public function getNetChangeAttribute()
    {
        return $this->total_in - $this->total_out;
    }

    public function getTurnoverRateAttribute()
    {
        if ($this->opening_balance <= 0) return 0;
        return round(($this->total_out / $this->opening_balance) * 100, 2);
    }

    public function getDaysOfSupplyAttribute()
    {
        $avgDailyUsage = $this->avg_daily_usage ?? 0;
        if ($avgDailyUsage <= 0) return null;
        return round($this->closing_balance / $avgDailyUsage);
    }

    public function getIsBalancedAttribute()
    {
        $expected = $this->opening_balance + $this->total_in - $this->total_out;
        return $expected === $this->closing_balance;
    }

    public function getStockStatusAttribute()
    {
        if ($this->closing_balance <= 0) return 'out_of_stock';
        if ($this->closing_balance <= 10) return 'critical';
        if ($this->closing_balance <= 50) return 'low_stock';
        return 'in_stock';
    }

    public function getStatusColorAttribute()
    {
        return [
            'out_of_stock' => 'red',
            'critical' => 'red',
            'low_stock' => 'yellow',
            'in_stock' => 'green',
        ][$this->stock_status] ?? 'gray';
    }

    // ============================================
    // SCOPES
    // ============================================

    public function scopeForDepartment($query, $departmentId)
    {
        return $query->where('department_id', $departmentId);
    }

    public function scopeForProduct($query, $productId)
    {
        return $query->where('product_id', $productId);
    }

    public function scopeForStore($query, $storeId)
    {
        return $query->where('bulk_store_id', $storeId);
    }

    public function scopeDateRange($query, $from, $to)
    {
        return $query->whereBetween('ledger_date', [$from, $to]);
    }

    public function scopeUnverified($query)
    {
        return $query->where('is_verified', false);
    }

    public function scopeVerified($query)
    {
        return $query->where('is_verified', true);
    }

    public function scopeWithHighTurnover($query, $threshold = 50)
    {
        return $query->whereRaw('(total_out / opening_balance) * 100 > ?', [$threshold]);
    }

    // ============================================
    // VERIFICATION METHODS
    // ============================================

    public function verify($userId = null, $notes = null)
    {
        $this->is_verified = true;
        $this->verified_at = now();
        $this->verified_by = $userId ?? Auth::id();
        $this->notes = $notes ?: $this->notes;
        $this->save();
        
        return $this;
    }

    public function unverify($reason = null)
    {
        $this->is_verified = false;
        $this->verified_at = null;
        $this->verified_by = null;
        $this->notes = $reason ? "Unverified: {$reason}" : $this->notes;
        $this->save();
        
        return $this;
    }

    public function isVerified()
    {
        return $this->is_verified;
    }

    // ============================================
    // CALCULATION METHODS
    // ============================================

    public function recalculate()
    {
        DB::transaction(function () {
            // Get all movements for this day
            $movements = StockMovement::where('department_id', $this->department_id)
                ->where('product_id', $this->product_id)
                ->where('bulk_store_id', $this->bulk_store_id)
                ->whereDate('moved_at', $this->ledger_date)
                ->get();

            // Calculate totals by type
            $totals = [
                'total_in' => 0,
                'total_out' => 0,
                'purchases_in' => 0,
                'returns_in' => 0,
                'transfers_in' => 0,
                'adjustments_in' => 0,
                'sales_out' => 0,
                'damage_out' => 0,
                'expiry_out' => 0,
                'transfers_out' => 0,
                'adjustments_out' => 0,
            ];

            $batchNumbers = [];
            $totalCost = 0;
            $itemsWithCost = 0;

            foreach ($movements as $movement) {
                $quantity = $movement->quantity;
                $type = $movement->type;

                if ($quantity > 0) {
                    $totals['total_in'] += $quantity;
                    
                    switch ($type) {
                        case 'receiving':
                            $totals['purchases_in'] += $quantity;
                            break;
                        case 'return':
                            $totals['returns_in'] += $quantity;
                            break;
                        case 'transfer':
                            $totals['transfers_in'] += $quantity;
                            break;
                        case 'adjustment':
                            $totals['adjustments_in'] += $quantity;
                            break;
                    }
                } else {
                    $absQuantity = abs($quantity);
                    $totals['total_out'] += $absQuantity;
                    
                    switch ($type) {
                        case 'issuing':
                            $totals['sales_out'] += $absQuantity;
                            break;
                        case 'damage':
                            $totals['damage_out'] += $absQuantity;
                            break;
                        case 'expiry':
                            $totals['expiry_out'] += $absQuantity;
                            break;
                        case 'transfer':
                            $totals['transfers_out'] += $absQuantity;
                            break;
                        case 'adjustment':
                            $totals['adjustments_out'] += $absQuantity;
                            break;
                    }
                }

                // Track batches
                if ($movement->batch_number) {
                    $batchNumbers[] = $movement->batch_number;
                }

                // Track cost
                if ($movement->unit_cost) {
                    $totalCost += $movement->unit_cost * abs($quantity);
                    $itemsWithCost += abs($quantity);
                }
            }

            // Update the ledger
            $this->update([
                'total_in' => $totals['total_in'],
                'total_out' => $totals['total_out'],
                'purchases_in' => $totals['purchases_in'],
                'returns_in' => $totals['returns_in'],
                'transfers_in' => $totals['transfers_in'],
                'adjustments_in' => $totals['adjustments_in'],
                'sales_out' => $totals['sales_out'],
                'damage_out' => $totals['damage_out'],
                'expiry_out' => $totals['expiry_out'],
                'transfers_out' => $totals['transfers_out'],
                'adjustments_out' => $totals['adjustments_out'],
                'movement_count' => $movements->count(),
                'unique_batches' => count(array_unique($batchNumbers)),
                'avg_unit_cost' => $itemsWithCost > 0 ? round($totalCost / $itemsWithCost, 2) : 0,
                'closing_balance' => $this->opening_balance + $totals['total_in'] - $totals['total_out'],
            ]);
        });

        return $this;
    }

    // ============================================
    // GENERATE LEDGER FOR DATE
    // ============================================

    public static function generateForDate($departmentId, $productId, $date, $storeId = null)
    {
        return DB::transaction(function () use ($departmentId, $productId, $date, $storeId) {
            // Get previous day's closing balance
            $previous = self::where('department_id', $departmentId)
                ->where('product_id', $productId)
                ->where('bulk_store_id', $storeId)
                ->where('ledger_date', '<', $date)
                ->orderBy('ledger_date', 'desc')
                ->first();

            $openingBalance = $previous ? $previous->closing_balance : 0;

            // Create or update ledger
            $ledger = self::updateOrCreate(
                [
                    'department_id' => $departmentId,
                    'product_id' => $productId,
                    'bulk_store_id' => $storeId,
                    'ledger_date' => $date,
                ],
                [
                    'opening_balance' => $openingBalance,
                    'notes' => 'Auto-generated from daily movements',
                ]
            );

            // Recalculate from movements
            return $ledger->recalculate();
        });
    }
}