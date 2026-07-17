<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Supplier extends Model
{
    protected $table = 'suppliers';

    protected $fillable = [
        'supplier_code',
        'supplier_name',
        'contact_person',
        'phone',
        'mobile',
        'email',
        'website',
        'address',
        'city',
        'state_province',
        'country',
        'postal_code',
        'tax_number',
        'business_registration',
        'license_number',
        'payment_terms',
        'delivery_terms',
        'currency',
        'credit_limit',
        'current_balance',
        'rating',
        'performance_score',
        'delivery_reliability',
        'quality_rating',
        'supplier_type',
        'supplier_category',
        'product_categories',
        'bank_name',
        'bank_account',
        'bank_swift',
        'notes',
        'internal_notes',
        'is_approved',
        'approved_by',
        'approved_at',
        'is_active',
        'is_preferred',
        'is_blacklisted',
        'blacklist_reason',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_preferred' => 'boolean',
        'is_approved' => 'boolean',
        'is_blacklisted' => 'boolean',
        'credit_limit' => 'decimal:2',
        'current_balance' => 'decimal:2',
        'rating' => 'integer',
        'performance_score' => 'decimal:2',
        'delivery_reliability' => 'decimal:2',
        'quality_rating' => 'decimal:2',
        'approved_at' => 'datetime',
    ];

    // Relationships
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function products(): HasMany
    {
        return $this->hasMany(SupplierProduct::class);
    }

    public function purchaseOrders(): HasMany
    {
        return $this->hasMany(SupplierPurchaseOrder::class);
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', 1);
    }

    public function scopePreferred($query)
    {
        return $query->where('is_preferred', 1);
    }

    public function scopeRated($query, $minRating)
    {
        return $query->where('rating', '>=', $minRating);
    }
}
