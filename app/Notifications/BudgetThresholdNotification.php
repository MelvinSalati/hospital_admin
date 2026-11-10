<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class BudgetThresholdNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * @param string $level 'warning' | 'critical'
     */
    public function __construct(
        public int $budgetId,
        public string $budgetCode,
        public string $budgetName,
        public string $level,
        public float $utilization,
        public float $threshold,
        public float $allocatedAmount,
        public float $availableAmount,
        public float $uncommittedAmount
    ) {
        $this->onQueue('notifications');

        // Dispatch only after the surrounding DB transaction commits,
        // so a rolled-back reserve/commit/release never sends a notification.
        $this->afterCommit();
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $isCritical = $this->level === 'critical';

        return [
            'type'               => 'budget_threshold',
            'title'              => $isCritical ? 'Budget critical' : 'Budget warning',
            'level'              => $this->level,
            'budget_id'          => $this->budgetId,
            'budget_code'        => $this->budgetCode,
            'budget_name'        => $this->budgetName,
            'utilization'        => round($this->utilization, 2),
            'threshold'          => round($this->threshold, 2),
            'allocated_amount'   => $this->allocatedAmount,
            'available_amount'   => $this->availableAmount,
            'uncommitted_amount' => $this->uncommittedAmount,
            'message'            => sprintf(
                '%s (%s) is at %s%% utilization, past the %s threshold of %s%%. %s still uncommitted.',
                $this->budgetName,
                $this->budgetCode,
                number_format($this->utilization, 2),
                $this->level,
                number_format($this->threshold, 2),
                number_format($this->uncommittedAmount, 2)
            ),
            'url'                => "/admin/budgets/{$this->budgetId}", // adjust to your real budget route
        ];
    }
}
