sap.ui.define(["sap/ui/model/json/JSONModel", "sap/m/MessageBox", "sap/ui/core/library", "./BaseController", "../service/OrderService", "../service/AddressService", "../service/ContactStorage"], function (JSONModel, MessageBox, sap_ui_core_library, __BaseController, __OrderService, __AddressService, __ContactStorage) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const ValueState = sap_ui_core_library["ValueState"];
  const BaseController = _interopRequireDefault(__BaseController);
  const OrderService = _interopRequireDefault(__OrderService);
  const CouponStatus = __OrderService["CouponStatus"];
  const FulfillmentType = __OrderService["FulfillmentType"];
  const AddressService = _interopRequireDefault(__AddressService);
  const ContactStorage = _interopRequireDefault(__ContactStorage);
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_DIGITS = {
    min: 10,
    max: 13
  };
  const NAME_MIN_LENGTH = 3;
  const ADDRESS_FIELDS = ["Address", "District", "City", "State"];
  const COUPON_STATES = {
    [CouponStatus.Applied]: ValueState.Success,
    [CouponStatus.NotBetter]: ValueState.Warning
  };

  /**
   * @namespace apps.dflc.benditalook.controller
   */
  const Cart = BaseController.extend("apps.dflc.benditalook.controller.Cart", {
    onInit: function _onInit() {
      this.checkoutModel = new JSONModel(this.initialState());
      this.getView()?.setModel(this.checkoutModel, "checkout");
      this.getRouter().getRoute("cart")?.attachPatternMatched(() => void this.refreshQuote());
    },
    onQuantityChange: function _onQuantityChange(event) {
      this.getCartModel().updateQuantity(this.variantIdOf(event), Number(event.getParameter("value")));
      void this.refreshQuote();
    },
    onRemoveItem: function _onRemoveItem(event) {
      this.getCartModel().removeItem(this.variantIdOf(event));
      void this.refreshQuote();
    },
    onContinueShopping: function _onContinueShopping() {
      this.navTo("catalog");
    },
    onContactChange: function _onContactChange() {
      ContactStorage.save(this.getContact());
    },
    onFulfillmentChange: function _onFulfillmentChange(event) {
      this.checkoutModel.setProperty("/data/FulfillmentType", event.getParameter("item")?.getKey());
      this.onContactChange();
    },
    onZipCodeChange: async function _onZipCodeChange() {
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
          this.applyAddress({
            Address: "",
            District: "",
            City: "",
            State: ""
          });
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
    },
    onApplyCoupon: function _onApplyCoupon() {
      const couponInput = this.checkoutModel.getProperty("/couponInput").trim().toUpperCase();
      this.checkoutModel.setProperty("/data/CouponCode", couponInput);
      void this.refreshQuote();
    },
    onRemoveCoupon: function _onRemoveCoupon() {
      this.checkoutModel.setProperty("/couponInput", "");
      this.checkoutModel.setProperty("/data/CouponCode", "");
      void this.refreshQuote();
    },
    formatCouponState: function _formatCouponState(couponStatus) {
      return COUPON_STATES[couponStatus ?? ""] ?? ValueState.Error;
    },
    onSubmitOrder: async function _onSubmitOrder() {
      const cartItems = this.getCartModel().getItems();
      if (!cartItems.length || !this.validateContact()) {
        return;
      }
      try {
        const quote = this.checkoutModel.getProperty("/quote");
        const contact = {
          ...this.getContact(),
          CouponCode: quote?.CouponStatus === CouponStatus.Applied ? quote.CouponCode ?? "" : ""
        };
        const order = await this.runBusy(() => new OrderService(this.getCatalogModel()).submitOrder(contact, cartItems));
        ContactStorage.save(contact);
        this.getCartModel().clear();
        this.checkoutModel.setData(this.initialState());
        MessageBox.success(this.getText("orderSubmittedMessage", [order.Number]), {
          title: this.getText("orderSubmittedTitle"),
          onClose: () => this.navTo("order", {
            orderNumber: order.Number,
            accessCode: order.AccessCode
          }, true)
        });
      } catch (error) {
        this.getCatalogModel().refresh();
        this.handleError(error, "orderSubmitError");
        void this.refreshQuote();
      }
    },
    onForgetContact: function _onForgetContact() {
      ContactStorage.clear();
      this.checkoutModel.setData(this.initialState());
      void this.refreshQuote();
    },
    refreshQuote: async function _refreshQuote() {
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
    },
    applyAddress: function _applyAddress(address) {
      const locks = Object.fromEntries(ADDRESS_FIELDS.map(field => [field, Boolean(address[field])]));
      ADDRESS_FIELDS.forEach(field => {
        this.checkoutModel.setProperty(`/data/${field}`, address[field]);
        this.checkoutModel.setProperty(`/states/${field}`, ValueState.None);
      });
      this.checkoutModel.setProperty("/locks", locks);
      this.onContactChange();
    },
    unlockAddress: function _unlockAddress() {
      this.checkoutModel.setProperty("/locks", this.unlockedAddress());
    },
    validateContact: function _validateContact() {
      const contact = this.getContact();
      const isDelivery = contact.FulfillmentType === FulfillmentType.Delivery;
      const validations = {
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
      Object.keys(validations).forEach(field => {
        this.checkoutModel.setProperty(`/states/${field}`, validations[field] ? ValueState.None : ValueState.Error);
      });
      const isValid = Object.values(validations).every(Boolean);
      if (!isValid) {
        MessageBox.warning(this.getText("contactInvalid"));
      }
      return isValid;
    },
    isValidPhone: function _isValidPhone(phone) {
      const digits = phone.replace(/\D/g, "").length;
      return digits >= PHONE_DIGITS.min && digits <= PHONE_DIGITS.max;
    },
    getContact: function _getContact() {
      return this.checkoutModel.getProperty("/data");
    },
    variantIdOf: function _variantIdOf(event) {
      return event.getSource().getBindingContext("cart")?.getProperty("VariantId");
    },
    unlockedAddress: function _unlockedAddress() {
      return {
        Address: false,
        District: false,
        City: false,
        State: false
      };
    },
    initialState: function _initialState() {
      const remembered = ContactStorage.load();
      const data = {
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
        locks: Object.fromEntries(ADDRESS_FIELDS.map(field => [field, hasRememberedAddress && Boolean(data[field])])),
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
  });
  return Cart;
});
//# sourceMappingURL=Cart-dbg.controller.js.map
