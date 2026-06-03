<?php

namespace App\Notifications\Production;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ProductionOrderCreatedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public int $productionOrderId,
        public string $reference,
        public int $projectId,
        public string $projectName,
        public int $fifoPosition,
    ) {}

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'production.order_created',
            'production_order_id' => $this->productionOrderId,
            'reference' => $this->reference,
            'project_id' => $this->projectId,
            'project_name' => $this->projectName,
            'fifo_position' => $this->fifoPosition,
            'message' => "Production order {$this->reference} created for {$this->projectName} (FIFO #{$this->fifoPosition}).",
        ];
    }
}
