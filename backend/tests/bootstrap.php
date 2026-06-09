<?php

/*
 * PHPUnit bootstrap: never run tests against a cached local config.
 * `php artisan config:cache` bakes .env values (e.g. pgsql/bibo_erm) into
 * bootstrap/cache/config.php, which ignores phpunit.xml env overrides and
 * causes RefreshDatabase to wipe the development database.
 */
$configCache = dirname(__DIR__).'/bootstrap/cache/config.php';

if (is_file($configCache)) {
    unlink($configCache);
}

require dirname(__DIR__).'/vendor/autoload.php';
