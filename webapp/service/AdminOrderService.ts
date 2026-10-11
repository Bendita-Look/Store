import type ODataModel from "sap/ui/model/odata/v4/ODataModel";
import { OrderStatus } from "../model/formatter";

export enum DeliveryType {
    UberFlash = "UBER_FLASH",
    LocalCourier = "LOCAL_COURIER"
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

        operation.setParameter("Sale", {
            ...sale,
            Items: sale.Items.map((item) => ({ Variant_ID: item.VariantId, Quantity: item.Quantity }))
        });

        await operation.invoke();

        return operation.getBoundContext().getObject() as RegisteredSale;
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

}
