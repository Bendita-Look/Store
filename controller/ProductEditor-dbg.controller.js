sap.ui.define(["sap/ui/model/json/JSONModel", "sap/ui/unified/ColorPickerPopover", "sap/ui/unified/library", "./BaseController", "../service/DraftService", "../service/MediaService", "../service/ImageCompressor"], function (JSONModel, ColorPickerPopover, sap_ui_unified_library, __BaseController, __DraftService, __MediaService, __ImageCompressor) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const ColorPickerMode = sap_ui_unified_library["ColorPickerMode"];
  const BaseController = _interopRequireDefault(__BaseController);
  const DraftService = _interopRequireDefault(__DraftService);
  const MediaService = _interopRequireDefault(__MediaService);
  const ImageCompressor = _interopRequireDefault(__ImageCompressor);
  const PLACEHOLDER_IMAGE = "img/placeholder.svg";

  /**
   * @namespace apps.dflc.benditalook.controller
   */
  const ProductEditor = BaseController.extend("apps.dflc.benditalook.controller.ProductEditor", {
    onInit: function _onInit() {
      this.editorModel = new JSONModel({
        colorOptions: [],
        imageUrls: {}
      });
      this.getView()?.setModel(this.editorModel, "editor");
      this.getRouter().getRoute("adminProduct")?.attachPatternMatched(event => this.onRouteMatched(event));
    },
    draftImageUrl: function _draftImageUrl(imageId, imageUrls) {
      return imageUrls?.[imageId] ?? PLACEHOLDER_IMAGE;
    },
    onAddColor: function _onAddColor() {
      this.getListBinding("colorsTable").create({
        Name: ""
      }, true);
    },
    onAddVariant: function _onAddVariant() {
      this.getListBinding("variantsTable").create({
        Size: "",
        Stock: 0
      }, true);
    },
    onDeleteRow: async function _onDeleteRow(event) {
      const context = event.getSource().getBindingContext();
      try {
        await context.delete();
        this.refreshColorOptions();
      } catch (error) {
        this.handleError(error, "rowDeleteError");
      }
    },
    onColorNameChange: function _onColorNameChange() {
      this.refreshColorOptions();
    },
    onColorsUpdated: function _onColorsUpdated() {
      this.refreshColorOptions();
    },
    onImagesUpdated: function _onImagesUpdated() {
      void this.loadImages();
    },
    onOpenColorPicker: function _onOpenColorPicker(event) {
      const source = event.getSource();
      this.colorPickerContext = source.getBindingContext();
      this.getColorPicker().setColorString(this.colorPickerContext.getProperty("HexCode") || "#ffffff");
      this.getColorPicker().openBy(source);
    },
    onImageSelected: async function _onImageSelected(event) {
      const uploader = event.getSource();
      const file = event.getParameter("files")?.[0];
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
          const imageId = imageContext.getProperty("ID");
          await MediaService.uploadDraftImage(imageId, content, ImageCompressor.outputType);
          this.setImageUrl(imageId, await MediaService.loadDraftImage(imageId));
        });
      } catch (error) {
        this.handleError(error, "imageUploadError");
      }
    },
    onSave: async function _onSave() {
      try {
        await this.runBusy(() => this.draftService().activateDraft(this.getDraftContext()));
        this.showToast("productSaved");
        this.closeEditor();
      } catch (error) {
        this.handleError(error, "productSaveError");
      }
    },
    onDiscard: async function _onDiscard() {
      if (!(await this.confirm("confirmDiscardProduct"))) {
        return;
      }
      try {
        await this.runBusy(() => this.draftService().discardDraft(this.getDraftContext()));
        this.closeEditor();
      } catch (error) {
        this.handleError(error, "productDiscardError");
      }
    },
    onBackToList: function _onBackToList() {
      this.closeEditor();
    },
    onRouteMatched: async function _onRouteMatched(event) {
      const {
        productId
      } = event.getParameter("arguments");
      if (!(await this.ensureAdminModel())) {
        this.navTo("login", {}, true);
        return;
      }
      this.editorModel.setData({
        colorOptions: [],
        imageUrls: {}
      });
      this.getView()?.bindElement({
        path: `/Products(ID=${productId},IsActiveEntity=false)`
      });
      this.byId("categorySelect")?.getBinding("items")?.refresh();
    },
    refreshColorOptions: function _refreshColorOptions() {
      const colors = this.getListBinding("colorsTable").getAllCurrentContexts().map(context => context.getObject()).filter(color => color?.ID);
      const options = [{
        key: "",
        text: this.getText("noColor")
      }, ...colors.map(color => ({
        key: color.ID,
        text: color.Name || this.getText("unnamedColor")
      }))];
      this.editorModel.setProperty("/colorOptions", options);
    },
    loadImages: async function _loadImages() {
      const imageIds = this.getListBinding("imagesTable").getAllCurrentContexts().map(context => context.getProperty("ID")).filter(Boolean);
      const loadedUrls = this.editorModel.getProperty("/imageUrls");
      for (const imageId of imageIds.filter(id => !loadedUrls[id])) {
        try {
          this.setImageUrl(imageId, await MediaService.loadDraftImage(imageId));
        } catch {
          this.setImageUrl(imageId, PLACEHOLDER_IMAGE);
        }
      }
    },
    setImageUrl: function _setImageUrl(imageId, url) {
      const imageUrls = this.editorModel.getProperty("/imageUrls");
      this.editorModel.setProperty("/imageUrls", {
        ...imageUrls,
        [imageId]: url
      });
    },
    getColorPicker: function _getColorPicker() {
      if (!this.colorPicker) {
        this.colorPicker = new ColorPickerPopover({
          mode: ColorPickerMode.HSL,
          change: event => {
            this.colorPickerContext?.setProperty("HexCode", (event.getParameter("hex") ?? "").toUpperCase());
          }
        });
        this.getView()?.addDependent(this.colorPicker);
      }
      return this.colorPicker;
    },
    closeEditor: function _closeEditor() {
      this.getView()?.unbindElement();
      this.navTo("admin", {
        tab: "products"
      }, true);
    },
    getDraftContext: function _getDraftContext() {
      return this.getView()?.getBindingContext();
    },
    getListBinding: function _getListBinding(tableId) {
      return this.byId(tableId).getBinding("items");
    },
    draftService: function _draftService() {
      return new DraftService(this.getAdminModel());
    }
  });
  return ProductEditor;
});
//# sourceMappingURL=ProductEditor-dbg.controller.js.map
