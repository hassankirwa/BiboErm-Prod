<?php

namespace App\Enums\Production;

enum ProductionStage: string
{
    case Cutting = 'cutting';
    case Fabrication = 'fabrication';
    case Sash = 'sash';
    case GlassAssembly = 'glass_assembly';
    case QcPreInstallation = 'qc_pre_installation';
}
