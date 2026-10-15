sap.ui.define(["sap/ui/model/json/JSONModel", "sap/ui/model/Filter", "sap/ui/model/FilterOperator", "../../service/DraftService"], function (JSONModel, Filter, FilterOperator, __DraftService) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const DraftService = _interopRequireDefault(__DraftService);
  const ALL = "ALL";
  const SEARCH_DELAY = 300;
  var ProductStatusFilter = /*#__PURE__*/function (ProductStatusFilter) {
    ProductStatusFilter["Active"] = "ACTIVE";
    ProductStatusFilter["Inactive"] = "INACTIVE";
    return ProductStatusFilter;
  }(ProductStatusFilter || {});
  var ProductStockFilter = /*#__PURE__*/function (ProductStockFilter) {
    ProductStockFilter["Available"] = "AVAILABLE";
    ProductStockFilter["SoldOut"] = "SOLD_OUT";
    return ProductStockFilter;
  }(ProductStockFilter || {});
  class ProductsSection {
    filterModel = new JSONModel(this.emptyFilters());
    constructor(controller) {
      this.controller = controller;
    }
    onSearch = () => {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => this.applyFilters(), SEARCH_DELAY);
    };
    onFilterChange = () => {
      this.applyFilters();
    };
    onClearFilters = () => {
      this.filterModel.setData(this.emptyFilters());
      this.applyFilters();
    };
    onNewProduct = async () => {
      try {
        const draft = await this.controller.runBusy(() => this.draftService().createDraft(this.getTableBinding(), {
          Active: true
        }));
        this.openEditor(draft);
      } catch (error) {
        this.controller.handleError(error, "productCreateError");
      }
    };
    onProductPress = async event => {
      const context = this.contextOf(event);
      if (context.getProperty("IsActiveEntity") === false) {
        this.openEditor(context);
        return;
      }
      try {
        const draft = await this.controller.runBusy(() => this.draftService().editDraft(context));
        this.openEditor(draft);
      } catch (error) {
        this.controller.handleError(error, "productEditError");
      }
    };
    onDeleteProduct = async event => {
      const context = this.contextOf(event);
      if (!(await this.controller.confirm("confirmDeleteProduct", [context.getProperty("Name") ?? ""]))) {
        return;
      }
      try {
        await this.controller.runBusy(() => context.delete());
        this.controller.showToast("productDeleted");
      } catch (error) {
        this.controller.handleError(error, "productDeleteError");
      }
    };
    refresh() {
      this.getTableBinding()?.refresh();
    }
    applyFilters() {
      const criteria = this.filterModel.getData();
      const filters = [];
      const search = criteria.search.trim();
      if (search) {
        filters.push(new Filter({
          path: "Name",
          operator: FilterOperator.Contains,
          value1: search,
          caseSensitive: false
        }));
      }
      if (criteria.category) {
        filters.push(new Filter("Category_ID", FilterOperator.EQ, criteria.category));
      }
      if (criteria.status !== ALL) {
        filters.push(new Filter("Active", FilterOperator.EQ, criteria.status === ProductStatusFilter.Active));
      }
      if (criteria.stock === ProductStockFilter.Available) {
        filters.push(new Filter({
          path: "Variants",
          operator: FilterOperator.Any,
          variable: "variant",
          condition: new Filter("variant/Stock", FilterOperator.GT, 0)
        }));
      }
      if (criteria.stock === ProductStockFilter.SoldOut) {
        filters.push(new Filter({
          path: "Variants",
          operator: FilterOperator.All,
          variable: "variant",
          condition: new Filter("variant/Stock", FilterOperator.LE, 0)
        }));
      }
      this.getTableBinding().filter(filters.length ? new Filter({
        filters,
        and: true
      }) : []);
    }
    emptyFilters() {
      return {
        search: "",
        category: "",
        status: ALL,
        stock: ALL
      };
    }
    openEditor(draft) {
      this.controller.navTo("adminProduct", {
        productId: draft.getProperty("ID")
      });
    }
    contextOf(event) {
      return event.getSource().getBindingContext();
    }
    draftService() {
      return new DraftService(this.controller.getAdminModel());
    }
    getTableBinding() {
      return this.controller.byControlId("productsTable").getBinding("items");
    }
  }
  return ProductsSection;
});
//# sourceMappingURL=ProductsSection-dbg.js.map
