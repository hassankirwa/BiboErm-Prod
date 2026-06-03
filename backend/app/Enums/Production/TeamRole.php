<?php

namespace App\Enums\Production;

enum TeamRole: string
{
    case CuttingLead = 'cutting_lead';
    case FabricationLead = 'fabrication_lead';
    case AssemblyLead = 'assembly_lead';
    case QcLiaison = 'qc_liaison';
}
