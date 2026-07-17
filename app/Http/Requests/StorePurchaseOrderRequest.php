<?php

namespace App\Http\Requests\BulkStores;

use Illuminate\Foundation\Http\FormRequest;

class StorePurchaseOrderRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'supplier_id'             => ['required', 'integer', 'exists:suppliers,id'],
            'bulk_store_id'           => ['required', 'integer', 'exists:bulk_stores,id'],
            'order_date'              => ['required', 'date'],
            'expected_delivery_date'  => ['nullable', 'date', 'after_or_equal:order_date'],
            'notes'                   => ['nullable', 'string', 'max:1000'],

            // Line items
            'items'                       => ['required', 'array', 'min:1'],
            'items.*.product_id'          => ['required', 'integer', 'exists:products,id'],
            'items.*.ordered_quantity'    => ['required', 'integer', 'min:1'],
            'items.*.unit_price'          => ['required', 'numeric', 'min:0'],
            'items.*.batch_number'        => ['nullable', 'string', 'max:100'],
            'items.*.expiry_date'         => ['nullable', 'date', 'after:today'],
        ];
    }
}
