import JSONModel from "sap/ui/model/json/JSONModel";
import MessageBox from "sap/m/MessageBox";
import { ValueState } from "sap/ui/core/library";
import type Control from "sap/ui/core/Control";
import type Event from "sap/ui/base/Event";
import type { StepInput$ChangeEvent } from "sap/m/StepInput";
import type { SegmentedButton$SelectionChangeEvent } from "sap/m/SegmentedButton";
import BaseController from "./BaseController";
import OrderService, { CouponStatus, CustomerContact, FulfillmentType, OrderQuote } from "../service/OrderService";
import AddressService, { ZipCodeAddress } from "../service/AddressService";
import ContactStorage from "../service/ContactStorage";

type ValidatedField = "CustomerName" | "CustomerEmail" | "CustomerPhone" | "ZipCode" | "AddressNumber" | "Address" | "District" | "City" | "State";

type AddressLocks = Record<keyof ZipCodeAddress, boolean>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_DIGITS = { min: 10, max: 13 };
const NAME_MIN_LENGTH = 3;
const ADDRESS_FIELDS: Array<keyof ZipCodeAddress> = ["Address", "District", "City", "State"];

const COUPON_STATES: Record<string, ValueState> = {
    [CouponStatus.Applied]: ValueState.Success,
    [CouponStatus.NotBetter]: ValueState.Warning
};

/**
 * @namespace apps.dflc.benditalook.controller
 */
export default class Cart extends BaseController {

    private checkoutModel: JSONModel;

    public onInit(): void {
        this.checkoutModel = new JSONModel(this.initialState());
        this.getView()?.setModel(this.checkoutModel, "checkout");
        this.getRouter().getRoute("cart")?.attachPatternMatched(() => void this.refreshQuote());
    }

    public onQuantityChange(event: StepInput$ChangeEvent): void {
        this.getCartModel().updateQuantity(this.variantIdOf(event), Number(event.getParameter("value")));
        void this.refreshQuote();
    }

    public onRemoveItem(event: Event): void {
        this.getCartModel().removeItem(this.variantIdOf(event));
        void this.refreshQuote();
    }

    public onContinueShopping(): void {
        this.navTo("catalog");
    }

    public onContactChange(): void {
        ContactStorage.save(this.getContact());
    }

    public onFulfillmentChange(event: SegmentedButton$SelectionChangeEvent): void {
        this.checkoutModel.setProperty("/data/FulfillmentType", event.getParameter("item")?.getKey());
        this.onContactChange();
    }

    public async onZipCodeChange(): Promise<void> {
        const zipCode = this.getContact().ZipCode;

        this.onContactChange();

        if (!AddressService.isCompleteZipCode(zipCode)) {
            this.checkoutModel.setProperty("/states/ZipCode", zipCode ? ValueState.Error : ValueState.None);
            return;
        }

        this.checkoutModel.setProperty("/zipLoading", true);

        try {
            const address = await AddressService.lookup(zipCode);

            if (!address) {
                this.checkoutModel.setProperty("/states/ZipCode", ValueState.Error);
                this.applyAddress({ Address: "", District: "", City: "", State: "" });
                return;
            }

            this.checkoutModel.setProperty("/states/ZipCode", ValueState.None);
            this.applyAddress(address);
        } catch {
            this.unlockAddress();
            this.showToast("zipCodeLookupError");
        } finally {
            this.checkoutModel.setProperty("/zipLoading", false);
        }
    }

    public onApplyCoupon(): void {
        const couponInput = (this.checkoutModel.getProperty("/couponInput") as string).trim().toUpperCase();

        this.checkoutModel.setProperty("/data/CouponCode", couponInput);
        void this.refreshQuote();
    }

    public onRemoveCoupon(): void {
        this.checkoutModel.setProperty("/couponInput", "");
        this.checkoutModel.setProperty("/data/CouponCode", "");
        void this.refreshQuote();
    }

    public formatCouponState(couponStatus: string | null | undefined): ValueState {
        return COUPON_STATES[couponStatus ?? ""] ?? ValueState.Error;
    }

    public async onSubmitOrder(): Promise<void> {
        const cartItems = this.getCartModel().getItems();

        if (!cartItems.length || !this.validateContact()) {
            return;
        }

        try {
            const quote = this.checkoutModel.getProperty("/quote") as OrderQuote | null;
            const contact: CustomerContact = {
                ...this.getContact(),
                CouponCode: quote?.CouponStatus === CouponStatus.Applied ? quote.CouponCode ?? "" : ""
            };
            const order = await this.runBusy(() => new OrderService(this.getCatalogModel()).submitOrder(contact, cartItems));

            ContactStorage.save(contact);
            this.getCartModel().clear();
            this.checkoutModel.setData(this.initialState());

            MessageBox.success(this.getText("orderSubmittedMessage", [order.Number]), {
                title: this.getText("orderSubmittedTitle"),
                onClose: () => this.navTo("order", { orderNumber: order.Number, accessCode: order.AccessCode }, true)
            });
        } catch (error) {
            this.getCatalogModel().refresh();
            this.handleError(error, "orderSubmitError");
            void this.refreshQuote();
        }
    }

    public onForgetContact(): void {
        ContactStorage.clear();
        this.checkoutModel.setData(this.initialState());
        void this.refreshQuote();
    }

    private async refreshQuote(): Promise<void> {
        const cartItems = this.getCartModel().getItems();

        if (!cartItems.length) {
            this.checkoutModel.setProperty("/quote", null);
            return;
        }

        try {
            const quote = await new OrderService(this.getCatalogModel()).quoteOrder(cartItems, this.getContact().CouponCode);
            this.checkoutModel.setProperty("/quote", quote);
        } catch (error) {
            this.checkoutModel.setProperty("/quote", null);
            this.handleError(error, "quoteError");
        }
    }

    private applyAddress(address: ZipCodeAddress): void {
        const locks = Object.fromEntries(ADDRESS_FIELDS.map((field) => [field, Boolean(address[field])])) as AddressLocks;

        ADDRESS_FIELDS.forEach((field) => {
            this.checkoutModel.setProperty(`/data/${field}`, address[field]);
            this.checkoutModel.setProperty(`/states/${field}`, ValueState.None);
        });

        this.checkoutModel.setProperty("/locks", locks);
        this.onContactChange();
    }

    private unlockAddress(): void {
        this.checkoutModel.setProperty("/locks", this.unlockedAddress());
    }

    private validateContact(): boolean {
        const contact = this.getContact();
        const isDelivery = contact.FulfillmentType === FulfillmentType.Delivery;
        const validations: Record<ValidatedField, boolean> = {
            CustomerName: contact.CustomerName.trim().length >= NAME_MIN_LENGTH,
            CustomerEmail: EMAIL_PATTERN.test(contact.CustomerEmail.trim()),
            CustomerPhone: this.isValidPhone(contact.CustomerPhone),
            ZipCode: !isDelivery || AddressService.isCompleteZipCode(contact.ZipCode),
            AddressNumber: !isDelivery || Boolean(contact.AddressNumber.trim()),
            Address: !isDelivery || Boolean(contact.Address.trim()),
            District: !isDelivery || Boolean(contact.District.trim()),
            City: !isDelivery || Boolean(contact.City.trim()),
            State: !isDelivery || /^[A-Za-z]{2}$/.test(contact.State.trim())
        };

        (Object.keys(validations) as ValidatedField[]).forEach((field) => {
            this.checkoutModel.setProperty(`/states/${field}`, validations[field] ? ValueState.None : ValueState.Error);
        });

        const isValid = Object.values(validations).every(Boolean);

        if (!isValid) {
            MessageBox.warning(this.getText("contactInvalid"));
        }

        return isValid;
    }

    private isValidPhone(phone: string): boolean {
        const digits = phone.replace(/\D/g, "").length;
        return digits >= PHONE_DIGITS.min && digits <= PHONE_DIGITS.max;
    }

    private getContact(): CustomerContact {
        return this.checkoutModel.getProperty("/data") as CustomerContact;
    }

    private variantIdOf(event: Event): string {
        return (event.getSource() as Control).getBindingContext("cart")?.getProperty("VariantId") as string;
    }

    private unlockedAddress(): AddressLocks {
        return { Address: false, District: false, City: false, State: false };
    }

    private initialState(): object {
        const remembered = ContactStorage.load();
        const data: CustomerContact = {
            CustomerName: "",
            CustomerEmail: "",
            CustomerPhone: "",
            FulfillmentType: FulfillmentType.Delivery,
            ZipCode: "",
            Address: "",
            AddressNumber: "",
            Complement: "",
            District: "",
            City: "",
            State: "",
            Notes: "",
            CouponCode: "",
            ...remembered
        };

        const hasRememberedAddress = AddressService.isCompleteZipCode(data.ZipCode);

        return {
            data,
            hasRememberedData: Object.keys(remembered).length > 0,
            locks: Object.fromEntries(ADDRESS_FIELDS.map((field) => [field, hasRememberedAddress && Boolean(data[field])])),
            zipLoading: false,
            couponInput: "",
            quote: null,
            states: {
                CustomerName: ValueState.None,
                CustomerEmail: ValueState.None,
                CustomerPhone: ValueState.None,
                ZipCode: ValueState.None,
                AddressNumber: ValueState.None,
                Address: ValueState.None,
                District: ValueState.None,
                City: ValueState.None,
                State: ValueState.None
            }
        };
    }

}
