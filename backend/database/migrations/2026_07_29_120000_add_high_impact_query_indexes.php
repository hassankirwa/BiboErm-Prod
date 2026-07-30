<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('site_visits', function (Blueprint $table) {
            $table->index(['assigned_field_officer_id', 'status'], 'idx_site_visits_officer_status');
            $table->index(['assigned_field_officer_id', 'visit_date'], 'idx_site_visits_officer_date');
            $table->index(['status', 'created_at'], 'idx_site_visits_status_created');
            $table->index('measurement_context', 'idx_site_visits_measurement_context');
        });

        Schema::table('purchase_requisitions', function (Blueprint $table) {
            $table->index(['project_id', 'status'], 'idx_purchase_requisitions_project_status');
            $table->index(['status', 'created_at'], 'idx_purchase_requisitions_status_created');
        });

        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->index(['project_id', 'status'], 'idx_purchase_orders_project_status');
            $table->index(['status', 'created_at'], 'idx_purchase_orders_status_created');
        });

        Schema::table('stock_reservations', function (Blueprint $table) {
            $table->index(['project_id', 'status'], 'idx_stock_reservations_project_status');
        });

        Schema::table('design_jobs', function (Blueprint $table) {
            $table->index(['status', 'created_at'], 'idx_design_jobs_status_created');
        });

        Schema::table('quotations', function (Blueprint $table) {
            $table->index(['account_id', 'status'], 'idx_quotations_account_status');
        });

        Schema::table('deals', function (Blueprint $table) {
            $table->index('status', 'idx_deals_status');
        });

        Schema::table('qc_defects', function (Blueprint $table) {
            $table->index(['status', 'severity'], 'idx_qc_defects_status_severity');
        });

        Schema::table('project_documents', function (Blueprint $table) {
            $table->index(['project_id', 'type'], 'idx_project_documents_project_type');
        });

        Schema::table('warehouse_items', function (Blueprint $table) {
            $table->index(['is_active', 'catalog_tier'], 'idx_warehouse_items_active_tier');
        });

        Schema::table('crm_activities', function (Blueprint $table) {
            $table->index(['assigned_to', 'status'], 'idx_crm_activities_assignee_status');
        });
    }

    public function down(): void
    {
        Schema::table('site_visits', function (Blueprint $table) {
            $table->dropIndex('idx_site_visits_officer_status');
            $table->dropIndex('idx_site_visits_officer_date');
            $table->dropIndex('idx_site_visits_status_created');
            $table->dropIndex('idx_site_visits_measurement_context');
        });

        Schema::table('purchase_requisitions', function (Blueprint $table) {
            $table->dropIndex('idx_purchase_requisitions_project_status');
            $table->dropIndex('idx_purchase_requisitions_status_created');
        });

        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->dropIndex('idx_purchase_orders_project_status');
            $table->dropIndex('idx_purchase_orders_status_created');
        });

        Schema::table('stock_reservations', function (Blueprint $table) {
            $table->dropIndex('idx_stock_reservations_project_status');
        });

        Schema::table('design_jobs', function (Blueprint $table) {
            $table->dropIndex('idx_design_jobs_status_created');
        });

        Schema::table('quotations', function (Blueprint $table) {
            $table->dropIndex('idx_quotations_account_status');
        });

        Schema::table('deals', function (Blueprint $table) {
            $table->dropIndex('idx_deals_status');
        });

        Schema::table('qc_defects', function (Blueprint $table) {
            $table->dropIndex('idx_qc_defects_status_severity');
        });

        Schema::table('project_documents', function (Blueprint $table) {
            $table->dropIndex('idx_project_documents_project_type');
        });

        Schema::table('warehouse_items', function (Blueprint $table) {
            $table->dropIndex('idx_warehouse_items_active_tier');
        });

        Schema::table('crm_activities', function (Blueprint $table) {
            $table->dropIndex('idx_crm_activities_assignee_status');
        });
    }
};
