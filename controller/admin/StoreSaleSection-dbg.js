sap.ui.define(["sap/ui/core/Fragment", "sap/ui/model/json/JSONModel", "../../service/AdminOrderService", "../../service/OrderService"], function (Fragment, JSONModel, __AdminOrderService, __OrderService) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const AdminOrderService = _interopRequireDefault(__AdminOrderService);
  const OrderService = _interopRequireDefault(__OrderService);
  const CouponStatus = __OrderService["CouponStatus"];
  class StoreSaleSection {
    model = new JSONModel(this.emptyState());
    constructor(controller) {
      this.controller = controller;
    }
    onOpenStoreSale = async () => {
      this.model.setData(this.emptyState());
      const dialog = await this.getDialog();
      this.controller.byControlId("saleVariantCombo").getBinding("items")?.refresh();
      dialog.open();
    };
    onCloseStoreSale = () => {
      this.dialog?.close();
    };
    onAddLine = () => {
      const combo = this.controller.byControlId("saleVariantCombo");
      const variant = combo.getSelectedItem()?.getBindingContext()?.getObject();
      if (!variant) {
        this.controller.showToast("saleSelectProduct");
        return;
      }
      const state = this.getState();
      const quantity = Math.max(1, Number(state.quantity) || 1);
      const existing = state.lines.find(line => line.VariantId === variant.ID);
      if (existing) {
        existing.Quantity = Math.min(existing.Quantity + quantity, variant.Stock);
      } else {
        state.lines.push({
          VariantId: variant.ID,
          Description: [variant.Product.Name, variant.Color?.Name, variant.Size].filter(Boolean).join(" / "),
          UnitPrice: Number(variant.Product.Price),
          Quantity: Math.min(quantity, variant.Stock),
          Stock: variant.Stock
        });
      }
      this.model.setProperty("/lines", [...state.lines]);
      this.model.setProperty("/selectedVariantId", "");
      this.model.setProperty("/quantity", 1);
      void this.refreshQuote();
    };
    onLineQuantityChange = event => {
      const variantId = this.variantIdOf(event);
      const quantity = Number(event.getParameter("value"));
      this.model.setProperty("/lines", this.getState().lines.map(line => line.VariantId === variantId ? {
        ...line,
        Quantity: quantity
      } : line));
      void this.refreshQuote();
    };
    onRemoveLine = event => {
      const variantId = this.variantIdOf(event);
      this.model.setProperty("/lines", this.getState().lines.filter(line => line.VariantId !== variantId));
      void this.refreshQuote();
    };
    onApplySaleCoupon = () => {
      this.model.setProperty("/couponCode", this.getState().couponInput.trim().toUpperCase());
      void this.refreshQuote();
    };
    onConfirmStoreSale = async () => {
      const state = this.getState();
      if (!state.lines.length) {
        this.controller.showToast("saleNoItems");
        return;
      }
      const sale = {
        ...state.customer,
        CouponCode: state.quote?.CouponStatus === CouponStatus.Applied ? state.couponCode : "",
        Items: state.lines.map(line => ({
          VariantId: line.VariantId,
          Quantity: line.Quantity
        }))
      };
      try {
        const order = await this.controller.runBusy(() => new AdminOrderService(this.controller.getAdminModel()).registerStoreSale(sale));
        this.dialog?.close();
        this.controller.showToast("saleRegistered", [order.Number]);
        this.controller.orders.refresh();
      } catch (error) {
        this.controller.handleError(error, "saleRegisterError");
        void this.refreshQuote();
      }
    };
    async refreshQuote() {
      const state = this.getState();
      if (!state.lines.length) {
        this.model.setProperty("/quote", null);
        return;
      }
      try {
        const quote = await new OrderService(this.controller.getCatalogModel()).quoteOrder(state.lines.map(line => ({
          VariantId: line.VariantId,
          Quantity: line.Quantity
        })), state.couponCode);
        this.model.setProperty("/quote", quote);
      } catch (error) {
        this.model.setProperty("/quote", null);
        this.controller.handleError(error, "quoteError");
      }
    }
    getState() {
      return this.model.getData();
    }
    variantIdOf(event) {
      return event.getSource().getBindingContext("sale")?.getProperty("VariantId");
    }
    emptyState() {
      return {
        lines: [],
        selectedVariantId: "",
        quantity: 1,
        customer: {
          CustomerName: "",
          CustomerEmail: "",
          CustomerPhone: "",
          Notes: ""
        },
        couponInput: "",
        couponCode: "",
        quote: null
      };
    }
    async getDialog() {
      if (!this.dialog) {
        const view = this.controller.getView();
        this.dialog = await Fragment.load({
          id: view?.getId(),
          name: "apps.dflc.benditalook.view.fragments.StoreSaleDialog",
          controller: this.controller
        });
        this.dialog.setModel(this.model, "sale");
        view?.addDependent(this.dialog);
      }
      return this.dialog;
    }
  }
  return StoreSaleSection;
});
//# sourceMappingURL=StoreSaleSection-dbg.js.map
