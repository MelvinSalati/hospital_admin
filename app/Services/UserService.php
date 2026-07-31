<?php

namespace App\Services;

use App\Repositories\Users\UserRepository;

class UserService
{
    protected UserRepository $userRepository;
    /**
     * Create a new class instance.
     */
    public function __construct(UserRepository $userRepository)
    {
        $this->userRepository   = $userRepository;
    } 

    public function getUsers(){
        return $this->userRepository->getAllUsers();
    } 



}
