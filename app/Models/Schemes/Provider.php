<?php

namespace App\Models\Schemes;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Provider extends Model
{
    protected $fillable = [
        'provider_uuid',
        'name',
        'description',
        'mobile_phone_number',
        'email'
    ];


    protected static function boot()
    {
        parent::boot();

        static::creating(function ($provider) {
            if (empty($provider->provider_uuid)) {
                $provider->provider_uuid = (string) Str::uuid();
            }
        });
    }


    //relations

    public function scheme(){
        return $this->belongsTo(Scheme::class,'provider_id');
    }
}
