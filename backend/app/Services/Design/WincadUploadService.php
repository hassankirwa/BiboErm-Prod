<?php

namespace App\Services\Design;

use App\Services\Projects\QuotationExcelExtractionService;
use Illuminate\Http\UploadedFile;

class WincadUploadService
{
    public function __construct(
        protected QuotationExcelExtractionService $fabricationExtractor,
    ) {}

    /**
     * @return array{
     *     project: array{name: string|null, order_no: string|null, delivery_date: string|null},
     *     items: array<int, array<string, mixed>>,
     *     summary: array{total_items: int, source_filename: string|null}
     * }
     */
    public function extractFromUpload(UploadedFile $file): array
    {
        return $this->fabricationExtractor->extractFromUpload($file);
    }

    /**
     * @param  array<int, array<int, string>>  $rows
     * @return array{
     *     project: array{name: string|null, order_no: string|null, delivery_date: string|null},
     *     items: array<int, array<string, mixed>>,
     *     summary: array{total_items: int, source_filename: string|null}
     * }
     */
    public function buildExtractionPayload(array $rows, ?string $sourceFilename = null): array
    {
        return $this->fabricationExtractor->buildExtractionPayload($rows, $sourceFilename);
    }
}
