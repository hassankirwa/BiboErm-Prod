<?php

namespace App\Enums\Projects;

enum ProjectWaveStatus: string
{
    case Planned = 'planned';
    case InProduction = 'in_production';
    case Installing = 'installing';
    case Complete = 'complete';
}
