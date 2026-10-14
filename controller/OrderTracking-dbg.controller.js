sap.ui.define(["sap/ui/model/json/JSONModel", "./BaseController", "../service/OrderService", "../service/AdminOrderService", "../model/formatter"], function (JSONModel, __BaseController, __OrderService, ___service_AdminOrderService, ___model_formatter) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const BaseController = _interopRequireDefault(__BaseController);
  const OrderService = _interopRequireDefault(__OrderService);
  const FulfillmentType = __OrderService["FulfillmentType"];
  const DeliveryType = ___service_AdminOrderService["DeliveryType"];
  const OrderStatus = ___model_formatter["OrderStatus"];
  const STEPS = [OrderStatus.New, OrderStatus.InService, OrderStatus.OutForDelivery, OrderStatus.Completed];

  /**
   * @namespace apps.dflc.benditalook.controller
   */
  const OrderTracking = BaseController.extend("apps.dflc.benditalook.controller.OrderTracking", {
    onInit: function _onInit() {
      this.trackingModel = new JSONModel({
        loaded: false,
        order: null,
        steps: [],
        cancelled: false
      });
      this.getView()?.setModel(this.trackingModel, "tracking");
      this.getRouter().getRoute("order")?.attachPatternMatched(event => this.onRouteMatched(event));
    },
    onContactWhatsapp: function _onContactWhatsapp() {
      const orderNumber = this.trackingModel.getProperty("/order/Number");
      const message = this.getText("whatsappOrderMessage", [orderNumber]);
      this.openWhatsapp(message);
    },
    courierLineKey: function _courierLineKey(customerArranged) {
      return this.getText(customerArranged ? "pickedUpByLine" : "courierLine");
    },
    onItemPress: function _onItemPress(event) {
      const productId = event.getSource().getBindingContext("tracking")?.getProperty("ProductId");
      if (productId) {
        this.navTo("product", {
          productId
        });
      }
    },
    onContinueShopping: function _onContinueShopping() {
      this.navTo("catalog");
    },
    onRouteMatched: async function _onRouteMatched(event) {
      const {
        orderNumber,
        accessCode
      } = event.getParameter("arguments");
      this.trackingModel.setProperty("/loaded", false);
      try {
        const order = await this.runBusy(() => new OrderService(this.getCatalogModel()).trackOrder(Number(orderNumber), accessCode));
        this.trackingModel.setData({
          loaded: true,
          order,
          cancelled: order.Status === OrderStatus.Cancelled,
          isPickup: order.FulfillmentType === FulfillmentType.Pickup,
          hasDelivery: !!order.DeliveryType,
          customerArranged: order.DeliveryType === DeliveryType.CustomerArranged,
          deliveryTypeText: this.formatDeliveryType(order.DeliveryType),
          steps: this.buildSteps(order.Status, !!order.DeliveryType, order.FulfillmentType === FulfillmentType.Pickup)
        });
      } catch (error) {
        this.handleError(error, "orderNotFound");
      }
    },
    buildSteps: function _buildSteps(status, hasDelivery, isPickup) {
      const showDeliveryStep = !isPickup && (hasDelivery || status !== OrderStatus.Completed);
      const steps = STEPS.filter(step => step !== OrderStatus.OutForDelivery || showDeliveryStep);
      const currentIndex = steps.indexOf(status);
      return steps.map((step, index) => ({
        text: this.formatStatus(step),
        icon: index <= currentIndex ? "sap-icon://sys-enter-2" : "sap-icon://circle-task",
        done: index <= currentIndex
      }));
    }
  });
  return OrderTracking;
});
//# sourceMappingURL=OrderTracking-dbg.controller.js.map
