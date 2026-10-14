sap.ui.define(["sap/ui/core/Fragment", "sap/ui/model/json/JSONModel", "../../service/AdminOrderService", "./OrderLines"], function (Fragment, JSONModel, __AdminOrderService, __OrderLines) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const AdminOrderService = _interopRequireDefault(__AdminOrderService);
  const OrderLines = _interopRequireDefault(__OrderLines);
  const FULL_SCREEN_MAX_WIDTH = 600;
  class OrderEditSection {
    model = new JSONModel(this.emptyState());
    lines = new OrderLines(this.model, "edit");
    constructor(controller) {
      this.controller = controller;
    }
    async open(order) {
      this.model.setData({
        ...this.emptyState(),
        orderId: order.ID,
        number: order.Number,
        couponInput: order.CouponCode ?? "",
        couponCode: order.CouponCode ?? "",
        applyPromotions: (order.Promotions ?? []).some(promotion => !promotion.CouponCode),
        lines: order.Items.map(item => ({
          VariantId: item.Variant_ID,
          Description: [item.ProductName, item.ColorName, item.Size].filter(Boolean).join(" / "),
          UnitPrice: Number(item.UnitPrice),
          Quantity: item.Quantity,
          Stock: null
        }))
      });
      const dialog = await this.getDialog();
      dialog.setStretch(window.innerWidth < FULL_SCREEN_MAX_WIDTH);
      dialog.open();
      void this.refreshQuote();
    }
    onClose = () => {
      this.dialog?.close();
    };
    onAddLine = async () => {
      const variant = await this.controller.productPicker.pickVariant();
      if (variant) {
        this.lines.add(variant, this.controller.productPicker.pickedQuantity);
        void this.refreshQuote();
      }
    };
    onApplyCoupon = () => {
      this.model.setProperty("/couponCode", this.getState().couponInput.trim().toUpperCase());
      void this.refreshQuote();
    };
    onPromotionsChange = () => {
      void this.refreshQuote();
    };
    onLineQuantityChange = event => {
      this.lines.changeQuantity(event);
      void this.refreshQuote();
    };
    onRemoveLine = event => {
      this.lines.remove(event);
      void this.refreshQuote();
    };
    onConfirm = async () => {
      const state = this.getState();
      if (!state.lines.length) {
        this.controller.showToast("editOrderNoItems");
        return;
      }
      try {
        await this.controller.runBusy(() => this.service().updateOrderItems(state.orderId, this.change()));
        this.dialog?.close();
        this.controller.showToast("orderItemsUpdated", [state.number]);
        this.controller.orders.refreshOpenOrder();
      } catch (error) {
        this.controller.handleError(error, "orderEditError");
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
        this.model.setProperty("/quote", await this.service().quoteOrderUpdate(state.orderId, this.change()));
      } catch (error) {
        this.model.setProperty("/quote", null);
        this.controller.handleError(error, "quoteError");
      }
    }
    change() {
      const state = this.getState();
      return {
        Items: this.lines.toItems(),
        CouponCode: state.couponCode,
        ApplyPromotions: state.applyPromotions
      };
    }
    service() {
      return new AdminOrderService(this.controller.getAdminModel());
    }
    getState() {
      return this.model.getData();
    }
    emptyState() {
      return {
        orderId: "",
        number: 0,
        lines: [],
        couponInput: "",
        couponCode: "",
        applyPromotions: false,
        quote: null
      };
    }
    async getDialog() {
      if (!this.dialog) {
        const view = this.controller.getView();
        this.dialog = await Fragment.load({
          id: view?.getId(),
          name: "apps.dflc.benditalook.view.fragments.OrderEditDialog",
          controller: this.controller
        });
        this.dialog.setModel(this.model, "edit");
        view?.addDependent(this.dialog);
      }
      return this.dialog;
    }
  }
  return OrderEditSection;
});
//# sourceMappingURL=OrderEditSection-dbg.js.map
