sap.ui.define(["sap/ui/core/Messaging"], function (Messaging) {
  "use strict";

  const SERVICE_NAMESPACE = "BenditaLook";
  const NETWORK_FAILURE_STATUS = 0;
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
      const knownMessages = this.technicalMessages().length;
      const draftContext = listBinding.create(data, true);
      await Promise.race([draftContext.created(), this.creationFailure(listBinding, draftContext, knownMessages)]);
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
    creationFailure(listBinding, context, knownMessages) {
      return new Promise((_resolve, reject) => {
        const onCreateCompleted = event => {
          if (event.getParameter("context") !== context) {
            return;
          }
          listBinding.detachCreateCompleted(onCreateCompleted);
          if (!event.getParameter("success")) {
            setTimeout(() => {
              reject(this.lastRequestError(knownMessages));
              context.delete().catch(() => undefined);
            });
          }
        };
        listBinding.attachCreateCompleted(onCreateCompleted);
      });
    }
    lastRequestError(knownMessages) {
      const newMessages = this.technicalMessages().slice(knownMessages);
      const lastMessage = newMessages[newMessages.length - 1];
      const details = lastMessage?.getTechnicalDetails();
      return new CreationFailedError(lastMessage?.getMessage() ?? "", details?.httpStatus ?? NETWORK_FAILURE_STATUS);
    }
    technicalMessages() {
      return Messaging.getMessageModel().getData().filter(message => message.getTechnical());
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
