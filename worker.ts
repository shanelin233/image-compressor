// Web Worker for image compression
self.onmessage = async (e) => {
    const { imageUrl, fileName, fileType, settings } = e.data;

    try {
        const result = await compressImageInWorker(imageUrl, fileName, fileType, settings);
        self.postMessage({ success: true, ...result });
    } catch (error) {
        self.postMessage({
            success: false,
            error: error instanceof Error ? error.message : '压缩失败'
        });
    }
};

async function compressImageInWorker(
    imageUrl: string,
    fileName: string,
    fileType: string,
    settings: any
): Promise<any> {
    try {
        // 使用 fetch 获取图片数据
        const response = await fetch(imageUrl);
        const blob = await response.blob();

        // 使用 createImageBitmap 创建图片（Worker 兼容）
        const imageBitmap = await createImageBitmap(blob);

        // 创建 OffscreenCanvas（Worker 兼容）
        const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('无法创建canvas上下文');
        }

        // 计算缩放后的尺寸
        let { width, height } = calculateDimensions(
            imageBitmap.width,
            imageBitmap.height,
            settings.maxWidth,
            settings.maxHeight
        );

        // 重新设置canvas尺寸
        canvas.width = width;
        canvas.height = height;

        // 处理图片旋转（EXIF纠正）
        const orientation = await getImageOrientation(imageUrl);
        applyOrientation(ctx, orientation, width, height);

        // 绘制图片
        ctx.drawImage(imageBitmap, 0, 0, width, height);

        // 确定输出格式
        const outputFormat = getOutputFormat(fileType, settings.outputFormat);
        const mimeType = getMimeType(outputFormat);

        // 压缩图片 - 使用 OffscreenCanvas.convertToBlob
        const compressedBlob = await canvas.convertToBlob({
            type: mimeType,
            quality: settings.quality
        });

        // 清理 ImageBitmap
        imageBitmap.close();

        return {
            blob: compressedBlob,
            size: compressedBlob.size,
            dimensions: { width, height },
            format: outputFormat
        };

    } catch (error) {
        throw error;
    }
}

// 计算缩放尺寸
function calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
): { width: number; height: number } {
    let width = originalWidth;
    let height = originalHeight;

    // 如果图片小于最大尺寸，保持原尺寸
    if (width <= maxWidth && height <= maxHeight) {
        return { width, height };
    }

    // 计算缩放比例
    const widthRatio = maxWidth / width;
    const heightRatio = maxHeight / height;
    const ratio = Math.min(widthRatio, heightRatio);

    width = Math.round(width * ratio);
    height = Math.round(height * ratio);

    return { width, height };
}

// 获取图片方向信息
async function getImageOrientation(imageUrl: string): Promise<number> {
    return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', imageUrl, true);
        xhr.responseType = 'arraybuffer';

        xhr.onload = function() {
            if (xhr.status === 200) {
                const view = new DataView(xhr.response);
                const orientation = getOrientationFromExif(view);
                resolve(orientation);
            } else {
                resolve(1); // 默认方向
            }
        };

        xhr.onerror = function() {
            resolve(1); // 默认方向
        };

        xhr.send();
    });
}

// 从EXIF数据获取方向
function getOrientationFromExif(view: DataView): number {
    if (view.byteLength < 2) return 1;

    const marker = view.getUint16(0, false);
    if (marker !== 0xFFD8) return 1; // 不是JPEG文件

    let offset = 2;
    const length = view.byteLength;

    while (offset < length) {
        if (view.getUint8(offset) !== 0xFF) break;

        const marker = view.getUint8(offset + 1);

        if (marker === 0xE1) { // EXIF标记
            const exifLength = view.getUint16(offset + 2, false);
            const exifData = new DataView(view.buffer, offset + 4, exifLength - 2);

            // 查找Orientation标签 (0x0112)
            const orientation = findOrientationInExif(exifData);
            if (orientation !== null) {
                return orientation;
            }
        }

        if (marker === 0xDA) break; // SOS标记，图片数据开始

        const segmentLength = view.getUint16(offset + 2, false);
        offset += 2 + segmentLength;
    }

    return 1; // 默认方向
}

// 在EXIF数据中查找方向标签
function findOrientationInExif(exifData: DataView): number | null {
    const length = exifData.byteLength;

    // 查找EXIF头
    let offset = 0;
    if (length > 6) {
        const exifHeader = exifData.getUint32(0, false);
        if (exifHeader === 0x45786966) { // "Exif"
            offset = 6;
        }
    }

    if (offset + 8 > length) return null;

    // 获取字节序
    const tiffHeader = exifData.getUint16(offset, false);
    const littleEndian = tiffHeader === 0x4949; // "II"

    offset += 4; // 跳过TIFF头和版本

    if (offset + 4 > length) return null;

    // 获取IFD0的偏移量
    const ifdOffset = exifData.getUint32(offset, littleEndian);
    offset = ifdOffset;

    if (offset + 2 > length) return null;

    // 获取IFD0中的条目数
    const numEntries = exifData.getUint16(offset, littleEndian);
    offset += 2;

    // 查找Orientation标签
    for (let i = 0; i < numEntries; i++) {
        if (offset + 12 > length) break;

        const tag = exifData.getUint16(offset, littleEndian);
        const type = exifData.getUint16(offset + 2, littleEndian);
        const count = exifData.getUint32(offset + 4, littleEndian);

        if (tag === 0x0112) { // Orientation标签
            if (type === 3 && count === 1) { // SHORT类型
                const value = exifData.getUint16(offset + 8, littleEndian);
                return value;
            } else if (type === 4 && count === 1) { // LONG类型
                const value = exifData.getUint32(offset + 8, littleEndian);
                return value;
            }
        }

        offset += 12;
    }

    return null;
}

// 应用图片方向
function applyOrientation(
    ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
    orientation: number,
    width: number,
    height: number
): void {
    switch (orientation) {
        case 2: // 水平翻转
            ctx.transform(-1, 0, 0, 1, width, 0);
            break;
        case 3: // 180度旋转
            ctx.transform(-1, 0, 0, -1, width, height);
            break;
        case 4: // 垂直翻转
            ctx.transform(1, 0, 0, -1, 0, height);
            break;
        case 5: // 顺时针90度旋转 + 水平翻转
            ctx.transform(0, 1, 1, 0, 0, 0);
            ctx.transform(-1, 0, 0, 1, height, 0);
            break;
        case 6: // 顺时针90度旋转
            ctx.transform(0, 1, -1, 0, height, 0);
            break;
        case 7: // 顺时针90度旋转 + 垂直翻转
            ctx.transform(0, 1, 1, 0, 0, 0);
            ctx.transform(1, 0, 0, -1, 0, width);
            break;
        case 8: // 逆时针90度旋转
            ctx.transform(0, -1, 1, 0, 0, width);
            break;
        default: // 正常方向
            break;
    }
}

// 获取输出格式
function getOutputFormat(originalType: string, outputFormat: string): string {
    if (outputFormat === 'original') {
        // 从原始文件类型中提取格式
        const match = originalType.match(/image\/(jpeg|jpg|png|webp|avif)/);
        return match ? match[1].replace('jpeg', 'jpg') : 'jpg';
    }
    return outputFormat;
}

// 获取MIME类型
function getMimeType(format: string): string {
    const mimeTypes: { [key: string]: string } = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'webp': 'image/webp',
        'avif': 'image/avif'
    };
    return mimeTypes[format] || 'image/jpeg';
}

// 注意：不再需要 dataURLToBlob 函数，因为我们直接使用 OffscreenCanvas.convertToBlob()