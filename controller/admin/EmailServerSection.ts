import JSONModel from "sap/ui/model/json/JSONModel";
import { ValueState } from "sap/ui/core/library";
import type Admin from "../Admin.controller";
import EmailServerService, { type EmailServerInfo } from "../../service/EmailServerService";

enum EmailServerSource {
    Settings = "SETTINGS",
    Environment = "ENVIRONMENT"
}

interface EmailServerState extends EmailServerInfo {
    loaded: boolean;
    Password: string;
    testRecipient: string;
}

export default class EmailServerSection {

    public readonly model = new JSONModel(this.emptyState());

    constructor(private readonly controller: Admin) { }

    public onSave = async (): Promise<void> => {
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

    public onRemove = async (): Promise<void> => {
        if (!await this.controller.confirm("confirmRemoveEmailServer")) {
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

    public onSendTest = async (): Promise<void> => {
        const recipient = this.state().testRecipient.trim();

        try {
            await this.controller.runBusy(() => this.service().sendTest(recipient));
            this.controller.showToast("emailTestSent", [recipient]);
        } catch (error) {
            this.controller.handleError(error, "emailTestError");
        }
    };

    public sourceText = (source: string): string => {
        return source ? this.controller.getText(`emailSource.${source}`) : "";
    };

    public sourceState = (source: string): ValueState => {
        if (source === EmailServerSource.Settings) {
            return ValueState.Success;
        }

        return source === EmailServerSource.Environment ? ValueState.Information : ValueState.Warning;
    };

    public async load(): Promise<void> {
        try {
            const info = await this.controller.runBusy(() => this.service().load());

            this.model.setData({ ...info, loaded: true, Password: "", testRecipient: this.state().testRecipient });
        } catch (error) {
            this.controller.handleError(error, "emailServerLoadError");
        }
    }

    private state(): EmailServerState {
        return this.model.getData() as EmailServerState;
    }

    private emptyState(): EmailServerState {
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

    private service(): EmailServerService {
        return new EmailServerService(this.controller.getAdminModel());
    }

}
