<?php

namespace App\Enums\QualityControl;

enum QcInspectionContext: string
{
    case WarehouseReceiving = 'warehouse_receiving';
    case WarehouseAccessoriesAudit = 'warehouse_accessories_audit';
    case WarehouseAluminiumAudit = 'warehouse_aluminium_audit';
    case WarehouseRubbersAudit = 'warehouse_rubbers_audit';
    case ToolsPeriodic = 'tools_periodic';
    case ProductionQcPreCheck = 'production_qc_pre_check';
    case ProductionQcPostFabrication = 'production_qc_post_fabrication';
    case ProductionInProcess = 'production_in_process';
    case SiteInstallation = 'site_installation';
    case SnaggingSignoff = 'snagging_signoff';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
