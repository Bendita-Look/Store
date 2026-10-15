import JSONModel from "sap/ui/model/json/JSONModel";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import type Table from "sap/m/Table";
import type Control from "sap/ui/core/Control";
import type Event from "sap/ui/base/Event";
import type Context from "sap/ui/model/odata/v4/Context";
import type ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import type Admin from "../Admin.controller";
import DraftService from "../../service/DraftService";

const ALL = "ALL";
const SEARCH_DELAY = 300;

enum ProductStatusFilter {
    Active = "ACTIVE",
    Inactive = "INACTIVE"
}

enum ProductStockFilter {
    Available = "AVAILABLE",
    SoldOut = "SOLD_OUT"
}

interface ProductFilters {
    search: string;
    category: string;
    status: string;
    stock: string;
}

export default class ProductsSection {

    public readonly filterModel = new JSONModel(this.emptyFilters());

    private searchTimer?: ReturnType<typeof setTimeout>;

    constructor(private readonly controller: Admin) { }

    public onSearch = (): void => {
        clearTimeout(this.searchTimer);
        this.searchTimer = setTimeout(() => this.applyFilters(), SEARCH_DELAY);
    };

    public onFilterChange = (): void => {
        this.applyFilters();
    };

    public onClearFilters = (): void => {
        this.filterModel.setData(this.emptyFilters());
        this.applyFilters();
    };

    public onNewProduct = async (): Promise<void> => {
        try {
            const draft = await this.controller.runBusy(() => this.draftService().createDraft(this.getTableBinding(), { Active: true }));
            this.openEditor(draft);
        } catch (error) {
            this.controller.handleError(error, "productCreateError");
        }
    };

    public onProductPress = async (event: Event): Promise<void> => {
        const context = this.contextOf(event);

        if (context.getProperty("IsActiveEntity") === false) {
            this.openEditor(context);
            return;
        }

        try {
            const draft = await this.controller.runBusy(() => this.draftService().editDraft(context));
            this.openEditor(draft);
        } catch (error) {
            this.controller.handleError(error, "productEditError");
        }
    };

    public onDeleteProduct = async (event: Event): Promise<void> => {
        const context = this.contextOf(event);

        if (!await this.controller.confirm("confirmDeleteProduct", [context.getProperty("Name") ?? ""])) {
            return;
        }

        try {
            await this.controller.runBusy(() => context.delete());
            this.controller.showToast("productDeleted");
        } catch (error) {
            this.controller.handleError(error, "productDeleteError");
        }
    };

    public refresh(): void {
        this.getTableBinding()?.refresh();
    }

    private applyFilters(): void {
        const criteria = this.filterModel.getData() as ProductFilters;
        const filters: Filter[] = [];
        const search = criteria.search.trim();

        if (search) {
            filters.push(new Filter({ path: "Name", operator: FilterOperator.Contains, value1: search, caseSensitive: false }));
        }

        if (criteria.category) {
            filters.push(new Filter("Category_ID", FilterOperator.EQ, criteria.category));
        }

        if (criteria.status !== ALL) {
            filters.push(new Filter("Active", FilterOperator.EQ, criteria.status === ProductStatusFilter.Active));
        }

        if (criteria.stock === ProductStockFilter.Available) {
            filters.push(new Filter({ path: "Variants", operator: FilterOperator.Any, variable: "variant", condition: new Filter("variant/Stock", FilterOperator.GT, 0) }));
        }

        if (criteria.stock === ProductStockFilter.SoldOut) {
            filters.push(new Filter({ path: "Variants", operator: FilterOperator.All, variable: "variant", condition: new Filter("variant/Stock", FilterOperator.LE, 0) }));
        }

        this.getTableBinding().filter(filters.length ? new Filter({ filters, and: true }) : []);
    }

    private emptyFilters(): ProductFilters {
        return { search: "", category: "", status: ALL, stock: ALL };
    }

    private openEditor(draft: Context): void {
        this.controller.navTo("adminProduct", { productId: draft.getProperty("ID") as string });
    }

    private contextOf(event: Event): Context {
        return (event.getSource() as Control).getBindingContext() as Context;
    }

    private draftService(): DraftService {
        return new DraftService(this.controller.getAdminModel());
    }

    private getTableBinding(): ODataListBinding {
        return this.controller.byControlId<Table>("productsTable").getBinding("items") as ODataListBinding;
    }

}
