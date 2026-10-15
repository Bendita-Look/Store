sap.ui.define([], function () {
  "use strict";

  var DeliveryType = /*#__PURE__*/function (DeliveryType) {
    DeliveryType["UberFlash"] = "UBER_FLASH";
    DeliveryType["LocalCourier"] = "LOCAL_COURIER";
    DeliveryType["CustomerArranged"] = "CUSTOMER_ARRANGED";
    return DeliveryType;
  }(DeliveryType || {});
  class AdminOrderService {
    constructor(adminModel) {
      this.adminModel = adminModel;
    }
    async registerStoreSale(sale) {
      const operation = this.adminModel.bindContext("/RegisterStoreSale(...)");
      operation.setParameter("Sale", {
        ...sale,
        Items: this.toItemsInput(sale.Items)
      });
      await operation.invoke();
      return operation.getBoundContext().getObject();
    }
    quoteOrderUpdate(orderId, change) {
      return this.invokeItemsChange("/QuoteOrderUpdate(...)", orderId, change);
    }
    updateOrderItems(orderId, change) {
      return this.invokeItemsChange("/UpdateOrderItems(...)", orderId, change);
    }
    quoteReturn(orderId, input) {
      return this.invokeReturn("/QuoteOrderReturn(...)", orderId, input);
    }
    registerReturn(orderId, input) {
      return this.invokeReturn("/RegisterOrderReturn(...)", orderId, input);
    }
    async changeStatus(orderId, status, delivery) {
      const operation = this.adminModel.bindContext("/ChangeOrderStatus(...)");
      operation.setParameter("OrderId", orderId);
      operation.setParameter("Status", status);
      if (delivery) {
        operation.setParameter("Delivery", delivery);
      }
      await operation.invoke();
    }
    async invokeItemsChange(path, orderId, change) {
      const operation = this.adminModel.bindContext(path);
      operation.setParameter("OrderId", orderId);
      operation.setParameter("Change", {
        ...change,
        Items: this.toItemsInput(change.Items)
      });
      await operation.invoke();
      return operation.getBoundContext().getObject();
    }
    async invokeReturn(path, orderId, input) {
      const operation = this.adminModel.bindContext(path);
      operation.setParameter("OrderId", orderId);
      operation.setParameter("Return", {
        Reason: input.Reason,
        Items: input.Items.map(item => ({
          OrderItem_ID: item.OrderItemId ?? null,
          Replacement_ID: item.ReplacementId ?? null,
          Quantity: item.Quantity,
          Restock: item.Restock
        })),
        Replacements: this.toItemsInput(input.Replacements)
      });
      await operation.invoke();
      return operation.getBoundContext().getObject();
    }
    toItemsInput(items) {
      return items.map(item => ({
        Variant_ID: item.VariantId,
        Quantity: item.Quantity
      }));
    }
  }
  AdminOrderService.DeliveryType = DeliveryType;
  return AdminOrderService;
});
//# sourceMappingURL=AdminOrderService-dbg.js.map
