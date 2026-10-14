import type JSONModel from "sap/ui/model/json/JSONModel";
import type ComboBox from "sap/m/ComboBox";
import type Control from "sap/ui/core/Control";
import type Event from "sap/ui/base/Event";
import type { StepInput$ChangeEvent } from "sap/m/StepInput";
import type { OrderLineInput } from "../../service/OrderService";

export interface OrderLine {
    VariantId: string;
    Description: string;
    UnitPrice: number;
    Quantity: number;
    Stock: number | null;
}

interface VariantOption {
    ID: string;
    Size: string;
    Stock: number;
    Product: { Name: string; Price: number };
    Color?: { Name: string } | null;
}

export default class OrderLines {

    constructor(
        private readonly model: JSONModel,
        private readonly modelName: string,
        private readonly path = "/lines"
    ) { }

    public get(): OrderLine[] {
        return (this.model.getProperty(this.path) as OrderLine[] | undefined) ?? [];
    }

    public set(lines: OrderLine[]): void {
        this.model.setProperty(this.path, lines);
    }

    public addFrom(combo: ComboBox, quantity: number): boolean {
        const variant = combo.getSelectedItem()?.getBindingContext()?.getObject() as VariantOption | undefined;

        if (!variant) {
            return false;
        }

        const amount = Math.max(1, Number(quantity) || 1);
        const lines = this.get();
        const existing = lines.find((line) => line.VariantId === variant.ID);

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

    public changeQuantity(event: StepInput$ChangeEvent): void {
        const variantId = this.variantIdOf(event);
        const quantity = Number(event.getParameter("value"));

        this.set(this.get().map((line) => line.VariantId === variantId ? { ...line, Quantity: quantity } : line));
    }

    public remove(event: Event): void {
        const variantId = this.variantIdOf(event);

        this.set(this.get().filter((line) => line.VariantId !== variantId));
    }

    public toItems(): OrderLineInput[] {
        return this.get().map((line) => ({ VariantId: line.VariantId, Quantity: line.Quantity }));
    }

    private limit(quantity: number, stock: number | null): number {
        return stock === null ? quantity : Math.min(quantity, stock);
    }

    private variantIdOf(event: Event): string {
        return (event.getSource() as Control).getBindingContext(this.modelName)?.getProperty("VariantId") as string;
    }

}
