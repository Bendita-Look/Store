import Fragment from "sap/ui/core/Fragment";
import JSONModel from "sap/ui/model/json/JSONModel";
import type Dialog from "sap/m/Dialog";
import type ComboBox from "sap/m/ComboBox";
import type Control from "sap/ui/core/Control";
import type Event from "sap/ui/base/Event";
import type { StepInput$ChangeEvent } from "sap/m/StepInput";
import type Admin from "../Admin.controller";
import AdminOrderService, { StoreSaleInput } from "../../service/AdminOrderService";
import OrderService, { CouponStatus, OrderQuote } from "../../service/OrderService";

interface SaleLine {
    VariantId: string;
    Description: string;
    UnitPrice: number;
    Quantity: number;
    Stock: number;
}

interface VariantOption {
    ID: string;
    Size: string;
    Stock: number;
    Product: { Name: string; Price: number };
    Color?: { Name: string } | null;
}

interface SaleState {
    lines: SaleLine[];
    selectedVariantId: string;
    quantity: number;
    customer: {
        CustomerName: string;
        CustomerEmail: string;
        CustomerPhone: string;
        Notes: string;
    };
    couponInput: string;
    couponCode: string;
    quote: OrderQuote | null;
}

export default class StoreSaleSection {

    public readonly model = new JSONModel(this.emptyState());

    private dialog?: Dialog;

    constructor(private readonly controller: Admin) { }

    public onOpenStoreSale = async (): Promise<void> => {
        this.model.setData(this.emptyState());

        const dialog = await this.getDialog();

        this.controller.byControlId<ComboBox>("saleVariantCombo").getBinding("items")?.refresh();
        dialog.open();
    };

    public onCloseStoreSale = (): void => {
        this.dialog?.close();
    };

    public onAddLine = (): void => {
        const combo = this.controller.byControlId<ComboBox>("saleVariantCombo");
        const variant = combo.getSelectedItem()?.getBindingContext()?.getObject() as VariantOption | undefined;

        if (!variant) {
            this.controller.showToast("saleSelectProduct");
            return;
        }

        const state = this.getState();
        const quantity = Math.max(1, Number(state.quantity) || 1);
        const existing = state.lines.find((line) => line.VariantId === variant.ID);

        if (existing) {
            existing.Quantity = Math.min(existing.Quantity + quantity, variant.Stock);
        } else {
            state.lines.push({
                VariantId: variant.ID,
                Description: [variant.Product.Name, variant.Color?.Name, variant.Size].filter(Boolean).join(" / "),
                UnitPrice: Number(variant.Product.Price),
                Quantity: Math.min(quantity, variant.Stock),
                Stock: variant.Stock
            });
        }

        this.model.setProperty("/lines", [...state.lines]);
        this.model.setProperty("/selectedVariantId", "");
        this.model.setProperty("/quantity", 1);
        void this.refreshQuote();
    };

    public onLineQuantityChange = (event: StepInput$ChangeEvent): void => {
        const variantId = this.variantIdOf(event);
        const quantity = Number(event.getParameter("value"));

        this.model.setProperty("/lines", this.getState().lines.map((line) => line.VariantId === variantId ? { ...line, Quantity: quantity } : line));
        void this.refreshQuote();
    };

    public onRemoveLine = (event: Event): void => {
        const variantId = this.variantIdOf(event);

        this.model.setProperty("/lines", this.getState().lines.filter((line) => line.VariantId !== variantId));
        void this.refreshQuote();
    };

    public onApplySaleCoupon = (): void => {
        this.model.setProperty("/couponCode", this.getState().couponInput.trim().toUpperCase());
        void this.refreshQuote();
    };

    public onConfirmStoreSale = async (): Promise<void> => {
        const state = this.getState();

        if (!state.lines.length) {
            this.controller.showToast("saleNoItems");
            return;
        }

        const sale: StoreSaleInput = {
            ...state.customer,
            CouponCode: state.quote?.CouponStatus === CouponStatus.Applied ? state.couponCode : "",
            Items: state.lines.map((line) => ({ VariantId: line.VariantId, Quantity: line.Quantity }))
        };

        try {
            const order = await this.controller.runBusy(() => new AdminOrderService(this.controller.getAdminModel()).registerStoreSale(sale));

            this.dialog?.close();
            this.controller.showToast("saleRegistered", [order.Number]);
            this.controller.orders.refresh();
        } catch (error) {
            this.controller.handleError(error, "saleRegisterError");
            void this.refreshQuote();
        }
    };

    private async refreshQuote(): Promise<void> {
        const state = this.getState();

        if (!state.lines.length) {
            this.model.setProperty("/quote", null);
            return;
        }

        try {
            const quote = await new OrderService(this.controller.getCatalogModel()).quoteOrder(
                state.lines.map((line) => ({ VariantId: line.VariantId, Quantity: line.Quantity })),
                state.couponCode
            );

            this.model.setProperty("/quote", quote);
        } catch (error) {
            this.model.setProperty("/quote", null);
            this.controller.handleError(error, "quoteError");
        }
    }

    private getState(): SaleState {
        return this.model.getData() as SaleState;
    }

    private variantIdOf(event: Event): string {
        return (event.getSource() as Control).getBindingContext("sale")?.getProperty("VariantId") as string;
    }

    private emptyState(): SaleState {
        return {
            lines: [],
            selectedVariantId: "",
            quantity: 1,
            customer: { CustomerName: "", CustomerEmail: "", CustomerPhone: "", Notes: "" },
            couponInput: "",
            couponCode: "",
            quote: null
        };
    }

    private async getDialog(): Promise<Dialog> {
        if (!this.dialog) {
            const view = this.controller.getView();

            this.dialog = await Fragment.load({
                id: view?.getId(),
                name: "apps.dflc.benditalook.view.fragments.StoreSaleDialog",
                controller: this.controller
            }) as Dialog;

            this.dialog.setModel(this.model, "sale");
            view?.addDependent(this.dialog);
        }

        return this.dialog;
    }

}
