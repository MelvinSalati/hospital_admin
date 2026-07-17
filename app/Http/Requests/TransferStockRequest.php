<?php

namespace App\Http\Requests\BulkStores;

use Illuminate\Foundation\Http\FormRequest;

class TransferStockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'from_store_id' => ['required', 'integer', 'exists:bulk_stores,id'],
            'to_store_id'   => ['required', 'integer', 'exists:bulk_stores,id', 'different:from_store_id'],
            'product_id'    => ['required', 'integer', 'exists:products,id'],
            'quantity'      => ['required', 'integer', 'min:1'],
            'batch_number'  => ['nullable', 'string', 'max:100'],
            'expiry_date'   => ['nullable', 'date'],
            'remarks'       => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'to_store_id.different' => 'Source and destination stores must be different.',
        ];
    }
}
