import JSONModel from "sap/ui/model/json/JSONModel";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import type Event from "sap/ui/base/Event";
import type Control from "sap/ui/core/Control";
import type ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import type Page from "sap/m/Page";
import type Button from "sap/m/Button";
import type VBox from "sap/m/VBox";
import type { SearchField$SearchEvent } from "sap/m/SearchField";
import BaseController from "./BaseController";
import OrderService from "../service/OrderService";

const SCROLL_DURATION = 400;

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
        this.viewModel = new JSONModel({ categoryId: "", categoryName: "", search: "", promotions: [] });
        this.getView()?.setModel(this.viewModel, "catalogView");
        (this.byId("headerBack") as Button | undefined)?.setVisible(false);
        this.getRouter().getRoute("catalog")?.attachPatternMatched(() => this.onRouteMatched());
    }

    public onCategoryPress(event: Event): void {
        const context = (event.getSource() as Control).getBindingContext("catalog");

        this.viewModel.setProperty("/categoryId", context ? context.getProperty("ID") as string : "");
        this.viewModel.setProperty("/categoryName", context ? context.getProperty("Name") as string : "");
        this.applyFilters();
    }

    public onSearch(event: SearchField$SearchEvent): void {
        this.viewModel.setProperty("/search", event.getParameter("query") ?? "");
        this.applyFilters();
    }

    public onProductPress(event: Event): void {
        const productId = (event.getSource() as Control).getBindingContext("catalog")?.getProperty("ID") as string | undefined;

        if (!productId) {
            this.getAppComponent().notifyBackendUnavailable();
            return;
        }

        this.navTo("product", { productId });
    }

    public onShopNow(): void {
        (this.byId("catalogPage") as Page).scrollToElement(this.byId("productsSection") as VBox, SCROLL_DURATION);
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
