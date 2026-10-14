sap.ui.define([], function () {
  "use strict";

  class OrderLines {
    constructor(model, modelName, path = "/lines") {
      this.model = model;
      this.modelName = modelName;
      this.path = path;
    }
    get() {
      return this.model.getProperty(this.path) ?? [];
    }
    set(lines) {
      this.model.setProperty(this.path, lines);
    }
    addFrom(combo, quantity) {
      const variant = combo.getSelectedItem()?.getBindingContext()?.getObject();
      if (!variant) {
        return false;
      }
      const amount = Math.max(1, Number(quantity) || 1);
      const lines = this.get();
      const existing = lines.find(line => line.VariantId === variant.ID);
      if (existing) {
        existing.Quantity = this.limit(existing.Quantity + amount, existing.Stock ?? variant.Stock);
        this.set([...lines]);
      } else {
        this.set([...lines, {
          VariantId: variant.ID,
          Description: [variant.Product.Name, variant.Color?.Name, variant.Size].filter(Boolean).join(" / "),
          UnitPrice: Number(variant.Product.Price),
          Quantity: this.limit(amount, variant.Stock),
          Stock: variant.Stock
        }]);
      }
      return true;
    }
    changeQuantity(event) {
      const variantId = this.variantIdOf(event);
      const quantity = Number(event.getParameter("value"));
      this.set(this.get().map(line => line.VariantId === variantId ? {
        ...line,
        Quantity: quantity
      } : line));
    }
    remove(event) {
      const variantId = this.variantIdOf(event);
      this.set(this.get().filter(line => line.VariantId !== variantId));
    }
    toItems() {
      return this.get().map(line => ({
        VariantId: line.VariantId,
        Quantity: line.Quantity
      }));
    }
    limit(quantity, stock) {
      return stock === null ? quantity : Math.min(quantity, stock);
    }
    variantIdOf(event) {
      return event.getSource().getBindingContext(this.modelName)?.getProperty("VariantId");
    }
  }
  return OrderLines;
});
//# sourceMappingURL=OrderLines-dbg.js.map
