<?php

namespace Database\Seeders;

use App\Models\Department;
use Illuminate\Database\Seeder;

class DepartmentSeeder extends Seeder
{
    /**
     * @var list<string>
     */
    public const DEPARTMENTS = [
        ['name' => 'Sales / Marketing', 'slug' => 'sales_marketing', 'default_module' => 'crm'],
        ['name' => 'Production', 'slug' => 'production', 'default_module' => 'production'],
        ['name' => 'Warehouse / Inventory', 'slug' => 'warehouse', 'default_module' => 'warehouse'],
        ['name' => 'Procurement', 'slug' => 'procurement', 'default_module' => 'procurement'],
        ['name' => 'Quality Control', 'slug' => 'quality_control', 'default_module' => 'qc'],
        ['name' => 'HR', 'slug' => 'hr', 'default_module' => 'hr'],
        ['name' => 'Finance', 'slug' => 'finance', 'default_module' => 'finance'],
        ['name' => 'IT', 'slug' => 'it', 'default_module' => 'it'],
        ['name' => 'Project Management', 'slug' => 'project_management', 'default_module' => 'projects'],
        ['name' => 'Operations / Admin', 'slug' => 'operations', 'default_module' => 'workspace'],
        ['name' => 'Reception', 'slug' => 'reception', 'default_module' => 'crm'],
        ['name' => 'Field Operations', 'slug' => 'field', 'default_module' => 'field'],
        ['name' => 'Field Installation', 'slug' => 'field_installation', 'default_module' => 'field'],
    ];

    public function run(): void
    {
        foreach (self::DEPARTMENTS as $dept) {
            Department::query()->updateOrCreate(
                ['slug' => $dept['slug']],
                ['name' => $dept['name'], 'default_module' => $dept['default_module'], 'is_active' => true]
            );
        }
    }
}
