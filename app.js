"use strict";
let imageFiles = [];
let currentSettings = {
    quality: 0.8,
    maxWidth: 2000,
    maxHeight: 2000,
    outputFormat: 'original'
};
const elements = {
    uploadArea: document.getElementById('uploadArea'),
    fileInput: document.getElementById('fileInput'),
    selectFilesBtn: document.getElementById('selectFilesBtn'),
    settingsSection: document.getElementById('settingsSection'),
    qualitySlider: document.getElementById('qualitySlider'),
    qualityValue: document.getElementById('qualityValue'),
    maxWidth: document.getElementById('maxWidth'),
    maxHeight: document.getElementById('maxHeight'),
    outputFormat: document.getElementById('outputFormat'),
    compressBtn: document.getElementById('compressBtn'),
    clearAllBtn: document.getElementById('clearAllBtn'),
    progressSection: document.getElementById('progressSection'),
    progressFill: document.getElementById('progressFill'),
    progressText: document.getElementById('progressText'),
    imagesSection: document.getElementById('imagesSection'),
    imagesGrid: document.getElementById('imagesGrid'),
    downloadAllBtn: document.getElementById('downloadAllBtn'),
    downloadZipBtn: document.getElementById('downloadZipBtn'),
    errorToast: document.getElementById('errorToast'),
    previewModal: document.getElementById('previewModal'),
    modalClose: document.getElementById('modalClose'),
    originalPreview: document.getElementById('originalPreview'),
    compressedPreview: document.getElementById('compressedPreview'),
    originalInfo: document.getElementById('originalInfo'),
    compressedInfo: document.getElementById('compressedInfo'),
    modalTitle: document.getElementById('modalTitle')
};
function init() {
    setupEventListeners();
    updateQualityDisplay();
}
function setupEventListeners() {
    elements.uploadArea.addEventListener('click', (e) => {
        if (e.target !== elements.selectFilesBtn) {
            elements.fileInput.click();
        }
    });
    elements.selectFilesBtn.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', handleFileSelect);
    elements.uploadArea.addEventListener('dragover', handleDragOver);
    elements.uploadArea.addEventListener('dragleave', handleDragLeave);
    elements.uploadArea.addEventListener('drop', handleDrop);
    elements.qualitySlider.addEventListener('input', updateQualityDisplay);
    elements.maxWidth.addEventListener('change', updateSettings);
    elements.maxHeight.addEventListener('change', updateSettings);
    elements.outputFormat.addEventListener('change', updateSettings);
    elements.compressBtn.addEventListener('click', startCompression);
    elements.clearAllBtn.addEventListener('click', clearAllImages);
    elements.downloadAllBtn.addEventListener('click', downloadAllImages);
    elements.downloadZipBtn.addEventListener('click', downloadZip);
    elements.modalClose.addEventListener('click', closePreviewModal);
    elements.previewModal.addEventListener('click', (e) => {
        if (e.target === elements.previewModal)
            closePreviewModal();
    });
}
function handleFileSelect(event) {
    const input = event.target;
    const files = input.files;
    if (files && files.length > 0) {
        processFiles(Array.from(files));
    }
}
function handleDragOver(e) {
    e.preventDefault();
    elements.uploadArea.classList.add('dragover');
}
function handleDragLeave(e) {
    e.preventDefault();
    elements.uploadArea.classList.remove('dragover');
}
function handleDrop(e) {
    e.preventDefault();
    elements.uploadArea.classList.remove('dragover');
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
        processFiles(Array.from(files));
    }
}
async function processFiles(files) {
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
        if (file.size > 50 * 1024 * 1024) {
            showError(`文件 ${file.name} 超过50MB限制`);
            continue;
        }
        await addImageFile(file);
    }
    if (imageFiles.length > 0) {
        showSettings();
    }
}
async function addImageFile(file) {
    try {
        const id = generateId();
        const originalUrl = URL.createObjectURL(file);
        const dimensions = await getImageDimensions(originalUrl);
        const imageFile = {
            id,
            file,
            originalUrl,
            originalSize: file.size,
            originalDimensions: dimensions,
            status: 'pending'
        };
        imageFiles.push(imageFile);
    }
    catch (error) {
        showError(`处理文件 ${file.name} 失败: ${error}`);
    }
}
function getImageDimensions(url) {
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
function showSettings() {
    elements.settingsSection.style.display = 'block';
    elements.imagesSection.style.display = 'block';
    renderImagesGrid();
}
function renderImagesGrid() {
    elements.imagesGrid.innerHTML = '';
    imageFiles.forEach(imageFile => {
        const card = createImageCard(imageFile);
        elements.imagesGrid.appendChild(card);
    });
}
function createImageCard(imageFile) {
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
                        <span>${formatFileSize(imageFile.compressedSize)}</span>
                    </div>
                    <div class="stat-item">
                        <span>压缩率:</span>
                        <span class="compression-ratio">${calculateCompressionRatio(imageFile.originalSize, imageFile.compressedSize)}%</span>
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
function updateSettings() {
    currentSettings = {
        quality: parseFloat(elements.qualitySlider.value),
        maxWidth: parseInt(elements.maxWidth.value),
        maxHeight: parseInt(elements.maxHeight.value),
        outputFormat: elements.outputFormat.value
    };
}
function updateQualityDisplay() {
    elements.qualityValue.textContent = Math.round(parseFloat(elements.qualitySlider.value) * 100) + '%';
    updateSettings();
}
async function startCompression() {
    if (imageFiles.length === 0) {
        showError('请先选择图片文件');
        return;
    }
    showProgress();
    for (let i = 0; i < imageFiles.length; i++) {
        const imageFile = imageFiles[i];
        updateProgress(i, imageFiles.length, `正在压缩: ${imageFile.file.name}`);
        try {
            imageFile.status = 'processing';
            renderImagesGrid();
            const compressedData = await compressImageWithWorker(imageFile, currentSettings);
            imageFile.compressedUrl = compressedData.url;
            imageFile.compressedSize = compressedData.size;
            imageFile.compressedDimensions = compressedData.dimensions;
            imageFile.status = 'completed';
        }
        catch (error) {
            imageFile.status = 'error';
            imageFile.error = error instanceof Error ? error.message : '压缩失败';
        }
        renderImagesGrid();
    }
    hideProgress();
    showSuccess('压缩完成！');
}
async function compressImageWithWorker(imageFile, settings) {
    return new Promise((resolve, reject) => {
        const worker = new Worker('worker.js');
        worker.onmessage = (e) => {
            if (e.data.success) {
                resolve(e.data);
            }
            else {
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
function showProgress() {
    elements.progressSection.style.display = 'block';
    elements.progressFill.style.width = '0%';
    elements.progressText.textContent = '准备压缩...';
}
function updateProgress(current, total, text) {
    const percentage = (current / total) * 100;
    elements.progressFill.style.width = percentage + '%';
    elements.progressText.textContent = `${text} (${current + 1}/${total})`;
}
function hideProgress() {
    setTimeout(() => {
        elements.progressSection.style.display = 'none';
    }, 1000);
}
async function downloadImage(imageId) {
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
    }
    catch (error) {
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
        const zip = new window.JSZip();
        for (const imageFile of completedImages) {
            const response = await fetch(imageFile.compressedUrl);
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
    }
    catch (error) {
        showError('打包下载失败: ' + error);
    }
}
function previewImage(imageId) {
    const imageFile = imageFiles.find(img => img.id === imageId);
    if (!imageFile) {
        showError('图片未找到');
        return;
    }
    elements.originalPreview.src = imageFile.originalUrl;
    elements.compressedPreview.src = imageFile.compressedUrl || imageFile.originalUrl;
    elements.modalTitle.textContent = imageFile.file.name;
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
    }
    else {
        elements.compressedInfo.innerHTML = '<div>未压缩</div>';
    }
    elements.previewModal.classList.add('show');
}
function closePreviewModal() {
    elements.previewModal.classList.remove('show');
}
function clearAllImages() {
    if (confirm('确定要清空所有图片吗？')) {
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
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}
function formatFileSize(bytes) {
    if (bytes === 0)
        return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
function calculateCompressionRatio(originalSize, compressedSize) {
    const ratio = ((originalSize - compressedSize) / originalSize) * 100;
    return ratio.toFixed(1);
}
function getDownloadFileName(originalName, outputFormat) {
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    const timestamp = new Date().getTime();
    if (outputFormat === 'original') {
        const extension = originalName.split('.').pop() || 'jpg';
        return `${nameWithoutExt}_compressed_${timestamp}.${extension}`;
    }
    return `${nameWithoutExt}_compressed_${timestamp}.${outputFormat}`;
}
function showError(message) {
    elements.errorToast.textContent = message;
    elements.errorToast.classList.add('show');
    setTimeout(() => {
        elements.errorToast.classList.remove('show');
    }, 5000);
}
function showSuccess(message) {
    elements.errorToast.textContent = message;
    elements.errorToast.style.backgroundColor = 'var(--success-color)';
    elements.errorToast.classList.add('show');
    setTimeout(() => {
        elements.errorToast.classList.remove('show');
        elements.errorToast.style.backgroundColor = '';
    }, 3000);
}
window.previewImage = previewImage;
window.downloadImage = downloadImage;
init();
