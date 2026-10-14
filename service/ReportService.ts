import type ODataModel from "sap/ui/model/odata/v4/ODataModel";

export interface MonthlySales {
    Month: number;
    Orders: number;
    Items: number;
    Revenue: number;
}

export interface ProductSales {
    ProductName: string;
    Quantity: number;
    Revenue: number;
}

export interface SalesReport {
    Year: number;
    CompletedOrders: number;
    ItemsSold: number;
    Revenue: number;
    AverageTicket: number;
    OpenOrders: number;
    OpenAmount: number;
    CancelledOrders: number;
    CustomerArrangedDeliveries: number;
    Months: MonthlySales[];
    TopProducts: ProductSales[];
}

export default class ReportService {

    constructor(private readonly adminModel: ODataModel) { }

    public async salesReport(year: number): Promise<SalesReport> {
        const operation = this.adminModel.bindContext("/SalesReport(...)");

        operation.setParameter("Year", year);

        await operation.invoke();

        return operation.getBoundContext().getObject() as SalesReport;
    }

}
