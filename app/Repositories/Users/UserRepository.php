<?php

namespace App\Repositories\Users;
use App\Models\User;
class UserRepository
{   
    public function getAllUsers()
    {


        $users = User::join('user_profiles', 'user_profiles.user_id', '=', 'users.id')
            ->whereNotNull('department_id')
            ->leftJoin('departments', 'departments.id', '=', 'user_profiles.department_id')
            ->select([
                'users.name',
                'users.email',
                'user_profiles.first_name',
                'user_profiles.surname',
                'departments.name as department_name',
                'user_profiles.mobile_phone_number',
                'user_profiles.roles'
            ])
            ->get()
            ->map(function ($user, $index) {
                // Add a serial number starting from 1
                $user->serial_number = $index + 1;

                return $user;
            });

        return $users;
    }
}
