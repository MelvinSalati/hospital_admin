<?php

namespace App\Helpers;

use App\Models\Patients\VisitToken;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class VisitTokenHelper
{
    // Cache keys
    const CACHE_PREFIX = 'visit_token_';
    const CACHE_TTL = 86400; // 24 hours in seconds

    /**
     * Get active visit token for a patient
     */
    public static function getActiveToken($patientId)
    {
        // Try cache first
        $cacheKey = self::CACHE_PREFIX . $patientId;
        VisitToken::where('patient_id', $patientId)->update([
            'status' => 'expired'
        ]);
       
        $cachedToken = Cache::get($cacheKey);
        if ($cachedToken) {
            return $cachedToken;
        }

        // Fetch from database
        $token = VisitToken::active()
            ->byPatient($patientId)
            ->first();

        if ($token) {
            // Store in cache
            self::storeInCache($patientId, $token);
            return $token;
        }

        return null;
    }

    /**
     * Get active token as array
     */
    public static function getActiveTokenArray($patientId)
    {
        $token = self::getActiveToken($patientId);

        if (!$token) {
            return null;
        }

        return [
            'id' => $token->id,
            'token' => $token->token,
            'patient_id' => $token->patient_id,
            'patient_number' => $token->patient_number,
            'payment_method' => $token->payment_method,
            'original_payment_method' => $token->original_payment_method,
            'status' => $token->status,
            'started_at' => $token->started_at->toISOString(),
            'expires_at' => $token->expires_at ? $token->expires_at->toISOString() : null,
        ];
    }

    /**
     * Get active token string only
     */
    public static function getActiveTokenString($patientId)
    {
        $token = self::getActiveToken($patientId);
        return $token ? $token->token : null;
    }

    /**
     * Store token in cache
     */
    public static function storeInCache($patientId, $token)
    {
        $cacheKey = self::CACHE_PREFIX . $patientId;

        // Store token data in cache
        Cache::put($cacheKey, $token, self::CACHE_TTL);

        // Also store just the token string for quick access
        Cache::put($cacheKey . '_string', $token->token, self::CACHE_TTL);

        Log::info('Visit token stored in cache', [
            'patient_id' => $patientId,
            'token' => $token->token,
            'cache_key' => $cacheKey
        ]);
    }

    /**
     * Clear token from cache
     */
    public static function clearFromCache($patientId)
    {
        $cacheKey = self::CACHE_PREFIX . $patientId;
        Cache::forget($cacheKey);
        Cache::forget($cacheKey . '_string');

        /**
         * Deactivate the status in the vist token table
         */ 

         VisitToken::where('patient_id',$patientId)->update([
            'status' => 'expired'
         ]);
    }

    /**
     * Check if patient has an active visit
     */
    public static function hasActiveVisit($patientId)
    {
        return self::getActiveToken($patientId) !== null;
    }

    /**
     * Create a new visit token
     */
    public static function createToken($patientId, $patientNumber, $paymentMethod, $createdBy, $originalMethod = null)
    {
        // Clear any existing active token for this patient
        self::clearActiveToken($patientId);

        // Create new token
        $token = VisitToken::generateToken(
            $patientId,
            $patientNumber,
            $paymentMethod,
            $createdBy,
            $originalMethod
        );

        // Store in cache
        self::storeInCache($patientId, $token);

        Log::info('New visit token created', [
            'patient_id' => $patientId,
            'token' => $token->token,
            'payment_method' => $paymentMethod
        ]);

        return $token;
    }

    /**
     * Clear any active token for a patient
     */
    public static function clearActiveToken($patientId)
    {
        $existingToken = self::getActiveToken($patientId);

        if ($existingToken) {
            $existingToken->cancel();
            self::clearFromCache($patientId);

            Log::info('Existing visit token cleared', [
                'patient_id' => $patientId,
                'token' => $existingToken->token
            ]);
        }
    }

    /**
     * Complete a visit token
     */
    public static function completeVisit($patientId)
    {
        $token = self::getActiveToken($patientId);

        if ($token) {
            $token->complete();
            self::clearFromCache($patientId);

            Log::info('Visit token completed', [
                'patient_id' => $patientId,
                'token' => $token->token
            ]);

            return true;
        }

        return false;
    }

    /**
     * Validate a token for a patient
     */
    public static function validateToken($patientId, $tokenString)
    {
        $token = self::getActiveToken($patientId);

        if (!$token) {
            return false;
        }

        if ($token->token !== $tokenString) {
            return false;
        }

        if ($token->isExpired()) {
            $token->cancel();
            self::clearFromCache($patientId);
            return false;
        }

        return true;
    }

    /**
     * Get all active tokens (for admin purposes)
     */
    public static function getAllActiveTokens()
    {
        return VisitToken::active()
            ->with(['patient', 'createdBy'])
            ->orderBy('started_at', 'desc')
            ->get();
    }

    /**
     * Clean up expired tokens (should be run by cron job)
     */
    public static function cleanupExpiredTokens()
    {
        $expiredTokens = VisitToken::where('status', 'active')
            ->where('expires_at', '<', now())
            ->get();

        foreach ($expiredTokens as $token) {
            $token->cancel();
            self::clearFromCache($token->patient_id);
        }

        Log::info('Expired visit tokens cleaned up', [
            'count' => $expiredTokens->count()
        ]);

        return $expiredTokens->count();
    }
}
