sap.ui.define(["sap/ui/core/Fragment", "sap/ui/model/json/JSONModel", "sap/ui/model/Filter", "sap/ui/model/FilterOperator", "../../util/variants"], function (Fragment, JSONModel, Filter, FilterOperator, ____util_variants) {
  "use strict";

  const imagesForColor = ____util_variants["imagesForColor"];
  const sortBySize = ____util_variants["sortBySize"];
  const FULL_SCREEN_MAX_WIDTH = 600;
  const SEARCH_DELAY = 300;
  var PickerMode = /*#__PURE__*/function (PickerMode) {
    PickerMode["Variant"] = "variant";
    PickerMode["Restock"] = "restock";
    PickerMode["Product"] = "product";
    return PickerMode;
  }(PickerMode || {});
  class ProductPicker {
    model = new JSONModel(this.emptyState(PickerMode.Variant));
    quantity = 1;
    constructor(controller) {
      this.controller = controller;
    }
    get pickedQuantity() {
      return this.quantity;
    }
    pickVariant() {
      return this.open(PickerMode.Variant);
    }
    pickRestockVariant() {
      return this.open(PickerMode.Restock);
    }
    pickProduct() {
      return this.open(PickerMode.Product);
    }
    onSearch = event => {
      this.model.setProperty("/search", event.getParameter("newValue") ?? "");
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => this.applyFilters(), SEARCH_DELAY);
    };
    soldOutVisible = (mode, variants) => {
      return mode === PickerMode.Variant && (variants ?? []).every(variant => !(variant.Stock > 0));
    };
    onProductPress = event => {
      const product = event.getSource().getBindingContext()?.getObject();
      if (this.model.getProperty("/mode") === PickerMode.Product) {
        this.finish({
          ID: product.ID,
          Name: product.Name
        });
        return;
      }
      this.model.setProperty("/product", product);
      this.model.setProperty("/step", "detail");
      this.selectColor(product.Colors[0]?.ID ?? "");
    };
    onBack = () => {
      this.model.setProperty("/step", "list");
    };
    onSwatchPress = event => {
      this.selectColor(event.getSource().getBindingContext("picker")?.getProperty("ID") ?? "");
    };
    onSizePress = event => {
      this.selectVariant(event.getSource().getBindingContext("picker")?.getProperty("ID") ?? "");
    };
    onConfirm = () => {
      const product = this.model.getProperty("/product");
      const variant = product.Variants.find(item => item.ID === this.model.getProperty("/selectedVariantId"));
      const restock = this.isRestock();
      if (!variant || !restock && variant.Stock < 1) {
        this.controller.showToast("selectAvailableSize");
        return;
      }
      const requested = Math.max(1, Number(this.model.getProperty("/quantity")) || 1);
      this.quantity = restock ? requested : Math.min(requested, variant.Stock);
      this.finish({
        ID: variant.ID,
        Size: variant.Size,
        Stock: variant.Stock,
        Product: {
          Name: product.Name,
          Price: Number(product.Price),
          CostPrice: Number(product.CostPrice ?? 0)
        },
        Color: product.Colors.find(color => color.ID === variant.Color_ID) ?? null
      });
    };
    onCancel = () => {
      this.dialog?.close();
    };
    async open(mode) {
      this.picked = undefined;
      this.quantity = 1;
      this.model.setData(this.emptyState(mode));
      const dialog = await this.getDialog();
      dialog.setStretch(window.innerWidth < FULL_SCREEN_MAX_WIDTH);
      this.applyFilters();
      dialog.open();
      return new Promise(resolve => {
        this.resolver = resolve;
      });
    }
    finish(value) {
      this.picked = value;
      this.dialog?.close();
    }
    onAfterClose() {
      this.resolver?.(this.picked);
      this.resolver = undefined;
    }
    applyFilters() {
      const binding = this.controller.byControlId("pickerGrid").getBinding("items");
      const search = this.model.getProperty("/search").trim();
      const filters = [new Filter("IsActiveEntity", FilterOperator.EQ, true)];
      if (this.model.getProperty("/mode") === PickerMode.Variant) {
        filters.push(new Filter("Active", FilterOperator.EQ, true));
      }
      if (search) {
        filters.push(new Filter({
          filters: [new Filter({
            path: "Name",
            operator: FilterOperator.Contains,
            value1: search,
            caseSensitive: false
          }), new Filter({
            path: "Category/Name",
            operator: FilterOperator.Contains,
            value1: search,
            caseSensitive: false
          })],
          and: false
        }));
      }
      binding.filter(new Filter({
        filters,
        and: true
      }));
      if (binding.isSuspended()) {
        binding.resume();
      }
    }
    selectColor(colorId) {
      const product = this.model.getProperty("/product");
      const variants = sortBySize(product.Variants.filter(variant => !colorId || variant.Color_ID === colorId));
      this.model.setProperty("/selectedColorId", colorId);
      this.model.setProperty("/selectedColorName", product.Colors.find(color => color.ID === colorId)?.Name ?? "");
      this.model.setProperty("/sizes", variants);
      this.model.setProperty("/imageId", imagesForColor(product.Images, colorId)[0]?.ID ?? "");
      this.selectVariant((this.isRestock() ? variants[0] : variants.find(variant => variant.Stock > 0))?.ID ?? "");
    }
    selectVariant(variantId) {
      const product = this.model.getProperty("/product");
      this.model.setProperty("/selectedVariantId", variantId);
      this.model.setProperty("/stock", product.Variants.find(variant => variant.ID === variantId)?.Stock ?? 0);
      this.model.setProperty("/quantity", 1);
    }
    isRestock() {
      return this.model.getProperty("/mode") === PickerMode.Restock;
    }
    emptyState(mode) {
      return {
        mode,
        step: "list",
        search: "",
        product: null,
        sizes: [],
        imageId: "",
        selectedColorId: "",
        selectedColorName: "",
        selectedVariantId: "",
        stock: 0,
        quantity: 1
      };
    }
    async getDialog() {
      if (!this.dialog) {
        const view = this.controller.getView();
        this.dialog = await Fragment.load({
          id: view?.getId(),
          name: "apps.dflc.benditalook.view.fragments.ProductPickerDialog",
          controller: this.controller
        });
        this.dialog.setModel(this.model, "picker");
        this.dialog.attachAfterClose(() => this.onAfterClose());
        view?.addDependent(this.dialog);
      }
      return this.dialog;
    }
  }
  return ProductPicker;
});
//# sourceMappingURL=ProductPicker-dbg.js.map
