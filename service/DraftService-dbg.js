sap.ui.define(["sap/ui/core/Messaging"], function (Messaging) {
  "use strict";

  const SERVICE_NAMESPACE = "BenditaLook";
  class CreationFailedError extends Error {
    constructor(message, status) {
      super(message);
      this.status = status;
      this.name = "CreationFailedError";
    }
  }
  class DraftService {
    constructor(adminModel) {
      this.adminModel = adminModel;
    }
    async createDraft(listBinding, data) {
      const draftContext = listBinding.create(data, true);
      await Promise.race([draftContext.created(), this.creationFailure(listBinding, draftContext)]);
      return draftContext;
    }
    async editDraft(activeContext) {
      const operation = this.adminModel.bindContext(`${SERVICE_NAMESPACE}.draftEdit(...)`, activeContext, {
        $$inheritExpandSelect: true
      });
      operation.setParameter("PreserveChanges", true);
      return await operation.invoke();
    }
    async activateDraft(draftContext) {
      await this.submitPendingChanges();
      const operation = this.adminModel.bindContext(`${SERVICE_NAMESPACE}.draftActivate(...)`, draftContext, {
        $$inheritExpandSelect: true
      });
      return await operation.invoke();
    }
    async discardDraft(draftContext) {
      this.adminModel.resetChanges();
      await draftContext.delete();
    }
    creationFailure(listBinding, context) {
      return new Promise((_resolve, reject) => {
        const onCreateCompleted = event => {
          if (event.getParameter("context") !== context) {
            return;
          }
          listBinding.detachCreateCompleted(onCreateCompleted);
          if (!event.getParameter("success")) {
            setTimeout(() => {
              reject(this.lastRequestError());
              context.delete().catch(() => undefined);
            });
          }
        };
        listBinding.attachCreateCompleted(onCreateCompleted);
      });
    }
    lastRequestError() {
      const messages = Messaging.getMessageModel().getData().filter(message => message.getTechnical());
      const lastMessage = messages[messages.length - 1];
      const details = lastMessage?.getTechnicalDetails();
      return new CreationFailedError(lastMessage?.getMessage() ?? "", details?.httpStatus);
    }
    async submitPendingChanges() {
      if (this.adminModel.hasPendingChanges()) {
        await this.adminModel.submitBatch(this.adminModel.getUpdateGroupId());
      }
    }
  }
  DraftService.CreationFailedError = CreationFailedError;
  return DraftService;
});
//# sourceMappingURL=DraftService-dbg.js.map
