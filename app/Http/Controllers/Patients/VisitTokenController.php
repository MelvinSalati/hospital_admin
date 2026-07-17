<?php

namespace App\Http\Controllers\Patients;

use App\Http\Controllers\Controller;
use App\Helpers\VisitTokenHelper;
use App\Models\Patients\Patient;
use App\Models\Patients\VisitToken;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class VisitTokenController extends Controller
{
    /**
     * Generate a new visit token for a patient
     */
    public function generate(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'patient_id' => 'required|exists:patients,id',
            'patient_number' => 'required|string',
            'payment_method' => 'required|in:cash,nhima,insurance,charity,mobile_money,card,altaf',
            'created_by' => 'required|exists:users,id',
        ]);

        /**
         * Dearivate previous 
         */

        VisitToken::where('patient_id',$request->patient_id)
        ->where('status','active')
        ->update([
            'status'=>'expired'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $patientId = $request->patient_id;
            $paymentMethod = $request->payment_method;
            $originalMethod = $request->payment_method;

            // Map 'card' to 'cash' for backend processing
            if ($paymentMethod === 'card') {
                $paymentMethod = 'cash';
            }

            // Check if patient already has an active visit
            if (VisitTokenHelper::hasActiveVisit($patientId)) {
                $existingToken = VisitTokenHelper::getActiveToken($patientId);

                return response()->json([
                    'success' => false,
                    'message' => 'Patient already has an active visit',
                    'token' => $existingToken->token,
                    'existing' => true
                ], 409);
            }

            // Create new token
            $token = VisitTokenHelper::createToken(
                $patientId,
                $request->patient_number,
                $paymentMethod,
                $request->created_by,
                $originalMethod
            );

            return response()->json([
                'success' => true,
                'message' => 'Visit token generated successfully',
                'token' => $token->token,
                'data' => [
                    'id' => $token->id,
                    'token' => $token->token,
                    'patient_id' => $token->patient_id,
                    'patient_number' => $token->patient_number,
                    'payment_method' => $token->payment_method,
                    'original_payment_method' => $token->original_payment_method,
                    'status' => $token->status,
                    'started_at' => $token->started_at,
                    'expires_at' => $token->expires_at,
                ]
            ], 201);
        } catch (\Exception $e) {
            Log::error('Failed to generate visit token: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate visit token',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get active token for a patient
     */
    public function getActiveToken($patientId)
    {
        try {
            $token = VisitTokenHelper::getActiveTokenArray($patientId);

            if (!$token) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active visit token found for this patient'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $token
            ], 200);
        } catch (\Exception $e) {
            Log::error('Failed to fetch active token: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch active token',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Validate a token
     */
    public function validateToken(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'patient_id' => 'required|exists:patients,id',
            'token' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $isValid = VisitTokenHelper::validateToken($request->patient_id, $request->token);

        return response()->json([
            'success' => $isValid,
            'message' => $isValid ? 'Token is valid' : 'Token is invalid or expired'
        ], $isValid ? 200 : 400);
    }

    /**
     * Complete a visit (end the visit)
     */
    public function completeVisit($patientId)
    {
        try {
            $completed = VisitTokenHelper::completeVisit($patientId);

            if (!$completed) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active visit found for this patient'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'message' => 'Visit completed successfully'
            ], 200);
        } catch (\Exception $e) {
            Log::error('Failed to complete visit: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to complete visit',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cancel a visit
     */
    public function cancelVisit($patientId)
    {
        try {
            $token = VisitTokenHelper::getActiveToken($patientId);

            if (!$token) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active visit found for this patient'
                ], 404);
            }

            $token->cancel();
            VisitTokenHelper::clearFromCache($patientId);

            return response()->json([
                'success' => true,
                'message' => 'Visit cancelled successfully'
            ], 200);
        } catch (\Exception $e) {
            Log::error('Failed to cancel visit: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to cancel visit',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all active tokens (admin)
     */
    public function getAllActiveTokens()
    {
        try {
            $tokens = VisitTokenHelper::getAllActiveTokens();

            return response()->json([
                'success' => true,
                'data' => $tokens,
                'count' => $tokens->count()
            ], 200);
        } catch (\Exception $e) {
            Log::error('Failed to fetch active tokens: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch active tokens',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Clean up expired tokens (can be called by cron)
     */
    public function cleanupExpired()
    {
        try {
            $count = VisitTokenHelper::cleanupExpiredTokens();

            return response()->json([
                'success' => true,
                'message' => "Cleaned up {$count} expired tokens",
                'count' => $count
            ], 200);
        } catch (\Exception $e) {
            Log::error('Failed to cleanup expired tokens: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to cleanup expired tokens',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
