import type ODataModel from "sap/ui/model/odata/v4/ODataModel";
import { OrderStatus } from "../model/formatter";
import type { OrderLineInput, OrderQuote } from "./OrderService";

export enum DeliveryType {
    UberFlash = "UBER_FLASH",
    LocalCourier = "LOCAL_COURIER",
    CustomerArranged = "CUSTOMER_ARRANGED"
}

export interface StoreSaleInput {
    CustomerName: string;
    CustomerEmail: string;
    CustomerPhone: string;
    Notes: string;
    CouponCode: string;
    Items: Array<{ VariantId: string; Quantity: number }>;
}

export interface RegisteredSale {
    Number: number;
}

export interface OrderChangeInput {
    Items: OrderLineInput[];
    CouponCode: string;
    ApplyPromotions: boolean;
}

export interface ReturnItemInput {
    OrderItemId?: string;
    ReplacementId?: string;
    Quantity: number;
    Restock: boolean;
}

export interface ReturnInput {
    Reason: string;
    Items: ReturnItemInput[];
    Replacements: OrderLineInput[];
}

export interface ReturnQuote {
    RefundAmount: number;
    ExchangeAmount: number;
    BalanceAmount: number;
}

export interface DeliveryInput {
    DeliveryType: DeliveryType;
    CourierName: string;
    VehiclePlate: string;
    DeliveryNotes: string;
}

export default class AdminOrderService {

    constructor(private readonly adminModel: ODataModel) { }

    public async registerStoreSale(sale: StoreSaleInput): Promise<RegisteredSale> {
        const operation = this.adminModel.bindContext("/RegisterStoreSale(...)");

        operation.setParameter("Sale", { ...sale, Items: this.toItemsInput(sale.Items) });

        await operation.invoke();

        return operation.getBoundContext().getObject() as RegisteredSale;
    }

    public quoteOrderUpdate(orderId: string, change: OrderChangeInput): Promise<OrderQuote> {
        return this.invokeItemsChange("/QuoteOrderUpdate(...)", orderId, change);
    }

    public updateOrderItems(orderId: string, change: OrderChangeInput): Promise<OrderQuote> {
        return this.invokeItemsChange("/UpdateOrderItems(...)", orderId, change);
    }

    public quoteReturn(orderId: string, input: ReturnInput): Promise<ReturnQuote> {
        return this.invokeReturn("/QuoteOrderReturn(...)", orderId, input);
    }

    public registerReturn(orderId: string, input: ReturnInput): Promise<ReturnQuote> {
        return this.invokeReturn("/RegisterOrderReturn(...)", orderId, input);
    }

    public async changeStatus(orderId: string, status: OrderStatus, delivery?: DeliveryInput): Promise<void> {
        const operation = this.adminModel.bindContext("/ChangeOrderStatus(...)");

        operation.setParameter("OrderId", orderId);
        operation.setParameter("Status", status);

        if (delivery) {
            operation.setParameter("Delivery", delivery);
        }

        await operation.invoke();
    }

    private async invokeItemsChange(path: string, orderId: string, change: OrderChangeInput): Promise<OrderQuote> {
        const operation = this.adminModel.bindContext(path);

        operation.setParameter("OrderId", orderId);
        operation.setParameter("Change", { ...change, Items: this.toItemsInput(change.Items) });

        await operation.invoke();

        return operation.getBoundContext().getObject() as OrderQuote;
    }

    private async invokeReturn(path: string, orderId: string, input: ReturnInput): Promise<ReturnQuote> {
        const operation = this.adminModel.bindContext(path);

        operation.setParameter("OrderId", orderId);
        operation.setParameter("Return", {
            Reason: input.Reason,
            Items: input.Items.map((item) => ({
                OrderItem_ID: item.OrderItemId ?? null,
                Replacement_ID: item.ReplacementId ?? null,
                Quantity: item.Quantity,
                Restock: item.Restock
            })),
            Replacements: this.toItemsInput(input.Replacements)
        });

        await operation.invoke();

        return operation.getBoundContext().getObject() as ReturnQuote;
    }

    private toItemsInput(items: OrderLineInput[]): object[] {
        return items.map((item) => ({ Variant_ID: item.VariantId, Quantity: item.Quantity }));
    }

}
