<?php

namespace Tests\Unit\Support;

use App\Support\UploadDiagnostics;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class UploadDiagnosticsTest extends TestCase
{
    public function test_ini_bytes_parses_shorthand(): void
    {
        $this->assertSame(8 * 1024 * 1024, UploadDiagnostics::iniBytes('8M'));
        $this->assertSame(160 * 1024 * 1024, UploadDiagnostics::iniBytes('160M'));
        $this->assertSame(2048, UploadDiagnostics::iniBytes('2K'));
        $this->assertSame(0, UploadDiagnostics::iniBytes('-1'));
    }

    public function test_recommended_ini_adds_headroom_over_app_max(): void
    {
        config(['bibo.warehouse.material_catalog_workbook_max_kb' => 153600]);

        $this->assertSame('160M', UploadDiagnostics::recommendedIni());
    }

    public function test_message_for_ini_size_names_the_file_and_limit(): void
    {
        $file = new UploadedFile(
            __FILE__,
            'PREMIUM.xlsx',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            UPLOAD_ERR_INI_SIZE,
            true,
        );

        $message = UploadDiagnostics::messageForPhpError($file);

        $this->assertStringContainsString('PREMIUM.xlsx', $message);
        $this->assertStringContainsString('upload_max_filesize', $message);
        $this->assertSame('upload_max_filesize_exceeded', UploadDiagnostics::errorCodeName(UPLOAD_ERR_INI_SIZE));
    }

    public function test_failed_files_detects_php_upload_errors(): void
    {
        $file = new UploadedFile(
            __FILE__,
            'BALUSTRADE.xlsx',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            UPLOAD_ERR_INI_SIZE,
            true,
        );
        $request = Request::create('/api/v1/warehouse/master-data/material-catalog/extract', 'POST', files: [
            'file' => $file,
        ]);

        $failed = UploadDiagnostics::failedFiles($request);

        $this->assertCount(1, $failed);
        $this->assertSame('BALUSTRADE.xlsx', $failed[0]->getClientOriginalName());
    }
}
