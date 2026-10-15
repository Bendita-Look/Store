sap.ui.define(["sap/ui/core/Fragment", "sap/ui/model/json/JSONModel", "../../service/AdminOrderService", "../../model/formatter"], function (Fragment, JSONModel, __AdminOrderService, __formatter) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const AdminOrderService = _interopRequireDefault(__AdminOrderService);
  const DeliveryType = __AdminOrderService["DeliveryType"];
  const formatter = _interopRequireDefault(__formatter);
  const OrderStatus = __formatter["OrderStatus"];
  const FULL_SCREEN_MAX_WIDTH = 600;
  const PICKUP = "PICKUP";
  class WhatsappComposer {
    model = new JSONModel({
      message: "",
      phone: "",
      customer: ""
    });
    constructor(controller) {
      this.controller = controller;
    }
    async open(order) {
      const link = await this.trackingLink(order.ID);
      this.model.setData({
        message: this.compose(order, link),
        phone: order.CustomerPhone ?? "",
        customer: order.CustomerName ?? ""
      });
      const dialog = await this.getDialog();
      dialog.setStretch(window.innerWidth < FULL_SCREEN_MAX_WIDTH);
      dialog.open();
    }
    onSend = () => {
      const {
        message,
        phone
      } = this.model.getData();
      window.open(formatter.whatsappUrl(phone, message.trim()), "_blank");
      this.dialog?.close();
    };
    onCancel = () => {
      this.dialog?.close();
    };
    compose(order, link) {
      const store = this.controller.getStoreModel();
      const firstName = (order.CustomerName ?? "").trim().split(/\s+/)[0];
      const greeting = firstName ? this.text("waGreeting", [firstName, store.getProperty("/StoreName")]) : this.text("waGreetingAnonymous", [store.getProperty("/StoreName")]);
      const signature = store.getProperty("/WhatsappSignature")?.trim();
      return [greeting, ...this.body(order, link), signature].filter(paragraph => Boolean(paragraph)).join("\n\n");
    }
    body(order, link) {
      switch (order.Status) {
        case OrderStatus.OutForDelivery:
          return order.DeliveryType === DeliveryType.CustomerArranged ? this.pickedUp(order, link) : this.outForDelivery(order, link);
        case OrderStatus.Completed:
          return [this.text("waCompleted", [order.Number]), this.text("waCompletedLink", [this.storeUrl()]), this.text("waClosing")];
        case OrderStatus.Cancelled:
          return [this.text("waCancelled", [order.Number])];
        default:
          return [this.text("waService", [order.Number]), link ? this.text("waServiceLink", [link]) : undefined, this.text("waPaymentQuestion"), this.text(order.FulfillmentType === PICKUP ? "waShippingPickup" : "waShippingDelivery"), this.text("waClosing")];
      }
    }
    outForDelivery(order, link) {
      const details = [this.text("waDeliveryType", [this.controller.formatDeliveryType(order.DeliveryType)]), order.CourierName ? this.text("waCourier", [order.CourierName]) : undefined, order.VehiclePlate ? this.text("waPlate", [order.VehiclePlate]) : undefined, order.DeliveryNotes ? this.text("waNotes", [order.DeliveryNotes]) : undefined].filter(Boolean).join("\n");
      return [this.text("waOutForDelivery", [order.Number]), `${this.text("waDeliveryData")}\n${details}`, link ? this.text("waTrackLink", [link]) : undefined, this.text("waClosing")];
    }
    pickedUp(order, link) {
      return [this.text("waPickedUp", [order.Number]), order.CourierName ? this.text("waPickedUpBy", [order.CourierName]) : undefined, link ? this.text("waTrackLink", [link]) : undefined, this.text("waClosing")];
    }
    async trackingLink(orderId) {
      try {
        return (await new AdminOrderService(this.controller.getAdminModel()).trackingUrl(orderId)) ?? undefined;
      } catch {
        return undefined;
      }
    }
    storeUrl() {
      return this.controller.getStoreModel().getProperty("/StoreUrl") || `${window.location.origin}${window.location.pathname}`;
    }
    text(key, parameters) {
      return this.controller.getText(key, parameters);
    }
    async getDialog() {
      if (!this.dialog) {
        const view = this.controller.getView();
        this.dialog = await Fragment.load({
          id: view?.getId(),
          name: "apps.dflc.benditalook.view.fragments.WhatsappDialog",
          controller: this.controller
        });
        this.dialog.setModel(this.model, "whatsapp");
        view?.addDependent(this.dialog);
      }
      return this.dialog;
    }
  }
  return WhatsappComposer;
});
//# sourceMappingURL=WhatsappComposer-dbg.js.map
