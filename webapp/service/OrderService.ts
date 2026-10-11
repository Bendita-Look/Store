import type ODataModel from "sap/ui/model/odata/v4/ODataModel";

export enum FulfillmentType {
    Delivery = "DELIVERY",
    Pickup = "PICKUP"
}

export enum CouponStatus {
    Applied = "APPLIED",
    NotBetter = "NOT_BETTER"
}

export interface CustomerContact {
    CustomerName: string;
    CustomerEmail: string;
    CustomerPhone: string;
    FulfillmentType: FulfillmentType;
    ZipCode: string;
    Address: string;
    AddressNumber: string;
    Complement: string;
    District: string;
    City: string;
    State: string;
    Notes: string;
    CouponCode: string;
}

export interface OrderLineInput {
    VariantId: string;
    Quantity: number;
}

export interface SubmittedOrder {
    Number: number;
    AccessCode: string;
}

export interface AppliedPromotion {
    PromotionName: string;
    RewardType: string;
    DiscountAmount: number;
    GiftDescription?: string;
    CouponCode?: string;
}

export interface OrderQuote {
    SubtotalAmount: number;
    DiscountAmount: number;
    TotalAmount: number;
    CouponCode?: string;
    CouponStatus?: string;
    CouponMessage?: string;
    Promotions: AppliedPromotion[];
}

export interface ActivePromotion {
    Name: string;
    Description?: string;
}

export interface TrackedOrderItem {
    ProductName: string;
    ColorName: string;
    Size: string;
    Quantity: number;
    UnitPrice: number;
    TotalPrice: number;
}

export interface TrackedOrder {
    Number: number;
    Status: string;
    CustomerName: string;
    FulfillmentType: FulfillmentType;
    SubtotalAmount: number;
    DiscountAmount: number;
    TotalAmount: number;
    CouponCode?: string;
    Promotions: AppliedPromotion[];
    DeliveryType?: string;
    CourierName?: string;
    VehiclePlate?: string;
    DeliveryNotes?: string;
    createdAt: string;
    modifiedAt: string;
    Items: TrackedOrderItem[];
}

export default class OrderService {

    constructor(private readonly catalogModel: ODataModel) { }

    public async submitOrder(contact: CustomerContact, items: OrderLineInput[]): Promise<SubmittedOrder> {
        const operation = this.catalogModel.bindContext("/SubmitOrder(...)");

        operation.setParameter("Order", { ...contact, Items: this.toItemsInput(items) });

        await operation.invoke();

        return operation.getBoundContext().getObject() as SubmittedOrder;
    }

    public async quoteOrder(items: OrderLineInput[], couponCode?: string): Promise<OrderQuote> {
        const operation = this.catalogModel.bindContext("/QuoteOrder(...)");

        operation.setParameter("Items", this.toItemsInput(items));
        operation.setParameter("CouponCode", couponCode || null);

        await operation.invoke();

        return operation.getBoundContext().getObject() as OrderQuote;
    }

    public async activePromotions(): Promise<ActivePromotion[]> {
        const operation = this.catalogModel.bindContext("/ActivePromotions(...)");

        await operation.invoke();

        return (operation.getBoundContext().getObject() as { value: ActivePromotion[] }).value;
    }

    public async trackOrder(orderNumber: number, accessCode: string): Promise<TrackedOrder> {
        const operation = this.catalogModel.bindContext("/TrackOrder(...)");

        operation.setParameter("Number", orderNumber);
        operation.setParameter("AccessCode", accessCode);

        await operation.invoke();

        return operation.getBoundContext().getObject() as TrackedOrder;
    }

    private toItemsInput(items: OrderLineInput[]): object[] {
        return items.map((item) => ({ Variant_ID: item.VariantId, Quantity: item.Quantity }));
    }

}
