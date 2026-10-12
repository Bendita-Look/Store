import JSONModel from "sap/ui/model/json/JSONModel";
import ColorPickerPopover from "sap/ui/unified/ColorPickerPopover";
import { ColorPickerMode } from "sap/ui/unified/library";
import type { ColorPickerPopover$ChangeEvent } from "sap/ui/unified/ColorPickerPopover";
import type FileUploader from "sap/ui/unified/FileUploader";
import type { FileUploader$ChangeEvent } from "sap/ui/unified/FileUploader";
import type { Route$PatternMatchedEvent } from "sap/ui/core/routing/Route";
import type Control from "sap/ui/core/Control";
import type Event from "sap/ui/base/Event";
import type Table from "sap/m/Table";
import type Context from "sap/ui/model/odata/v4/Context";
import type ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import BaseController from "./BaseController";
import DraftService from "../service/DraftService";
import MediaService from "../service/MediaService";
import ImageCompressor from "../service/ImageCompressor";

interface ColorOption {
    key: string;
    text: string;
}

const PLACEHOLDER_IMAGE = "img/placeholder.svg";

/**
 * @namespace apps.dflc.benditalook.controller
 */
export default class ProductEditor extends BaseController {

    private editorModel: JSONModel;

    private colorPicker?: ColorPickerPopover;

    private colorPickerContext?: Context;

    public onInit(): void {
        this.editorModel = new JSONModel({ colorOptions: [], imageUrls: {} });
        this.getView()?.setModel(this.editorModel, "editor");
        this.getRouter().getRoute("adminProduct")?.attachPatternMatched((event) => this.onRouteMatched(event));
    }

    public draftImageUrl(imageId: string, imageUrls: Record<string, string>): string {
        return imageUrls?.[imageId] ?? PLACEHOLDER_IMAGE;
    }

    public onAddColor(): void {
        this.getListBinding("colorsTable").create({ Name: "" }, true);
    }

    public onAddVariant(): void {
        this.getListBinding("variantsTable").create({ Size: "", Stock: 0 }, true);
    }

    public async onDeleteRow(event: Event): Promise<void> {
        const context = (event.getSource() as Control).getBindingContext() as Context;

        try {
            await context.delete();
            this.refreshColorOptions();
        } catch (error) {
            this.handleError(error, "rowDeleteError");
        }
    }

    public onColorNameChange(): void {
        this.refreshColorOptions();
    }

    public onColorsUpdated(): void {
        this.refreshColorOptions();
    }

    public onImagesUpdated(): void {
        void this.loadImages();
    }

    public onOpenColorPicker(event: Event): void {
        const source = event.getSource() as Control;

        this.colorPickerContext = source.getBindingContext() as Context;
        this.getColorPicker().setColorString(this.colorPickerContext.getProperty("HexCode") as string || "#ffffff");
        this.getColorPicker().openBy(source);
    }

    public async onImageSelected(event: FileUploader$ChangeEvent): Promise<void> {
        const uploader = event.getSource() as FileUploader;
        const file = (event.getParameter("files") as File[] | undefined)?.[0];

        uploader.clear();

        if (!file) {
            return;
        }

        try {
            await this.runBusy(async () => {
                const content = await ImageCompressor.compress(file);
                const imagesBinding = this.getListBinding("imagesTable");
                const imageContext = await this.draftService().createDraft(imagesBinding, {
                    ImageType: ImageCompressor.outputType,
                    SortOrder: imagesBinding.getLength() ?? 0
                });

                const imageId = imageContext.getProperty("ID") as string;

                await MediaService.uploadDraftImage(imageId, content, ImageCompressor.outputType);
                this.setImageUrl(imageId, await MediaService.loadDraftImage(imageId));
            });
        } catch (error) {
            this.handleError(error, "imageUploadError");
        }
    }

    public async onSave(): Promise<void> {
        try {
            await this.runBusy(() => this.draftService().activateDraft(this.getDraftContext()));
            this.showToast("productSaved");
            this.closeEditor();
        } catch (error) {
            this.handleError(error, "productSaveError");
        }
    }

    public async onDiscard(): Promise<void> {
        if (!await this.confirm("confirmDiscardProduct")) {
            return;
        }

        try {
            await this.runBusy(() => this.draftService().discardDraft(this.getDraftContext()));
            this.closeEditor();
        } catch (error) {
            this.handleError(error, "productDiscardError");
        }
    }

    public onBackToList(): void {
        this.closeEditor();
    }

    private async onRouteMatched(event: Route$PatternMatchedEvent): Promise<void> {
        const { productId } = event.getParameter("arguments") as { productId: string };

        if (!await this.ensureAdminModel()) {
            this.navTo("login", {}, true);
            return;
        }

        this.editorModel.setData({ colorOptions: [], imageUrls: {} });

        this.getView()?.bindElement({ path: `/Products(ID=${productId},IsActiveEntity=false)` });
        (this.byId("categorySelect")?.getBinding("items") as ODataListBinding | undefined)?.refresh();
    }

    private refreshColorOptions(): void {
        const colors = this.getListBinding("colorsTable").getAllCurrentContexts()
            .map((context) => context.getObject() as { ID: string; Name: string })
            .filter((color) => color?.ID);

        const options: ColorOption[] = [
            { key: "", text: this.getText("noColor") },
            ...colors.map((color) => ({ key: color.ID, text: color.Name || this.getText("unnamedColor") }))
        ];

        this.editorModel.setProperty("/colorOptions", options);
    }

    private async loadImages(): Promise<void> {
        const imageIds = this.getListBinding("imagesTable").getAllCurrentContexts()
            .map((context) => context.getProperty("ID") as string)
            .filter(Boolean);

        const loadedUrls = this.editorModel.getProperty("/imageUrls") as Record<string, string>;

        for (const imageId of imageIds.filter((id) => !loadedUrls[id])) {
            try {
                this.setImageUrl(imageId, await MediaService.loadDraftImage(imageId));
            } catch {
                this.setImageUrl(imageId, PLACEHOLDER_IMAGE);
            }
        }
    }

    private setImageUrl(imageId: string, url: string): void {
        const imageUrls = this.editorModel.getProperty("/imageUrls") as Record<string, string>;

        this.editorModel.setProperty("/imageUrls", { ...imageUrls, [imageId]: url });
    }

    private getColorPicker(): ColorPickerPopover {
        if (!this.colorPicker) {
            this.colorPicker = new ColorPickerPopover({
                mode: ColorPickerMode.HSL,
                change: (event: ColorPickerPopover$ChangeEvent) => {
                    this.colorPickerContext?.setProperty("HexCode", (event.getParameter("hex") ?? "").toUpperCase());
                }
            });
            this.getView()?.addDependent(this.colorPicker);
        }

        return this.colorPicker;
    }

    private closeEditor(): void {
        this.getView()?.unbindElement();
        this.navTo("admin", { tab: "products" }, true);
    }

    private getDraftContext(): Context {
        return this.getView()?.getBindingContext() as Context;
    }

    private getListBinding(tableId: string): ODataListBinding {
        return (this.byId(tableId) as Table).getBinding("items") as ODataListBinding;
    }

    private draftService(): DraftService {
        return new DraftService(this.getAdminModel());
    }

}
