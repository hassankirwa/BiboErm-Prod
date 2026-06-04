import {
  listProductionOrders,
  type ProductionOrder,
  type ProductionStageValue,
} from "@/lib/api/production";

/**
 * Loads orders for queue pages using server-side stage filter (one request per stage).
 */
export async function loadOrdersForStages(
  stages: ProductionStageValue[],
  options: {
    assigned_to_me?: boolean;
    per_page?: number;
  } = {},
): Promise<ProductionOrder[]> {
  const perPage = options.per_page ?? 50;
  const responses = await Promise.all(
    stages.map((stage) =>
      listProductionOrders({
        stage,
        per_page: perPage,
        assigned_to_me: options.assigned_to_me,
      }),
    ),
  );

  const byId = new Map<number, ProductionOrder>();
  for (const res of responses) {
    for (const order of res.data) {
      if (order.status === "scheduled" || order.status === "in_progress") {
        byId.set(order.id, order);
      }
    }
  }

  return Array.from(byId.values()).sort((a, b) => a.fifo_position - b.fifo_position);
}
