sap.ui.define([], function () {
  "use strict";

  class EmailServerService {
    constructor(adminModel) {
      this.adminModel = adminModel;
    }
    async load() {
      const operation = this.adminModel.bindContext("/EmailServer(...)");
      await operation.invoke();
      return operation.getBoundContext().getObject();
    }
    async save(server) {
      const operation = this.adminModel.bindContext("/SaveEmailServer(...)");
      operation.setParameter("Server", server);
      await operation.invoke();
    }
    async remove() {
      await this.adminModel.bindContext("/RemoveEmailServer(...)").invoke();
    }
    async sendTest(recipient) {
      const operation = this.adminModel.bindContext("/SendTestEmail(...)");
      operation.setParameter("Recipient", recipient);
      await operation.invoke();
    }
  }
  return EmailServerService;
});
//# sourceMappingURL=EmailServerService-dbg.js.map
