import JSONModel from "sap/ui/model/json/JSONModel";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import type Event from "sap/ui/base/Event";
import type Control from "sap/ui/core/Control";
import type ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import type { SearchField$SearchEvent } from "sap/m/SearchField";
import BaseController from "./BaseController";
import formatter from "../model/formatter";
import OrderService from "../service/OrderService";

interface CatalogViewState {
    categoryId: string;
    search: string;
}

/**
 * @namespace apps.dflc.benditalook.controller
 */
export default class Catalog extends BaseController {

    private viewModel: JSONModel;

    public onInit(): void {
        this.viewModel = new JSONModel({ categoryId: "", search: "", promotions: [] });
        this.getView()?.setModel(this.viewModel, "catalogView");
        this.getRouter().getRoute("catalog")?.attachPatternMatched(() => this.onRouteMatched());
    }

    public onCategoryPress(event: Event): void {
        const context = (event.getSource() as Control).getBindingContext("catalog");

        this.viewModel.setProperty("/categoryId", context ? context.getProperty("ID") as string : "");
        this.applyFilters();
    }

    public onSearch(event: SearchField$SearchEvent): void {
        this.viewModel.setProperty("/search", event.getParameter("query") ?? "");
        this.applyFilters();
    }

    public onProductPress(event: Event): void {
        const context = (event.getSource() as Control).getBindingContext("catalog");

        this.navTo("product", { productId: context?.getProperty("ID") as string });
    }

    public onOpenAdmin(): void {
        this.navTo("admin");
    }

    public onContactWhatsapp(): void {
        window.open(formatter.whatsappUrl(this.getStoreModel().getProperty("/Whatsapp") as string, this.getText("whatsappGreeting")), "_blank");
    }

    public onContactEmail(): void {
        window.open(formatter.mailtoUrl(this.getStoreModel().getProperty("/ContactEmail") as string), "_self");
    }

    public onOpenInstagram(): void {
        window.open(formatter.instagramUrl(this.getStoreModel().getProperty("/Instagram") as string), "_blank");
    }

    private onRouteMatched(): void {
        const products = this.getProductsBinding();

        if (products && !products.isSuspended() && products.getLength() > 0) {
            products.refresh();
        }

        void this.loadPromotions();
    }

    private getProductsBinding(): ODataListBinding | undefined {
        return this.byId("productGrid")?.getBinding("items") as ODataListBinding | undefined;
    }

    private async loadPromotions(): Promise<void> {
        try {
            this.viewModel.setProperty("/promotions", await new OrderService(this.getCatalogModel()).activePromotions());
        } catch {
            this.viewModel.setProperty("/promotions", []);
        }
    }

    private applyFilters(): void {
        const { categoryId, search } = this.viewModel.getData() as CatalogViewState;
        const filters: Filter[] = [];

        if (categoryId) {
            filters.push(new Filter("Category_ID", FilterOperator.EQ, categoryId));
        }

        if (search.trim()) {
            filters.push(new Filter({ path: "Name", operator: FilterOperator.Contains, value1: search.trim(), caseSensitive: false }));
        }

        this.getProductsBinding()?.filter(filters);
    }

}
