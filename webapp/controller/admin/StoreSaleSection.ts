import Fragment from "sap/ui/core/Fragment";
import JSONModel from "sap/ui/model/json/JSONModel";
import type Dialog from "sap/m/Dialog";
import type Event from "sap/ui/base/Event";
import type { StepInput$ChangeEvent } from "sap/m/StepInput";
import type Admin from "../Admin.controller";
import AdminOrderService, { StoreSaleInput } from "../../service/AdminOrderService";
import OrderService, { CouponStatus, OrderQuote } from "../../service/OrderService";
import OrderLines, { OrderLine } from "./OrderLines";

interface SaleState {
    lines: OrderLine[];
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

    private readonly lines = new OrderLines(this.model, "sale");

    private dialog?: Dialog;

    constructor(private readonly controller: Admin) { }

    public onOpenStoreSale = async (): Promise<void> => {
        this.model.setData(this.emptyState());

        const dialog = await this.getDialog();

        dialog.open();
    };

    public onCloseStoreSale = (): void => {
        this.dialog?.close();
    };

    public onAddLine = async (): Promise<void> => {
        const variant = await this.controller.productPicker.pickVariant();

        if (variant) {
            this.lines.add(variant, this.controller.productPicker.pickedQuantity);
            void this.refreshQuote();
        }
    };

    public onLineQuantityChange = (event: StepInput$ChangeEvent): void => {
        this.lines.changeQuantity(event);
        void this.refreshQuote();
    };

    public onRemoveLine = (event: Event): void => {
        this.lines.remove(event);
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
            Items: this.lines.toItems()
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
            const quote = await new OrderService(this.controller.getCatalogModel()).quoteOrder(this.lines.toItems(), state.couponCode);

            this.model.setProperty("/quote", quote);
        } catch (error) {
            this.model.setProperty("/quote", null);
            this.controller.handleError(error, "quoteError");
        }
    }

    private getState(): SaleState {
        return this.model.getData() as SaleState;
    }

    private emptyState(): SaleState {
        return {
            lines: [],
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
