import JSONModel from "sap/ui/model/json/JSONModel";
import type Control from "sap/ui/core/Control";
import type Context from "sap/ui/model/odata/v4/Context";
import type Admin from "../Admin.controller";
import type { FileUploader$ChangeEvent } from "sap/ui/unified/FileUploader";
import type FileUploader from "sap/ui/unified/FileUploader";
import DraftService from "../../service/DraftService";
import MediaService from "../../service/MediaService";
import ImageCompressor from "../../service/ImageCompressor";

const SETTINGS_FILTER = "IsActiveEntity eq false or SiblingEntity/IsActiveEntity eq null";
const BANNER_MAX_DIMENSION = 1920;

export default class SettingsSection {

    public readonly model = new JSONModel({ editing: false, loaded: false, bannerPreview: null });

    constructor(private readonly controller: Admin) { }

    public onEdit = async (): Promise<void> => {
        try {
            const draft = await this.controller.runBusy(() => this.draftService().editDraft(this.getContext()));
            this.showContext(draft);
        } catch (error) {
            this.controller.handleError(error, "settingsEditError");
        }
    };

    public onSave = async (): Promise<void> => {
        try {
            await this.controller.runBusy(() => this.draftService().activateDraft(this.getContext()));
            this.controller.showToast("settingsSaved");
            await this.load();
            await this.controller.refreshStoreInfo();
        } catch (error) {
            this.controller.handleError(error, "settingsSaveError");
        }
    };

    public onCancel = async (): Promise<void> => {
        try {
            await this.draftService().discardDraft(this.getContext());
        } catch (error) {
            this.controller.handleError(error, "settingsCancelError");
        } finally {
            await this.load();
        }
    };

    public onBannerSelected = async (event: FileUploader$ChangeEvent): Promise<void> => {
        const uploader = event.getSource() as FileUploader;
        const file = (event.getParameter("files") as File[] | undefined)?.[0];

        uploader.clear();

        if (!file) {
            return;
        }

        try {
            await this.controller.runBusy(async () => {
                const context = this.getContext();
                const content = await ImageCompressor.compress(file, BANNER_MAX_DIMENSION);

                await MediaService.uploadMedia(this.bannerPath(context), content, ImageCompressor.outputType);
                context.setProperty("BannerImageType", ImageCompressor.outputType);
                this.setPreview(URL.createObjectURL(content));
            });
        } catch (error) {
            this.controller.handleError(error, "bannerUploadError");
        }
    };

    public onRemoveBanner = async (): Promise<void> => {
        try {
            await this.controller.runBusy(async () => {
                const context = this.getContext();

                await MediaService.deleteMedia(this.bannerPath(context));
                context.setProperty("BannerImageType", null);
                this.setPreview(null);
            });
        } catch (error) {
            this.controller.handleError(error, "bannerUploadError");
        }
    };

    public async load(): Promise<void> {
        try {
            const contexts = await this.controller.runBusy(() => this.controller.getAdminModel()
                .bindList("/StoreSettings", undefined, undefined, undefined, { $filter: SETTINGS_FILTER })
                .requestContexts(0, 1));

            this.showContext(contexts[0]);
        } catch (error) {
            this.controller.handleError(error, "settingsLoadError");
        }
    }

    private showContext(context: Context): void {
        this.getForm().setBindingContext(context);
        this.model.setData({ editing: context.getProperty("IsActiveEntity") === false, loaded: true, bannerPreview: null });
        void this.loadPreview(context);
    }

    private async loadPreview(context: Context): Promise<void> {
        const bannerType = await context.requestProperty("BannerImageType") as string | null;

        if (!bannerType) {
            return;
        }

        try {
            this.setPreview(await MediaService.loadMedia(this.bannerPath(context)));
        } catch {
            this.setPreview(null);
        }
    }

    private setPreview(url: string | null): void {
        const previous = this.model.getProperty("/bannerPreview") as string | null;

        if (previous) {
            URL.revokeObjectURL(previous);
        }

        this.model.setProperty("/bannerPreview", url);
    }

    private bannerPath(context: Context): string {
        return MediaService.settingsBannerPath(context.getProperty("ID") as string, context.getProperty("IsActiveEntity") !== false);
    }

    private getContext(): Context {
        return this.getForm().getBindingContext() as Context;
    }

    private getForm(): Control {
        return this.controller.byControlId<Control>("settingsForm");
    }

    private draftService(): DraftService {
        return new DraftService(this.controller.getAdminModel());
    }

}
