<?php

namespace App\Enums;

enum InstallMode: string
{
    case NairobiFabricationOnly = 'nairobi_fabrication_only';
    case NairobiSiteInstall = 'nairobi_site_install';
    case OutsideFullInstall = 'outside_full_install';
}
