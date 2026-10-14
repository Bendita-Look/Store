import Fragment from "sap/ui/core/Fragment";
import type Dialog from "sap/m/Dialog";
import type Table from "sap/m/Table";
import type Control from "sap/ui/core/Control";
import type Event from "sap/ui/base/Event";
import type Context from "sap/ui/model/odata/v4/Context";
import type ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import type Admin from "../Admin.controller";
import DraftService from "../../service/DraftService";

export default class PromotionsSection {

    private dialog?: Dialog;

    constructor(private readonly controller: Admin) { }

    public onNewPromotion = async (): Promise<void> => {
        try {
            const draft = await this.controller.runBusy(() => this.draftService().createDraft(this.getTableBinding(), {
                Active: true,
                Scope: "ALL",
                RewardType: "PERCENT",
                MinQuantity: 1
            }));
            await this.openDialog(draft);
        } catch (error) {
            this.controller.handleError(error, "promotionCreateError");
        }
    };

    public onEditPromotion = async (event: Event): Promise<void> => {
        const context = this.contextOf(event);

        try {
            const draft = context.getProperty("IsActiveEntity") === false
                ? context
                : await this.controller.runBusy(() => this.draftService().editDraft(context));

            await this.openDialog(draft);
        } catch (error) {
            this.controller.handleError(error, "promotionEditError");
        }
    };

    public onDeletePromotion = async (event: Event): Promise<void> => {
        const context = this.contextOf(event);

        if (!await this.controller.confirm("confirmDeletePromotion", [context.getProperty("Name") ?? ""])) {
            return;
        }

        try {
            await this.controller.runBusy(() => context.delete());
            this.controller.showToast("promotionDeleted");
        } catch (error) {
            this.getTableBinding().refresh();
            this.controller.handleError(error, "promotionDeleteError");
        }
    };

    public onCouponChange = (): void => {
        const context = this.getDialogContext();
        const couponCode = (context.getProperty("CouponCode") as string | null) ?? "";

        context.setProperty("CouponCode", couponCode.trim().toUpperCase() || null);
    };

    public onPickProduct = async (): Promise<void> => {
        const product = await this.controller.productPicker.pickProduct();

        if (!product) {
            return;
        }

        try {
            const context = this.getDialogContext();

            await context.setProperty("Product_ID", product.ID);
            await context.requestSideEffects([{ $NavigationPropertyPath: "Product" }]);
        } catch (error) {
            this.controller.handleError(error, "promotionSaveError");
        }
    };

    public onSavePromotion = async (): Promise<void> => {
        try {
            await this.controller.runBusy(() => this.draftService().activateDraft(this.getDialogContext()));
            this.closeDialog();
            this.controller.showToast("promotionSaved");
        } catch (error) {
            this.controller.handleError(error, "promotionSaveError");
        }
    };

    public onCancelPromotion = async (): Promise<void> => {
        try {
            await this.draftService().discardDraft(this.getDialogContext());
        } catch (error) {
            this.controller.handleError(error, "promotionCancelError");
        } finally {
            this.closeDialog();
        }
    };

    public refresh(): void {
        this.getTableBinding()?.refresh();
    }

    private closeDialog(): void {
        this.dialog?.close();
        this.dialog?.unbindElement();
        this.getTableBinding().refresh();
    }

    private async openDialog(draft: Context): Promise<void> {
        const dialog = await this.getDialog();

        dialog.setBindingContext(draft);
        dialog.open();
    }

    private getDialogContext(): Context {
        return this.dialog?.getBindingContext() as Context;
    }

    private contextOf(event: Event): Context {
        return (event.getSource() as Control).getBindingContext() as Context;
    }

    private draftService(): DraftService {
        return new DraftService(this.controller.getAdminModel());
    }

    private getTableBinding(): ODataListBinding {
        return this.controller.byControlId<Table>("promotionsTable").getBinding("items") as ODataListBinding;
    }

    private async getDialog(): Promise<Dialog> {
        if (!this.dialog) {
            const view = this.controller.getView();

            this.dialog = await Fragment.load({
                id: view?.getId(),
                name: "apps.dflc.benditalook.view.fragments.PromotionDialog",
                controller: this.controller
            }) as Dialog;

            view?.addDependent(this.dialog);
        }

        return this.dialog;
    }

}
