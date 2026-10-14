import Fragment from "sap/ui/core/Fragment";
import JSONModel from "sap/ui/model/json/JSONModel";
import type Dialog from "sap/m/Dialog";
import type Control from "sap/ui/core/Control";
import type Event from "sap/ui/base/Event";
import type { SearchField$LiveChangeEvent } from "sap/m/SearchField";
import type Admin from "../Admin.controller";
import { imagesForColor, sortBySize } from "../../util/variants";

const FULL_SCREEN_MAX_WIDTH = 600;
const PRODUCTS_LIMIT = 500;
const PRODUCT_EXPAND = "Category($select=Name),Colors($select=ID,Name,HexCode),Variants($select=ID,Size,Stock,Color_ID),Images($select=ID,Color_ID,SortOrder)";

enum PickerMode {
    Variant = "variant",
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
    Active: boolean;
    Category?: { Name: string } | null;
    Colors: PickerColor[];
    Variants: PickerVariant[];
    Images: PickerImage[];
    CoverId?: string;
    Stock: number;
}

export interface PickedVariant {
    ID: string;
    Size: string;
    Stock: number;
    Product: { Name: string; Price: number };
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

    constructor(private readonly controller: Admin) { }

    public get pickedQuantity(): number {
        return this.quantity;
    }

    public pickVariant(): Promise<PickedVariant | undefined> {
        return this.open(PickerMode.Variant) as Promise<PickedVariant | undefined>;
    }

    public pickProduct(): Promise<PickedProduct | undefined> {
        return this.open(PickerMode.Product) as Promise<PickedProduct | undefined>;
    }

    public onSearch = (event: SearchField$LiveChangeEvent): void => {
        this.model.setProperty("/search", event.getParameter("newValue") ?? "");
        this.applyFilter();
    };

    public onProductPress = (event: Event): void => {
        const product = (event.getSource() as Control).getBindingContext("picker")?.getObject() as PickerProduct;

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

        if (!variant || variant.Stock < 1) {
            this.controller.showToast("selectAvailableSize");
            return;
        }

        this.quantity = Math.min(Math.max(1, Number(this.model.getProperty("/quantity")) || 1), variant.Stock);
        this.finish({
            ID: variant.ID,
            Size: variant.Size,
            Stock: variant.Stock,
            Product: { Name: product.Name, Price: Number(product.Price) },
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
        dialog.open();
        void this.loadProducts(mode);

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

    private async loadProducts(mode: PickerMode): Promise<void> {
        this.model.setProperty("/busy", true);

        try {
            const filter = mode === PickerMode.Variant ? "IsActiveEntity eq true and Active eq true" : "IsActiveEntity eq true";
            const contexts = await this.controller.getAdminModel()
                .bindList("/Products", undefined, undefined, undefined, { $filter: filter, $expand: PRODUCT_EXPAND, $orderby: "Name" })
                .requestContexts(0, PRODUCTS_LIMIT);

            this.model.setProperty("/products", contexts.map((context) => this.toPickerProduct(context.getObject() as PickerProduct)));
            this.applyFilter();
        } catch (error) {
            this.controller.handleError(error, "pickerLoadError");
        } finally {
            this.model.setProperty("/busy", false);
        }
    }

    private toPickerProduct(product: PickerProduct): PickerProduct {
        return {
            ...product,
            CoverId: imagesForColor(product.Images ?? [], "")[0]?.ID,
            Stock: (product.Variants ?? []).reduce((total, variant) => total + variant.Stock, 0)
        };
    }

    private applyFilter(): void {
        const search = (this.model.getProperty("/search") as string).trim().toLowerCase();
        const products = this.model.getProperty("/products") as PickerProduct[];

        this.model.setProperty("/filtered", search
            ? products.filter((product) => `${product.Name} ${product.Category?.Name ?? ""}`.toLowerCase().includes(search))
            : products);
    }

    private selectColor(colorId: string): void {
        const product = this.model.getProperty("/product") as PickerProduct;
        const variants = sortBySize(product.Variants.filter((variant) => !colorId || variant.Color_ID === colorId));

        this.model.setProperty("/selectedColorId", colorId);
        this.model.setProperty("/selectedColorName", product.Colors.find((color) => color.ID === colorId)?.Name ?? "");
        this.model.setProperty("/sizes", variants);
        this.model.setProperty("/imageId", imagesForColor(product.Images, colorId)[0]?.ID ?? "");
        this.selectVariant(variants.find((variant) => variant.Stock > 0)?.ID ?? "");
    }

    private selectVariant(variantId: string): void {
        const product = this.model.getProperty("/product") as PickerProduct;

        this.model.setProperty("/selectedVariantId", variantId);
        this.model.setProperty("/stock", product.Variants.find((variant) => variant.ID === variantId)?.Stock ?? 0);
        this.model.setProperty("/quantity", 1);
    }

    private emptyState(mode: PickerMode): object {
        return {
            mode,
            step: "list",
            busy: false,
            search: "",
            products: [],
            filtered: [],
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
