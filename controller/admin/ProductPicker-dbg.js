sap.ui.define(["sap/ui/core/Fragment", "sap/ui/model/json/JSONModel", "../../util/variants"], function (Fragment, JSONModel, ____util_variants) {
  "use strict";

  const imagesForColor = ____util_variants["imagesForColor"];
  const sortBySize = ____util_variants["sortBySize"];
  const FULL_SCREEN_MAX_WIDTH = 600;
  const PRODUCTS_LIMIT = 500;
  const PRODUCT_EXPAND = "Category($select=Name),Colors($select=ID,Name,HexCode),Variants($select=ID,Size,Stock,Color_ID),Images($select=ID,Color_ID,SortOrder)";
  var PickerMode = /*#__PURE__*/function (PickerMode) {
    PickerMode["Variant"] = "variant";
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
    pickProduct() {
      return this.open(PickerMode.Product);
    }
    onSearch = event => {
      this.model.setProperty("/search", event.getParameter("newValue") ?? "");
      this.applyFilter();
    };
    onProductPress = event => {
      const product = event.getSource().getBindingContext("picker")?.getObject();
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
      if (!variant || variant.Stock < 1) {
        this.controller.showToast("selectAvailableSize");
        return;
      }
      this.quantity = Math.min(Math.max(1, Number(this.model.getProperty("/quantity")) || 1), variant.Stock);
      this.finish({
        ID: variant.ID,
        Size: variant.Size,
        Stock: variant.Stock,
        Product: {
          Name: product.Name,
          Price: Number(product.Price)
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
      dialog.open();
      void this.loadProducts(mode);
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
    async loadProducts(mode) {
      this.model.setProperty("/busy", true);
      try {
        const filter = mode === PickerMode.Variant ? "IsActiveEntity eq true and Active eq true" : "IsActiveEntity eq true";
        const contexts = await this.controller.getAdminModel().bindList("/Products", undefined, undefined, undefined, {
          $filter: filter,
          $expand: PRODUCT_EXPAND,
          $orderby: "Name"
        }).requestContexts(0, PRODUCTS_LIMIT);
        this.model.setProperty("/products", contexts.map(context => this.toPickerProduct(context.getObject())));
        this.applyFilter();
      } catch (error) {
        this.controller.handleError(error, "pickerLoadError");
      } finally {
        this.model.setProperty("/busy", false);
      }
    }
    toPickerProduct(product) {
      return {
        ...product,
        CoverId: imagesForColor(product.Images ?? [], "")[0]?.ID,
        Stock: (product.Variants ?? []).reduce((total, variant) => total + variant.Stock, 0)
      };
    }
    applyFilter() {
      const search = this.model.getProperty("/search").trim().toLowerCase();
      const products = this.model.getProperty("/products");
      this.model.setProperty("/filtered", search ? products.filter(product => `${product.Name} ${product.Category?.Name ?? ""}`.toLowerCase().includes(search)) : products);
    }
    selectColor(colorId) {
      const product = this.model.getProperty("/product");
      const variants = sortBySize(product.Variants.filter(variant => !colorId || variant.Color_ID === colorId));
      this.model.setProperty("/selectedColorId", colorId);
      this.model.setProperty("/selectedColorName", product.Colors.find(color => color.ID === colorId)?.Name ?? "");
      this.model.setProperty("/sizes", variants);
      this.model.setProperty("/imageId", imagesForColor(product.Images, colorId)[0]?.ID ?? "");
      this.selectVariant(variants.find(variant => variant.Stock > 0)?.ID ?? "");
    }
    selectVariant(variantId) {
      const product = this.model.getProperty("/product");
      this.model.setProperty("/selectedVariantId", variantId);
      this.model.setProperty("/stock", product.Variants.find(variant => variant.ID === variantId)?.Stock ?? 0);
      this.model.setProperty("/quantity", 1);
    }
    emptyState(mode) {
      return {
        mode,
        step: "list",
        busy: false,
        search: "",
        products: [],
        filtered: [],
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
