<?php

namespace App\Http\Controllers\Patients;


use App\Http\Controllers\Controller;
use App\Http\Requests\Patients\OperativeNoteRequest;
use App\Models\Patients\Patient;          // adjust namespace if different
use App\Models\Patients\PatientVisit;     // adjust namespace if different
use App\Models\Patients\OperativeNote;
use App\Models\Theater\TheaterOrderItem;  // adjust namespace if different
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class OperativeNoteController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | SCHEMA ASSUMPTIONS — the only place to edit if your columns differ.
    |--------------------------------------------------------------------------
    | patients:            name, date_of_birth, gender, mrn
    | patient_visits:      id, visit_number, visit_date   (linked by order item's patient_visit_id)
    | theater_order_items: patient_id, patient_visit_id, procedure_name,
    |                      theatre, scheduled_at, urgency
    | users:               profile relation with a JSON `roles` array (as in your /dashboard route)
    */
    private const STAFF_ROLES = [
        'surgeons' => ['surgeon', 'doctor'],
        'anaesthetists' => ['anaesthetist', 'anesthetist', 'doctor'],
        'nurses' => ['nurses', 'nurse', 'theatre_nurse'],
    ];

    private function patientPayload(Patient $p): array
    {
        $dob = $p->getAttribute('date_of_birth');

        return [
            'id' => $p->id,
            'name' => $p->getAttribute('name'),
            'dob' => $dob ? Carbon::parse($dob)->toDateString() : null,
            'age' => $dob ? Carbon::parse($dob)->age : null,
            'gender' => $p->getAttribute('gender'),
            'mrn' => $p->getAttribute('mrn'),
        ];
    }

    private function itemPayload(TheaterOrderItem $i): array
    {
        return [
            'id' => $i->id,
            'procedure' => $i->getAttribute('procedure_name'),
            'theatre' => $i->getAttribute('theatre'),
            'scheduled_at' => $i->getAttribute('scheduled_at'),
            'urgency' => $i->getAttribute('urgency'),
        ];
    }

    /* ---------------------------------------------------------------------- */

    public function create(TheaterOrderItem $orderItem): Response|RedirectResponse
    {
        // One note per procedure: reopen it instead of creating a duplicate.
        if ($existing = OperativeNote::where('theater_order_item_id', $orderItem->id)->first()) {
            return redirect()->route('theater.op-notes.show', $existing);
        }

        $scheduled = $orderItem->getAttribute('scheduled_at');

        return $this->render($orderItem, null, [
            'operation_date' => $scheduled ? Carbon::parse($scheduled)->toDateString() : now()->toDateString(),
            'start_time' => $scheduled ? Carbon::parse($scheduled)->format('H:i') : '',
            'theatre' => $orderItem->getAttribute('theatre') ?? '',
            'procedure_performed' => $orderItem->getAttribute('procedure_name') ?? '',
        ]);
    }

    public function show(OperativeNote $note): Response
    {
        $note->load(['team', 'orderItem']);

        return Inertia::render('patients/operativenote', [
            "orderItems" => '$this->render($note->orderItem',
            'note' =>  $this->formData($note)
        ]);
    }

    public function store(OperativeNoteRequest $request): RedirectResponse
    {
        $item = TheaterOrderItem::findOrFail($request->integer('theater_order_item_id'));

        if ($existing = OperativeNote::where('theater_order_item_id', $item->id)->first()) {
            return redirect()->route('theater.op-notes.show', $existing)
                ->with('error', 'An operative note already exists for this procedure.');
        }

        $note = DB::transaction(function () use ($request, $item) {
            // Patient and visit come from the order item, never from the client.
            $note = new OperativeNote([
                'theater_order_item_id' => $item->id,
                'patient_id' => $item->getAttribute('patient_id'),
                'patient_visit_id' => $item->getAttribute('patient_visit_id'),
            ]);
            $note->created_by = $request->user()->id;

            return $this->persist($note, $request);
        });

        return $this->redirectAfterSave($note, $request);
    }

    public function update(OperativeNoteRequest $request, OperativeNote $note): RedirectResponse
    {
        abort_if($note->isSigned(), 403, 'Signed operative notes cannot be edited.');

        DB::transaction(fn() => $this->persist($note, $request));

        return $this->redirectAfterSave($note, $request);
    }

    /* ---------------------------------------------------------------------- */

    private function persist(OperativeNote $note, OperativeNoteRequest $request): OperativeNote
    {
        $note->fill($request->safe()->only([
            'operation_date',
            'start_time',
            'end_time',
            'theatre',
            'lead_surgeon_id',
            'preoperative_diagnosis',
            'postoperative_diagnosis',
            'procedure_performed',
            'anaesthesia_type',
            'procedure_details',
            'findings',
            'ebl_ml',
            'fluids_ml',
            'urine_output_ml',
            'counts_correct',
            'specimens',
            'complications_occurred',
            'complications',
            'post_op_plan',
            'registration_number',
        ]));

        if (! $note->complications_occurred) {
            $note->complications = null;
        }

        if ($request->input('action') === 'sign') {
            $note->status = OperativeNote::STATUS_SIGNED;
            $note->signed_by = $request->user()->id;
            $note->signed_at = now();
        }

        $note->save();
        $this->syncTeam($note, $request);

        return $note;
    }

    private function syncTeam(OperativeNote $note, OperativeNoteRequest $request): void
    {
        $roles = [
            OperativeNote::ROLE_CO_SURGEON => (array) $request->input('co_surgeon_ids', []),
            OperativeNote::ROLE_ASSISTANT => (array) $request->input('assistant_ids', []),
            OperativeNote::ROLE_ANAESTHETIST => array_filter([$request->input('anaesthetist_id')]),
            OperativeNote::ROLE_SCRUB_NURSE => array_filter([$request->input('scrub_nurse_id')]),
            OperativeNote::ROLE_CIRCULATING_NURSE => array_filter([$request->input('circulating_nurse_id')]),
        ];

        $note->team()->detach();
        foreach ($roles as $role => $ids) {
            foreach (array_unique($ids) as $userId) {
                $note->team()->attach($userId, ['role' => $role]);
            }
        }
    }

    private function redirectAfterSave(OperativeNote $note, OperativeNoteRequest $request): RedirectResponse
    {
        if ($note->isSigned()) {
            return redirect()->route('theater')->with('success', 'Operative note signed.');
        }

        return redirect()->route('theater.op-notes.show', $note)->with('success', 'Draft saved.');
    }

    private function render(TheaterOrderItem $item, ?OperativeNote $note, array $defaults): Response
    {
        $patient = Patient::findOrFail($item->getAttribute('patient_id'));
        $visit = $item->getAttribute('patient_visit_id')
            ? PatientVisit::find($item->getAttribute('patient_visit_id'))
            : null;

        $user = auth()->user();

        return Inertia::render('theater/operative-note', [
            'orderItem' => $this->itemPayload($item),
            'patient' => $this->patientPayload($patient),
            'visit' => $visit ? [
                'id' => $visit->id,
                'visit_number' => $visit->getAttribute('visit_number'),
                'visit_date' => $visit->getAttribute('visit_date'),
            ] : null,
            'staff' => [
                'surgeons' => $this->staff(self::STAFF_ROLES['surgeons']),
                'anaesthetists' => $this->staff(self::STAFF_ROLES['anaesthetists']),
                'nurses' => $this->staff(self::STAFF_ROLES['nurses']),
            ],
            'note' => $note ? ['id' => $note->id, 'status' => $note->status, 'signed_at' => $note->signed_at?->toIso8601String()] : null,
            'defaults' => $defaults + [
                'lead_surgeon_id' => $user->id, // prefilled; the author can change it
            ],
            'currentUser' => [
                'id' => $user->id,
                'name' => $user->name,
                'title' => $user->profile?->title ?? null,
                'registration_number' => $user->profile?->registration_number ?? '',
            ],
            'readOnly' => $note?->isSigned() ?? false,
        ]);
    }

    private function formData(OperativeNote $note): array
    {
        return [
            'operation_date' => $note->operation_date?->toDateString(),
            'start_time' => $note->start_time ? substr($note->start_time, 0, 5) : '',
            'end_time' => $note->end_time ? substr($note->end_time, 0, 5) : '',
            'theatre' => $note->theatre,
            'lead_surgeon_id' => $note->lead_surgeon_id,
            'co_surgeon_ids' => $note->teamIds(OperativeNote::ROLE_CO_SURGEON),
            'assistant_ids' => $note->teamIds(OperativeNote::ROLE_ASSISTANT),
            'anaesthetist_id' => $note->teamIds(OperativeNote::ROLE_ANAESTHETIST)[0] ?? null,
            'scrub_nurse_id' => $note->teamIds(OperativeNote::ROLE_SCRUB_NURSE)[0] ?? null,
            'circulating_nurse_id' => $note->teamIds(OperativeNote::ROLE_CIRCULATING_NURSE)[0] ?? null,
            'preoperative_diagnosis' => $note->preoperative_diagnosis,
            'postoperative_diagnosis' => $note->postoperative_diagnosis,
            'procedure_performed' => $note->procedure_performed,
            'anaesthesia_type' => $note->anaesthesia_type,
            'procedure_details' => $note->procedure_details,
            'findings' => $note->findings,
            'ebl_ml' => $note->ebl_ml,
            'fluids_ml' => $note->fluids_ml,
            'urine_output_ml' => $note->urine_output_ml,
            'counts_correct' => $note->counts_correct,
            'specimens' => $note->specimens ?? [],
            'complications_occurred' => $note->complications_occurred,
            'complications' => $note->complications,
            'post_op_plan' => $note->post_op_plan ?? [],
            'registration_number' => $note->registration_number,
        ];
    }

    /** Users whose profile roles include any of the given roles. */
    private function staff(array $roles): array
    {
        return User::query()
            ->whereHas('profile', function ($q) use ($roles) {
                $q->where(function ($q) use ($roles) {
                    foreach ($roles as $role) {
                        $q->orWhereJsonContains('roles', $role);
                    }
                });
            })
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn($u) => ['id' => $u->id, 'name' => $u->name])
            ->all();
    }
}
