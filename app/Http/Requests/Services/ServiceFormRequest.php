<?php

namespace App\Http\Requests\Services;

use Illuminate\Foundation\Http\FormRequest;

class ServiceFormRequest extends FormRequest
{
    /**
     * Determine whether the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules for creating or updating a service.
     */
    public function rules(): array
    {
        return [
            'scheme_type' => [
                'sometimes',
                'required',
                'integer',
            ],

            'department_id' => [
                'sometimes',
                'required',
                'integer',
                'exists:departments,id',
            ],

            'service_name' => [
                'sometimes',
                'required',
                'string',
                'max:255',
            ],

            'service_category' => [
                'nullable',
                'string',
                'max:100',
            ],

            'has_unit' => [
                'sometimes',
                'boolean',
            ],

            'unit' => [
                'nullable',
                'string',
                'max:100',
            ],

            'service_code' => [
                'nullable',
                'string',
                'max:100',
            ],

            'description' => [
                'nullable',
                'string',
            ],

            'price' => [
                'sometimes',
                'required',
                'numeric',
                'min:0',
            ],

            'is_active' => [
                'sometimes',
                'boolean',
            ],
        ];
    }

    /**
     * Get custom validation messages.
     */
    public function messages(): array
    {
        return [
            'department_id.required' => 'Please select a department.',
            'department_id.exists' => 'The selected department does not exist.',
            'service_name.required' => 'The service name is required.',
            'service_name.max' => 'The service name cannot exceed 255 characters.',
            'price.required' => 'The service price is required.',
            'price.numeric' => 'The service price must be a valid number.',
            'price.min' => 'The service price cannot be negative.',
            'service_code.max' => 'The service code cannot exceed 100 characters.',
        ];
    }

    /**
     * Get custom attribute names for validation errors.
     */
    public function attributes(): array
    {
        return [
            'scheme_type' => 'scheme type',
            'department_id' => 'department',
            'service_name' => 'service name',
            'service_category' => 'service category',
            'service_code' => 'service code',
            'is_active' => 'service status',
        ];
    }
}
