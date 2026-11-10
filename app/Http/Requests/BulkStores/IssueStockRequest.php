<?php

namespace App\Http\Requests\BulkStores;

use Illuminate\Contracts\Validation\ValidationRule;
use App\Models\BulkStores\DepartmentRequisitionItem;
use App\Models\BulkStores\DepartmentRequisition;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class IssueStockRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'requisition_id' => ['required', 'integer', 'exists:department_requisitions,id'],
            'issue_id'       => ['required', 'integer', 'exists:department_requisition_items,id'],
            'product_id'     => ['required', 'integer', 'exists:products,id'],
            'department_id'  => ['required', 'integer', 'exists:departments,id'],
            'quantity'       => ['required', 'numeric', 'min:0.01'],
            'action'         => ['required', 'string', 'in:issue,reject'],
            'comment'        => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function withValidator(Validator $v): void
    {
        $v->after(function (Validator $v) {
            if ($v->errors()->isNotEmpty()) return;

            $item        = DepartmentRequisitionItem::find($this->input('issue_id'));
            $requisition = DepartmentRequisition::find($this->input('requisition_id'));

            if (! $item || ! $requisition) return;

            // 1. The line must belong to the requisition.
            if ((int) $item->department_requisition_id !== (int) $requisition->id) {
                $v->errors()->add(
                    'issue_id',
                    "Line #{$item->id} does not belong to requisition #{$requisition->id}."
                );
                return;
            }

            // 2. The line must be for the product claimed.
            if ((int) $item->product_id !== (int) $this->input('product_id')) {
                $v->errors()->add(
                    'product_id',
                    "Line #{$item->id} is for product #{$item->product_id}, not #{$this->input('product_id')}."
                );
            }

            // 3. The requisition must target the department claimed.
            if ((int) $requisition->department_id !== (int) $this->input('department_id')) {
                $v->errors()->add(
                    'department_id',
                    "Requisition #{$requisition->id} targets department #{$requisition->department_id}, not #{$this->input('department_id')}."
                );
            }

            // 4. The requisition must still be open.
            if (! in_array($requisition->status, ['pending', 'approved', 'partially_fulfilled'], true)) {
                $v->errors()->add(
                    'requisition_id',
                    "Requisition #{$requisition->id} is {$requisition->status} and cannot be issued."
                );
            }
        });
    }
}
