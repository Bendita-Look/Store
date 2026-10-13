import JSONModel from "sap/ui/model/json/JSONModel";
import type { Route$PatternMatchedEvent } from "sap/ui/core/routing/Route";
import type Carousel from "sap/m/Carousel";
import type Event from "sap/ui/base/Event";
import type Control from "sap/ui/core/Control";
import BaseController from "./BaseController";

interface CatalogColor {
    ID: string;
    Name: string;
    HexCode?: string;
}

interface CatalogVariant {
    ID: string;
    Color_ID?: string | null;
    Size: string;
    Stock: number;
}

interface CatalogImage {
    ID: string;
    Color_ID?: string | null;
    SortOrder?: number | null;
}

interface CatalogProduct {
    ID: string;
    Name: string;
    Description?: string;
    Price: number;
    Category?: { Name: string };
    Colors: CatalogColor[];
    Variants: CatalogVariant[];
    Images: CatalogImage[];
}

interface SizeOption {
    key: string;
    text: string;
    enabled: boolean;
}

const SIZE_ORDER = ["PP", "P", "M", "G", "GG", "XG", "XGG", "U", "UNICO", "ÚNICO"];

const PRODUCT_EXPAND = "Category($select=Name),Colors,Variants,Images($select=ID,Color_ID,SortOrder)";

/**
 * @namespace apps.dflc.benditalook.controller
 */
export default class Product extends BaseController {

    private productModel: JSONModel;

    public onInit(): void {
        this.productModel = new JSONModel(this.emptyState());
        this.getView()?.setModel(this.productModel, "product");
        this.getRouter().getRoute("product")?.attachPatternMatched((event) => this.onRouteMatched(event));
    }

    public onSwatchPress(event: Event): void {
        this.selectColor((event.getSource() as Control).getBindingContext("product")?.getProperty("ID") as string ?? "");
    }

    public onThumbnailPress(event: Event): void {
        const image = (event.getSource() as Control).getBindingContext("product")?.getObject() as CatalogImage;
        const images = this.productModel.getProperty("/images") as CatalogImage[];
        const carousel = this.byId("productCarousel") as Carousel;
        const page = carousel.getPages()[images.indexOf(image)];

        if (page) {
            carousel.setActivePage(page);
        }
    }

    public onAskAboutProduct(): void {
        this.openWhatsapp(this.getText("whatsappProductMessage", [this.productModel.getProperty("/product/Name")]));
    }

    public onSizePress(event: Event): void {
        this.selectVariant((event.getSource() as Control).getBindingContext("product")?.getProperty("key") as string ?? "");
    }

    public onAddToCart(): void {
        const product = this.productModel.getProperty("/product") as CatalogProduct;
        const variant = this.findVariant(this.productModel.getProperty("/selectedVariantId") as string);

        if (!variant || variant.Stock < 1) {
            this.showToast("selectAvailableSize");
            return;
        }

        const quantity = this.getCartModel().addItem({
            VariantId: variant.ID,
            ProductId: product.ID,
            ProductName: product.Name,
            ColorName: product.Colors.find((color) => color.ID === variant.Color_ID)?.Name ?? "",
            Size: variant.Size,
            UnitPrice: Number(product.Price),
            Quantity: this.productModel.getProperty("/quantity") as number,
            MaxQuantity: variant.Stock,
            ImageId: (this.productModel.getProperty("/images") as CatalogImage[])[0]?.ID ?? ""
        });

        this.showToast("addedToCart", [quantity]);
    }

    private async onRouteMatched(event: Route$PatternMatchedEvent): Promise<void> {
        const { productId } = event.getParameter("arguments") as { productId: string };

        this.productModel.setData(this.emptyState());

        try {
            const product = await this.runBusy(() => this.getCatalogModel()
                .bindContext(`/Products(${productId})`, undefined, { $expand: PRODUCT_EXPAND })
                .requestObject() as Promise<CatalogProduct>);

            this.productModel.setProperty("/product", product);
            this.productModel.setProperty("/colors", product.Colors);
            this.productModel.setProperty("/loaded", true);
            this.selectColor(product.Colors[0]?.ID ?? "");
        } catch (error) {
            this.handleError(error, "productNotFound");
            this.navTo("catalog", {}, true);
        }
    }

    private selectColor(colorId: string): void {
        const product = this.productModel.getProperty("/product") as CatalogProduct;
        const variants = this.sortBySize(product.Variants.filter((variant) => !colorId || variant.Color_ID === colorId));
        const sizes: SizeOption[] = variants.map((variant) => ({ key: variant.ID, text: variant.Size, enabled: variant.Stock > 0 }));

        this.productModel.setProperty("/selectedColorId", colorId);
        this.productModel.setProperty("/selectedColorName", product.Colors.find((color) => color.ID === colorId)?.Name ?? "");
        this.productModel.setProperty("/sizes", sizes);
        this.productModel.setProperty("/images", this.imagesForColor(product.Images, colorId));
        this.selectVariant(sizes.find((size) => size.enabled)?.key ?? "");
    }

    private selectVariant(variantId: string): void {
        const stock = this.findVariant(variantId)?.Stock ?? 0;

        this.productModel.setProperty("/selectedVariantId", variantId);
        this.productModel.setProperty("/stock", stock);
        this.productModel.setProperty("/quantity", 1);
    }

    private findVariant(variantId: string): CatalogVariant | undefined {
        const product = this.productModel.getProperty("/product") as CatalogProduct | null;
        return product?.Variants.find((variant) => variant.ID === variantId);
    }

    private imagesForColor(images: CatalogImage[], colorId: string): CatalogImage[] {
        const sorted = [...images].sort((first, second) => (first.SortOrder ?? 0) - (second.SortOrder ?? 0));
        const forColor = sorted.filter((image) => !image.Color_ID || image.Color_ID === colorId);

        return forColor.length ? forColor : sorted;
    }

    private sortBySize(variants: CatalogVariant[]): CatalogVariant[] {
        const position = (size: string): number => {
            const index = SIZE_ORDER.indexOf(size.toUpperCase());
            const numericSize = Number(size);

            if (index !== -1) {
                return index;
            }

            return SIZE_ORDER.length + (Number.isNaN(numericSize) ? 0 : numericSize);
        };

        return [...variants].sort((first, second) => position(first.Size) - position(second.Size));
    }

    private emptyState(): object {
        return {
            loaded: false,
            product: null,
            colors: [],
            sizes: [],
            images: [],
            selectedColorId: "",
            selectedColorName: "",
            selectedVariantId: "",
            stock: 0,
            quantity: 1
        };
    }

}
