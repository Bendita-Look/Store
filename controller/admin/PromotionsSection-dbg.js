sap.ui.define(["sap/ui/core/Fragment", "../../service/DraftService"], function (Fragment, __DraftService) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const DraftService = _interopRequireDefault(__DraftService);
  class PromotionsSection {
    constructor(controller) {
      this.controller = controller;
    }
    onNewPromotion = async () => {
      try {
        const draft = await this.controller.runBusy(() => this.draftService().createDraft(this.getTableBinding(), {
          Active: true,
          Scope: "ALL",
          RewardType: "PERCENT",
          MinQuantity: 1
        }));
        await this.openDialog(draft);
      } catch (error) {
        this.controller.handleError(error, "promotionCreateError");
      }
    };
    onEditPromotion = async event => {
      const context = this.contextOf(event);
      try {
        const draft = context.getProperty("IsActiveEntity") === false ? context : await this.controller.runBusy(() => this.draftService().editDraft(context));
        await this.openDialog(draft);
      } catch (error) {
        this.controller.handleError(error, "promotionEditError");
      }
    };
    onDeletePromotion = async event => {
      const context = this.contextOf(event);
      if (!(await this.controller.confirm("confirmDeletePromotion", [context.getProperty("Name") ?? ""]))) {
        return;
      }
      try {
        await this.controller.runBusy(() => context.delete());
        this.controller.showToast("promotionDeleted");
      } catch (error) {
        this.getTableBinding().refresh();
        this.controller.handleError(error, "promotionDeleteError");
      }
    };
    onCouponChange = () => {
      const context = this.getDialogContext();
      const couponCode = context.getProperty("CouponCode") ?? "";
      context.setProperty("CouponCode", couponCode.trim().toUpperCase() || null);
    };
    onSavePromotion = async () => {
      try {
        await this.controller.runBusy(() => this.draftService().activateDraft(this.getDialogContext()));
        this.closeDialog();
        this.controller.showToast("promotionSaved");
      } catch (error) {
        this.controller.handleError(error, "promotionSaveError");
      }
    };
    onCancelPromotion = async () => {
      try {
        await this.draftService().discardDraft(this.getDialogContext());
      } catch (error) {
        this.controller.handleError(error, "promotionCancelError");
      } finally {
        this.closeDialog();
      }
    };
    refresh() {
      this.getTableBinding()?.refresh();
    }
    closeDialog() {
      this.dialog?.close();
      this.dialog?.unbindElement();
      this.getTableBinding().refresh();
    }
    async openDialog(draft) {
      const dialog = await this.getDialog();
      dialog.setBindingContext(draft);
      dialog.open();
    }
    getDialogContext() {
      return this.dialog?.getBindingContext();
    }
    contextOf(event) {
      return event.getSource().getBindingContext();
    }
    draftService() {
      return new DraftService(this.controller.getAdminModel());
    }
    getTableBinding() {
      return this.controller.byControlId("promotionsTable").getBinding("items");
    }
    async getDialog() {
      if (!this.dialog) {
        const view = this.controller.getView();
        this.dialog = await Fragment.load({
          id: view?.getId(),
          name: "apps.dflc.benditalook.view.fragments.PromotionDialog",
          controller: this.controller
        });
        view?.addDependent(this.dialog);
      }
      return this.dialog;
    }
  }
  return PromotionsSection;
});
//# sourceMappingURL=PromotionsSection-dbg.js.map
