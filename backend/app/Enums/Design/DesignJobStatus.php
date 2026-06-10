<?php

namespace App\Enums\Design;

enum DesignJobStatus: string
{
    case DesignRequired = 'design_required';
    case Assigned = 'assigned';
    case PackageDownloaded = 'package_downloaded';
    case WincadInProgress = 'wincad_in_progress';
    case FilesUploaded = 'files_uploaded';
    case DesignReview = 'design_review';
    case Approved = 'approved';
    case ReadyForQuotation = 'ready_for_quotation';
}
