sap.ui.define(["sap/ui/model/json/JSONModel", "sap/ui/model/Filter", "sap/ui/model/FilterOperator", "./BaseController", "../model/formatter", "../service/OrderService"], function (JSONModel, Filter, FilterOperator, __BaseController, __formatter, __OrderService) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const BaseController = _interopRequireDefault(__BaseController);
  const formatter = _interopRequireDefault(__formatter);
  const OrderService = _interopRequireDefault(__OrderService);
  /**
   * @namespace apps.dflc.benditalook.controller
   */
  const Catalog = BaseController.extend("apps.dflc.benditalook.controller.Catalog", {
    onInit: function _onInit() {
      this.viewModel = new JSONModel({
        categoryId: "",
        search: "",
        promotions: []
      });
      this.getView()?.setModel(this.viewModel, "catalogView");
      this.getRouter().getRoute("catalog")?.attachPatternMatched(() => void this.loadPromotions());
    },
    onCategoryPress: function _onCategoryPress(event) {
      const context = event.getSource().getBindingContext("catalog");
      this.viewModel.setProperty("/categoryId", context ? context.getProperty("ID") : "");
      this.applyFilters();
    },
    onSearch: function _onSearch(event) {
      this.viewModel.setProperty("/search", event.getParameter("query") ?? "");
      this.applyFilters();
    },
    onProductPress: function _onProductPress(event) {
      const context = event.getSource().getBindingContext("catalog");
      this.navTo("product", {
        productId: context?.getProperty("ID")
      });
    },
    onOpenAdmin: function _onOpenAdmin() {
      this.navTo("admin");
    },
    onContactWhatsapp: function _onContactWhatsapp() {
      window.open(formatter.whatsappUrl(this.getStoreModel().getProperty("/Whatsapp"), this.getText("whatsappGreeting")), "_blank");
    },
    onContactEmail: function _onContactEmail() {
      window.open(formatter.mailtoUrl(this.getStoreModel().getProperty("/ContactEmail")), "_self");
    },
    onOpenInstagram: function _onOpenInstagram() {
      window.open(formatter.instagramUrl(this.getStoreModel().getProperty("/Instagram")), "_blank");
    },
    loadPromotions: async function _loadPromotions() {
      try {
        this.viewModel.setProperty("/promotions", await new OrderService(this.getCatalogModel()).activePromotions());
      } catch {
        this.viewModel.setProperty("/promotions", []);
      }
    },
    applyFilters: function _applyFilters() {
      const {
        categoryId,
        search
      } = this.viewModel.getData();
      const filters = [];
      if (categoryId) {
        filters.push(new Filter("Category_ID", FilterOperator.EQ, categoryId));
      }
      if (search.trim()) {
        filters.push(new Filter({
          path: "Name",
          operator: FilterOperator.Contains,
          value1: search.trim(),
          caseSensitive: false
        }));
      }
      this.byId("productGrid")?.getBinding("items")?.filter(filters);
    }
  });
  return Catalog;
});
//# sourceMappingURL=Catalog-dbg.controller.js.map
