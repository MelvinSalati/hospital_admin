<?php

namespace App\Models\Departments; 

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\Services\Service; 

class Department extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'description',
        'status',
    ];

    protected $casts = [
        'status' => 'string',
    ];

    public function services(): HasMany
    {
        return $this->hasMany(Service::class);
    }

    public function getServiceCountAttribute(): int
    {
        return $this->services()->count();
    }
}
