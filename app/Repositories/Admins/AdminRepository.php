<?php

namespace App\Repositories\Admins;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Support\Facades\Log;

class AdminRepository
{
    protected User $user;
    protected UserProfile $userProfile;
    /**
     * Create a new class instance.
     */
    public function __construct(User $user, UserProfile $userProfile)
    {
        $this->user         = $user;
        $this->userProfile  = $userProfile;
    }


    public function createUser(array $data){
        $user  = $this->user->create($data);
        return $user->id;
    }

    public function createProfile(array $data){
        try{
            return $this->userProfile->create($data);
        } 
        catch(\Exception $e){
            Log::info("error",[$e->getMessage()]);
        }
    }
}
