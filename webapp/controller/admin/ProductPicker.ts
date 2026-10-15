import Fragment from "sap/ui/core/Fragment";
import JSONModel from "sap/ui/model/json/JSONModel";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import type GridList from "sap/f/GridList";
import type ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import type Dialog from "sap/m/Dialog";
import type Control from "sap/ui/core/Control";
import type Event from "sap/ui/base/Event";
import type { SearchField$LiveChangeEvent } from "sap/m/SearchField";
import type Admin from "../Admin.controller";
import { imagesForColor, sortBySize } from "../../util/variants";

const FULL_SCREEN_MAX_WIDTH = 600;
const SEARCH_DELAY = 300;

enum PickerMode {
    Variant = "variant",
    Restock = "restock",
    Product = "product"
}

interface PickerColor {
    ID: string;
    Name: string;
    HexCode?: string | null;
}

interface PickerVariant {
    ID: string;
    Size: string;
    Stock: number;
    Color_ID?: string | null;
}

interface PickerImage {
    ID: string;
    Color_ID?: string | null;
    SortOrder?: number | null;
}

interface PickerProduct {
    ID: string;
    Name: string;
    Price: number;
    CostPrice?: number | null;
    Active: boolean;
    Category?: { Name: string } | null;
    Colors: PickerColor[];
    Variants: PickerVariant[];
    Images: PickerImage[];
}

export interface PickedVariant {
    ID: string;
    Size: string;
    Stock: number;
    Product: { Name: string; Price: number; CostPrice: number };
    Color?: { Name: string } | null;
}

export interface PickedProduct {
    ID: string;
    Name: string;
}

type Resolver = (value: PickedVariant | PickedProduct | undefined) => void;

export default class ProductPicker {

    public readonly model = new JSONModel(this.emptyState(PickerMode.Variant));

    private dialog?: Dialog;

    private resolver?: Resolver;

    private picked?: PickedVariant | PickedProduct;

    private quantity = 1;

    private searchTimer?: ReturnType<typeof setTimeout>;

    constructor(private readonly controller: Admin) { }

    public get pickedQuantity(): number {
        return this.quantity;
    }

    public pickVariant(): Promise<PickedVariant | undefined> {
        return this.open(PickerMode.Variant) as Promise<PickedVariant | undefined>;
    }

    public pickRestockVariant(): Promise<PickedVariant | undefined> {
        return this.open(PickerMode.Restock) as Promise<PickedVariant | undefined>;
    }

    public pickProduct(): Promise<PickedProduct | undefined> {
        return this.open(PickerMode.Product) as Promise<PickedProduct | undefined>;
    }

    public onSearch = (event: SearchField$LiveChangeEvent): void => {
        this.model.setProperty("/search", event.getParameter("newValue") ?? "");
        clearTimeout(this.searchTimer);
        this.searchTimer = setTimeout(() => this.applyFilters(), SEARCH_DELAY);
    };

    public soldOutVisible = (mode: string, variants: Array<{ Stock: number }> | null | undefined): boolean => {
        return mode === PickerMode.Variant && (variants ?? []).every((variant) => !(variant.Stock > 0));
    };

    public onProductPress = (event: Event): void => {
        const product = (event.getSource() as Control).getBindingContext()?.getObject() as PickerProduct;

        if (this.model.getProperty("/mode") === PickerMode.Product) {
            this.finish({ ID: product.ID, Name: product.Name });
            return;
        }

        this.model.setProperty("/product", product);
        this.model.setProperty("/step", "detail");
        this.selectColor(product.Colors[0]?.ID ?? "");
    };

    public onBack = (): void => {
        this.model.setProperty("/step", "list");
    };

    public onSwatchPress = (event: Event): void => {
        this.selectColor((event.getSource() as Control).getBindingContext("picker")?.getProperty("ID") as string ?? "");
    };

    public onSizePress = (event: Event): void => {
        this.selectVariant((event.getSource() as Control).getBindingContext("picker")?.getProperty("ID") as string ?? "");
    };

    public onConfirm = (): void => {
        const product = this.model.getProperty("/product") as PickerProduct;
        const variant = product.Variants.find((item) => item.ID === this.model.getProperty("/selectedVariantId"));

        const restock = this.isRestock();

        if (!variant || (!restock && variant.Stock < 1)) {
            this.controller.showToast("selectAvailableSize");
            return;
        }

        const requested = Math.max(1, Number(this.model.getProperty("/quantity")) || 1);

        this.quantity = restock ? requested : Math.min(requested, variant.Stock);
        this.finish({
            ID: variant.ID,
            Size: variant.Size,
            Stock: variant.Stock,
            Product: { Name: product.Name, Price: Number(product.Price), CostPrice: Number(product.CostPrice ?? 0) },
            Color: product.Colors.find((color) => color.ID === variant.Color_ID) ?? null
        });
    };

    public onCancel = (): void => {
        this.dialog?.close();
    };

    private async open(mode: PickerMode): Promise<PickedVariant | PickedProduct | undefined> {
        this.picked = undefined;
        this.quantity = 1;
        this.model.setData(this.emptyState(mode));

        const dialog = await this.getDialog();

        dialog.setStretch(window.innerWidth < FULL_SCREEN_MAX_WIDTH);
        this.applyFilters();
        dialog.open();

        return new Promise((resolve) => {
            this.resolver = resolve;
        });
    }

    private finish(value: PickedVariant | PickedProduct): void {
        this.picked = value;
        this.dialog?.close();
    }

    private onAfterClose(): void {
        this.resolver?.(this.picked);
        this.resolver = undefined;
    }

    private applyFilters(): void {
        const binding = this.controller.byControlId<GridList>("pickerGrid").getBinding("items") as ODataListBinding;
        const search = (this.model.getProperty("/search") as string).trim();
        const filters = [new Filter("IsActiveEntity", FilterOperator.EQ, true)];

        if (this.model.getProperty("/mode") === PickerMode.Variant) {
            filters.push(new Filter("Active", FilterOperator.EQ, true));
        }

        if (search) {
            filters.push(new Filter({
                filters: [
                    new Filter({ path: "Name", operator: FilterOperator.Contains, value1: search, caseSensitive: false }),
                    new Filter({ path: "Category/Name", operator: FilterOperator.Contains, value1: search, caseSensitive: false })
                ],
                and: false
            }));
        }

        binding.filter(new Filter({ filters, and: true }));

        if (binding.isSuspended()) {
            binding.resume();
        }
    }

    private selectColor(colorId: string): void {
        const product = this.model.getProperty("/product") as PickerProduct;
        const variants = sortBySize(product.Variants.filter((variant) => !colorId || variant.Color_ID === colorId));

        this.model.setProperty("/selectedColorId", colorId);
        this.model.setProperty("/selectedColorName", product.Colors.find((color) => color.ID === colorId)?.Name ?? "");
        this.model.setProperty("/sizes", variants);
        this.model.setProperty("/imageId", imagesForColor(product.Images, colorId)[0]?.ID ?? "");
        this.selectVariant((this.isRestock() ? variants[0] : variants.find((variant) => variant.Stock > 0))?.ID ?? "");
    }

    private selectVariant(variantId: string): void {
        const product = this.model.getProperty("/product") as PickerProduct;

        this.model.setProperty("/selectedVariantId", variantId);
        this.model.setProperty("/stock", product.Variants.find((variant) => variant.ID === variantId)?.Stock ?? 0);
        this.model.setProperty("/quantity", 1);
    }

    private isRestock(): boolean {
        return this.model.getProperty("/mode") === PickerMode.Restock;
    }

    private emptyState(mode: PickerMode): object {
        return {
            mode,
            step: "list",
            search: "",
            product: null,
            sizes: [],
            imageId: "",
            selectedColorId: "",
            selectedColorName: "",
            selectedVariantId: "",
            stock: 0,
            quantity: 1
        };
    }

    private async getDialog(): Promise<Dialog> {
        if (!this.dialog) {
            const view = this.controller.getView();

            this.dialog = await Fragment.load({
                id: view?.getId(),
                name: "apps.dflc.benditalook.view.fragments.ProductPickerDialog",
                controller: this.controller
            }) as Dialog;

            this.dialog.setModel(this.model, "picker");
            this.dialog.attachAfterClose(() => this.onAfterClose());
            view?.addDependent(this.dialog);
        }

        return this.dialog;
    }

}
