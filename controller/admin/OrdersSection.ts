import Fragment from "sap/ui/core/Fragment";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import JSONModel from "sap/ui/model/json/JSONModel";
import type Dialog from "sap/m/Dialog";
import type Table from "sap/m/Table";
import type Control from "sap/ui/core/Control";
import type Event from "sap/ui/base/Event";
import type Context from "sap/ui/model/odata/v4/Context";
import type ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import type Button from "sap/m/Button";
import type Admin from "../Admin.controller";
import AdminOrderService, { DeliveryInput, DeliveryType } from "../../service/AdminOrderService";
import formatter, { OrderStatus } from "../../model/formatter";
import type { EditableOrder } from "./OrderEditSection";
import type { ReturnableOrder } from "./OrderReturnSection";

const ALL_STATUSES = "ALL";
const FULL_SCREEN_MAX_WIDTH = 600;
const ORDER_EXPAND = "Items,Promotions,Returns($expand=Items;$orderby=createdAt)";
const CHANGE_PARAMETERS = {
    $select: "ID,Number,CouponCode",
    $expand: "Items($select=ID,Variant_ID,ImageId,ProductName,ColorName,Size,Quantity,UnitPrice),Returns($select=ID;$expand=Items($select=ID,Kind,OrderItem_ID,Quantity)),Promotions($select=ID,CouponCode)"
};

type DialogOrder = EditableOrder & ReturnableOrder & {
    CustomerName: string;
    CustomerPhone: string;
};

export default class OrdersSection {

    public readonly deliveryModel = new JSONModel(this.emptyDelivery());

    private dialog?: Dialog;

    private deliveryDialog?: Dialog;

    constructor(private readonly controller: Admin) { }

    public readonly filterModel = new JSONModel({ status: ALL_STATUSES });

    public onStatusPress = (event: Event): void => {
        const status = ((event.getSource() as Button).data("status") as string | null) ?? ALL_STATUSES;
        const filters = status === ALL_STATUSES ? [] : [new Filter("Status", FilterOperator.EQ, status)];

        this.filterModel.setProperty("/status", status);
        this.getTableBinding().filter(filters);
    };

    public onRefresh = (): void => {
        this.refresh();
    };

    public refresh(): void {
        this.getTableBinding()?.refresh();
    }

    public refreshOpenOrder(): void {
        this.dialog?.getElementBinding()?.refresh();
        this.refresh();
    }

    public onEditItems = async (): Promise<void> => {
        const order = await this.loadChangeableOrder();

        if (order) {
            await this.controller.orderEdit.open(order);
        }
    };

    public onRegisterReturn = async (): Promise<void> => {
        const order = await this.loadChangeableOrder();

        if (order) {
            await this.controller.orderReturn.open(order);
        }
    };

    public onOrderPress = async (event: Event): Promise<void> => {
        const context = (event.getSource() as Control).getBindingContext() as Context;
        const dialog = await this.getDialog();

        dialog.bindElement({ path: context.getPath(), parameters: { $expand: ORDER_EXPAND } });
        dialog.setStretch(window.innerWidth < FULL_SCREEN_MAX_WIDTH);
        dialog.open();
    };

    public onItemPress = (event: Event): void => {
        const productId = (event.getSource() as Control).getBindingContext()?.getProperty("Product_ID") as string | undefined;

        if (productId) {
            this.onCloseDialog();
            this.controller.navTo("product", { productId });
        }
    };

    public onCloseDialog = (): void => {
        this.dialog?.close();
    };

    public onStartService = (): Promise<boolean> => this.changeStatus(OrderStatus.InService, "orderStatusChanged");

    public onComplete = (): Promise<boolean> => this.changeStatus(OrderStatus.Completed, "orderStatusChanged");

    public onCancel = async (): Promise<void> => {
        if (await this.controller.confirm("confirmCancelOrder", [this.getDialogOrder().Number])) {
            await this.changeStatus(OrderStatus.Cancelled, "orderCancelled");
        }
    };

    public onOpenDeliveryDialog = async (): Promise<void> => {
        this.deliveryModel.setData(this.emptyDelivery());
        (await this.getDeliveryDialog()).open();
    };

    public onCloseDeliveryDialog = (): void => {
        this.deliveryDialog?.close();
    };

    public onConfirmDelivery = async (): Promise<void> => {
        const delivery = this.deliveryModel.getData() as DeliveryInput;

        if (await this.changeStatus(OrderStatus.OutForDelivery, "orderStatusChanged", delivery)) {
            this.deliveryDialog?.close();
        }
    };

    public onWhatsapp = (): void => {
        const order = this.getDialogOrder();
        const message = this.controller.getText("whatsappCustomerMessage", [order.CustomerName, order.Number]);

        window.open(formatter.whatsappUrl(order.CustomerPhone, message), "_blank");
    };

    private async changeStatus(status: OrderStatus, successKey: string, delivery?: DeliveryInput): Promise<boolean> {
        const order = this.getDialogOrder();

        try {
            await this.controller.runBusy(() => new AdminOrderService(this.controller.getAdminModel()).changeStatus(order.ID, status, delivery));

            this.controller.showToast(successKey, [order.Number]);
            this.refreshOpenOrder();

            return true;
        } catch (error) {
            this.controller.handleError(error, "orderStatusError");

            return false;
        }
    }

    private async loadChangeableOrder(): Promise<DialogOrder | undefined> {
        const path = this.dialog?.getBindingContext()?.getPath() as string;

        try {
            return await this.controller.runBusy(() => this.controller.getAdminModel()
                .bindContext(path, undefined, CHANGE_PARAMETERS)
                .requestObject() as Promise<DialogOrder>);
        } catch (error) {
            this.controller.handleError(error, "orderLoadError");

            return undefined;
        }
    }

    private emptyDelivery(): DeliveryInput {
        return { DeliveryType: DeliveryType.UberFlash, CourierName: "", VehiclePlate: "", DeliveryNotes: "" };
    }

    private getDialogOrder(): DialogOrder {
        return this.dialog?.getBindingContext()?.getObject() as DialogOrder;
    }

    private getTableBinding(): ODataListBinding {
        return this.controller.byControlId<Table>("ordersTable").getBinding("items") as ODataListBinding;
    }

    private async getDialog(): Promise<Dialog> {
        if (!this.dialog) {
            this.dialog = await this.loadFragment("OrderDialog");
        }

        return this.dialog;
    }

    private async getDeliveryDialog(): Promise<Dialog> {
        if (!this.deliveryDialog) {
            this.deliveryDialog = await this.loadFragment("DeliveryDialog");
            this.deliveryDialog.setModel(this.deliveryModel, "delivery");
        }

        return this.deliveryDialog;
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
