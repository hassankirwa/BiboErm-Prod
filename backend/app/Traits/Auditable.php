<?php

namespace App\Traits;

use App\Enums\AuditAction;
use App\Services\Audit\OwenAuditLogger;

trait Auditable
{
    public static function bootAuditable(): void
    {
        static::created(function ($model) {
            app(OwenAuditLogger::class)->log(
                module: $model->auditModule(),
                action: AuditAction::Create->value,
                entityType: $model->getMorphClass(),
                entityId: (int) $model->getKey(),
                newValues: $model->toArray(),
            );
        });

        static::updated(function ($model) {
            app(OwenAuditLogger::class)->log(
                module: $model->auditModule(),
                action: AuditAction::Update->value,
                entityType: $model->getMorphClass(),
                entityId: (int) $model->getKey(),
                oldValues: $model->getOriginal(),
                newValues: $model->toArray(),
            );
        });

        static::deleted(function ($model) {
            app(OwenAuditLogger::class)->log(
                module: $model->auditModule(),
                action: AuditAction::Delete->value,
                entityType: $model->getMorphClass(),
                entityId: (int) $model->getKey(),
                oldValues: $model->toArray(),
            );
        });
    }

    abstract public function auditModule(): string;
}
