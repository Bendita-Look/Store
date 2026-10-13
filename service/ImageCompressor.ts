const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 0.85;
const OUTPUT_TYPE = "image/jpeg";

export default class ImageCompressor {

    public static readonly outputType = OUTPUT_TYPE;

    public static async compress(file: File, maxDimension = MAX_DIMENSION): Promise<Blob> {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement("canvas");

        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);

        const context = canvas.getContext("2d");

        if (!context) {
            throw new Error("Canvas is not supported");
        }

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();

        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Image compression failed")), OUTPUT_TYPE, JPEG_QUALITY);
        });
    }

}
