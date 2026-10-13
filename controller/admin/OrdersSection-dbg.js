sap.ui.define(["sap/ui/core/Fragment", "sap/ui/model/Filter", "sap/ui/model/FilterOperator", "sap/ui/model/json/JSONModel", "../../service/AdminOrderService", "../../model/formatter"], function (Fragment, Filter, FilterOperator, JSONModel, __AdminOrderService, __formatter) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const AdminOrderService = _interopRequireDefault(__AdminOrderService);
  const DeliveryType = __AdminOrderService["DeliveryType"];
  const formatter = _interopRequireDefault(__formatter);
  const OrderStatus = __formatter["OrderStatus"];
  const ALL_STATUSES = "ALL";
  class OrdersSection {
    deliveryModel = new JSONModel(this.emptyDelivery());
    constructor(controller) {
      this.controller = controller;
    }
    onStatusFilter = event => {
      const status = event.getParameter("item")?.getKey() ?? ALL_STATUSES;
      const filters = status === ALL_STATUSES ? [] : [new Filter("Status", FilterOperator.EQ, status)];
      this.getTableBinding().filter(filters);
    };
    onRefresh = () => {
      this.refresh();
    };
    refresh() {
      this.getTableBinding()?.refresh();
    }
    onOrderPress = async event => {
      const context = event.getSource().getBindingContext();
      const dialog = await this.getDialog();
      dialog.bindElement({
        path: context.getPath(),
        parameters: {
          $expand: "Items,Promotions"
        }
      });
      dialog.open();
    };
    onItemPress = event => {
      const productId = event.getSource().getBindingContext()?.getProperty("Product_ID");
      if (productId) {
        this.onCloseDialog();
        this.controller.navTo("product", {
          productId
        });
      }
    };
    onCloseDialog = () => {
      this.dialog?.close();
    };
    onStartService = () => this.changeStatus(OrderStatus.InService, "orderStatusChanged");
    onComplete = () => this.changeStatus(OrderStatus.Completed, "orderStatusChanged");
    onCancel = async () => {
      if (await this.controller.confirm("confirmCancelOrder", [this.getDialogOrder().Number])) {
        await this.changeStatus(OrderStatus.Cancelled, "orderCancelled");
      }
    };
    onOpenDeliveryDialog = async () => {
      this.deliveryModel.setData(this.emptyDelivery());
      (await this.getDeliveryDialog()).open();
    };
    onCloseDeliveryDialog = () => {
      this.deliveryDialog?.close();
    };
    onConfirmDelivery = async () => {
      const delivery = this.deliveryModel.getData();
      if (await this.changeStatus(OrderStatus.OutForDelivery, "orderStatusChanged", delivery)) {
        this.deliveryDialog?.close();
      }
    };
    onWhatsapp = () => {
      const order = this.getDialogOrder();
      const message = this.controller.getText("whatsappCustomerMessage", [order.CustomerName, order.Number]);
      window.open(formatter.whatsappUrl(order.CustomerPhone, message), "_blank");
    };
    async changeStatus(status, successKey, delivery) {
      const order = this.getDialogOrder();
      try {
        await this.controller.runBusy(() => new AdminOrderService(this.controller.getAdminModel()).changeStatus(order.ID, status, delivery));
        this.controller.showToast(successKey, [order.Number]);
        this.dialog?.getElementBinding()?.refresh();
        this.getTableBinding().refresh();
        return true;
      } catch (error) {
        this.controller.handleError(error, "orderStatusError");
        return false;
      }
    }
    emptyDelivery() {
      return {
        DeliveryType: DeliveryType.UberFlash,
        CourierName: "",
        VehiclePlate: "",
        DeliveryNotes: ""
      };
    }
    getDialogOrder() {
      return this.dialog?.getBindingContext()?.getObject();
    }
    getTableBinding() {
      return this.controller.byControlId("ordersTable").getBinding("items");
    }
    async getDialog() {
      if (!this.dialog) {
        this.dialog = await this.loadFragment("OrderDialog");
      }
      return this.dialog;
    }
    async getDeliveryDialog() {
      if (!this.deliveryDialog) {
        this.deliveryDialog = await this.loadFragment("DeliveryDialog");
        this.deliveryDialog.setModel(this.deliveryModel, "delivery");
      }
      return this.deliveryDialog;
    }
    async loadFragment(name) {
      const view = this.controller.getView();
      const dialog = await Fragment.load({
        id: view?.getId(),
        name: `apps.dflc.benditalook.view.fragments.${name}`,
        controller: this.controller
      });
      view?.addDependent(dialog);
      return dialog;
    }
  }
  return OrdersSection;
});
//# sourceMappingURL=OrdersSection-dbg.js.map
