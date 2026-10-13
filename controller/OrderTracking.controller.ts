import JSONModel from "sap/ui/model/json/JSONModel";
import type { Route$PatternMatchedEvent } from "sap/ui/core/routing/Route";
import type Event from "sap/ui/base/Event";
import type Control from "sap/ui/core/Control";
import BaseController from "./BaseController";
import OrderService, { FulfillmentType } from "../service/OrderService";
import formatter, { OrderStatus } from "../model/formatter";

interface TrackingStep {
    text: string;
    icon: string;
    done: boolean;
}

const STEPS = [OrderStatus.New, OrderStatus.InService, OrderStatus.OutForDelivery, OrderStatus.Completed];

/**
 * @namespace apps.dflc.benditalook.controller
 */
export default class OrderTracking extends BaseController {

    private trackingModel: JSONModel;

    public onInit(): void {
        this.trackingModel = new JSONModel({ loaded: false, order: null, steps: [], cancelled: false });
        this.getView()?.setModel(this.trackingModel, "tracking");
        this.getRouter().getRoute("order")?.attachPatternMatched((event) => this.onRouteMatched(event));
    }

    public onContactWhatsapp(): void {
        const orderNumber = this.trackingModel.getProperty("/order/Number") as number;
        const message = this.getText("whatsappOrderMessage", [orderNumber]);

        window.open(formatter.whatsappUrl(this.getStoreModel().getProperty("/Whatsapp") as string, message), "_blank");
    }

    public onItemPress(event: Event): void {
        const productId = (event.getSource() as Control).getBindingContext("tracking")?.getProperty("ProductId") as string | undefined;

        if (productId) {
            this.navTo("product", { productId });
        }
    }

    public onContinueShopping(): void {
        this.navTo("catalog");
    }

    private async onRouteMatched(event: Route$PatternMatchedEvent): Promise<void> {
        const { orderNumber, accessCode } = event.getParameter("arguments") as { orderNumber: string; accessCode: string };

        this.trackingModel.setProperty("/loaded", false);

        try {
            const order = await this.runBusy(() => new OrderService(this.getCatalogModel()).trackOrder(Number(orderNumber), accessCode));

            this.trackingModel.setData({
                loaded: true,
                order,
                cancelled: order.Status === OrderStatus.Cancelled,
                isPickup: order.FulfillmentType === FulfillmentType.Pickup,
                hasDelivery: !!order.DeliveryType,
                deliveryTypeText: this.formatDeliveryType(order.DeliveryType),
                steps: this.buildSteps(order.Status as OrderStatus, !!order.DeliveryType, order.FulfillmentType === FulfillmentType.Pickup)
            });
        } catch (error) {
            this.handleError(error, "orderNotFound");
        }
    }

    private buildSteps(status: OrderStatus, hasDelivery: boolean, isPickup: boolean): TrackingStep[] {
        const showDeliveryStep = !isPickup && (hasDelivery || status !== OrderStatus.Completed);
        const steps = STEPS.filter((step) => step !== OrderStatus.OutForDelivery || showDeliveryStep);
        const currentIndex = steps.indexOf(status);

        return steps.map((step, index) => ({
            text: this.formatStatus(step),
            icon: index <= currentIndex ? "sap-icon://sys-enter-2" : "sap-icon://circle-task",
            done: index <= currentIndex
        }));
    }

}
