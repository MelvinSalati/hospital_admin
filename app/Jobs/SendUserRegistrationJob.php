<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use App\Communications\WhatsApp;

class SendUserRegistrationJob implements ShouldQueue
{
    use Queueable;

    protected string $phoneNumber;
    protected string $message;

    /**
     * Create a new job instance.
     */
    public function __construct(string $phoneNumber, string $message)
    {
        $this->phoneNumber = $phoneNumber;
        $this->message = $message;
    }

    /**
     * Execute the job.
     */
    
    public function handle(): void
    {
        $message  = new WhatsApp();
        $message->send($this->phoneNumber, $this->message);
    }
}
