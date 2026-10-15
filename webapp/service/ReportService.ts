import type ODataModel from "sap/ui/model/odata/v4/ODataModel";

export interface MonthlySales {
    Month: number;
    Orders: number;
    Items: number;
    Revenue: number;
    Refunds: number;
    Cost: number;
    Profit: number;
    Purchases: number;
}

export interface ProductSales {
    ProductName: string;
    Quantity: number;
    Revenue: number;
    Cost: number;
    Profit: number;
}

export interface CategorySales {
    CategoryName: string;
    Quantity: number;
    Revenue: number;
    Profit: number;
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
    GrossRevenue: number;
    ReturnsCount: number;
    ReturnedItems: number;
    RefundedAmount: number;
    ExchangedAmount: number;
    Cost: number;
    Profit: number;
    Margin: number;
    Purchases: number;
    ItemsWithoutCost: number;
    Months: MonthlySales[];
    TopProducts: ProductSales[];
    TopReturned: ProductSales[];
    TopCategories: CategorySales[];
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
