import formatMessage from "sap/base/strings/formatMessage";
import Localization from "sap/base/i18n/Localization";
import { ValueState } from "sap/ui/core/library";
import { XsuaaAuthHelper } from "../auth/providers/XsuaaAuthHelper";

export enum OrderStatus {
    New = "NEW",
    InService = "IN_SERVICE",
    OutForDelivery = "OUT_FOR_DELIVERY",
    Completed = "COMPLETED",
    Cancelled = "CANCELLED"
}

interface ImageReference {
    ID: string;
    SortOrder?: number | null;
}

interface StockReference {
    Stock?: number | null;
}

const PLACEHOLDER_IMAGE = "img/placeholder.svg";
const CURRENCY = "BRL";
const BRAZIL_COUNTRY_CODE = "55";
const LOCAL_PHONE_MAX_DIGITS = 11;

const STATUS_STATES: Record<string, ValueState> = {
    [OrderStatus.New]: ValueState.Information,
    [OrderStatus.InService]: ValueState.Warning,
    [OrderStatus.OutForDelivery]: ValueState.Warning,
    [OrderStatus.Completed]: ValueState.Success,
    [OrderStatus.Cancelled]: ValueState.Error
};

function languageTag(): string {
    return Localization.getLanguageTag().toString();
}

function formatCurrency(value: number | string | null | undefined): string {
    return new Intl.NumberFormat(languageTag(), { style: "currency", currency: CURRENCY }).format(Number(value ?? 0));
}

function catalogImageUrl(imageId: string | null | undefined): string {
    return imageId
        ? `${XsuaaAuthHelper.getConfig().catalogService}ProductImages(${imageId})/Image`
        : PLACEHOLDER_IMAGE;
}

function totalStock(variants: StockReference[] | null | undefined): number {
    return (variants ?? []).reduce((total, variant) => total + (variant.Stock ?? 0), 0);
}

function whatsappUrl(phone: string | null | undefined, message?: string): string {
    const digits = (phone ?? "").replace(/\D/g, "");
    const fullNumber = digits.length <= LOCAL_PHONE_MAX_DIGITS ? `${BRAZIL_COUNTRY_CODE}${digits}` : digits;
    const text = message ? `?text=${encodeURIComponent(message)}` : "";

    return `https://wa.me/${fullNumber}${text}`;
}

function formatPercent(value: number | string | null | undefined): string {
    return new Intl.NumberFormat(languageTag(), { style: "percent", maximumFractionDigits: 1 }).format(Number(value ?? 0) / 100);
}

function costMargin(pattern: string, price: number | string | null | undefined, cost: number | string | null | undefined): string {
    const salePrice = Number(price);
    const costPrice = Number(cost);

    if (!(salePrice > 0) || !(costPrice > 0)) {
        return "";
    }

    const profit = salePrice - costPrice;

    return pattern
        .replace("{0}", formatCurrency(profit))
        .replace("{1}", formatPercent(profit / salePrice * 100));
}

export default {
    costMargin,
    percent: formatPercent,

    currency: formatCurrency,

    negativeAmount(value: number | string | null | undefined): string {
        const amount = Number(value ?? 0);
        return amount > 0 ? `- ${formatCurrency(amount)}` : "";
    },

    firstAmount(...values: Array<number | string | null | undefined>): string {
        const amount = values.find((value) => value !== null && value !== undefined && value !== "");
        return formatCurrency(amount);
    },

    message(pattern: string, ...values: unknown[]): string {
        return formatMessage(pattern, values);
    },

    stockMessage(inStockPattern: string, soldOutText: string, stock: number): string {
        return stock > 0 ? formatMessage(inStockPattern, [stock]) : soldOutText;
    },

    variantDescription(...parts: Array<string | null | undefined>): string {
        return parts.filter(Boolean).join(" / ");
    },

    date(value: string | null | undefined): string {
        return value ? new Intl.DateTimeFormat(languageTag(), { dateStyle: "short", timeZone: "UTC" }).format(new Date(value)) : "";
    },

    firstText(...values: Array<string | null | undefined>): string {
        return values.find((value) => Boolean(value?.trim())) ?? "";
    },

    fullAddress(street: string, number: string, complement: string, district: string, city: string, state: string, zipCode: string): string {
        const streetLine = [street, number].filter(Boolean).join(", ");
        const cityLine = [city, state].filter(Boolean).join("/");

        return [streetLine, complement, district, cityLine, zipCode].filter(Boolean).join(" - ");
    },

    dateTime(value: string | null | undefined): string {
        return value ? new Intl.DateTimeFormat(languageTag(), { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "";
    },

    catalogImageUrl,

    bannerUrl(bannerId: string | null | undefined, version: string | null | undefined): string {
        return bannerId
            ? `${XsuaaAuthHelper.getConfig().catalogService}StoreBanners(${bannerId})/BannerImage?v=${encodeURIComponent(version ?? "")}`
            : "";
    },

    totalStock,

    whatsappUrl,

    coverImageUrl(images: ImageReference[] | null | undefined): string {
        const cover = [...(images ?? [])].sort((first, second) => (first.SortOrder ?? 0) - (second.SortOrder ?? 0))[0];
        return catalogImageUrl(cover?.ID);
    },

    isSoldOut(variants: StockReference[] | null | undefined): boolean {
        return totalStock(variants) === 0;
    },

    statusState(status: string | null | undefined): ValueState {
        return STATUS_STATES[status ?? ""] ?? ValueState.None;
    },

    storeWhatsappUrl(phone: string | null | undefined): string {
        return phone ? whatsappUrl(phone) : "";
    },

    instagramUrl(user: string | null | undefined): string {
        return user ? `https://instagram.com/${user.replace(/^@/, "")}` : "";
    },

    mailtoUrl(email: string | null | undefined): string {
        return email ? `mailto:${email}` : "";
    }

};
