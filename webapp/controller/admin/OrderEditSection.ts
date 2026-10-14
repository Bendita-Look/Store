import Fragment from "sap/ui/core/Fragment";
import JSONModel from "sap/ui/model/json/JSONModel";
import type Dialog from "sap/m/Dialog";
import type ComboBox from "sap/m/ComboBox";
import type Event from "sap/ui/base/Event";
import type { StepInput$ChangeEvent } from "sap/m/StepInput";
import type Admin from "../Admin.controller";
import AdminOrderService from "../../service/AdminOrderService";
import type { OrderQuote } from "../../service/OrderService";
import OrderLines, { OrderLine } from "./OrderLines";

const FULL_SCREEN_MAX_WIDTH = 600;

export interface EditableOrder {
    ID: string;
    Number: number;
    Items: Array<{
        Variant_ID: string;
        ProductName: string;
        ColorName?: string;
        Size: string;
        Quantity: number;
        UnitPrice: number;
    }>;
}

interface EditState {
    orderId: string;
    number: number;
    lines: OrderLine[];
    selectedVariantId: string;
    quantity: number;
    quote: OrderQuote | null;
}

export default class OrderEditSection {

    public readonly model = new JSONModel(this.emptyState());

    private readonly lines = new OrderLines(this.model, "edit");

    private dialog?: Dialog;

    constructor(private readonly controller: Admin) { }

    public async open(order: EditableOrder): Promise<void> {
        this.model.setData({
            ...this.emptyState(),
            orderId: order.ID,
            number: order.Number,
            lines: order.Items.map((item) => ({
                VariantId: item.Variant_ID,
                Description: [item.ProductName, item.ColorName, item.Size].filter(Boolean).join(" / "),
                UnitPrice: Number(item.UnitPrice),
                Quantity: item.Quantity,
                Stock: null
            }))
        });

        const dialog = await this.getDialog();

        this.controller.byControlId<ComboBox>("editVariantCombo").getBinding("items")?.refresh();
        dialog.setStretch(window.innerWidth < FULL_SCREEN_MAX_WIDTH);
        dialog.open();
        void this.refreshQuote();
    }

    public onClose = (): void => {
        this.dialog?.close();
    };

    public onAddLine = (): void => {
        if (!this.lines.addFrom(this.controller.byControlId<ComboBox>("editVariantCombo"), this.getState().quantity)) {
            this.controller.showToast("saleSelectProduct");
            return;
        }

        this.model.setProperty("/selectedVariantId", "");
        this.model.setProperty("/quantity", 1);
        void this.refreshQuote();
    };

    public onLineQuantityChange = (event: StepInput$ChangeEvent): void => {
        this.lines.changeQuantity(event);
        void this.refreshQuote();
    };

    public onRemoveLine = (event: Event): void => {
        this.lines.remove(event);
        void this.refreshQuote();
    };

    public onConfirm = async (): Promise<void> => {
        const state = this.getState();

        if (!state.lines.length) {
            this.controller.showToast("editOrderNoItems");
            return;
        }

        try {
            await this.controller.runBusy(() => this.service().updateOrderItems(state.orderId, this.lines.toItems()));

            this.dialog?.close();
            this.controller.showToast("orderItemsUpdated", [state.number]);
            this.controller.orders.refreshOpenOrder();
        } catch (error) {
            this.controller.handleError(error, "orderEditError");
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
            this.model.setProperty("/quote", await this.service().quoteOrderUpdate(state.orderId, this.lines.toItems()));
        } catch (error) {
            this.model.setProperty("/quote", null);
            this.controller.handleError(error, "quoteError");
        }
    }

    private service(): AdminOrderService {
        return new AdminOrderService(this.controller.getAdminModel());
    }

    private getState(): EditState {
        return this.model.getData() as EditState;
    }

    private emptyState(): EditState {
        return { orderId: "", number: 0, lines: [], selectedVariantId: "", quantity: 1, quote: null };
    }

    private async getDialog(): Promise<Dialog> {
        if (!this.dialog) {
            const view = this.controller.getView();

            this.dialog = await Fragment.load({
                id: view?.getId(),
                name: "apps.dflc.benditalook.view.fragments.OrderEditDialog",
                controller: this.controller
            }) as Dialog;

            this.dialog.setModel(this.model, "edit");
            view?.addDependent(this.dialog);
        }

        return this.dialog;
    }

}
