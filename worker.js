"use strict";
self.onmessage = async (e) => {
    const { imageUrl, fileName, fileType, settings } = e.data;
    try {
        const result = await compressImageInWorker(imageUrl, fileName, fileType, settings);
        self.postMessage({ success: true, ...result });
    }
    catch (error) {
        self.postMessage({
            success: false,
            error: error instanceof Error ? error.message : '压缩失败'
        });
    }
};
async function compressImageInWorker(imageUrl, fileName, fileType, settings) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = async () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    throw new Error('无法创建canvas上下文');
                }
                let { width, height } = calculateDimensions(img.naturalWidth, img.naturalHeight, settings.maxWidth, settings.maxHeight);
                canvas.width = width;
                canvas.height = height;
                const orientation = await getImageOrientation(imageUrl);
                applyOrientation(ctx, orientation, width, height);
                ctx.drawImage(img, 0, 0, width, height);
                const outputFormat = getOutputFormat(fileType, settings.outputFormat);
                const mimeType = getMimeType(outputFormat);
                const compressedDataUrl = canvas.toDataURL(mimeType, settings.quality);
                const blob = dataURLToBlob(compressedDataUrl);
                const url = URL.createObjectURL(blob);
                resolve({
                    url,
                    size: blob.size,
                    dimensions: { width, height },
                    format: outputFormat
                });
            }
            catch (error) {
                reject(error);
            }
        };
        img.onerror = () => {
            reject(new Error('无法加载图片'));
        };
        img.src = imageUrl;
    });
}
function calculateDimensions(originalWidth, originalHeight, maxWidth, maxHeight) {
    let width = originalWidth;
    let height = originalHeight;
    if (width <= maxWidth && height <= maxHeight) {
        return { width, height };
    }
    const widthRatio = maxWidth / width;
    const heightRatio = maxHeight / height;
    const ratio = Math.min(widthRatio, heightRatio);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
    return { width, height };
}
async function getImageOrientation(imageUrl) {
    return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', imageUrl, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function () {
            if (xhr.status === 200) {
                const view = new DataView(xhr.response);
                const orientation = getOrientationFromExif(view);
                resolve(orientation);
            }
            else {
                resolve(1);
            }
        };
        xhr.onerror = function () {
            resolve(1);
        };
        xhr.send();
    });
}
function getOrientationFromExif(view) {
    if (view.byteLength < 2)
        return 1;
    const marker = view.getUint16(0, false);
    if (marker !== 0xFFD8)
        return 1;
    let offset = 2;
    const length = view.byteLength;
    while (offset < length) {
        if (view.getUint8(offset) !== 0xFF)
            break;
        const marker = view.getUint8(offset + 1);
        if (marker === 0xE1) {
            const exifLength = view.getUint16(offset + 2, false);
            const exifData = new DataView(view.buffer, offset + 4, exifLength - 2);
            const orientation = findOrientationInExif(exifData);
            if (orientation !== null) {
                return orientation;
            }
        }
        if (marker === 0xDA)
            break;
        const segmentLength = view.getUint16(offset + 2, false);
        offset += 2 + segmentLength;
    }
    return 1;
}
function findOrientationInExif(exifData) {
    const length = exifData.byteLength;
    let offset = 0;
    if (length > 6) {
        const exifHeader = exifData.getUint32(0, false);
        if (exifHeader === 0x45786966) {
            offset = 6;
        }
    }
    if (offset + 8 > length)
        return null;
    const tiffHeader = exifData.getUint16(offset, false);
    const littleEndian = tiffHeader === 0x4949;
    offset += 4;
    if (offset + 4 > length)
        return null;
    const ifdOffset = exifData.getUint32(offset, littleEndian);
    offset = ifdOffset;
    if (offset + 2 > length)
        return null;
    const numEntries = exifData.getUint16(offset, littleEndian);
    offset += 2;
    for (let i = 0; i < numEntries; i++) {
        if (offset + 12 > length)
            break;
        const tag = exifData.getUint16(offset, littleEndian);
        const type = exifData.getUint16(offset + 2, littleEndian);
        const count = exifData.getUint32(offset + 4, littleEndian);
        if (tag === 0x0112) {
            if (type === 3 && count === 1) {
                const value = exifData.getUint16(offset + 8, littleEndian);
                return value;
            }
            else if (type === 4 && count === 1) {
                const value = exifData.getUint32(offset + 8, littleEndian);
                return value;
            }
        }
        offset += 12;
    }
    return null;
}
function applyOrientation(ctx, orientation, width, height) {
    switch (orientation) {
        case 2:
            ctx.transform(-1, 0, 0, 1, width, 0);
            break;
        case 3:
            ctx.transform(-1, 0, 0, -1, width, height);
            break;
        case 4:
            ctx.transform(1, 0, 0, -1, 0, height);
            break;
        case 5:
            ctx.transform(0, 1, 1, 0, 0, 0);
            ctx.transform(-1, 0, 0, 1, height, 0);
            break;
        case 6:
            ctx.transform(0, 1, -1, 0, height, 0);
            break;
        case 7:
            ctx.transform(0, 1, 1, 0, 0, 0);
            ctx.transform(1, 0, 0, -1, 0, width);
            break;
        case 8:
            ctx.transform(0, -1, 1, 0, 0, width);
            break;
        default:
            break;
    }
}
function getOutputFormat(originalType, outputFormat) {
    if (outputFormat === 'original') {
        const match = originalType.match(/image\/(jpeg|jpg|png|webp|avif)/);
        return match ? match[1].replace('jpeg', 'jpg') : 'jpg';
    }
    return outputFormat;
}
function getMimeType(format) {
    const mimeTypes = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'webp': 'image/webp',
        'avif': 'image/avif'
    };
    return mimeTypes[format] || 'image/jpeg';
}
function dataURLToBlob(dataURL) {
    const parts = dataURL.split(',');
    const byteString = atob(parts[1]);
    const mimeString = parts[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
}
