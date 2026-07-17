<?php

namespace App\Models\Schemes;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Scheme extends Model
{
  protected $fillable = [
    'schema_uuid',
    'schema_name',
    'provider_id'
  ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($schema) {
            if (empty($schema->schema_uuid)) {
                $schema->schema_uuid = (string) Str::uuid();
            }
        });
    }
}
