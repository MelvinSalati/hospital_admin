<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Notifications\RequestToApproveAdjustment;

class NotificationSeeder extends Seeder
{
    public function run()
    {
        $users = User::all();
        
        foreach ($users as $user) {
            for ($i = 0; $i < 5; $i++) {
                $adjustment = (object) [
                    'id' => $i + 1,
                    'adjustment_number' => 'ADJ-' . str_pad($i + 1, 6, '0', STR_PAD_LEFT),
                    'user' => (object) ['name' => 'John Doe'],
                ];
                
                $user->notify(new RequestToApproveAdjustment($adjustment));
            }
        }
    }
}