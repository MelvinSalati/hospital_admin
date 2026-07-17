<?php

namespace App\Http\Requests\BulkStores;

use Illuminate\Foundation\Http\FormRequest;

class IssueStockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'bulk_store_id'    => ['required', 'integer', 'exists:bulk_stores,id'],
            'product_id'       => ['required', 'integer', 'exists:products,id'],
            'to_department_id' => ['required', 'integer', 'exists:departments,id'],
            'quantity'         => ['required', 'integer', 'min:1'],
            'batch_number'     => ['nullable', 'string', 'max:100'],
            'reference_number' => ['nullable', 'string', 'max:100'],
            'remarks'          => ['nullable', 'string', 'max:500'],
        ];
    }
}
