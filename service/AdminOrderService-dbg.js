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
    quoteOrderUpdate(orderId, items) {
      return this.invokeItemsChange("/QuoteOrderUpdate(...)", orderId, items);
    }
    updateOrderItems(orderId, items) {
      return this.invokeItemsChange("/UpdateOrderItems(...)", orderId, items);
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
    async invokeItemsChange(path, orderId, items) {
      const operation = this.adminModel.bindContext(path);
      operation.setParameter("OrderId", orderId);
      operation.setParameter("Items", this.toItemsInput(items));
      await operation.invoke();
      return operation.getBoundContext().getObject();
    }
    async invokeReturn(path, orderId, input) {
      const operation = this.adminModel.bindContext(path);
      operation.setParameter("OrderId", orderId);
      operation.setParameter("Return", {
        Reason: input.Reason,
        Items: input.Items.map(item => ({
          OrderItem_ID: item.OrderItemId,
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
