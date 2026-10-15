import Fragment from "sap/ui/core/Fragment";
import JSONModel from "sap/ui/model/json/JSONModel";
import type Dialog from "sap/m/Dialog";
import type Event from "sap/ui/base/Event";
import type { StepInput$ChangeEvent } from "sap/m/StepInput";
import type Admin from "../Admin.controller";
import AdminOrderService, { ReturnInput, ReturnQuote } from "../../service/AdminOrderService";
import formatter from "../../model/formatter";
import OrderLines, { OrderLine } from "./OrderLines";

const FULL_SCREEN_MAX_WIDTH = 600;
const RETURNED_KIND = "RETURNED";
const REPLACEMENT_KIND = "REPLACEMENT";

interface ReturnedEntry {
    ID: string;
    Kind: string;
    OrderItem_ID?: string | null;
    Replacement_ID?: string | null;
    ImageId?: string | null;
    ProductName: string;
    ColorName?: string | null;
    Size: string;
    Quantity: number;
}

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
        Items: ReturnedEntry[];
    }>;
}

interface ReturnRow {
    OrderItemId?: string;
    ReplacementId?: string;
    ImageId?: string | null;
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

        dialog.setStretch(window.innerWidth < FULL_SCREEN_MAX_WIDTH);
        dialog.open();
    }

    public onClose = (): void => {
        this.dialog?.close();
    };

    public onReturnQuantityChange = (): void => {
        void this.refreshQuote();
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
                .map((row) => ({ OrderItemId: row.OrderItemId, ReplacementId: row.ReplacementId, Quantity: row.Quantity, Restock: row.Restock })),
            Replacements: this.lines.toItems()
        };
    }

    private buildRows(order: ReturnableOrder): ReturnRow[] {
        const entries = (order.Returns ?? []).flatMap((orderReturn) => orderReturn.Items);
        const returned = new Map<string, number>();

        entries
            .filter((entry) => entry.Kind === RETURNED_KIND)
            .forEach((entry) => {
                const key = (entry.OrderItem_ID ?? entry.Replacement_ID) as string;

                returned.set(key, (returned.get(key) ?? 0) + entry.Quantity);
            });

        const orderRows = order.Items.map((item) => this.row(item, item.Quantity - (returned.get(item.ID) ?? 0), { OrderItemId: item.ID }));
        const replacementRows = entries
            .filter((entry) => entry.Kind === REPLACEMENT_KIND)
            .map((entry) => this.row(entry, entry.Quantity - (returned.get(entry.ID) ?? 0), { ReplacementId: entry.ID }, true));

        return [...orderRows, ...replacementRows];
    }

    private row(
        item: { ImageId?: string | null; ProductName: string; ColorName?: string | null; Size: string; Quantity: number },
        available: number,
        source: Pick<ReturnRow, "OrderItemId" | "ReplacementId">,
        fromExchange = false
    ): ReturnRow {
        const description = [item.ProductName, item.ColorName, item.Size].filter(Boolean).join(" / ");

        return {
            ...source,
            ImageId: item.ImageId,
            Description: fromExchange ? this.controller.getText("returnFromExchange", [description]) : description,
            Purchased: item.Quantity,
            Available: available,
            Quantity: 0,
            Restock: true
        };
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
