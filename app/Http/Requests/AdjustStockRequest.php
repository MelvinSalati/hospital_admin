<?php

namespace App\Http\Requests\BulkStores;

use Illuminate\Foundation\Http\FormRequest;

class AdjustStockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'bulk_store_id' => ['required', 'integer', 'exists:bulk_stores,id'],
            'product_id'    => ['required', 'integer', 'exists:products,id'],
            // Positive = add stock, negative = remove stock. Zero not allowed (StockService guards it too).
            'quantity'      => ['required', 'integer', 'not_in:0'],
            'batch_number'  => ['nullable', 'string', 'max:100'],
            'remarks'       => ['required', 'string', 'max:500'], // Mandatory reason for audit
        ];
    }

    public function messages(): array
    {
        return [
            'quantity.not_in' => 'Adjustment quantity cannot be zero.',
            'remarks.required' => 'A reason is required for stock adjustments (audit trail).',
        ];
    }
}
