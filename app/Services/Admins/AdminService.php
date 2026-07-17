<?php

namespace App\Services\Admins;

use Illuminate\Support\Facades\Hash;
use App\Repositories\Admins\AdminRepository as User;

class AdminService
{
    protected User $userService;

    public function __construct(User $userService)
    {
        $this->userService = $userService;
    }

    public function create($data)
    {
        try {
            $user = $this->userService->createUser([
                'email' => $data['email'],
                'name'  => $data['first_name'] . " " . $data['surname'],
                'password' => Hash::make($data['self_gen_password']),
            ]);



            if (!$user) {
                return null;
            }

            $userProfile =  [
                'user_id' => $user,
                'first_name' => $data['first_name'],
                'surname' => $data['surname'],
                'date_of_birth' => $data['date_of_birth'] ?? null,
                'gender' => $data['gender'] ?? null,
                'degrees' => $data['degrees'] ?? null,
                'license_document' => $data['license_document'] ?? null,
                'license_expiry_date' => $data['license_expiry_date'] ?? null,
                'license_number' => $data['license_number'] ?? null,
                'mobile_phone_number' => $data['mobile_phone_number'] ?? null,
                'roles' => $data['roles'] ?? null,
                'profession_id' => $data['profession_id'] ?? null,
                'diploma' => $data['diploma'] ?? null,
                'certificates' => $data['certificates'] ?? null,
                'address' => $data['address'] ?? null,
                'department_id' => $data['department_id'] ?? null,
            ];



            if($this->userService->createProfile($userProfile)){
                return response()->json([
                    'message'  => 'Account registered successfully and Password sent',
                    'status'   => 'success'
                ],200);
            }
            else {
                return response()->json([
                    'message'  => 'Account not created!',
                    'status'   => 'failed'
                ], 200);
            }
        } catch (\Exception $e) {
            throw $e;
        }
    }
}
