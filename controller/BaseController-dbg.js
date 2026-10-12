sap.ui.define(["sap/ui/core/mvc/Controller", "sap/ui/core/UIComponent", "sap/ui/core/routing/History", "sap/m/MessageBox", "sap/m/MessageToast", "sap/m/InstanceManager", "../model/formatter", "../util/feedback", "../util/http", "../auth/AuthenticationService"], function (Controller, UIComponent, History, MessageBox, MessageToast, InstanceManager, __formatter, ___util_feedback, ___util_http, ___auth_AuthenticationService) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const formatter = _interopRequireDefault(__formatter);
  const getBackendErrorMessage = ___util_feedback["getBackendErrorMessage"];
  const isAuthenticationError = ___util_http["isAuthenticationError"];
  const isBackendUnavailableError = ___util_http["isBackendUnavailableError"];
  const isSessionExpiredError = ___util_http["isSessionExpiredError"];
  const AuthenticationService = ___auth_AuthenticationService["AuthenticationService"];
  /**
   * @namespace apps.dflc.benditalook.controller
   */
  const BaseController = Controller.extend("apps.dflc.benditalook.controller.BaseController", {
    constructor: function constructor() {
      Controller.prototype.constructor.apply(this, arguments);
      this.formatter = formatter;
    },
    getRouter: function _getRouter() {
      return UIComponent.getRouterFor(this);
    },
    getAppComponent: function _getAppComponent() {
      return this.getOwnerComponent();
    },
    navTo: function _navTo(route, parameters, replace) {
      this.getRouter().navTo(route, parameters, replace);
    },
    onNavBack: function _onNavBack() {
      if (History.getInstance().getPreviousHash() !== undefined) {
        window.history.go(-1);
        return;
      }
      this.navTo("catalog", {}, true);
    },
    onGoHome: function _onGoHome() {
      this.navTo("catalog");
    },
    onOpenCart: function _onOpenCart() {
      this.navTo("cart");
    },
    formatStatus: function _formatStatus(status) {
      return status ? this.getText(`orderStatus.${status}`) : "";
    },
    formatDeliveryType: function _formatDeliveryType(deliveryType) {
      return deliveryType ? this.getText(`deliveryType.${deliveryType}`) : "";
    },
    formatChannel: function _formatChannel(channel) {
      return channel ? this.getText(`channel.${channel}`) : "";
    },
    formatFulfillment: function _formatFulfillment(fulfillment) {
      return fulfillment ? this.getText(`fulfillment.${fulfillment}`) : "";
    },
    formatReward: function _formatReward(rewardType, rewardValue, gift, maxDiscount) {
      if (!rewardType) {
        return "";
      }
      const value = Number(rewardValue ?? 0);
      const details = {
        PERCENT: this.getText("rewardSummary.PERCENT", [value]),
        FIXED: this.getText("rewardSummary.FIXED", [this.formatter.currency(value)]),
        GIFT: this.getText("rewardSummary.GIFT", [gift ?? ""]),
        CHEAPEST_FREE: this.getText("rewardSummary.CHEAPEST_FREE")
      };
      const summary = details[rewardType] ?? "";
      return maxDiscount ? this.getText("rewardSummaryLimit", [summary, this.formatter.currency(Number(maxDiscount))]) : summary;
    },
    formatCouponUsage: function _formatCouponUsage(couponCode, usedCount, maxUses) {
      if (!couponCode) {
        return this.getText("automaticPromotion");
      }
      return maxUses ? this.getText("couponUsageLimited", [couponCode, usedCount ?? 0, maxUses]) : this.getText("couponUsage", [couponCode, usedCount ?? 0]);
    },
    formatPeriod: function _formatPeriod(startDate, endDate) {
      if (!startDate && !endDate) {
        return this.getText("noPeriod");
      }
      return this.getText("periodRange", [this.formatter.date(startDate) || "...", this.formatter.date(endDate) || "..."]);
    },
    refreshStoreInfo: function _refreshStoreInfo() {
      return this.getAppComponent().refreshStoreInfo();
    },
    getText: function _getText(key, parameters) {
      const bundle = this.getAppComponent().getModel("i18n").getResourceBundle();
      return bundle.getText(key, parameters) ?? key;
    },
    getCatalogModel: function _getCatalogModel() {
      return this.getAppComponent().getModel("catalog");
    },
    getCartModel: function _getCartModel() {
      return this.getAppComponent().getModel("cart");
    },
    getStoreModel: function _getStoreModel() {
      return this.getAppComponent().getModel("store");
    },
    ensureAdminModel: function _ensureAdminModel() {
      return this.getAppComponent().ensureAdminModel();
    },
    getAdminModel: function _getAdminModel() {
      return this.getAppComponent().getModel();
    },
    showToast: function _showToast(key, parameters) {
      MessageToast.show(this.getText(key, parameters));
    },
    confirm: function _confirm(key, parameters) {
      return new Promise(resolve => {
        MessageBox.confirm(this.getText(key, parameters), {
          onClose: action => resolve(action === MessageBox.Action.OK)
        });
      });
    },
    handleError: function _handleError(error, key) {
      if (isSessionExpiredError(error)) {
        return;
      }
      if (isAuthenticationError(error)) {
        AuthenticationService.notifySessionExpired();
        return;
      }
      if (isBackendUnavailableError(error)) {
        this.getAppComponent().notifyBackendUnavailable();
        return;
      }
      const detail = getBackendErrorMessage(error);
      const message = this.getText(key);
      MessageBox.error(detail ? `${message}\n\n${detail}` : message);
    },
    runBusy: async function _runBusy(action) {
      const controls = [this.getView(), ...InstanceManager.getOpenDialogs()];
      controls.forEach(control => control?.setBusy(true));
      try {
        return await action();
      } finally {
        controls.forEach(control => control?.setBusy(false));
      }
    }
  });
  return BaseController;
});
//# sourceMappingURL=BaseController-dbg.js.map
