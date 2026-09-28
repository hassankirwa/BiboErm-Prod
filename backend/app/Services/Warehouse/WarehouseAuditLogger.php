<?php

namespace App\Services\Warehouse;

use App\Services\Audit\OwenAuditLogger;

class WarehouseAuditLogger
{
    public function __construct(
        protected OwenAuditLogger $audit,
    ) {}

    public function stockReceived(int $movementId, array $context = []): void
    {
        $this->log('stock.received', 'stock_movement', $movementId, $context);
    }

    public function stockIssued(int $movementId, array $context = []): void
    {
        $this->log('stock.issued', 'stock_movement', $movementId, $context);
    }

    public function stockTransferred(int $movementId, array $context = []): void
    {
        $this->log('stock.transferred', 'stock_movement', $movementId, $context);
    }

    public function stockAdjusted(int $movementId, array $context = []): void
    {
        $this->log('stock.adjusted', 'stock_movement', $movementId, $context);
    }

    public function reservationCreated(int $reservationId, array $context = []): void
    {
        $this->log('reservation.created', 'stock_reservation', $reservationId, $context);
    }

    public function reservationAdjusted(int $reservationId, array $context = []): void
    {
        $this->log('reservation.adjusted', 'stock_reservation', $reservationId, $context);
    }

    public function reservationReleased(int $reservationId, array $context = []): void
    {
        $this->log('reservation.released', 'stock_reservation', $reservationId, $context);
    }

    public function offcutLogged(int $offcutId, array $context = []): void
    {
        $this->log('offcut.logged', 'offcut_piece', $offcutId, $context);
    }

    public function offcutAllocated(int $offcutId, array $context = []): void
    {
        $this->log('offcut.allocated', 'offcut_piece', $offcutId, $context);
    }

    public function offcutConsumed(int $offcutId, array $context = []): void
    {
        $this->log('offcut.consumed', 'offcut_piece', $offcutId, $context);
    }

    public function stockReturned(int $movementId, array $context = []): void
    {
        $this->log('stock.returned', 'stock_movement', $movementId, $context);
    }

    public function materialRequestCreated(int $requestId, array $context = []): void
    {
        $this->log('material_request.created', 'material_request', $requestId, $context);
    }

    public function materialRequestFulfilled(int $requestId, array $context = []): void
    {
        $this->log('material_request.fulfilled', 'material_request', $requestId, $context);
    }

    public function materialRequestRejected(int $requestId, array $context = []): void
    {
        $this->log('material_request.rejected', 'material_request', $requestId, $context);
    }

    public function toolIssued(int $issuanceId, array $context = []): void
    {
        $this->log('tool.issued', 'tool_issuance', $issuanceId, $context);
    }

    public function toolReplacementRequired(int $toolId, array $context = []): void
    {
        $this->log('tool.replacement_required', 'warehouse_tool', $toolId, $context);
    }

    public function masterDataUpdated(int $itemId, array $context = []): void
    {
        $this->log('master_data.updated', 'warehouse_item', $itemId, $context);
    }

    public function doorTypeUpdated(int $doorTypeId, array $context = []): void
    {
        $this->log('master_data.updated', 'door_type', $doorTypeId, $context);
    }

    public function shortageDetected(int $projectId, array $context = []): void
    {
        $this->log('warehouse.shortage_detected', 'project', $projectId, $context);
    }

    public function materialCheckPassed(int $projectId, array $context = []): void
    {
        $this->log('warehouse.material_check_passed', 'project', $projectId, $context);
    }

    public function materialsReady(int $projectId, array $context = []): void
    {
        $this->log('warehouse.materials_ready', 'project', $projectId, $context);
    }

    public function materialsReserved(int $projectId, array $context = []): void
    {
        $this->log('warehouse.materials_reserved', 'project', $projectId, $context);
    }

    public function materialsStagedForProduction(int $projectId, array $context = []): void
    {
        $this->log('warehouse.materials_staged_for_production', 'project', $projectId, $context);
    }

    public function fifoSequenceOverride(array $context = []): void
    {
        $this->log('fifo_sequence_override', 'stock_reservation', null, $context);
    }

    public function lowStockDetected(int $itemId, array $context = []): void
    {
        $this->log('warehouse.low_stock', 'warehouse_item', $itemId, $context);
    }

    public function grnShortageRecheck(int $projectId, array $context = []): void
    {
        $this->log('grn.shortage_recheck', 'project', $projectId, $context);
    }

    public function grnReservationFulfilled(int $projectId, array $context = []): void
    {
        $this->log('grn.reservation_fulfilled', 'project', $projectId, $context);
    }

    protected function log(string $action, string $entityType, ?int $entityId, array $context): void
    {
        $this->audit->log(
            module: 'warehouse',
            action: $action,
            entityType: $entityType,
            entityId: $entityId,
            newValues: $context !== [] ? $context : null,
        );
    }
}
