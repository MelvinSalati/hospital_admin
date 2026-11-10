<?php

namespace App\Http\Controllers\Radiologies;

use App\Http\Controllers\Controller;
use App\Jobs\Imaging\ProcessImagingUpload;
use App\Jobs\ProcessImagingUpload as JobsProcessImagingUpload;
use App\Models\Patients\ImagingOrder;
use App\Models\Patients\ImagingOrderItem;
use App\Models\Patients\ImagingResultFile;
use App\Services\Imaging\ImagingService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class RadiologyController extends Controller
{
    public function __construct(
        private readonly ImagingService $storage,
    ) {}

    /**
     * GET /radiology/dashboard/{departmentId}
     */
    public function dashboard(Request $request, $departmentId)
    {
        return Inertia::render('radiologies/dashboard', [
            'departmentId' => (int) $departmentId,
            'dashboard'    => [],
        ]);
    }

    /**
     * GET /radiology/queue
     *
     * Pending imaging orders with no active result file uploaded yet.
     * One row per imaging_order, with its line items nested.
     */
    public function index()
    {
        $orders = ImagingOrder::query()
            ->with(['patient', 'items', 'orderedBy'])
            ->whereIn('status', ['pending', 'scheduled', 'in_progress'])
            ->orderBy('ordered_date', 'asc')
            ->limit(50)
            ->get();

        return Inertia::render('radiologies/queue', [
            'radiologyQueue' => $orders->map(fn(ImagingOrder $o) => $this->mapQueueRow($o)),
        ]);
    }
    /**
     * GET /radiology/queue  (alias of index)
     */
    public function queue()
    {
        return $this->index();
    }

    /**
     * GET /radiology/processed
     *
     * Imaging orders that already have files or have been finalized.
     */
    public function processed()
    {
        $orders = ImagingOrder::query()
            ->with(['patient', 'items', 'resultFiles'])
            ->whereIn('status', ['in_progress', 'completed', 'reported', 'performed'])
            ->orderByDesc('reported_date')
            ->orderByDesc('performed_date')
            ->limit(100)
            ->get();

        return Inertia::render('radiologies/processed', [
            'radiologyQueue' => $orders->map(fn(ImagingOrder $o) => $this->mapProcessedRow($o)),
        ]);
    }

    /**
     * POST /radiology/orders/{imagingOrder}/results  → 202 Accepted
     *
     * Stages the uploaded files on the `staging` disk and queues
     * ProcessImagingUpload to move them into public storage.
     */
    public function uploadResult(Request $request, ImagingOrder $imagingOrder)
    {
        $validated = $request->validate([
            'files'                 => ['required', 'array', 'min:1', 'max:20'],
            'files.*'               => ['required', 'file', 'max:20480'],   // 20 MB each
            'imaging_order_item_id' => ['nullable', 'integer', 'exists:imaging_order_items,id'],
            'file_type'             => ['nullable', 'in:image,dicom,pdf,report,other'],
            'notes'                 => ['nullable', 'string', 'max:2000'],
               'uploaded_by'              => 'nullable|exists:users,id'
        ]);

        // Guard: the item must belong to this order.
        if (!empty($validated['imaging_order_item_id'])) {
            $belongs = $imagingOrder->items()
                ->whereKey($validated['imaging_order_item_id'])
                ->exists();

            abort_unless($belongs, 422, 'The selected item does not belong to this imaging order.');
        }

        $stagingFolder = 'uploads/' . $imagingOrder->id . '/' . Str::uuid()->toString();
        $staged        = [];

        foreach ($request->file('files') as $file) {
            $path = $file->storeAs(
                $stagingFolder,
                Str::random(12) . '.' . ($file->getClientOriginalExtension() ?: $file->guessExtension()),
                ImagingService::STAGING_DISK,
            );

            $staged[] = [
                'path'          => $path,
                'original_name' => $file->getClientOriginalName(),
                'mime'          => $file->getClientMimeType(),
                'size'          => $file->getSize(),
            ];
        }

        JobsProcessImagingUpload::dispatch(
            $imagingOrder->id,
            $staged,
            $validated['imaging_order_item_id'] ?? null,
            $validated['file_type'] ?? 'image',
            $validated['notes'] ?? null,
            $request->user()?->uploaded_by,
        );

        return response()->json([
            'message'  => count($staged) . ' file(s) queued for processing.',
            'status'   => 'queued',
            'order_id' => $imagingOrder->id,
            'staged'   => count($staged),
        ], 202);
    }

    /**
     * POST /radiology/results/{imagingResultFile}/remove
     *
     * Soft-removal: row marked removed, file stays on disk for audit.
     */
    public function removeResult(Request $request, ImagingResultFile $imagingResultFile)
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:3', 'max:500'],
        ]);

        if ($imagingResultFile->is_removed) {
            return response()->json(['message' => 'File already removed.'], 409);
        }

        $imagingResultFile->update([
            'is_removed'     => true,
            'removed_at'     => now(),
            'removed_by'     => $request->user()?->id,
            'removal_reason' => $validated['reason'],
        ]);

        $imagingResultFile->delete();   // soft delete only

        return response()->json([
            'message' => 'File marked as removed. It remains on disk for audit.',
        ]);
    }

    /**
     * POST /radiology/orders/{imagingOrder}/finalize
     */
    public function finalize(Request $request, ImagingOrder $imagingOrder)
    {
        $validated = $request->validate([
            'findings'         => ['nullable', 'string'],
            'impression'       => ['nullable', 'string'],
            'recommendations'  => ['nullable', 'string'],
            'amendment_reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $isAmendment = $imagingOrder->status === 'reported';

        $imagingOrder->update([
            'status'           => 'reported',
            'findings'         => $validated['findings']         ?? $imagingOrder->findings,
            'impression'       => $validated['impression']       ?? $imagingOrder->impression,
            'recommendations'  => $validated['recommendations']  ?? $imagingOrder->recommendations,
            'reported_by'      => $imagingOrder->reported_by ?? $request->user()?->id,
            'reported_date'    => now(),
            'reviewed_by'      => $request->user()?->id,
            'reviewed_at'      => now(),
            'amended_at'       => $isAmendment ? now() : $imagingOrder->amended_at,
            'amendment_reason' => $validated['amendment_reason'] ?? $imagingOrder->amendment_reason,
        ]);

        return response()->json([
            'message' => $isAmendment ? 'Report amended.' : 'Order finalized.',
            'order'   => $imagingOrder->fresh(),
        ]);
    }

    /* ------------------------------------------------------------------ */
    /* Mappers                                                             */
    /* ------------------------------------------------------------------ */

    private function mapQueueRow(ImagingOrder $o): array
    {
        return [
            'id'                => $o->id,
            'imaging_order_id'  => $o->id,
            'order_number'      => $o->order_number,
            'visit_token'       => $o->visit_token,
            'patient_id'        => $o->patient_id,
            'patient_no'        => $o->patient?->patient_no,
            'first_name'        => $o->patient?->first_name,
            'last_name'         => $o->patient?->last_name,
            'name'              => $o->patient?->name ?? $o->patient?->first_name.' '.$o->patient?->last_name,
            'gender'            => trim((ucfirst($o->patient?->gender) ?? '-') . '/' . (Carbon::parse($o->patient?->date_of_birth)->age ?? '-')),
            'priority'          => $o->priority ?? 'routine',
            'modality'          => $o->modality,
            'body_part'         => $o->body_part,
            'total_amount'      => (float) $o->total_amount,
            'ordered_date'      => optional($o->ordered_date)->toIso8601String(),

            // ── Ordered by ──────────────────────────────────────
            'ordered_by'        => $o->orderedBy?->name ?? 'System',  // ← name
            'ordered_by_id'     => $o->ordered_by,                     // ← keep the ID if the UI ever needs it

            'tests' => $o->items->map(fn($i) => [
                'item_id'     => $i->id,
                'test_name'   => $i->service_name,
                'modality'    => $i->modality,
                'body_part'   => $i->body_part,
                'unit_price'  => (float) $i->price,
                'quantity'    => (int) $i->quantity,
                'total_price' => (float) $i->total,
                'amount'      => (float) $i->total,
                'status'      => $i->status,
            ])->values()->all(),

            'files' => $o->imagingResultFiles?->map(fn($f) => [
                'id'          => $f->id,
                'name'        => $f->file_name,
                'url'         => $f->file_path ? asset('storage/' . ltrim($f->file_path, '/')) : null,
                'mime'        => $f->mime_type,
                'type'        => $f->file_type,
                'size'        => $f->file_size,
                'notes'       => $f->notes,
                'uploaded_at' => optional($f->created_at)->toIso8601String(),
                'uploaded_by' => $f->uploaded_by,
            ])->values()->all() ?? [],
        ];
    }

    private function mapProcessedRow(ImagingOrder $order): array
    {
        $patient = $order->patient;

        return [
            'id'              => $order->id,
            'order_number'    => $order->order_number,
            'visit_token'     => $order->visit_token,
            'status'          => $order->status,
            'patient_id'      => $patient?->id,
            'patient_name'    => $patient?->name
                ?? trim(($patient?->first_name ?? '') . ' ' . ($patient?->last_name ?? '')),
            'modality'        => $order->modality,
            'body_part'       => $order->body_part,
            'performed_by'    => $order->performed_by,
            'performed_at'    => optional($order->performed_date)->toIso8601String(),
            'reported_by'     => $order->reported_by,
            'reported_at'     => optional($order->reported_date)->toIso8601String(),
            'reviewed_by'     => $order->reviewed_by,
            'reviewed_at'     => optional($order->reviewed_at)->toIso8601String(),
            'amended_at'      => optional($order->amended_at)->toIso8601String(),
            'findings'        => $order->findings,
            'impression'      => $order->impression,
            'recommendations' => $order->recommendations,

            'files' => $order->activeResultFiles->map(fn($f) => [
                'id'          => $f->id,
                'name'        => $f->file_name,
                'url'         => $this->storage->publicUrl($f->file_path),
                'mime'        => $f->mime_type,
                'size'        => $f->file_size,
                'type'        => $f->file_type,
                'uploaded_at' => optional($f->created_at)->toIso8601String(),
            ])->values(),

            'removed_files' => $order->resultFiles
                ->where('is_removed', true)
                ->map(fn($f) => [
                    'id'             => $f->id,
                    'name'           => $f->file_name,
                    'removed_at'     => optional($f->removed_at)->toIso8601String(),
                    'removal_reason' => $f->removal_reason,
                ])->values(),
        ];
    }
}
