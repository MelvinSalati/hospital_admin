<?php

namespace App\Helpers;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class PasswordGenerator
{
    /**
     * Create a new class instance.
     */
    public function __construct()
    {
        //
    }

    /**
     * Generate a strong, memorable password.
     *
     * @param int $length The length of the password.
     * @return string The generated password.
     */
    public static function generate($length = 8)
    {
        // Define character sets
        $uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
        $digits = '0123456789';
        $specialChars = '!@#$%^&*()-_=+[]{}|;:,.<>?';

        // Ensure the password contains at least one character from each set
        $password = Str::random(1, strlen($uppercaseChars)) .
            Str::random(1, strlen($lowercaseChars)) .
            Str::random(1, strlen($digits)) .
            Str::random(1, strlen($specialChars));

        // Fill the rest of the password length with a mix of all characters
        $allChars = $uppercaseChars . $lowercaseChars . $digits . $specialChars;
        $password .= Str::random($length - 4, strlen($allChars));

        // Shuffle the password to ensure randomness
        $passwordArray = str_split($password);
        shuffle($passwordArray);
        $password = implode('', $passwordArray);
Log::info('password',[$password]);
        return $password;
    }
}
