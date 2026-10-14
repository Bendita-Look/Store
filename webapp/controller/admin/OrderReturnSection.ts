import Fragment from "sap/ui/core/Fragment";
import JSONModel from "sap/ui/model/json/JSONModel";
import type Dialog from "sap/m/Dialog";
import type ComboBox from "sap/m/ComboBox";
import type Event from "sap/ui/base/Event";
import type { StepInput$ChangeEvent } from "sap/m/StepInput";
import type Admin from "../Admin.controller";
import AdminOrderService, { ReturnInput, ReturnQuote } from "../../service/AdminOrderService";
import formatter from "../../model/formatter";
import OrderLines, { OrderLine } from "./OrderLines";

const FULL_SCREEN_MAX_WIDTH = 600;
const RETURNED_KIND = "RETURNED";

export interface ReturnableOrder {
    ID: string;
    Number: number;
    Items: Array<{
        ID: string;
        ImageId?: string;
        ProductName: string;
        ColorName?: string;
        Size: string;
        Quantity: number;
    }>;
    Returns?: Array<{
        Items: Array<{ Kind: string; OrderItem_ID?: string; Quantity: number }>;
    }>;
}

interface ReturnRow {
    OrderItemId: string;
    ImageId?: string;
    Description: string;
    Purchased: number;
    Available: number;
    Quantity: number;
    Restock: boolean;
}

interface ReturnState {
    orderId: string;
    number: number;
    rows: ReturnRow[];
    reason: string;
    lines: OrderLine[];
    selectedVariantId: string;
    quantity: number;
    quote: ReturnQuote | null;
    balanceText: string;
}

export default class OrderReturnSection {

    public readonly model = new JSONModel(this.emptyState());

    private readonly lines = new OrderLines(this.model, "return");

    private dialog?: Dialog;

    constructor(private readonly controller: Admin) { }

    public async open(order: ReturnableOrder): Promise<void> {
        this.model.setData({ ...this.emptyState(), orderId: order.ID, number: order.Number, rows: this.buildRows(order) });

        const dialog = await this.getDialog();

        this.controller.byControlId<ComboBox>("returnVariantCombo").getBinding("items")?.refresh();
        dialog.setStretch(window.innerWidth < FULL_SCREEN_MAX_WIDTH);
        dialog.open();
    }

    public onClose = (): void => {
        this.dialog?.close();
    };

    public onReturnQuantityChange = (): void => {
        void this.refreshQuote();
    };

    public onAddLine = (): void => {
        if (!this.lines.addFrom(this.controller.byControlId<ComboBox>("returnVariantCombo"), this.getState().quantity)) {
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
        const input = this.buildInput();

        if (!input.Items.length) {
            this.controller.showToast("returnSelectItems");
            return;
        }

        try {
            await this.controller.runBusy(() => this.service().registerReturn(state.orderId, input));

            this.dialog?.close();
            this.controller.showToast("returnRegistered", [state.number]);
            this.controller.orders.refreshOpenOrder();
        } catch (error) {
            this.controller.handleError(error, "returnError");
            void this.refreshQuote();
        }
    };

    private async refreshQuote(): Promise<void> {
        const input = this.buildInput();

        if (!input.Items.length) {
            this.setQuote(null);
            return;
        }

        try {
            this.setQuote(await this.service().quoteReturn(this.getState().orderId, input));
        } catch (error) {
            this.setQuote(null);
            this.controller.handleError(error, "quoteError");
        }
    }

    private setQuote(quote: ReturnQuote | null): void {
        this.model.setProperty("/quote", quote);
        this.model.setProperty("/balanceText", quote ? this.balanceText(Number(quote.BalanceAmount)) : "");
    }

    private balanceText(balance: number): string {
        if (!balance) {
            return this.controller.getText("balanceEven");
        }

        return this.controller.getText(balance > 0 ? "balanceToPay" : "balanceToRefund", [formatter.currency(Math.abs(balance))]);
    }

    private buildInput(): ReturnInput {
        const state = this.getState();

        return {
            Reason: state.reason.trim(),
            Items: state.rows
                .filter((row) => row.Quantity > 0)
                .map((row) => ({ OrderItemId: row.OrderItemId, Quantity: row.Quantity, Restock: row.Restock })),
            Replacements: this.lines.toItems()
        };
    }

    private buildRows(order: ReturnableOrder): ReturnRow[] {
        const returned = new Map<string, number>();

        (order.Returns ?? [])
            .flatMap((orderReturn) => orderReturn.Items)
            .filter((item) => item.Kind === RETURNED_KIND && item.OrderItem_ID)
            .forEach((item) => returned.set(item.OrderItem_ID as string, (returned.get(item.OrderItem_ID as string) ?? 0) + item.Quantity));

        return order.Items.map((item) => ({
            OrderItemId: item.ID,
            ImageId: item.ImageId,
            Description: [item.ProductName, item.ColorName, item.Size].filter(Boolean).join(" / "),
            Purchased: item.Quantity,
            Available: item.Quantity - (returned.get(item.ID) ?? 0),
            Quantity: 0,
            Restock: true
        }));
    }

    private service(): AdminOrderService {
        return new AdminOrderService(this.controller.getAdminModel());
    }

    private getState(): ReturnState {
        return this.model.getData() as ReturnState;
    }

    private emptyState(): ReturnState {
        return {
            orderId: "",
            number: 0,
            rows: [],
            reason: "",
            lines: [],
            selectedVariantId: "",
            quantity: 1,
            quote: null,
            balanceText: ""
        };
    }

    private async getDialog(): Promise<Dialog> {
        if (!this.dialog) {
            const view = this.controller.getView();

            this.dialog = await Fragment.load({
                id: view?.getId(),
                name: "apps.dflc.benditalook.view.fragments.OrderReturnDialog",
                controller: this.controller
            }) as Dialog;

            this.dialog.setModel(this.model, "return");
            view?.addDependent(this.dialog);
        }

        return this.dialog;
    }

}
