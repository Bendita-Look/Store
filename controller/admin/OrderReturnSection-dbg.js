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
  const REPLACEMENT_KIND = "REPLACEMENT";
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
          ReplacementId: row.ReplacementId,
          Quantity: row.Quantity,
          Restock: row.Restock
        })),
        Replacements: this.lines.toItems()
      };
    }
    buildRows(order) {
      const entries = (order.Returns ?? []).flatMap(orderReturn => orderReturn.Items);
      const returned = new Map();
      entries.filter(entry => entry.Kind === RETURNED_KIND).forEach(entry => {
        const key = entry.OrderItem_ID ?? entry.Replacement_ID;
        returned.set(key, (returned.get(key) ?? 0) + entry.Quantity);
      });
      const orderRows = order.Items.map(item => this.row(item, item.Quantity - (returned.get(item.ID) ?? 0), {
        OrderItemId: item.ID
      }));
      const replacementRows = entries.filter(entry => entry.Kind === REPLACEMENT_KIND).map(entry => this.row(entry, entry.Quantity - (returned.get(entry.ID) ?? 0), {
        ReplacementId: entry.ID
      }, true));
      return [...orderRows, ...replacementRows];
    }
    row(item, available, source, fromExchange = false) {
      const description = [item.ProductName, item.ColorName, item.Size].filter(Boolean).join(" / ");
      return {
        ...source,
        ImageId: item.ImageId,
        Description: fromExchange ? this.controller.getText("returnFromExchange", [description]) : description,
        Purchased: item.Quantity,
        Available: available,
        Quantity: 0,
        Restock: true
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
