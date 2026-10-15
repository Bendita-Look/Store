import Fragment from "sap/ui/core/Fragment";
import JSONModel from "sap/ui/model/json/JSONModel";
import type Dialog from "sap/m/Dialog";
import type Table from "sap/m/Table";
import type Control from "sap/ui/core/Control";
import type Event from "sap/ui/base/Event";
import type Context from "sap/ui/model/odata/v4/Context";
import type ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import type Admin from "../Admin.controller";
import StockService from "../../service/StockService";

const FULL_SCREEN_MAX_WIDTH = 600;
const MODEL_NAME = "stock";

interface StockLine {
    VariantId: string;
    Description: string;
    Stock: number;
    Quantity: number;
    UnitCost: number;
}

interface StockState {
    lines: StockLine[];
    note: string;
    totalQuantity: number;
    totalCost: number;
}

export default class StockSection {

    public readonly model = new JSONModel(this.emptyState());

    private dialog?: Dialog;

    private detailsDialog?: Dialog;

    constructor(private readonly controller: Admin) { }

    public refresh(): void {
        (this.controller.byControlId<Table>("stockEntriesTable")?.getBinding("items") as ODataListBinding | undefined)?.refresh();
    }

    public onNewEntry = async (): Promise<void> => {
        this.model.setData(this.emptyState());

        const dialog = await this.getDialog();

        dialog.setStretch(window.innerWidth < FULL_SCREEN_MAX_WIDTH);
        dialog.open();
    };

    public onAddLine = async (): Promise<void> => {
        const variant = await this.controller.productPicker.pickRestockVariant();

        if (!variant) {
            return;
        }

        const quantity = this.controller.productPicker.pickedQuantity;
        const lines = this.getState().lines;
        const existing = lines.find((line) => line.VariantId === variant.ID);

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

    public onLineChange = (): void => {
        this.setLines(this.getState().lines);
    };

    public onRemoveLine = (event: Event): void => {
        const variantId = (event.getSource() as Control).getBindingContext(MODEL_NAME)?.getProperty("VariantId") as string;

        this.setLines(this.getState().lines.filter((line) => line.VariantId !== variantId));
    };

    public onConfirm = async (): Promise<void> => {
        const state = this.getState();

        if (!state.lines.length) {
            this.controller.showToast("stockEntryNoItems");
            return;
        }

        try {
            await this.controller.runBusy(() => new StockService(this.controller.getAdminModel()).registerEntry({
                Note: state.note.trim(),
                Items: state.lines.map((line) => ({ VariantId: line.VariantId, Quantity: Number(line.Quantity), UnitCost: Number(line.UnitCost) || 0 }))
            }));

            this.dialog?.close();
            this.controller.showToast("stockEntrySaved", [state.totalQuantity]);
            this.refresh();
            this.controller.products.refresh();
        } catch (error) {
            this.controller.handleError(error, "stockEntryError");
        }
    };

    public onClose = (): void => {
        this.dialog?.close();
    };

    public onEntryPress = async (event: Event): Promise<void> => {
        const context = (event.getSource() as Control).getBindingContext() as Context;

        if (!this.detailsDialog) {
            this.detailsDialog = await this.loadFragment("StockEntryDetailsDialog");
        }

        this.detailsDialog.bindElement({ path: context.getPath(), parameters: { $expand: "Items" } });
        this.detailsDialog.setStretch(window.innerWidth < FULL_SCREEN_MAX_WIDTH);
        this.detailsDialog.open();
    };

    public onCloseDetails = (): void => {
        this.detailsDialog?.close();
    };

    private setLines(lines: StockLine[]): void {
        this.model.setProperty("/lines", lines);
        this.model.setProperty("/totalQuantity", lines.reduce((total, line) => total + (Number(line.Quantity) || 0), 0));
        this.model.setProperty("/totalCost", lines.reduce((total, line) => total + (Number(line.Quantity) || 0) * (Number(line.UnitCost) || 0), 0));
    }

    private getState(): StockState {
        return this.model.getData() as StockState;
    }

    private emptyState(): StockState {
        return { lines: [], note: "", totalQuantity: 0, totalCost: 0 };
    }

    private async getDialog(): Promise<Dialog> {
        if (!this.dialog) {
            this.dialog = await this.loadFragment("StockEntryDialog");
            this.dialog.setModel(this.model, MODEL_NAME);
        }

        return this.dialog;
    }

    private async loadFragment(name: string): Promise<Dialog> {
        const view = this.controller.getView();
        const dialog = await Fragment.load({
            id: view?.getId(),
            name: `apps.dflc.benditalook.view.fragments.${name}`,
            controller: this.controller
        }) as Dialog;

        view?.addDependent(dialog);

        return dialog;
    }

}
