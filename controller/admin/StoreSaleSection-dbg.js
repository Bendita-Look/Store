sap.ui.define(["sap/ui/core/Fragment", "sap/ui/model/json/JSONModel", "../../service/AdminOrderService", "../../service/OrderService", "./OrderLines"], function (Fragment, JSONModel, __AdminOrderService, __OrderService, __OrderLines) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const AdminOrderService = _interopRequireDefault(__AdminOrderService);
  const OrderService = _interopRequireDefault(__OrderService);
  const CouponStatus = __OrderService["CouponStatus"];
  const OrderLines = _interopRequireDefault(__OrderLines);
  class StoreSaleSection {
    model = new JSONModel(this.emptyState());
    lines = new OrderLines(this.model, "sale");
    constructor(controller) {
      this.controller = controller;
    }
    onOpenStoreSale = async () => {
      this.model.setData(this.emptyState());
      const dialog = await this.getDialog();
      dialog.open();
    };
    onCloseStoreSale = () => {
      this.dialog?.close();
    };
    onAddLine = async () => {
      const variant = await this.controller.productPicker.pickVariant();
      if (variant) {
        this.lines.add(variant, this.controller.productPicker.pickedQuantity);
        void this.refreshQuote();
      }
    };
    onLineQuantityChange = event => {
      this.lines.changeQuantity(event);
      void this.refreshQuote();
    };
    onRemoveLine = event => {
      this.lines.remove(event);
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
        Items: this.lines.toItems()
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
        const quote = await new OrderService(this.controller.getCatalogModel()).quoteOrder(this.lines.toItems(), state.couponCode);
        this.model.setProperty("/quote", quote);
      } catch (error) {
        this.model.setProperty("/quote", null);
        this.controller.handleError(error, "quoteError");
      }
    }
    getState() {
      return this.model.getData();
    }
    emptyState() {
      return {
        lines: [],
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
