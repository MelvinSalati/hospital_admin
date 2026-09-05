<?php

namespace App\Http\Controllers\Patients;

use App\Http\Controllers\Controller;
use App\Helpers\VisitTokenHelper;
use App\Models\Patients\PatientVisitScheme;
use App\Models\Patients\VisitToken;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class VisitTokenController extends Controller
{
    /**
     * Generate a new visit token for a patient.
     */
    public function generate(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'patient_id' => 'required|exists:patients,id',
            'patient_number' => 'required|string',
            'payment_method' => 'required|in:cash,nhima,insurance,charity,mobile_money,card,altaf',
            'created_by' => 'required|exists:users,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $patientId = $request->patient_id;

            /*
             * Expire any previous active visit.
             */
            VisitToken::where('patient_id', $patientId)
                ->where('status', 'active')
                ->update([
                    'status' => 'expired',
                ]);

            /*
             * Payment method selected by the user.
             */
            $originalMethod = $request->payment_method;

            /*
             * Card is processed as cash internally,
             * while original_payment_method preserves "card".
             */
            $paymentMethod = $originalMethod === 'card'
                ? 'cash'
                : $originalMethod;

            /*
             * Double-check that there is no active visit.
             */
            if (VisitTokenHelper::hasActiveVisit($patientId)) {
                $existingToken = VisitTokenHelper::getActiveToken($patientId);

                return response()->json([
                    'success' => false,
                    'message' => 'Patient already has an active visit',
                    'token' => $existingToken?->token,
                    'existing' => true,
                ], 409);
            }

            /*
             * Create visit token.
             */
            $token = VisitTokenHelper::createToken(
                $patientId,
                $request->patient_number,
                $paymentMethod,
                $request->created_by,
                $originalMethod
            );

            /*
             * Create patient visit scheme.
             *
             * One scheme record belongs to this visit token.
             */
            $scheme = PatientVisitScheme::create([
                'uuid' => (string) Str::uuid(),
                'token' => $token->token,
                'patient_visit_id' => $token->id,
                'scheme_id' => 1,
                'scheme_number' => $request->scheme_number ?? null,
                'status' => 'active',
            ]);
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

                    'scheme' => [
                        'id' => $scheme->id,
                        'uuid' => $scheme->uuid,
                        'patient_id' => $scheme->patient_id,
                        'token' => $scheme->token,
                        'scheme_name' => $scheme->scheme_name,
                        'status' => $scheme->status,
                    ],

                    'status' => $token->status,
                    'started_at' => $token->started_at,
                    'expires_at' => $token->expires_at,
                ],
            ], 201);

        } catch (\Throwable $e) {

            Log::error('Failed to generate visit token', [
                'patient_id' => $request->patient_id,
                'patient_number' => $request->patient_number,
                'payment_method' => $request->payment_method,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate visit token',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get active token for a patient.
     */
    public function getActiveToken($patientId)
    {
        try {
            $token = VisitTokenHelper::getActiveTokenArray($patientId);

            if (!$token) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active visit token found for this patient',
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $token,
            ], 200);

        } catch (\Throwable $e) {

            Log::error('Failed to fetch active visit token', [
                'patient_id' => $patientId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch active token',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Validate a visit token.
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
                'errors' => $validator->errors(),
            ], 422);
        }

        $isValid = VisitTokenHelper::validateToken(
            $request->patient_id,
            $request->token
        );

        return response()->json([
            'success' => $isValid,
            'message' => $isValid
                ? 'Token is valid'
                : 'Token is invalid or expired',
        ], $isValid ? 200 : 400);
    }

    /**
     * Complete a visit.
     */
    public function completeVisit($patientId)
    {
        try {
            $completed = VisitTokenHelper::completeVisit($patientId);

            if (!$completed) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active visit found for this patient',
                ], 404);
            }

            /*
             * Mark the scheme associated with the completed
             * visit as completed.
             */
            PatientVisitScheme::where('patient_id', $patientId)
                ->where('status', 'active')
                ->update([
                    'status' => 'completed',
                ]);

            return response()->json([
                'success' => true,
                'message' => 'Visit completed successfully',
            ], 200);

        } catch (\Throwable $e) {

            Log::error('Failed to complete visit', [
                'patient_id' => $patientId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to complete visit',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Cancel a visit.
     */
    public function cancelVisit($patientId)
    {
        try {
            $token = VisitTokenHelper::getActiveToken($patientId);

            if (!$token) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active visit found for this patient',
                ], 404);
            }

            $token->cancel();

            /*
             * Mark the scheme as cancelled.
             */
            PatientVisitScheme::where('patient_id', $patientId)
                ->where('token', $token->token)
                ->where('status', 'active')
                ->update([
                    'status' => 'cancelled',
                ]);

            VisitTokenHelper::clearFromCache($patientId);

            return response()->json([
                'success' => true,
                'message' => 'Visit cancelled successfully',
            ], 200);

        } catch (\Throwable $e) {

            Log::error('Failed to cancel visit', [
                'patient_id' => $patientId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to cancel visit',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get all active tokens.
     */
    public function getAllActiveTokens()
    {
        try {
            $tokens = VisitTokenHelper::getAllActiveTokens();

            return response()->json([
                'success' => true,
                'data' => $tokens,
                'count' => $tokens->count(),
            ], 200);

        } catch (\Throwable $e) {

            Log::error('Failed to fetch active tokens', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch active tokens',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Clean up expired tokens.
     */
    public function cleanupExpired()
    {
        try {
            $count = VisitTokenHelper::cleanupExpiredTokens();

            /*
             * Also expire schemes whose visit tokens
             * are no longer active.
             */
            PatientVisitScheme::where('status', 'active')
                ->whereHas('visitToken', function ($query) {
                    $query->where('status', 'expired');
                })
                ->update([
                    'status' => 'expired',
                ]);

            return response()->json([
                'success' => true,
                'message' => "Cleaned up {$count} expired tokens",
                'count' => $count,
            ], 200);

        } catch (\Throwable $e) {

            Log::error('Failed to cleanup expired tokens', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to cleanup expired tokens',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
