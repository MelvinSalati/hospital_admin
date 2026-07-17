<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\User; // Ensure you have the User model included

class UserDetail extends Model
{
    protected $fillable = [
        'user_id',
        'department_id', // Corrected spelling of 'deaprtment_id' to 'department_id'
        'role_id',
        'qualification',
        'profession', // Corrected spelling of 'proffesion' to 'profession'
        'status',
        'mobile_phone_number',
        'nrc'
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id'); // Using the correct relationship method
    }
}
