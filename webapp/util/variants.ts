const SIZE_ORDER = ["PP", "P", "M", "G", "GG", "XG", "XGG", "U", "UNICO", "ÚNICO"];

export interface SizedVariant {
    Size: string;
}

export interface ColoredImage {
    ID: string;
    Color_ID?: string | null;
    SortOrder?: number | null;
}

export function sortBySize<Variant extends SizedVariant>(variants: Variant[]): Variant[] {
    const position = (size: string): number => {
        const index = SIZE_ORDER.indexOf(size.toUpperCase());
        const numericSize = Number(size);

        if (index !== -1) {
            return index;
        }

        return SIZE_ORDER.length + (Number.isNaN(numericSize) ? 0 : numericSize);
    };

    return [...variants].sort((first, second) => position(first.Size) - position(second.Size));
}

export function imagesForColor<Image extends ColoredImage>(images: Image[], colorId: string): Image[] {
    const sorted = [...images].sort((first, second) => (first.SortOrder ?? 0) - (second.SortOrder ?? 0));
    const forColor = sorted.filter((image) => !image.Color_ID || image.Color_ID === colorId);

    return forColor.length ? forColor : sorted;
}
