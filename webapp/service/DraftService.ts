import type Context from "sap/ui/model/odata/v4/Context";
import type ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import type { ODataListBinding$CreateCompletedEvent } from "sap/ui/model/odata/v4/ODataListBinding";
import Messaging from "sap/ui/core/Messaging";
import type Message from "sap/ui/core/message/Message";
import type ODataModel from "sap/ui/model/odata/v4/ODataModel";

const SERVICE_NAMESPACE = "BenditaLook";

export class CreationFailedError extends Error {
    public constructor(message: string, public readonly status?: number) {
        super(message);
        this.name = "CreationFailedError";
    }
}

export default class DraftService {

    constructor(private readonly adminModel: ODataModel) { }

    public async createDraft(listBinding: ODataListBinding, data: object): Promise<Context> {
        const draftContext = listBinding.create(data, true);

        await Promise.race([draftContext.created(), this.creationFailure(listBinding, draftContext)]);

        return draftContext;
    }

    public async editDraft(activeContext: Context): Promise<Context> {
        const operation = this.adminModel.bindContext(`${SERVICE_NAMESPACE}.draftEdit(...)`, activeContext, {
            $$inheritExpandSelect: true
        });

        operation.setParameter("PreserveChanges", true);

        return await operation.invoke() as Context;
    }

    public async activateDraft(draftContext: Context): Promise<Context> {
        await this.submitPendingChanges();

        const operation = this.adminModel.bindContext(`${SERVICE_NAMESPACE}.draftActivate(...)`, draftContext, {
            $$inheritExpandSelect: true
        });

        return await operation.invoke() as Context;
    }

    public async discardDraft(draftContext: Context): Promise<void> {
        this.adminModel.resetChanges();

        await draftContext.delete();
    }

    private creationFailure(listBinding: ODataListBinding, context: Context): Promise<never> {
        return new Promise((_resolve, reject) => {
            const onCreateCompleted = (event: ODataListBinding$CreateCompletedEvent): void => {
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

    private lastRequestError(): CreationFailedError {
        const messages = (Messaging.getMessageModel().getData() as Message[]).filter((message) => message.getTechnical());
        const lastMessage = messages[messages.length - 1];
        const details = lastMessage?.getTechnicalDetails() as { httpStatus?: number } | undefined;

        return new CreationFailedError(lastMessage?.getMessage() ?? "", details?.httpStatus);
    }

    public async submitPendingChanges(): Promise<void> {
        if (this.adminModel.hasPendingChanges()) {
            await this.adminModel.submitBatch(this.adminModel.getUpdateGroupId());
        }
    }

}
