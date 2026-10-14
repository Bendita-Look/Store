sap.ui.define(["sap/ui/core/Fragment", "sap/ui/model/json/JSONModel", "../../service/AdminOrderService", "../../model/formatter", "./OrderLines"], function (Fragment, JSONModel, __AdminOrderService, __formatter, __OrderLines) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const AdminOrderService = _interopRequireDefault(__AdminOrderService);
  const formatter = _interopRequireDefault(__formatter);
  const OrderLines = _interopRequireDefault(__OrderLines);
  const FULL_SCREEN_MAX_WIDTH = 600;
  const RETURNED_KIND = "RETURNED";
  class OrderReturnSection {
    model = new JSONModel(this.emptyState());
    lines = new OrderLines(this.model, "return");
    constructor(controller) {
      this.controller = controller;
    }
    async open(order) {
      this.model.setData({
        ...this.emptyState(),
        orderId: order.ID,
        number: order.Number,
        rows: this.buildRows(order)
      });
      const dialog = await this.getDialog();
      dialog.setStretch(window.innerWidth < FULL_SCREEN_MAX_WIDTH);
      dialog.open();
    }
    onClose = () => {
      this.dialog?.close();
    };
    onReturnQuantityChange = () => {
      void this.refreshQuote();
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
    onConfirm = async () => {
      const state = this.getState();
      const input = this.buildInput();
      if (!input.Items.length) {
        this.controller.showToast("returnSelectItems");
        return;
      }
      try {
        await this.controller.runBusy(() => this.service().registerReturn(state.orderId, input));
        this.dialog?.close();
        this.controller.showToast("returnRegistered", [state.number]);
        this.controller.orders.refreshOpenOrder();
      } catch (error) {
        this.controller.handleError(error, "returnError");
        void this.refreshQuote();
      }
    };
    async refreshQuote() {
      const input = this.buildInput();
      if (!input.Items.length) {
        this.setQuote(null);
        return;
      }
      try {
        this.setQuote(await this.service().quoteReturn(this.getState().orderId, input));
      } catch (error) {
        this.setQuote(null);
        this.controller.handleError(error, "quoteError");
      }
    }
    setQuote(quote) {
      this.model.setProperty("/quote", quote);
      this.model.setProperty("/balanceText", quote ? this.balanceText(Number(quote.BalanceAmount)) : "");
    }
    balanceText(balance) {
      if (!balance) {
        return this.controller.getText("balanceEven");
      }
      return this.controller.getText(balance > 0 ? "balanceToPay" : "balanceToRefund", [formatter.currency(Math.abs(balance))]);
    }
    buildInput() {
      const state = this.getState();
      return {
        Reason: state.reason.trim(),
        Items: state.rows.filter(row => row.Quantity > 0).map(row => ({
          OrderItemId: row.OrderItemId,
          Quantity: row.Quantity,
          Restock: row.Restock
        })),
        Replacements: this.lines.toItems()
      };
    }
    buildRows(order) {
      const returned = new Map();
      (order.Returns ?? []).flatMap(orderReturn => orderReturn.Items).filter(item => item.Kind === RETURNED_KIND && item.OrderItem_ID).forEach(item => returned.set(item.OrderItem_ID, (returned.get(item.OrderItem_ID) ?? 0) + item.Quantity));
      return order.Items.map(item => ({
        OrderItemId: item.ID,
        ImageId: item.ImageId,
        Description: [item.ProductName, item.ColorName, item.Size].filter(Boolean).join(" / "),
        Purchased: item.Quantity,
        Available: item.Quantity - (returned.get(item.ID) ?? 0),
        Quantity: 0,
        Restock: true
      }));
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
        rows: [],
        reason: "",
        lines: [],
        quote: null,
        balanceText: ""
      };
    }
    async getDialog() {
      if (!this.dialog) {
        const view = this.controller.getView();
        this.dialog = await Fragment.load({
          id: view?.getId(),
          name: "apps.dflc.benditalook.view.fragments.OrderReturnDialog",
          controller: this.controller
        });
        this.dialog.setModel(this.model, "return");
        view?.addDependent(this.dialog);
      }
      return this.dialog;
    }
  }
  return OrderReturnSection;
});
//# sourceMappingURL=OrderReturnSection-dbg.js.map
