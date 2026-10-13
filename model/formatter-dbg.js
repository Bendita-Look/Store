sap.ui.define(["sap/base/strings/formatMessage", "sap/base/i18n/Localization", "sap/ui/core/library", "../auth/providers/XsuaaAuthHelper"], function (formatMessage, Localization, sap_ui_core_library, ___auth_providers_XsuaaAuthHelper) {
  "use strict";

  const ValueState = sap_ui_core_library["ValueState"];
  const XsuaaAuthHelper = ___auth_providers_XsuaaAuthHelper["XsuaaAuthHelper"];
  var OrderStatus = /*#__PURE__*/function (OrderStatus) {
    OrderStatus["New"] = "NEW";
    OrderStatus["InService"] = "IN_SERVICE";
    OrderStatus["OutForDelivery"] = "OUT_FOR_DELIVERY";
    OrderStatus["Completed"] = "COMPLETED";
    OrderStatus["Cancelled"] = "CANCELLED";
    return OrderStatus;
  }(OrderStatus || {});
  const PLACEHOLDER_IMAGE = "img/placeholder.svg";
  const CURRENCY = "BRL";
  const BRAZIL_COUNTRY_CODE = "55";
  const LOCAL_PHONE_MAX_DIGITS = 11;
  const STATUS_STATES = {
    [OrderStatus.New]: ValueState.Information,
    [OrderStatus.InService]: ValueState.Warning,
    [OrderStatus.OutForDelivery]: ValueState.Warning,
    [OrderStatus.Completed]: ValueState.Success,
    [OrderStatus.Cancelled]: ValueState.Error
  };
  function languageTag() {
    return Localization.getLanguageTag().toString();
  }
  function formatCurrency(value) {
    return new Intl.NumberFormat(languageTag(), {
      style: "currency",
      currency: CURRENCY
    }).format(Number(value ?? 0));
  }
  function catalogImageUrl(imageId) {
    return imageId ? `${XsuaaAuthHelper.getConfig().catalogService}ProductImages(${imageId})/Image` : PLACEHOLDER_IMAGE;
  }
  function totalStock(variants) {
    return (variants ?? []).reduce((total, variant) => total + (variant.Stock ?? 0), 0);
  }
  function whatsappUrl(phone, message) {
    const digits = (phone ?? "").replace(/\D/g, "");
    const fullNumber = digits.length <= LOCAL_PHONE_MAX_DIGITS ? `${BRAZIL_COUNTRY_CODE}${digits}` : digits;
    const text = message ? `?text=${encodeURIComponent(message)}` : "";
    return `https://wa.me/${fullNumber}${text}`;
  }
  var __exports = {
    currency: formatCurrency,
    negativeAmount(value) {
      const amount = Number(value ?? 0);
      return amount > 0 ? `- ${formatCurrency(amount)}` : "";
    },
    firstAmount(...values) {
      const amount = values.find(value => value !== null && value !== undefined && value !== "");
      return formatCurrency(amount);
    },
    message(pattern, ...values) {
      return formatMessage(pattern, values);
    },
    stockMessage(inStockPattern, soldOutText, stock) {
      return stock > 0 ? formatMessage(inStockPattern, [stock]) : soldOutText;
    },
    variantDescription(...parts) {
      return parts.filter(Boolean).join(" / ");
    },
    date(value) {
      return value ? new Intl.DateTimeFormat(languageTag(), {
        dateStyle: "short",
        timeZone: "UTC"
      }).format(new Date(value)) : "";
    },
    firstText(...values) {
      return values.find(value => Boolean(value?.trim())) ?? "";
    },
    fullAddress(street, number, complement, district, city, state, zipCode) {
      const streetLine = [street, number].filter(Boolean).join(", ");
      const cityLine = [city, state].filter(Boolean).join("/");
      return [streetLine, complement, district, cityLine, zipCode].filter(Boolean).join(" - ");
    },
    dateTime(value) {
      return value ? new Intl.DateTimeFormat(languageTag(), {
        dateStyle: "short",
        timeStyle: "short"
      }).format(new Date(value)) : "";
    },
    catalogImageUrl,
    bannerUrl(bannerId, version) {
      return bannerId ? `${XsuaaAuthHelper.getConfig().catalogService}StoreBanners(${bannerId})/BannerImage?v=${encodeURIComponent(version ?? "")}` : "";
    },
    totalStock,
    whatsappUrl,
    coverImageUrl(images) {
      const cover = [...(images ?? [])].sort((first, second) => (first.SortOrder ?? 0) - (second.SortOrder ?? 0))[0];
      return catalogImageUrl(cover?.ID);
    },
    isSoldOut(variants) {
      return totalStock(variants) === 0;
    },
    statusState(status) {
      return STATUS_STATES[status ?? ""] ?? ValueState.None;
    },
    storeWhatsappUrl(phone) {
      return phone ? whatsappUrl(phone) : "";
    },
    instagramUrl(user) {
      return user ? `https://instagram.com/${user.replace(/^@/, "")}` : "";
    },
    mailtoUrl(email) {
      return email ? `mailto:${email}` : "";
    }
  };
  __exports.OrderStatus = OrderStatus;
  return __exports;
});
//# sourceMappingURL=formatter-dbg.js.map
