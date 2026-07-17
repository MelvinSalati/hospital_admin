<?php

namespace App\Jobs;

use App\Models\Patients\Interaction;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class InteractionJob implements ShouldQueue
{
    use Queueable;

    protected $data;

    /**
     * Create a new job instance.
     */
    public function __construct(array $data)
    {
        $this->data     = $data;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        Interaction::create($this->data);
    }
}
