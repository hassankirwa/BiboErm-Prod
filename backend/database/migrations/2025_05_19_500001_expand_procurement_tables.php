<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchase_requisitions', function (Blueprint $table) {
            $table->timestamp('submitted_at')->nullable()->after('requested_by');
            $table->foreignId('approved_by')->nullable()->after('submitted_at')->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable()->after('approved_by');
            $table->text('rejection_reason')->nullable()->after('approved_at');
        });

        Schema::create('purchase_requisition_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_requisition_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('warehouse_item_id')->nullable();
            $table->unsignedBigInteger('project_bom_line_id')->nullable();
            $table->string('description');
            $table->string('sku', 50)->nullable();
            $table->decimal('quantity', 15, 3);
            $table->string('unit_of_measure', 20)->nullable();
            $table->string('trigger_type', 30);
            $table->decimal('estimated_unit_price', 15, 2)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('purchase_requisition_id');
            $table->index('warehouse_item_id');
            $table->index('trigger_type');
        });

        Schema::table('purchase_order_lines', function (Blueprint $table) {
            $table->unsignedBigInteger('warehouse_item_id')->nullable()->after('purchase_order_id');
            $table->decimal('received_qty', 15, 3)->default(0)->after('line_total');
            $table->index('warehouse_item_id');
        });

        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->timestamp('sent_at')->nullable()->after('approved_at');
        });

        Schema::create('transport_orders', function (Blueprint $table) {
            $table->id();
            $table->string('transport_number', 30)->unique();
            $table->foreignId('purchase_order_id')->constrained()->cascadeOnDelete();
            $table->string('transport_type', 30);
            $table->string('vehicle', 100)->nullable();
            $table->string('driver_name')->nullable();
            $table->string('driver_phone', 50)->nullable();
            $table->timestamp('expected_arrival')->nullable();
            $table->timestamp('actual_arrival')->nullable();
            $table->string('status', 30)->default('scheduled');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();

            $table->index('purchase_order_id');
        });

        Schema::create('goods_receipts', function (Blueprint $table) {
            $table->id();
            $table->string('grn_number', 30)->unique();
            $table->foreignId('purchase_order_id')->constrained();
            $table->foreignId('project_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('transport_order_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status', 30)->default('pending');
            $table->timestamp('received_at');
            $table->timestamp('verified_at')->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();

            $table->index('purchase_order_id');
            $table->index('project_id');
            $table->index('status');
        });

        Schema::create('goods_receipt_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('goods_receipt_id')->constrained()->cascadeOnDelete();
            $table->foreignId('purchase_order_line_id')->constrained();
            $table->unsignedBigInteger('warehouse_item_id')->nullable();
            $table->decimal('qty_received', 15, 3);
            $table->decimal('qty_accepted', 15, 3)->default(0);
            $table->decimal('qty_rejected', 15, 3)->default(0);
            $table->text('rejection_reason')->nullable();
            $table->unsignedBigInteger('to_bin_id')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('goods_receipt_id');
            $table->index('purchase_order_line_id');
            $table->index('warehouse_item_id');
            $table->index('to_bin_id');
        });

        Schema::create('goods_receipt_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('goods_receipt_id')->constrained()->cascadeOnDelete();
            $table->string('type', 30);
            $table->string('path', 500);
            $table->string('firebase_url', 500)->nullable();
            $table->string('original_filename')->nullable();
            $table->foreignId('uploaded_by')->constrained('users');
            $table->timestamp('uploaded_at');
            $table->timestamp('created_at')->useCurrent();

            $table->index('goods_receipt_id');
            $table->index(['goods_receipt_id', 'type']);
        });

        Schema::create('glass_orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number', 30)->unique();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('supplier_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('purchase_order_id')->nullable()->constrained()->nullOnDelete();
            $table->json('specs');
            $table->string('status', 30)->default('draft');
            $table->timestamp('ordered_at')->nullable();
            $table->date('expected_delivery')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->string('delivery_location')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();

            $table->index('project_id');
            $table->index('status');
        });

        Schema::create('project_addon_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('purchase_requisition_id')->nullable()->constrained()->nullOnDelete();
            $table->text('description');
            $table->boolean('client_requested')->default(true);
            $table->string('status', 30)->default('pending');
            $table->foreignId('requested_by')->constrained('users');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('project_id');
        });

        Schema::create('procurement_delays', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('purchase_order_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('glass_order_id')->nullable()->constrained()->nullOnDelete();
            $table->string('reason');
            $table->date('expected_date')->nullable();
            $table->date('actual_date')->nullable();
            $table->integer('days_delayed')->nullable();
            $table->text('impact_notes')->nullable();
            $table->foreignId('logged_by')->constrained('users');
            $table->timestamps();

            $table->index('project_id');
        });

        Schema::create('supplier_item_prices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('warehouse_item_id');
            $table->decimal('unit_price', 15, 2);
            $table->string('currency', 3)->default('KES');
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            $table->boolean('is_current')->default(true);
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['supplier_id', 'warehouse_item_id', 'effective_from'], 'supplier_item_price_unique');
            $table->index('warehouse_item_id');
            $table->index(['supplier_id', 'warehouse_item_id', 'is_current'], 'supplier_price_current_idx');
        });

        Schema::create('procurement_project_watchers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->string('notify_at_stage', 50);
            $table->foreignId('notify_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_notified_at')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();

            $table->unique(['project_id', 'notify_at_stage']);
            $table->index('project_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('procurement_project_watchers');
        Schema::dropIfExists('supplier_item_prices');
        Schema::dropIfExists('procurement_delays');
        Schema::dropIfExists('project_addon_requests');
        Schema::dropIfExists('glass_orders');
        Schema::dropIfExists('goods_receipt_attachments');
        Schema::dropIfExists('goods_receipt_lines');
        Schema::dropIfExists('goods_receipts');
        Schema::dropIfExists('transport_orders');

        Schema::table('purchase_order_lines', function (Blueprint $table) {
            $table->dropIndex(['warehouse_item_id']);
            $table->dropColumn('warehouse_item_id');
            $table->dropColumn('received_qty');
        });

        Schema::dropIfExists('purchase_requisition_lines');

        Schema::table('purchase_requisitions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('approved_by');
            $table->dropColumn(['submitted_at', 'approved_at', 'rejection_reason']);
        });

        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->dropColumn('sent_at');
        });
    }
};
