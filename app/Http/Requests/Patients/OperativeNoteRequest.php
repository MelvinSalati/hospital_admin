<?php

namespace App\Http\Requests\Patients;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Drafts only need an order item; signing requires the full note.
 * `action` is "draft" or "sign".
 */
class OperativeNoteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        $sign = $this->input('action') === 'sign';
        $req = $sign ? 'required' : 'nullable';

        return [
            'action' => ['required', Rule::in(['draft', 'sign'])],
            'theater_order_item_id' => [$this->isMethod('post') ? 'required' : 'sometimes', 'integer', 'exists:theater_order_items,id'],

            'operation_date' => [$req, 'date'],
            'start_time' => [$req, 'date_format:H:i'],
            'end_time' => [$req, 'date_format:H:i', 'after_or_equal:start_time'],
            'theatre' => ['nullable', 'string', 'max:100'],

            'lead_surgeon_id' => [$req, 'integer', 'exists:users,id'],
            'co_surgeon_ids' => ['nullable', 'array'],
            'co_surgeon_ids.*' => ['integer', 'exists:users,id'],
            'assistant_ids' => ['nullable', 'array'],
            'assistant_ids.*' => ['integer', 'exists:users,id'],
            'anaesthetist_id' => [$req, 'integer', 'exists:users,id'],
            'scrub_nurse_id' => ['nullable', 'integer', 'exists:users,id'],
            'circulating_nurse_id' => ['nullable', 'integer', 'exists:users,id'],

            'preoperative_diagnosis' => [$req, 'string', 'max:2000'],
            'postoperative_diagnosis' => [$req, 'string', 'max:2000'],
            'procedure_performed' => [$req, 'string', 'max:2000'],
            'anaesthesia_type' => [$req, Rule::in(['general', 'spinal', 'epidural', 'regional', 'local', 'sedation', 'mac'])],

            'procedure_details' => [$req, 'string', 'max:20000'],
            'findings' => [$req, 'string', 'max:10000'],

            'ebl_ml' => [$req, 'integer', 'min:0', 'max:20000'],
            'fluids_ml' => ['nullable', 'integer', 'min:0', 'max:50000'],
            'urine_output_ml' => ['nullable', 'integer', 'min:0', 'max:20000'],
            'counts_correct' => [$req, Rule::in(['correct', 'incorrect', 'not_applicable'])],

            'specimens' => ['nullable', 'array', 'max:20'],
            'specimens.*.description' => ['required_with:specimens.*.destination', 'nullable', 'string', 'max:500'],
            'specimens.*.destination' => ['nullable', 'string', 'max:200'],

            'complications_occurred' => ['boolean'],
            'complications' => [Rule::requiredIf(fn() => $sign && $this->boolean('complications_occurred')), 'nullable', 'string', 'max:5000'],

            'post_op_plan' => ['nullable', 'array'],
            'post_op_plan.monitoring' => [$req, 'string', 'max:2000'],
            'post_op_plan.activity' => ['nullable', 'string', 'max:2000'],
            'post_op_plan.diet' => ['nullable', 'string', 'max:2000'],
            'post_op_plan.iv_fluids' => ['nullable', 'string', 'max:2000'],
            'post_op_plan.medications' => [$req, 'string', 'max:3000'],
            'post_op_plan.drains_dressings' => ['nullable', 'string', 'max:2000'],

            'registration_number' => [$req, 'string', 'max:100'],
        ];
    }

    public function attributes(): array
    {
        return [
            'lead_surgeon_id' => 'lead surgeon',
            'anaesthetist_id' => 'anaesthetist',
            'ebl_ml' => 'estimated blood loss',
            'post_op_plan.monitoring' => 'monitoring plan',
            'post_op_plan.medications' => 'medications plan',
            'registration_number' => 'registration number',
        ];
    }
}
