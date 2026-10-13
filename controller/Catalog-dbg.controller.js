sap.ui.define(["sap/ui/model/json/JSONModel", "sap/ui/model/Filter", "sap/ui/model/FilterOperator", "./BaseController", "../service/OrderService"], function (JSONModel, Filter, FilterOperator, __BaseController, __OrderService) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const BaseController = _interopRequireDefault(__BaseController);
  const OrderService = _interopRequireDefault(__OrderService);
  const SCROLL_DURATION = 400;
  /**
   * @namespace apps.dflc.benditalook.controller
   */
  const Catalog = BaseController.extend("apps.dflc.benditalook.controller.Catalog", {
    onInit: function _onInit() {
      this.viewModel = new JSONModel({
        categoryId: "",
        categoryName: "",
        search: "",
        promotions: []
      });
      this.getView()?.setModel(this.viewModel, "catalogView");
      this.byId("headerBack")?.setVisible(false);
      this.getRouter().getRoute("catalog")?.attachPatternMatched(() => this.onRouteMatched());
    },
    onCategoryPress: function _onCategoryPress(event) {
      const context = event.getSource().getBindingContext("catalog");
      this.viewModel.setProperty("/categoryId", context ? context.getProperty("ID") : "");
      this.viewModel.setProperty("/categoryName", context ? context.getProperty("Name") : "");
      this.applyFilters();
    },
    onSearch: function _onSearch(event) {
      this.viewModel.setProperty("/search", event.getParameter("query") ?? "");
      this.applyFilters();
    },
    onProductPress: function _onProductPress(event) {
      const productId = event.getSource().getBindingContext("catalog")?.getProperty("ID");
      if (!productId) {
        this.getAppComponent().notifyBackendUnavailable();
        return;
      }
      this.navTo("product", {
        productId
      });
    },
    onShopNow: function _onShopNow() {
      this.byId("catalogPage").scrollToElement(this.byId("productsSection"), SCROLL_DURATION);
    },
    onRouteMatched: function _onRouteMatched() {
      const products = this.getProductsBinding();
      if (products && !products.isSuspended() && products.getLength() > 0) {
        products.refresh();
      }
      void this.loadPromotions();
    },
    getProductsBinding: function _getProductsBinding() {
      return this.byId("productGrid")?.getBinding("items");
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
      this.getProductsBinding()?.filter(filters);
    }
  });
  return Catalog;
});
//# sourceMappingURL=Catalog-dbg.controller.js.map
