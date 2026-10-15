sap.ui.define(["sap/ui/core/Fragment", "sap/ui/model/Filter", "sap/ui/model/FilterOperator", "sap/ui/model/json/JSONModel", "../../service/AdminOrderService", "../../model/formatter"], function (Fragment, Filter, FilterOperator, JSONModel, __AdminOrderService, ____model_formatter) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const AdminOrderService = _interopRequireDefault(__AdminOrderService);
  const DeliveryType = __AdminOrderService["DeliveryType"];
  const OrderStatus = ____model_formatter["OrderStatus"];
  const ALL_STATUSES = "ALL";
  const ALL = "ALL";
  const SEARCH_DELAY = 300;
  const DIGITS_ONLY = /^\d+$/;
  const FULL_SCREEN_MAX_WIDTH = 600;
  const ORDER_EXPAND = "Items,Promotions,Returns($expand=Items;$orderby=createdAt)";
  const CHANGE_PARAMETERS = {
    $select: "ID,Number,CouponCode",
    $expand: "Items($select=ID,Variant_ID,ImageId,ProductName,ColorName,Size,Quantity,UnitPrice),Returns($select=ID;$expand=Items($select=ID,Kind,OrderItem_ID,Replacement_ID,ImageId,ProductName,ColorName,Size,Quantity)),Promotions($select=ID,CouponCode)"
  };
  class OrdersSection {
    deliveryModel = new JSONModel(this.emptyDelivery());
    constructor(controller) {
      this.controller = controller;
    }
    filterModel = new JSONModel(this.emptyFilters());
    onStatusPress = event => {
      this.filterModel.setProperty("/status", event.getSource().data("status") ?? ALL_STATUSES);
      this.applyFilters();
    };
    onSearch = () => {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => this.applyFilters(), SEARCH_DELAY);
    };
    onFilterChange = () => {
      this.applyFilters();
    };
    onClearFilters = () => {
      this.filterModel.setData({
        ...this.emptyFilters(),
        status: this.filterModel.getProperty("/status")
      });
      this.applyFilters();
    };
    onRefresh = () => {
      this.refresh();
    };
    refresh() {
      this.getTableBinding()?.refresh();
    }
    refreshOpenOrder() {
      this.dialog?.getElementBinding()?.refresh();
      this.refresh();
    }
    onEditItems = async () => {
      const order = await this.loadChangeableOrder();
      if (order) {
        await this.controller.orderEdit.open(order);
      }
    };
    onRegisterReturn = async () => {
      const order = await this.loadChangeableOrder();
      if (order) {
        await this.controller.orderReturn.open(order);
      }
    };
    onOrderPress = async event => {
      const context = event.getSource().getBindingContext();
      const dialog = await this.getDialog();
      dialog.bindElement({
        path: context.getPath(),
        parameters: {
          $expand: ORDER_EXPAND
        }
      });
      dialog.setStretch(window.innerWidth < FULL_SCREEN_MAX_WIDTH);
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
    onReturnDetails = async event => {
      const context = event.getSource().getBindingContext();
      if (!this.returnDetailsDialog) {
        this.returnDetailsDialog = await this.loadFragment("ReturnDetailsDialog");
      }
      this.returnDetailsDialog.bindElement({
        path: context.getPath(),
        parameters: {
          $expand: "Items"
        }
      });
      this.returnDetailsDialog.setStretch(window.innerWidth < FULL_SCREEN_MAX_WIDTH);
      this.returnDetailsDialog.open();
    };
    onReturnItemPress = event => {
      const productId = event.getSource().getBindingContext()?.getProperty("Product_ID");
      if (productId) {
        this.onCloseReturnDetails();
        this.onCloseDialog();
        this.controller.navTo("product", {
          productId
        });
      }
    };
    onCloseReturnDetails = () => {
      this.returnDetailsDialog?.close();
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
      void this.controller.whatsapp.open(this.getDialogOrder());
    };
    async changeStatus(status, successKey, delivery) {
      const order = this.getDialogOrder();
      try {
        await this.controller.runBusy(() => new AdminOrderService(this.controller.getAdminModel()).changeStatus(order.ID, status, delivery));
        this.controller.showToast(successKey, [order.Number]);
        this.refreshOpenOrder();
        return true;
      } catch (error) {
        this.controller.handleError(error, "orderStatusError");
        return false;
      }
    }
    async loadChangeableOrder() {
      const path = this.dialog?.getBindingContext()?.getPath();
      try {
        return await this.controller.runBusy(() => this.controller.getAdminModel().bindContext(path, undefined, CHANGE_PARAMETERS).requestObject());
      } catch (error) {
        this.controller.handleError(error, "orderLoadError");
        return undefined;
      }
    }
    applyFilters() {
      const criteria = this.filterModel.getData();
      const filters = [];
      const search = criteria.search.trim();
      if (criteria.status !== ALL_STATUSES) {
        filters.push(new Filter("Status", FilterOperator.EQ, criteria.status));
      }
      if (search) {
        filters.push(this.searchFilter(search));
      }
      if (criteria.channel !== ALL) {
        filters.push(new Filter("Channel", FilterOperator.EQ, criteria.channel));
      }
      if (criteria.fulfillment !== ALL) {
        filters.push(new Filter("FulfillmentType", FilterOperator.EQ, criteria.fulfillment));
      }
      if (criteria.from) {
        filters.push(new Filter("createdAt", FilterOperator.GE, this.startOfDay(criteria.from).toISOString()));
      }
      if (criteria.to) {
        filters.push(new Filter("createdAt", FilterOperator.LT, this.startOfDay(criteria.to, 1).toISOString()));
      }
      this.getTableBinding().filter(filters.length ? new Filter({
        filters,
        and: true
      }) : []);
    }
    searchFilter(search) {
      const text = (path, value = search) => new Filter({
        path,
        operator: FilterOperator.Contains,
        value1: value,
        caseSensitive: false
      });
      const alternatives = [text("CustomerName"), text("CustomerEmail")];
      const digits = search.replace(/\D/g, "");
      if (digits) {
        alternatives.push(text("CustomerPhone", digits));
      }
      if (DIGITS_ONLY.test(search)) {
        alternatives.push(new Filter("Number", FilterOperator.EQ, Number(search)));
      }
      return new Filter({
        filters: alternatives,
        and: false
      });
    }
    startOfDay(date, addDays = 0) {
      return new Date(date.getFullYear(), date.getMonth(), date.getDate() + addDays);
    }
    emptyFilters() {
      return {
        status: ALL_STATUSES,
        search: "",
        channel: ALL,
        fulfillment: ALL,
        from: null,
        to: null
      };
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
