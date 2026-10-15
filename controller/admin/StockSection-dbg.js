sap.ui.define(["sap/ui/core/Fragment", "sap/ui/model/json/JSONModel", "../../service/StockService"], function (Fragment, JSONModel, __StockService) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const StockService = _interopRequireDefault(__StockService);
  const FULL_SCREEN_MAX_WIDTH = 600;
  const MODEL_NAME = "stock";
  class StockSection {
    model = new JSONModel(this.emptyState());
    constructor(controller) {
      this.controller = controller;
    }
    refresh() {
      this.controller.byControlId("stockEntriesTable")?.getBinding("items")?.refresh();
    }
    onNewEntry = async () => {
      this.model.setData(this.emptyState());
      const dialog = await this.getDialog();
      dialog.setStretch(window.innerWidth < FULL_SCREEN_MAX_WIDTH);
      dialog.open();
    };
    onAddLine = async () => {
      const variant = await this.controller.productPicker.pickRestockVariant();
      if (!variant) {
        return;
      }
      const quantity = this.controller.productPicker.pickedQuantity;
      const lines = this.getState().lines;
      const existing = lines.find(line => line.VariantId === variant.ID);
      if (existing) {
        existing.Quantity += quantity;
      } else {
        lines.push({
          VariantId: variant.ID,
          Description: [variant.Product.Name, variant.Color?.Name, variant.Size].filter(Boolean).join(" / "),
          Stock: variant.Stock,
          Quantity: quantity,
          UnitCost: variant.Product.CostPrice
        });
      }
      this.setLines([...lines]);
    };
    onLineChange = () => {
      this.setLines(this.getState().lines);
    };
    onRemoveLine = event => {
      const variantId = event.getSource().getBindingContext(MODEL_NAME)?.getProperty("VariantId");
      this.setLines(this.getState().lines.filter(line => line.VariantId !== variantId));
    };
    onConfirm = async () => {
      const state = this.getState();
      if (!state.lines.length) {
        this.controller.showToast("stockEntryNoItems");
        return;
      }
      try {
        await this.controller.runBusy(() => new StockService(this.controller.getAdminModel()).registerEntry({
          Note: state.note.trim(),
          Items: state.lines.map(line => ({
            VariantId: line.VariantId,
            Quantity: Number(line.Quantity),
            UnitCost: Number(line.UnitCost) || 0
          }))
        }));
        this.dialog?.close();
        this.controller.showToast("stockEntrySaved", [state.totalQuantity]);
        this.refresh();
        this.controller.products.refresh();
      } catch (error) {
        this.controller.handleError(error, "stockEntryError");
      }
    };
    onClose = () => {
      this.dialog?.close();
    };
    onEntryPress = async event => {
      const context = event.getSource().getBindingContext();
      if (!this.detailsDialog) {
        this.detailsDialog = await this.loadFragment("StockEntryDetailsDialog");
      }
      this.detailsDialog.bindElement({
        path: context.getPath(),
        parameters: {
          $expand: "Items"
        }
      });
      this.detailsDialog.setStretch(window.innerWidth < FULL_SCREEN_MAX_WIDTH);
      this.detailsDialog.open();
    };
    onCloseDetails = () => {
      this.detailsDialog?.close();
    };
    setLines(lines) {
      this.model.setProperty("/lines", lines);
      this.model.setProperty("/totalQuantity", lines.reduce((total, line) => total + (Number(line.Quantity) || 0), 0));
      this.model.setProperty("/totalCost", lines.reduce((total, line) => total + (Number(line.Quantity) || 0) * (Number(line.UnitCost) || 0), 0));
    }
    getState() {
      return this.model.getData();
    }
    emptyState() {
      return {
        lines: [],
        note: "",
        totalQuantity: 0,
        totalCost: 0
      };
    }
    async getDialog() {
      if (!this.dialog) {
        this.dialog = await this.loadFragment("StockEntryDialog");
        this.dialog.setModel(this.model, MODEL_NAME);
      }
      return this.dialog;
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
  return StockSection;
});
//# sourceMappingURL=StockSection-dbg.js.map
