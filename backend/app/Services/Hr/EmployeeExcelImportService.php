<?php

namespace App\Services\Hr;

use App\Models\Department;
use App\Models\EmployeeProfile;
use App\Models\User;
use App\Models\UserProfile;
use App\Services\Projects\WorkbookDrawingExtractor;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Spatie\Permission\Models\Role;

class EmployeeExcelImportService
{
    /**
     * @var array<string, list<string>>
     */
    private const HEADER_ALIASES = [
        'employee_number' => ['staff no', 'staff no.', 'staff number', 'employee no', 'employee number', 'emp no', 'staff_no'],
        'name' => ['full name', 'name', 'employee name'],
        'department' => ['department', 'dept'],
        'unit' => ['unit', 'section', 'team'],
        'job_title' => ['role', 'job title', 'title', 'position'],
        'start_date' => ['start date', 'date joined', 'joined'],
        'phone' => ['phone number', 'phone', 'mobile', 'tel'],
        'phone_alt' => ['alternative phone', 'alt phone', 'phone 2', 'secondary phone'],
        'home_county' => ['home county', 'county'],
        'home_area' => ['home area / estate', 'home area', 'estate', 'area'],
        'address' => ['postal / physical address', 'postal address', 'physical address', 'address'],
        'emergency_contact_name' => ['next of kin - name', 'next of kin name', 'nok name', 'emergency contact name'],
        'emergency_contact_relationship' => ['relationship', 'nok relationship', 'emergency contact relationship'],
        'emergency_contact_phone' => ['next of kin - phone', 'next of kin phone', 'nok phone', 'emergency contact phone'],
        'national_id' => ['national id no.', 'national id no', 'national id', 'id no', 'id number'],
        'kra_pin' => ['kra pin', 'kra', 'pin'],
        'nssf_number' => ['nssf no.', 'nssf no', 'nssf number', 'nssf'],
        'shif_number' => ['shif (sha) no.', 'shif (sha) no', 'shif no', 'shif number', 'sha no', 'shif'],
        'bank_or_mpesa' => ['bank / m-pesa name', 'bank / mpesa name', 'bank', 'mpesa', 'm-pesa'],
        'hr_notes' => ['notes', 'remarks', 'comment'],
    ];

    /**
     * @var array<string, string>
     */
    private const DEPARTMENT_ALIASES = [
        'production' => 'production',
        'cutting' => 'production',
        'fabrication' => 'production',
        'fabrication & assembly' => 'production',
        'silicone' => 'production',
        'installation' => 'field_installation',
        'field installation' => 'field_installation',
        'warehouse' => 'warehouse',
        'warehouse / inventory' => 'warehouse',
        'inventory' => 'warehouse',
        'design' => 'project_management',
        'design & measurement' => 'project_management',
        'measurement' => 'project_management',
        'qc' => 'quality_control',
        'qc & packing' => 'quality_control',
        'quality control' => 'quality_control',
        'hr' => 'hr',
        'finance' => 'finance',
        'sales' => 'sales_marketing',
        'sales / marketing' => 'sales_marketing',
        'procurement' => 'procurement',
        'it' => 'it',
    ];

    public function __construct(
        private readonly WorkbookDrawingExtractor $drawings,
        private readonly EmployeeImageStorage $images,
        private readonly EmployeeNumberGenerator $numbers,
        private readonly EmployeeDirectCreateService $directCreate,
    ) {}

    /**
     * @return array{rows: list<array<string, mixed>>, summary: array<string, int>, extract_token: string, source_filename: string|null}
     */
    public function extract(UploadedFile $file, ?string $extractToken = null): array
    {
        $extension = strtolower((string) $file->getClientOriginalExtension());
        if (! in_array($extension, ['xlsx', 'xls', 'csv'], true)) {
            throw ValidationException::withMessages([
                'file' => ['Upload a staff workbook as .xlsx, .xls, or .csv.'],
            ]);
        }

        $extractToken = $extractToken && trim($extractToken) !== ''
            ? trim($extractToken)
            : (string) Str::uuid();

        $path = $file->getRealPath() ?: $file->getPathname();
        $rows = $extension === 'csv'
            ? $this->rowsFromCsv($path)
            : $this->rowsFromSpreadsheet($path, $extension, $extractToken);

        if ($rows === []) {
            throw ValidationException::withMessages([
                'file' => ['No staff rows could be parsed from the workbook.'],
            ]);
        }

        $rows = $this->annotateSyncStatus($rows);
        $counts = collect($rows)->countBy('_sync_status');

        return [
            'rows' => $rows,
            'summary' => [
                'total' => count($rows),
                'new' => (int) ($counts['new'] ?? 0),
                'changed' => (int) ($counts['changed'] ?? 0),
                'unchanged' => (int) ($counts['unchanged'] ?? 0),
                'with_photos' => count(array_filter($rows, fn (array $row) => ! empty($row['avatar_url']))),
                'warnings' => count(array_filter($rows, fn (array $row) => ! empty($row['_warnings']))),
            ],
            'extract_token' => $extractToken,
            'source_filename' => $file->getClientOriginalName(),
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return array{created: int, updated: int, skipped: int}
     */
    public function import(array $rows, ?string $extractToken, User $actor): array
    {
        $created = 0;
        $updated = 0;
        $skipped = 0;

        foreach ($rows as $row) {
            $staffNo = strtoupper(trim((string) ($row['employee_number'] ?? '')));
            if ($staffNo === '') {
                $skipped++;
                continue;
            }

            $existingProfile = EmployeeProfile::query()
                ->where('employee_number', $staffNo)
                ->with('user.profile')
                ->first();

            $avatarPath = null;
            $incomingAvatar = $row['avatar_path'] ?? null;
            if (is_string($incomingAvatar) && $incomingAvatar !== '') {
                $promoted = $this->images->promoteExtractPath($incomingAvatar, $staffNo);
                $avatarPath = $promoted['path'] ?? null;
            }

            if ($existingProfile?->user) {
                $this->updateExisting($existingProfile, $row, $avatarPath);
                $updated++;
                continue;
            }

            $departmentId = $this->resolveDepartmentId($row['department'] ?? null);
            if ($departmentId === null) {
                $skipped++;
                continue;
            }

            $roleId = $this->defaultRoleIdForDepartment($departmentId);
            if ($roleId === null) {
                $skipped++;
                continue;
            }

            $email = trim((string) ($row['email'] ?? ''));
            // Never invent a login email during import — HR sends a real invite later.
            if ($email === '') {
                $email = 'import.'.mb_strtolower(preg_replace('/\W+/', '', $staffNo) ?: Str::random(6)).'@pending.bibo.internal';
            }

            $sharedEmail = Department::query()->whereKey($departmentId)->value('shared_email');

            try {
                $result = $this->directCreate->create([
                    'name' => $row['name'] ?? $staffNo,
                    'email' => $email,
                    'activate_now' => false,
                    'department_id' => $departmentId,
                    'role_id' => $roleId,
                    'additional_assignments' => [],
                    'employee_number' => $staffNo,
                    'job_title' => $row['job_title'] ?? null,
                    'unit' => $row['unit'] ?? null,
                    'department_email' => $sharedEmail ?: null,
                    'start_date' => $this->normalizeDate($row['start_date'] ?? null),
                    'phone' => $row['phone'] ?? null,
                    'phone_alt' => $row['phone_alt'] ?? null,
                    'address' => $row['address'] ?? null,
                    'home_county' => $row['home_county'] ?? null,
                    'home_area' => $row['home_area'] ?? null,
                    'emergency_contact_name' => $row['emergency_contact_name'] ?? null,
                    'emergency_contact_phone' => $row['emergency_contact_phone'] ?? null,
                    'emergency_contact_relationship' => $row['emergency_contact_relationship'] ?? null,
                    'national_id' => $row['national_id'] ?? null,
                    'kra_pin' => $row['kra_pin'] ?? null,
                    'nssf_number' => $row['nssf_number'] ?? null,
                    'shif_number' => $row['shif_number'] ?? null,
                    'bank_or_mpesa' => $row['bank_or_mpesa'] ?? null,
                    'hr_notes' => $row['hr_notes'] ?? null,
                    'employment_type' => EmployeeProfile::EMPLOYMENT_FULL_TIME,
                ], $actor);

                if ($avatarPath) {
                    $profile = $result['user']->profile;
                    if ($profile && ! $profile->avatar_path) {
                        $profile->update([
                            'avatar_path' => $avatarPath,
                            'avatar_url' => null,
                        ]);
                    }
                }
                $created++;
            } catch (\Throwable) {
                $skipped++;
            }
        }

        if ($extractToken) {
            $this->images->cleanupExtractToken($extractToken);
        }

        return compact('created', 'updated', 'skipped');
    }

    public function discard(string $extractToken): void
    {
        $this->images->cleanupExtractToken($extractToken);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function rowsFromSpreadsheet(string $path, string $extension, string $extractToken): array
    {
        $spreadsheet = IOFactory::load($path);
        $sheet = $spreadsheet->getSheet(0);
        $imagesByRow = $this->drawings->extractMapByRowForSheet($path, $extension, $sheet->getTitle());

        $highestRow = $sheet->getHighestDataRow();
        $highestColumn = $sheet->getHighestDataColumn();
        $headerMap = [];
        $headerRow = 1;

        for ($row = 1; $row <= min(10, $highestRow); $row++) {
            $candidate = [];
            foreach (range('A', $highestColumn) as $col) {
                $value = trim((string) $sheet->getCell($col.$row)->getFormattedValue());
                $canonical = $this->canonicalHeader($value);
                if ($canonical !== null) {
                    $candidate[$col] = $canonical;
                }
            }
            if (count($candidate) >= 3) {
                $headerMap = $candidate;
                $headerRow = $row;
                break;
            }
        }

        if ($headerMap === []) {
            return [];
        }

        $rows = [];
        for ($row = $headerRow + 1; $row <= $highestRow; $row++) {
            $item = [];
            foreach ($headerMap as $col => $canonical) {
                $item[$canonical] = trim((string) $sheet->getCell($col.$row)->getFormattedValue());
            }

            $staffNo = strtoupper(trim((string) ($item['employee_number'] ?? '')));
            $name = trim((string) ($item['name'] ?? ''));
            if ($staffNo === '' && $name === '') {
                continue;
            }

            $media = $imagesByRow[$row] ?? null;
            if (is_array($media) && is_string($media['binary'] ?? null) && $media['binary'] !== '') {
                $stored = $this->images->storeExtractBinary(
                    $media['binary'],
                    (string) ($media['mime_type'] ?? 'image/jpeg'),
                    $staffNo !== '' ? $staffNo : 'row-'.$row,
                    $extractToken,
                );
                if ($stored) {
                    $item['avatar_path'] = $stored['path'];
                    $item['avatar_url'] = $stored['url'];
                }
            }

            $item['employee_number'] = $staffNo;
            $item['_warnings'] = $this->rowWarnings($item);
            $rows[] = $item;
        }

        return $rows;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function rowsFromCsv(string $path): array
    {
        $handle = fopen($path, 'rb');
        if ($handle === false) {
            return [];
        }

        $headers = null;
        $rows = [];
        while (($data = fgetcsv($handle)) !== false) {
            if ($headers === null) {
                $headers = [];
                foreach ($data as $index => $header) {
                    $canonical = $this->canonicalHeader((string) $header);
                    if ($canonical !== null) {
                        $headers[$index] = $canonical;
                    }
                }
                continue;
            }

            $item = [];
            foreach ($headers as $index => $canonical) {
                $item[$canonical] = trim((string) ($data[$index] ?? ''));
            }
            $item['employee_number'] = strtoupper(trim((string) ($item['employee_number'] ?? '')));
            if (($item['employee_number'] ?? '') === '' && ($item['name'] ?? '') === '') {
                continue;
            }
            $item['_warnings'] = $this->rowWarnings($item);
            $rows[] = $item;
        }
        fclose($handle);

        return $rows;
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return list<array<string, mixed>>
     */
    private function annotateSyncStatus(array $rows): array
    {
        $numbers = array_values(array_filter(array_map(
            fn (array $row) => strtoupper(trim((string) ($row['employee_number'] ?? ''))),
            $rows,
        )));

        $existing = $numbers === []
            ? collect()
            : EmployeeProfile::query()
                ->whereIn('employee_number', $numbers)
                ->with('user.profile')
                ->get()
                ->keyBy(fn (EmployeeProfile $profile) => strtoupper((string) $profile->employee_number));

        return array_map(function (array $row) use ($existing) {
            $staffNo = strtoupper(trim((string) ($row['employee_number'] ?? '')));
            /** @var EmployeeProfile|null $profile */
            $profile = $existing->get($staffNo);
            if (! $profile) {
                $row['_sync_status'] = 'new';
                $row['_changed_fields'] = [];
                return $row;
            }

            $changed = [];
            $comparisons = [
                'name' => [$profile->user?->name, $row['name'] ?? null],
                'job_title' => [$profile->job_title, $row['job_title'] ?? null],
                'unit' => [$profile->unit, $row['unit'] ?? null],
                'phone' => [$profile->user?->profile?->phone, $row['phone'] ?? null],
            ];
            foreach ($comparisons as $field => [$current, $incoming]) {
                if (trim((string) ($incoming ?? '')) !== '' && trim((string) ($current ?? '')) !== trim((string) $incoming)) {
                    $changed[] = $field;
                }
            }
            if (empty($profile->user?->profile?->avatar_path) && ! empty($row['avatar_path'])) {
                $changed[] = 'photo';
            }

            $row['_sync_status'] = $changed === [] ? 'unchanged' : 'changed';
            $row['_changed_fields'] = $changed;

            return $row;
        }, $rows);
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private function updateExisting(EmployeeProfile $profile, array $row, ?string $avatarPath): void
    {
        $user = $profile->user;
        if (! $user) {
            return;
        }

        DB::transaction(function () use ($profile, $user, $row, $avatarPath) {
            if (! empty($row['name'])) {
                $user->update(['name' => $row['name']]);
            }

            $profile->fill(array_filter([
                'job_title' => $row['job_title'] ?? null,
                'unit' => $row['unit'] ?? null,
                'start_date' => $this->normalizeDate($row['start_date'] ?? null),
                'national_id' => $row['national_id'] ?? null,
                'kra_pin' => $row['kra_pin'] ?? null,
                'nssf_number' => $row['nssf_number'] ?? null,
                'shif_number' => $row['shif_number'] ?? null,
                'bank_or_mpesa' => $row['bank_or_mpesa'] ?? null,
                'hr_notes' => $row['hr_notes'] ?? null,
            ], fn ($value) => $value !== null && $value !== ''))->save();

            $userProfile = $user->profile ?? UserProfile::query()->firstOrCreate(['user_id' => $user->id]);
            $userProfile->fill(array_filter([
                'phone' => $row['phone'] ?? null,
                'phone_alt' => $row['phone_alt'] ?? null,
                'address' => $row['address'] ?? null,
                'home_county' => $row['home_county'] ?? null,
                'home_area' => $row['home_area'] ?? null,
                'emergency_contact_name' => $row['emergency_contact_name'] ?? null,
                'emergency_contact_phone' => $row['emergency_contact_phone'] ?? null,
                'emergency_contact_relationship' => $row['emergency_contact_relationship'] ?? null,
            ], fn ($value) => $value !== null && $value !== ''))->save();

            if ($avatarPath && ! $userProfile->avatar_path) {
                $userProfile->update([
                    'avatar_path' => $avatarPath,
                    'avatar_url' => null,
                ]);
            }
        });
    }

    private function canonicalHeader(string $header): ?string
    {
        $normalized = mb_strtolower(trim(preg_replace('/\s+/', ' ', $header) ?? $header));
        if ($normalized === '') {
            return null;
        }

        foreach (self::HEADER_ALIASES as $canonical => $aliases) {
            if (in_array($normalized, $aliases, true)) {
                return $canonical;
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $row
     * @return list<string>
     */
    private function rowWarnings(array $row): array
    {
        $warnings = [];
        $dept = trim((string) ($row['department'] ?? ''));
        if ($dept !== '' && $this->resolveDepartmentId($dept) === null) {
            $warnings[] = 'Unmapped department: '.$dept;
        }
        if (trim((string) ($row['employee_number'] ?? '')) === '') {
            $warnings[] = 'Missing staff number';
        }

        return $warnings;
    }

    private function resolveDepartmentId(mixed $department): ?int
    {
        $name = mb_strtolower(trim((string) $department));
        if ($name === '') {
            return null;
        }

        $slug = self::DEPARTMENT_ALIASES[$name] ?? null;
        if ($slug === null) {
            foreach (self::DEPARTMENT_ALIASES as $alias => $mapped) {
                if (str_contains($name, $alias)) {
                    $slug = $mapped;
                    break;
                }
            }
        }

        if ($slug === null) {
            return null;
        }

        return Department::query()->where('slug', $slug)->value('id');
    }

    private function defaultRoleIdForDepartment(int $departmentId): ?int
    {
        $department = Department::query()->find($departmentId);
        if (! $department) {
            return null;
        }

        $preferred = match ($department->slug) {
            'hr' => 'hr_manager',
            'finance' => 'finance_officer',
            'warehouse' => 'warehouse_manager',
            'production' => 'production_manager',
            'field_installation' => 'installation_lead',
            'quality_control' => 'qc_inspector',
            'sales_marketing' => 'sales_rep',
            'procurement' => 'procurement_officer',
            'it' => 'it_admin',
            'project_management' => 'project_manager',
            default => null,
        };

        $guard = (string) config('permission.defaults.guard', 'web');
        if ($preferred) {
            $role = Role::query()->where('guard_name', $guard)->where('name', $preferred)->first();
            if ($role) {
                return $role->id;
            }
        }

        return Role::query()->where('guard_name', $guard)->value('id');
    }

    private function normalizeDate(mixed $value): ?string
    {
        $raw = trim((string) $value);
        if ($raw === '') {
            return null;
        }

        try {
            return \Carbon\Carbon::parse($raw)->toDateString();
        } catch (\Throwable) {
            return null;
        }
    }
}
