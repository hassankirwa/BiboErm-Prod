<?php

namespace App\Enums;

enum ProjectStage: string
{
    case AwaitingDeposit = 'awaiting_deposit';
    case DepositReceived = 'deposit_received';
    case SiteAssessment = 'site_assessment';
    case FinalDesignApproval = 'final_design_approval';
    case BomFinalized = 'bom_finalized';
    case MaterialCheck = 'material_check';
    case MaterialsReserved = 'materials_reserved';
    case AwaitingProcurement = 'awaiting_procurement';
    case MaterialsReady = 'materials_ready';
    case CuttingStage = 'cutting_stage';
    case FabricationStage = 'fabrication_stage';
    case GlassAssembly = 'glass_assembly';
    case QcPreInstallation = 'qc_pre_installation';
    case InTransit = 'in_transit';
    case Installation = 'installation';
    case SiteQc = 'site_qc';
    case Snagging = 'snagging';
    case ProjectComplete = 'project_complete';
}
