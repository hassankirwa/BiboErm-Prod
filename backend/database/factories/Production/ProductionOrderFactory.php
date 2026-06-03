<?php

namespace Database\Factories\Production;

use App\Enums\Production\ProductionOrderStatus;
use App\Enums\Production\ProductionStage;
use App\Models\Production\ProductionOrder;
use App\Models\Project;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProductionOrder>
 */
class ProductionOrderFactory extends Factory
{
    protected $model = ProductionOrder::class;

    public function definition(): array
    {
        return [
            'reference' => 'PROD-'.now()->format('Y').'-'.fake()->unique()->numerify('#####'),
            'project_id' => Project::query()->value('id') ?? 1,
            'status' => ProductionOrderStatus::Scheduled,
            'current_stage' => ProductionStage::MaterialPrep,
            'fifo_position' => fake()->numberBetween(1, 100),
            'scheduled_start' => now()->addDays(1)->toDateString(),
            'scheduled_end' => now()->addDays(14)->toDateString(),
        ];
    }
}
