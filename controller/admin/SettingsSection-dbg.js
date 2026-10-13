sap.ui.define(["sap/ui/model/json/JSONModel", "../../service/DraftService", "../../service/MediaService", "../../service/ImageCompressor"], function (JSONModel, __DraftService, __MediaService, __ImageCompressor) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const DraftService = _interopRequireDefault(__DraftService);
  const MediaService = _interopRequireDefault(__MediaService);
  const ImageCompressor = _interopRequireDefault(__ImageCompressor);
  const SETTINGS_FILTER = "IsActiveEntity eq false or SiblingEntity/IsActiveEntity eq null";
  const BANNER_MAX_DIMENSION = 1920;
  class SettingsSection {
    model = new JSONModel({
      editing: false,
      loaded: false,
      bannerPreview: null
    });
    constructor(controller) {
      this.controller = controller;
    }
    onEdit = async () => {
      try {
        const draft = await this.controller.runBusy(() => this.draftService().editDraft(this.getContext()));
        this.showContext(draft);
      } catch (error) {
        this.controller.handleError(error, "settingsEditError");
      }
    };
    onSave = async () => {
      try {
        await this.controller.runBusy(() => this.draftService().activateDraft(this.getContext()));
        this.controller.showToast("settingsSaved");
        await this.load();
        await this.controller.refreshStoreInfo();
      } catch (error) {
        this.controller.handleError(error, "settingsSaveError");
      }
    };
    onCancel = async () => {
      try {
        await this.draftService().discardDraft(this.getContext());
      } catch (error) {
        this.controller.handleError(error, "settingsCancelError");
      } finally {
        await this.load();
      }
    };
    onBannerSelected = async event => {
      const uploader = event.getSource();
      const file = event.getParameter("files")?.[0];
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
    onRemoveBanner = async () => {
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
    async load() {
      try {
        const contexts = await this.controller.runBusy(() => this.controller.getAdminModel().bindList("/StoreSettings", undefined, undefined, undefined, {
          $filter: SETTINGS_FILTER
        }).requestContexts(0, 1));
        this.showContext(contexts[0]);
      } catch (error) {
        this.controller.handleError(error, "settingsLoadError");
      }
    }
    showContext(context) {
      this.getForm().setBindingContext(context);
      this.model.setData({
        editing: context.getProperty("IsActiveEntity") === false,
        loaded: true,
        bannerPreview: null
      });
      void this.loadPreview(context);
    }
    async loadPreview(context) {
      const bannerType = await context.requestProperty("BannerImageType");
      if (!bannerType) {
        return;
      }
      try {
        this.setPreview(await MediaService.loadMedia(this.bannerPath(context)));
      } catch {
        this.setPreview(null);
      }
    }
    setPreview(url) {
      const previous = this.model.getProperty("/bannerPreview");
      if (previous) {
        URL.revokeObjectURL(previous);
      }
      this.model.setProperty("/bannerPreview", url);
    }
    bannerPath(context) {
      return MediaService.settingsBannerPath(context.getProperty("ID"), context.getProperty("IsActiveEntity") !== false);
    }
    getContext() {
      return this.getForm().getBindingContext();
    }
    getForm() {
      return this.controller.byControlId("settingsForm");
    }
    draftService() {
      return new DraftService(this.controller.getAdminModel());
    }
  }
  return SettingsSection;
});
//# sourceMappingURL=SettingsSection-dbg.js.map
