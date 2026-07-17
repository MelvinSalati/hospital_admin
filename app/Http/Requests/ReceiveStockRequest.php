<?php

namespace App\Http\Requests\BulkStores;

use Illuminate\Foundation\Http\FormRequest;

class ReceiveStockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Add your gate/policy check here
    }

    public function rules(): array
    {
        return [
            'bulk_store_id'    => ['required', 'integer', 'exists:bulk_stores,id'],
            'product_id'       => ['required', 'integer', 'exists:products,id'],
            'supplier_id'      => ['required', 'integer', 'exists:suppliers,id'],
            'quantity'         => ['required', 'integer', 'min:1'],
            'batch_number'     => ['nullable', 'string', 'max:100'],
            'expiry_date'      => ['nullable', 'date', 'after:today'],
            'unit_cost'        => ['nullable', 'numeric', 'min:0'],
            'reference_number' => ['nullable', 'string', 'max:100'],
            'remarks'          => ['nullable', 'string', 'max:500'],
        ];
    }
}
