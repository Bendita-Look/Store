sap.ui.define(["sap/ui/model/json/JSONModel", "sap/ui/core/library", "../../service/EmailServerService"], function (JSONModel, sap_ui_core_library, __EmailServerService) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const ValueState = sap_ui_core_library["ValueState"];
  const EmailServerService = _interopRequireDefault(__EmailServerService);
  var EmailServerSource = /*#__PURE__*/function (EmailServerSource) {
    EmailServerSource["Settings"] = "SETTINGS";
    EmailServerSource["Environment"] = "ENVIRONMENT";
    return EmailServerSource;
  }(EmailServerSource || {});
  class EmailServerSection {
    model = new JSONModel(this.emptyState());
    constructor(controller) {
      this.controller = controller;
    }
    onSave = async () => {
      const state = this.state();
      try {
        await this.controller.runBusy(() => this.service().save({
          Host: (state.Host ?? "").trim(),
          Port: Number(state.Port),
          Username: (state.Username ?? "").trim(),
          Sender: (state.Sender ?? "").trim(),
          Password: state.Password
        }));
        this.controller.showToast("emailServerSaved");
        await this.load();
      } catch (error) {
        this.controller.handleError(error, "emailServerSaveError");
      }
    };
    onRemove = async () => {
      if (!(await this.controller.confirm("confirmRemoveEmailServer"))) {
        return;
      }
      try {
        await this.controller.runBusy(() => this.service().remove());
        this.controller.showToast("emailServerRemoved");
        await this.load();
      } catch (error) {
        this.controller.handleError(error, "emailServerRemoveError");
      }
    };
    onSendTest = async () => {
      const recipient = this.state().testRecipient.trim();
      try {
        await this.controller.runBusy(() => this.service().sendTest(recipient));
        this.controller.showToast("emailTestSent", [recipient]);
      } catch (error) {
        this.controller.handleError(error, "emailTestError");
      }
    };
    sourceText = source => {
      return source ? this.controller.getText(`emailSource.${source}`) : "";
    };
    sourceState = source => {
      if (source === EmailServerSource.Settings) {
        return ValueState.Success;
      }
      return source === EmailServerSource.Environment ? ValueState.Information : ValueState.Warning;
    };
    async load() {
      try {
        const info = await this.controller.runBusy(() => this.service().load());
        this.model.setData({
          ...info,
          loaded: true,
          Password: "",
          testRecipient: this.state().testRecipient
        });
      } catch (error) {
        this.controller.handleError(error, "emailServerLoadError");
      }
    }
    state() {
      return this.model.getData();
    }
    emptyState() {
      return {
        loaded: false,
        Host: null,
        Port: 587,
        Username: null,
        Sender: null,
        Password: "",
        Saved: false,
        PasswordReadable: false,
        Source: "",
        testRecipient: ""
      };
    }
    service() {
      return new EmailServerService(this.controller.getAdminModel());
    }
  }
  return EmailServerSection;
});
//# sourceMappingURL=EmailServerSection-dbg.js.map
