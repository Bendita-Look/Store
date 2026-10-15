import Fragment from "sap/ui/core/Fragment";
import JSONModel from "sap/ui/model/json/JSONModel";
import type Dialog from "sap/m/Dialog";
import type Admin from "../Admin.controller";
import AdminOrderService, { DeliveryType } from "../../service/AdminOrderService";
import formatter, { OrderStatus } from "../../model/formatter";

const FULL_SCREEN_MAX_WIDTH = 600;
const PICKUP = "PICKUP";

export interface ComposableOrder {
    ID: string;
    Number: number;
    Status: OrderStatus;
    FulfillmentType: string;
    CustomerName?: string | null;
    CustomerPhone?: string | null;
    DeliveryType?: string | null;
    CourierName?: string | null;
    VehiclePlate?: string | null;
    DeliveryNotes?: string | null;
}

export default class WhatsappComposer {

    public readonly model = new JSONModel({ message: "", phone: "", customer: "" });

    private dialog?: Dialog;

    constructor(private readonly controller: Admin) { }

    public async open(order: ComposableOrder): Promise<void> {
        const link = await this.trackingLink(order.ID);

        this.model.setData({
            message: this.compose(order, link),
            phone: order.CustomerPhone ?? "",
            customer: order.CustomerName ?? ""
        });

        const dialog = await this.getDialog();

        dialog.setStretch(window.innerWidth < FULL_SCREEN_MAX_WIDTH);
        dialog.open();
    }

    public onSend = (): void => {
        const { message, phone } = this.model.getData() as { message: string; phone: string };

        window.open(formatter.whatsappUrl(phone, message.trim()), "_blank");
        this.dialog?.close();
    };

    public onCancel = (): void => {
        this.dialog?.close();
    };

    private compose(order: ComposableOrder, link: string | undefined): string {
        const store = this.controller.getStoreModel();
        const firstName = (order.CustomerName ?? "").trim().split(/\s+/)[0];
        const greeting = firstName
            ? this.text("waGreeting", [firstName, store.getProperty("/StoreName") as string])
            : this.text("waGreetingAnonymous", [store.getProperty("/StoreName") as string]);
        const signature = (store.getProperty("/WhatsappSignature") as string | null)?.trim();

        return [greeting, ...this.body(order, link), signature]
            .filter((paragraph): paragraph is string => Boolean(paragraph))
            .join("\n\n");
    }

    private body(order: ComposableOrder, link: string | undefined): Array<string | undefined> {
        switch (order.Status) {
            case OrderStatus.OutForDelivery:
                return order.DeliveryType === DeliveryType.CustomerArranged ? this.pickedUp(order, link) : this.outForDelivery(order, link);
            case OrderStatus.Completed:
                return [this.text("waCompleted", [order.Number]), this.text("waCompletedLink", [this.storeUrl()]), this.text("waClosing")];
            case OrderStatus.Cancelled:
                return [this.text("waCancelled", [order.Number])];
            default:
                return [
                    this.text("waService", [order.Number]),
                    link ? this.text("waServiceLink", [link]) : undefined,
                    this.text("waPaymentQuestion"),
                    this.text(order.FulfillmentType === PICKUP ? "waShippingPickup" : "waShippingDelivery"),
                    this.text("waClosing")
                ];
        }
    }

    private outForDelivery(order: ComposableOrder, link: string | undefined): Array<string | undefined> {
        const details = [
            this.text("waDeliveryType", [this.controller.formatDeliveryType(order.DeliveryType)]),
            order.CourierName ? this.text("waCourier", [order.CourierName]) : undefined,
            order.VehiclePlate ? this.text("waPlate", [order.VehiclePlate]) : undefined,
            order.DeliveryNotes ? this.text("waNotes", [order.DeliveryNotes]) : undefined
        ].filter(Boolean).join("\n");

        return [
            this.text("waOutForDelivery", [order.Number]),
            `${this.text("waDeliveryData")}\n${details}`,
            link ? this.text("waTrackLink", [link]) : undefined,
            this.text("waClosing")
        ];
    }

    private pickedUp(order: ComposableOrder, link: string | undefined): Array<string | undefined> {
        return [
            this.text("waPickedUp", [order.Number]),
            order.CourierName ? this.text("waPickedUpBy", [order.CourierName]) : undefined,
            link ? this.text("waTrackLink", [link]) : undefined,
            this.text("waClosing")
        ];
    }

    private async trackingLink(orderId: string): Promise<string | undefined> {
        try {
            return await new AdminOrderService(this.controller.getAdminModel()).trackingUrl(orderId) ?? undefined;
        } catch {
            return undefined;
        }
    }

    private storeUrl(): string {
        return (this.controller.getStoreModel().getProperty("/StoreUrl") as string | null)
            || `${window.location.origin}${window.location.pathname}`;
    }

    private text(key: string, parameters?: unknown[]): string {
        return this.controller.getText(key, parameters);
    }

    private async getDialog(): Promise<Dialog> {
        if (!this.dialog) {
            const view = this.controller.getView();

            this.dialog = await Fragment.load({
                id: view?.getId(),
                name: "apps.dflc.benditalook.view.fragments.WhatsappDialog",
                controller: this.controller
            }) as Dialog;

            this.dialog.setModel(this.model, "whatsapp");
            view?.addDependent(this.dialog);
        }

        return this.dialog;
    }

}
