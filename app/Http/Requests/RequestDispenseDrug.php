<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class RequestDispenseDrug extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'items'                     => ['required', 'array', 'min:1'],
            'items.*.drug_id'           => ['required', 'integer'],
            'items.*.quantity_dispensed' => ['required', 'numeric', 'gt:0'],
            'items.*.prescription_number' => ['required', 'string'],
            'items.*.dispensed_by' => ['required', 'integer'],
            'items.*.drug_name'  => ['required', 'string'],
            'items.*.quantity_prescribed' => ['required', 'integer']
        ];
    }
}
