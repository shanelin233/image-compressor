// 类型定义
interface ImageFile {
    id: string;
    file: File;
    originalUrl: string;
    compressedUrl?: string;
    originalSize: number;
    compressedSize?: number;
    originalDimensions: { width: number; height: number };
    compressedDimensions?: { width: number; height: number };
    status: 'pending' | 'processing' | 'completed' | 'error';
    error?: string;
}

interface CompressionSettings {
    quality: number;
    maxWidth: number;
    maxHeight: number;
    outputFormat: string;
}

// 全局变量
let imageFiles: ImageFile[] = [];
let currentSettings: CompressionSettings = {
    quality: 0.8,
    maxWidth: 2000,
    maxHeight: 2000,
    outputFormat: 'original'
};

// DOM元素
const elements = {
    stepsIndicator: document.getElementById('stepsIndicator') as HTMLDivElement,
    uploadArea: document.getElementById('uploadArea') as HTMLDivElement,
    fileInput: document.getElementById('fileInput') as HTMLInputElement,
    selectFilesBtn: document.getElementById('selectFilesBtn') as HTMLButtonElement,
    filePreviewSection: document.getElementById('filePreviewSection') as HTMLElement,
    filePreviewGrid: document.getElementById('filePreviewGrid') as HTMLDivElement,
    addMoreFilesBtn: document.getElementById('addMoreFilesBtn') as HTMLButtonElement,
    proceedToSettingsBtn: document.getElementById('proceedToSettingsBtn') as HTMLButtonElement,
    settingsSection: document.getElementById('settingsSection') as HTMLElement,
    qualitySlider: document.getElementById('qualitySlider') as HTMLInputElement,
    qualityValue: document.getElementById('qualityValue') as HTMLSpanElement,
    maxWidth: document.getElementById('maxWidth') as HTMLInputElement,
    maxHeight: document.getElementById('maxHeight') as HTMLInputElement,
    outputFormat: document.getElementById('outputFormat') as HTMLSelectElement,
    compressBtn: document.getElementById('compressBtn') as HTMLButtonElement,
    clearAllBtn: document.getElementById('clearAllBtn') as HTMLButtonElement,
    progressSection: document.getElementById('progressSection') as HTMLElement,
    progressFill: document.getElementById('progressFill') as HTMLDivElement,
    progressText: document.getElementById('progressText') as HTMLParagraphElement,
    imagesSection: document.getElementById('imagesSection') as HTMLElement,
    imagesGrid: document.getElementById('imagesGrid') as HTMLDivElement,
    downloadAllBtn: document.getElementById('downloadAllBtn') as HTMLButtonElement,
    downloadZipBtn: document.getElementById('downloadZipBtn') as HTMLButtonElement,
    errorToast: document.getElementById('errorToast') as HTMLDivElement,
    previewModal: document.getElementById('previewModal') as HTMLDivElement,
    modalClose: document.getElementById('modalClose') as HTMLButtonElement,
    originalPreview: document.getElementById('originalPreview') as HTMLImageElement,
    compressedPreview: document.getElementById('compressedPreview') as HTMLImageElement,
    originalInfo: document.getElementById('originalInfo') as HTMLDivElement,
    compressedInfo: document.getElementById('compressedInfo') as HTMLDivElement,
    modalTitle: document.getElementById('modalTitle') as HTMLHeadingElement
};

// 初始化
function init() {
    setupEventListeners();
    updateQualityDisplay();
}

// 设置事件监听器
function setupEventListeners() {
    // 文件上传
    elements.uploadArea.addEventListener('click', (e) => {
        if (e.target !== elements.selectFilesBtn) {
            elements.fileInput.click();
        }
    });
    elements.selectFilesBtn.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', handleFileSelect);

    // 拖拽上传
    elements.uploadArea.addEventListener('dragover', handleDragOver);
    elements.uploadArea.addEventListener('dragleave', handleDragLeave);
    elements.uploadArea.addEventListener('drop', handleDrop);

    // 设置控制
    elements.qualitySlider.addEventListener('input', updateQualityDisplay);
    elements.maxWidth.addEventListener('change', updateSettings);
    elements.maxHeight.addEventListener('change', updateSettings);
    elements.outputFormat.addEventListener('change', updateSettings);

    // 新的按钮事件
    elements.addMoreFilesBtn.addEventListener('click', () => elements.fileInput.click());
    elements.proceedToSettingsBtn.addEventListener('click', proceedToSettings);

    // 操作按钮
    elements.compressBtn.addEventListener('click', startCompression);
    elements.clearAllBtn.addEventListener('click', clearAllImages);
    elements.downloadAllBtn.addEventListener('click', downloadAllImages);
    elements.downloadZipBtn.addEventListener('click', downloadZip);

    // 模态框
    elements.modalClose.addEventListener('click', closePreviewModal);
    elements.previewModal.addEventListener('click', (e) => {
        if (e.target === elements.previewModal) closePreviewModal();
    });
}

// 处理文件选择
function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length > 0) {
        processFiles(Array.from(files));
    }
}

// 处理拖拽
function handleDragOver(e: DragEvent) {
    e.preventDefault();
    elements.uploadArea.classList.add('dragover');
}

function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    elements.uploadArea.classList.remove('dragover');
}

function handleDrop(e: DragEvent) {
    e.preventDefault();
    elements.uploadArea.classList.remove('dragover');

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
        processFiles(Array.from(files));
    }
}

// 处理文件
async function processFiles(files: File[]) {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
        showError('请选择有效的图片文件');
        return;
    }

    if (imageFiles.length > 20) {
        showError('一次最多支持处理20张图片');
        return;
    }

    for (const file of imageFiles) {
        if (file.size > 50 * 1024 * 1024) { // 50MB限制
            showError(`文件 ${file.name} 超过50MB限制`);
            continue;
        }

        await addImageFile(file);
    }

    if (imageFiles.length > 0) {
        showFilePreview();
        updateStepIndicator(1);
    }
}

// 添加图片文件
async function addImageFile(file: File) {
    try {
        const id = generateId();
        const originalUrl = URL.createObjectURL(file);

        // 获取图片原始尺寸
        const dimensions = await getImageDimensions(originalUrl);

        const imageFile: ImageFile = {
            id,
            file,
            originalUrl,
            originalSize: file.size,
            originalDimensions: dimensions,
            status: 'pending'
        };

        imageFiles.push(imageFile);

    } catch (error) {
        showError(`处理文件 ${file.name} 失败: ${error}`);
    }
}

// 获取图片尺寸
function getImageDimensions(url: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = () => {
            reject(new Error('无法加载图片'));
        };
        img.src = url;
    });
}

// 显示文件预览
function showFilePreview() {
    elements.stepsIndicator.style.display = 'flex';
    elements.filePreviewSection.style.display = 'block';
    renderFilePreview();
}

// 渲染文件预览
function renderFilePreview() {
    elements.filePreviewGrid.innerHTML = '';

    imageFiles.forEach(imageFile => {
        const previewItem = createFilePreviewItem(imageFile);
        elements.filePreviewGrid.appendChild(previewItem);
    });
}

// 创建文件预览项
function createFilePreviewItem(imageFile: ImageFile): HTMLDivElement {
    const item = document.createElement('div');
    item.className = 'file-preview-item';
    item.innerHTML = `
        <button class="file-preview-remove" onclick="removeImageFile('${imageFile.id}')">&times;</button>
        <div class="file-preview-image">
            <img src="${imageFile.originalUrl}" alt="${imageFile.file.name}">
        </div>
        <div class="file-preview-info">
            <div class="file-preview-name" title="${imageFile.file.name}">${imageFile.file.name}</div>
            <div class="file-preview-details">
                <span>大小: ${formatFileSize(imageFile.originalSize)}</span>
                <span>尺寸: ${imageFile.originalDimensions.width} × ${imageFile.originalDimensions.height}</span>
            </div>
        </div>
    `;
    return item;
}

// 进入设置步骤
function proceedToSettings() {
    updateStepIndicator(2);
    elements.settingsSection.style.display = 'block';
    elements.imagesSection.style.display = 'block';
    renderImagesGrid();

    // 滚动到设置区域
    elements.settingsSection.scrollIntoView({ behavior: 'smooth' });
}

// 更新步骤指示器
function updateStepIndicator(currentStep: number) {
    const steps = document.querySelectorAll('.step');

    steps.forEach((step, index) => {
        const stepNumber = index + 1;
        step.classList.remove('active', 'completed');

        if (stepNumber < currentStep) {
            step.classList.add('completed');
        } else if (stepNumber === currentStep) {
            step.classList.add('active');
        }
    });
}

// 移除图片文件
function removeImageFile(imageId: string) {
    const index = imageFiles.findIndex(img => img.id === imageId);
    if (index > -1) {
        URL.revokeObjectURL(imageFiles[index].originalUrl);
        if (imageFiles[index].compressedUrl) {
            URL.revokeObjectURL(imageFiles[index].compressedUrl);
        }
        imageFiles.splice(index, 1);
        renderFilePreview();

        if (imageFiles.length === 0) {
            elements.filePreviewSection.style.display = 'none';
            elements.stepsIndicator.style.display = 'none';
            updateStepIndicator(1);
        }
    }
}

// 显示设置面板
function showSettings() {
    elements.settingsSection.style.display = 'block';
    elements.imagesSection.style.display = 'block';
    renderImagesGrid();
}

// 渲染图片网格
function renderImagesGrid() {
    elements.imagesGrid.innerHTML = '';

    imageFiles.forEach(imageFile => {
        const card = createImageCard(imageFile);
        elements.imagesGrid.appendChild(card);
    });
}

// 创建图片卡片
function createImageCard(imageFile: ImageFile): HTMLDivElement {
    const card = document.createElement('div');
    card.className = 'image-card';
    card.innerHTML = `
        <div class="image-preview">
            <img src="${imageFile.originalUrl}" alt="${imageFile.file.name}" onclick="window.previewImage('${imageFile.id}')">
        </div>
        <div class="image-info">
            <div class="image-name" title="${imageFile.file.name}">${imageFile.file.name}</div>
            <div class="image-stats">
                <div class="stat-item">
                    <span>原始大小:</span>
                    <span>${formatFileSize(imageFile.originalSize)}</span>
                </div>
                <div class="stat-item">
                    <span>尺寸:</span>
                    <span>${imageFile.originalDimensions.width} × ${imageFile.originalDimensions.height}</span>
                </div>
                ${imageFile.status === 'completed' ? `
                    <div class="stat-item">
                        <span>压缩后大小:</span>
                        <span>${formatFileSize(imageFile.compressedSize!)}</span>
                    </div>
                    <div class="stat-item">
                        <span>压缩率:</span>
                        <span class="compression-ratio">${calculateCompressionRatio(imageFile.originalSize, imageFile.compressedSize!)}%</span>
                    </div>
                ` : imageFile.status === 'processing' ? `
                    <div class="stat-item">
                        <span colspan="2"><span class="loading"></span> 压缩中...</span>
                    </div>
                ` : imageFile.status === 'error' ? `
                    <div class="stat-item">
                        <span colspan="2" class="error">错误: ${imageFile.error}</span>
                    </div>
                ` : ''}
            </div>
        </div>
        ${imageFile.status === 'completed' ? `
            <div class="image-actions">
                <button class="btn btn-outline" onclick="window.downloadImage('${imageFile.id}')">下载</button>
                <button class="btn btn-outline" onclick="window.previewImage('${imageFile.id}')">预览</button>
            </div>
        ` : ''}
    `;

    return card;
}

// 更新设置
function updateSettings() {
    currentSettings = {
        quality: parseFloat(elements.qualitySlider.value),
        maxWidth: parseInt(elements.maxWidth.value),
        maxHeight: parseInt(elements.maxHeight.value),
        outputFormat: elements.outputFormat.value
    };
}

// 更新质量显示
function updateQualityDisplay() {
    elements.qualityValue.textContent = Math.round(parseFloat(elements.qualitySlider.value) * 100) + '%';
    updateSettings();
}

// 开始压缩
async function startCompression() {
    if (imageFiles.length === 0) {
        showError('请先选择图片文件');
        return;
    }

    updateStepIndicator(3);
    showProgress();

    for (let i = 0; i < imageFiles.length; i++) {
        const imageFile = imageFiles[i];
        updateProgress(i, imageFiles.length, `正在压缩: ${imageFile.file.name}`);

        try {
            imageFile.status = 'processing';
            renderImagesGrid();

            // 显示当前处理的文件
            showCurrentProcessingFile(imageFile);

            const compressedData = await compressImageWithWorker(imageFile, currentSettings);

            imageFile.compressedUrl = compressedData.url;
            imageFile.compressedSize = compressedData.size;
            imageFile.compressedDimensions = compressedData.dimensions;
            imageFile.status = 'completed';

            // 显示压缩结果统计
            showCompressionStats(imageFile);

        } catch (error) {
            imageFile.status = 'error';
            const errorMessage = error instanceof Error ? error.message : '压缩失败';
            imageFile.error = errorMessage;
            console.error(`压缩 ${imageFile.file.name} 时出错:`, error);

            // 显示具体的错误信息
            const errorDetails = getErrorSolution(errorMessage);
            if (errorDetails) {
                console.warn(`建议解决方案: ${errorDetails}`);
            }
        }

        renderImagesGrid();

        // 添加小延迟，让用户能看到进度变化
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    hideProgress();
    updateStepIndicator(4);
    showSuccess('压缩完成！可以下载您的图片了');
}

// 调用Web Worker压缩图片
async function compressImageWithWorker(imageFile: ImageFile, settings: CompressionSettings): Promise<any> {
    return new Promise((resolve, reject) => {
        const worker = new Worker('worker.js');

        worker.onmessage = (e) => {
            if (e.data.success) {
                resolve(e.data);
            } else {
                reject(new Error(e.data.error));
            }
            worker.terminate();
        };

        worker.onerror = (error) => {
            reject(error);
            worker.terminate();
        };

        worker.postMessage({
            imageUrl: imageFile.originalUrl,
            fileName: imageFile.file.name,
            fileType: imageFile.file.type,
            settings
        });
    });
}

// 显示进度
function showProgress() {
    elements.progressSection.style.display = 'block';
    elements.progressFill.style.width = '0%';
    elements.progressText.textContent = '准备压缩...';
}

function updateProgress(current: number, total: number, text: string) {
    const percentage = ((current + 1) / total) * 100;
    elements.progressFill.style.width = percentage + '%';
    elements.progressText.textContent = `${text} (${current + 1}/${total}) - ${Math.round(percentage)}%`;
}

function hideProgress() {
    setTimeout(() => {
        elements.progressSection.style.display = 'none';
    }, 1000);
}

// 显示当前处理的文件
function showCurrentProcessingFile(imageFile: ImageFile) {
    const processingInfo = document.createElement('div');
    processingInfo.className = 'processing-info';
    processingInfo.innerHTML = `
        <div class="processing-file">
            <div class="processing-thumbnail">
                <img src="${imageFile.originalUrl}" alt="${imageFile.file.name}">
            </div>
            <div class="processing-details">
                <div class="processing-filename">${imageFile.file.name}</div>
                <div class="processing-size">${formatFileSize(imageFile.originalSize)}</div>
                <div class="processing-dimensions">${imageFile.originalDimensions.width} × ${imageFile.originalDimensions.height}</div>
            </div>
            <div class="processing-spinner"></div>
        </div>
    `;

    // 替换或添加到进度区域
    const existingInfo = elements.progressSection.querySelector('.processing-info');
    if (existingInfo) {
        existingInfo.replaceWith(processingInfo);
    } else {
        elements.progressSection.appendChild(processingInfo);
    }
}

// 显示压缩统计
function showCompressionStats(imageFile: ImageFile) {
    if (!imageFile.compressedSize) return;

    const compressionRatio = parseFloat(calculateCompressionRatio(imageFile.originalSize, imageFile.compressedSize));
    const savedBytes = imageFile.originalSize - imageFile.compressedSize;

    // 创建简短的统计提示
    const statsText = `${imageFile.file.name}: 压缩了 ${compressionRatio.toFixed(1)}%，节省 ${formatFileSize(savedBytes)}`;

    // 可以在控制台显示详细信息
    console.log(`✅ ${statsText}`);

    // 在进度文本中显示最新完成的文件信息
    elements.progressText.textContent += ` | 节省: ${formatFileSize(savedBytes)}`;
}

// 下载功能
async function downloadImage(imageId: string) {
    const imageFile = imageFiles.find(img => img.id === imageId);
    if (!imageFile || !imageFile.compressedUrl) {
        showError('图片未找到或尚未压缩');
        return;
    }

    try {
        const response = await fetch(imageFile.compressedUrl);
        const blob = await response.blob();

        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = getDownloadFileName(imageFile.file.name, currentSettings.outputFormat);
        link.click();

        URL.revokeObjectURL(link.href);
    } catch (error) {
        showError('下载失败: ' + error);
    }
}

async function downloadAllImages() {
    const completedImages = imageFiles.filter(img => img.status === 'completed' && img.compressedUrl);

    if (completedImages.length === 0) {
        showError('没有可下载的图片');
        return;
    }

    for (const imageFile of completedImages) {
        await downloadImage(imageFile.id);
        // 添加小延迟避免浏览器阻止多个下载
        await new Promise(resolve => setTimeout(resolve, 200));
    }
}

async function downloadZip() {
    const completedImages = imageFiles.filter(img => img.status === 'completed' && img.compressedUrl);

    if (completedImages.length === 0) {
        showError('没有可下载的图片');
        return;
    }

    try {
        const zip = new (window as any).JSZip();

        for (const imageFile of completedImages) {
            const response = await fetch(imageFile.compressedUrl!);
            const blob = await response.blob();
            const fileName = getDownloadFileName(imageFile.file.name, currentSettings.outputFormat);
            zip.file(fileName, blob);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipBlob);
        link.download = `compressed_images_${new Date().getTime()}.zip`;
        link.click();

        URL.revokeObjectURL(link.href);
    } catch (error) {
        showError('打包下载失败: ' + error);
    }
}

// 预览功能
function previewImage(imageId: string) {
    const imageFile = imageFiles.find(img => img.id === imageId);
    if (!imageFile) {
        showError('图片未找到');
        return;
    }

    elements.originalPreview.src = imageFile.originalUrl;
    elements.compressedPreview.src = imageFile.compressedUrl || imageFile.originalUrl;
    elements.modalTitle.textContent = imageFile.file.name;

    // 显示图片信息
    elements.originalInfo.innerHTML = `
        <div>文件大小: ${formatFileSize(imageFile.originalSize)}</div>
        <div>尺寸: ${imageFile.originalDimensions.width} × ${imageFile.originalDimensions.height}</div>
    `;

    if (imageFile.compressedSize && imageFile.compressedDimensions) {
        elements.compressedInfo.innerHTML = `
            <div>文件大小: ${formatFileSize(imageFile.compressedSize)}</div>
            <div>尺寸: ${imageFile.compressedDimensions.width} × ${imageFile.compressedDimensions.height}</div>
            <div class="success">压缩率: ${calculateCompressionRatio(imageFile.originalSize, imageFile.compressedSize)}%</div>
        `;
    } else {
        elements.compressedInfo.innerHTML = '<div>未压缩</div>';
    }

    elements.previewModal.classList.add('show');
}

function closePreviewModal() {
    elements.previewModal.classList.remove('show');
}

// 清空所有图片
function clearAllImages() {
    if (confirm('确定要清空所有图片吗？')) {
        // 清理URL对象
        imageFiles.forEach(imageFile => {
            URL.revokeObjectURL(imageFile.originalUrl);
            if (imageFile.compressedUrl) {
                URL.revokeObjectURL(imageFile.compressedUrl);
            }
        });

        imageFiles = [];
        elements.settingsSection.style.display = 'none';
        elements.imagesSection.style.display = 'none';
        elements.fileInput.value = '';
    }
}

// 工具函数
function generateId(): string {
    return Math.random().toString(36).substr(2, 9);
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function calculateCompressionRatio(originalSize: number, compressedSize: number): string {
    const ratio = ((originalSize - compressedSize) / originalSize) * 100;
    return ratio.toFixed(1);
}

function getDownloadFileName(originalName: string, outputFormat: string): string {
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    const timestamp = new Date().getTime();

    if (outputFormat === 'original') {
        const extension = originalName.split('.').pop() || 'jpg';
        return `${nameWithoutExt}_compressed_${timestamp}.${extension}`;
    }

    return `${nameWithoutExt}_compressed_${timestamp}.${outputFormat}`;
}

// 改进的错误处理
function showError(message: string, details?: string) {
    const errorContent = document.createElement('div');
    errorContent.innerHTML = `
        <div class="error-main">${message}</div>
        ${details ? `<div class="error-details">${details}</div>` : ''}
        <button class="error-close" onclick="hideError()">&times;</button>
    `;

    elements.errorToast.innerHTML = '';
    elements.errorToast.appendChild(errorContent);
    elements.errorToast.classList.add('show');

    // 自动隐藏错误提示
    setTimeout(() => {
        elements.errorToast.classList.remove('show');
    }, 8000);
}

// 隐藏错误提示
function hideError() {
    elements.errorToast.classList.remove('show');
}

// 改进的成功提示
function showSuccess(message: string, details?: string) {
    const successContent = document.createElement('div');
    successContent.innerHTML = `
        <div class="success-main">${message}</div>
        ${details ? `<div class="success-details">${details}</div>` : ''}
        <button class="success-close" onclick="hideSuccess()">&times;</button>
    `;

    elements.errorToast.innerHTML = '';
    elements.errorToast.appendChild(successContent);
    elements.errorToast.style.backgroundColor = 'var(--success-color)';
    elements.errorToast.classList.add('show');

    setTimeout(() => {
        elements.errorToast.classList.remove('show');
        elements.errorToast.style.backgroundColor = '';
    }, 5000);
}

// 隐藏成功提示
function hideSuccess() {
    elements.errorToast.classList.remove('show');
    elements.errorToast.style.backgroundColor = '';
}

// 获取错误解决方案
function getErrorSolution(errorMessage: string): string | null {
    const errorSolutions: { [key: string]: string } = {
        '无法加载图片': '请检查图片文件是否完整，或尝试其他格式的图片',
        '无法创建canvas上下文': '您的浏览器可能不支持此功能，请更新浏览器或使用最新版本的Chrome/Firefox',
        '压缩失败': '图片可能已损坏或格式不支持，请尝试其他图片',
        'Failed to fetch': '网络连接问题，请检查网络连接',
        'Out of memory': '图片太大，请尝试较小的图片或降低最大尺寸设置'
    };

    for (const [key, solution] of Object.entries(errorSolutions)) {
        if (errorMessage.includes(key)) {
            return solution;
        }
    }

    return null;
}


// 全局函数供HTML调用
(window as any).previewImage = previewImage;
(window as any).downloadImage = downloadImage;
(window as any).removeImageFile = removeImageFile;
(window as any).hideError = hideError;
(window as any).hideSuccess = hideSuccess;

// 初始化应用
init();