<?php

namespace Tests\Unit\Support;

use App\Exceptions\UploadRejectedException;
use App\Support\ApiExceptionPresenter;
use Illuminate\Database\QueryException;
use Illuminate\Http\Exceptions\PostTooLargeException;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;
use ValueError;

class ApiExceptionPresenterTest extends TestCase
{
    public function test_presents_clear_schema_message_for_unknown_column(): void
    {
        config(['app.debug' => false]);

        $previous = new \PDOException('SQLSTATE[42S22]: Column not found: 1054 Unknown column \'catalog_tier\'');
        $exception = new QueryException('mysql', 'select * from warehouse_items', [], $previous);
        $request = Request::create('/api/v1/warehouse/master-data/catalog-items', 'GET');
        $request->headers->set('Accept', 'application/json');

        $presented = ApiExceptionPresenter::present($exception, $request);

        $this->assertNotNull($presented);
        $this->assertSame(500, $presented['status']);
        $this->assertSame('schema_outdated', $presented['payload']['error']);
        $this->assertStringContainsString('Run migrations', $presented['payload']['message']);
        $this->assertArrayNotHasKey('detail', $presented['payload']);
        $this->assertArrayNotHasKey('exception', $presented['payload']);
    }

    public function test_includes_debug_detail_when_app_debug_enabled(): void
    {
        config(['app.debug' => true]);

        $previous = new \PDOException('SQLSTATE[42S22]: Column not found: 1054 Unknown column \'catalog_tier\'');
        $exception = new QueryException('mysql', 'select * from warehouse_items', [], $previous);
        $request = Request::create('/api/v1/foo', 'GET', server: ['HTTP_ACCEPT' => 'application/json']);

        $presented = ApiExceptionPresenter::present($exception, $request);

        $this->assertNotNull($presented);
        $this->assertArrayHasKey('detail', $presented['payload']);
        $this->assertArrayHasKey('exception', $presented['payload']);
    }

    public function test_classifies_invalid_enum_value_errors(): void
    {
        config(['app.debug' => false]);

        $exception = new ValueError('"glass" is not a valid backing value for enum App\\Enums\\Warehouse\\ItemCategory');
        $request = Request::create('/api/v1/warehouse/master-data/catalog-items', 'GET');
        $request->headers->set('X-Requested-With', 'XMLHttpRequest');

        $presented = ApiExceptionPresenter::present($exception, $request);

        $this->assertNotNull($presented);
        $this->assertSame('invalid_catalog_category', $presented['payload']['error']);
    }

    public function test_does_not_override_validation_exceptions(): void
    {
        $exception = ValidationException::withMessages(['search' => ['Too long.']]);
        $request = Request::create('/api/v1/warehouse/master-data/catalog-items', 'GET');
        $request->headers->set('Accept', 'application/json');

        $this->assertNull(ApiExceptionPresenter::present($exception, $request));
    }

    public function test_presents_clear_post_too_large_message_and_logs_limits(): void
    {
        config(['app.debug' => false, 'bibo.warehouse.material_catalog_workbook_max_kb' => 153600]);

        $request = Request::create(
            '/api/v1/warehouse/master-data/material-catalog/extract',
            'POST',
            server: [
                'CONTENT_LENGTH' => 26168299,
                'HTTP_ACCEPT' => 'application/json',
            ],
        );

        $presented = ApiExceptionPresenter::present(new PostTooLargeException, $request);

        $this->assertNotNull($presented);
        $this->assertSame(413, $presented['status']);
        $this->assertSame('post_too_large', $presented['payload']['error']);
        $this->assertStringContainsString('post_max_size', $presented['payload']['message']);
        $this->assertStringContainsString('25 MB', $presented['payload']['message']);
        $this->assertSame('25 MB', $presented['payload']['limits']['content_length']);
        $this->assertSame(26168299, $presented['payload']['limits']['content_length_bytes']);
        $this->assertArrayHasKey('recommended_php', $presented['payload']['limits']);
        $this->assertSame($presented['payload']['message'], $presented['payload']['errors']['file'][0]);
        $this->assertArrayNotHasKey('exception', $presented['payload']);
    }

    public function test_presents_upload_rejected_payload(): void
    {
        config(['app.debug' => false]);

        $file = new UploadedFile(
            __FILE__,
            'PREMIUM.xlsx',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            UPLOAD_ERR_INI_SIZE,
            true,
        );
        $request = Request::create('/api/v1/warehouse/master-data/material-catalog/extract', 'POST');
        $request->headers->set('Accept', 'application/json');

        $exception = UploadRejectedException::fromPhpFile($request, $file);
        $presented = ApiExceptionPresenter::present($exception, $request);

        $this->assertNotNull($presented);
        $this->assertSame(422, $presented['status']);
        $this->assertSame('upload_max_filesize_exceeded', $presented['payload']['error']);
        $this->assertStringContainsString('PREMIUM.xlsx', $presented['payload']['message']);
        $this->assertStringContainsString('upload_max_filesize', $presented['payload']['message']);
        $this->assertSame('PREMIUM.xlsx', $presented['payload']['limits']['filename']);
    }
}
