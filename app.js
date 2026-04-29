(function () {
    "use strict";

    const dropzone = document.getElementById("dropzone");
    const fileInput = document.getElementById("fileInput");
    const fileInfo = document.getElementById("fileInfo");
    const fileCount = document.getElementById("fileCount");
    const selectedCount = document.getElementById("selectedCount");
    const generateBtn = document.getElementById("generateBtn");
    const progress = document.getElementById("progress");
    const progressFill = document.getElementById("progressFill");
    const progressText = document.getElementById("progressText");
    const output = document.getElementById("output");
    const outputSections = document.getElementById("outputSections");

    let loadedFiles = []; // sorted File objects
let folderName = ""; // folder name from selected folder

    // --- Help toggle ---
    const helpToggle = document.querySelector(".help-toggle");
    const helpPanel = document.getElementById("sectionsHelp");
    helpToggle.addEventListener("click", () => {
        const expanded = helpToggle.getAttribute("aria-expanded") === "true";
        helpToggle.setAttribute("aria-expanded", !expanded);
        helpPanel.hidden = expanded;
    });

    // --- File handling ---

    dropzone.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => handleFiles(fileInput.files));

    function handleFiles(fileList) {
        const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
        if (files.length === 0) return;
        files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
        loadedFiles = files;
    
        // Extract folder name from webkitRelativePath
        if (files[0].webkitRelativePath) {
            const pathParts = files[0].webkitRelativePath.split("/");
            folderName = pathParts[0];
        }
    
        updateFileInfo();
        generateBtn.disabled = false;
    }

    function updateFileInfo() {
        const cols = getInt("cols");
        const rows = getInt("rows");
        const needed = cols * rows;
        fileCount.textContent = loadedFiles.length;
        selectedCount.textContent = `(${needed} will be used in the quilt)`;
        fileInfo.hidden = false;
    }

    // --- Settings helpers ---

    function getInt(id) { return parseInt(document.getElementById(id).value, 10); }
    function getFloat(id) { return parseFloat(document.getElementById(id).value); }

    document.getElementById("cols").addEventListener("input", updateFileInfo);
    document.getElementById("rows").addEventListener("input", updateFileInfo);

    // --- Generate ---

    generateBtn.addEventListener("click", generate);

    async function generate() {
        const cols = getInt("cols");
        const rows = getInt("rows");
        const scale = getFloat("scale");
        const sections = getInt("sections");
        const deviceW = getFloat("deviceW");
        const deviceH = getFloat("deviceH");
        const invertOrder = document.getElementById("invertOrder").checked;
        const totalNeeded = cols * rows;

        if (sections < 1 || sections > 3) {
            alert("Sections must be 1, 2, or 3.");
            return;
        }
        if (loadedFiles.length < totalNeeded) {
            alert(`Need at least ${totalNeeded} images (cols×rows). You have ${loadedFiles.length}.`);
            return;
        }

        generateBtn.disabled = true;
        progress.hidden = false;
        output.hidden = true;
        outputSections.innerHTML = "";
        setProgress(0, "Loading images...");

        try {
            // Select evenly distributed frames
            const step = Math.floor(loadedFiles.length / totalNeeded);
            const selectedFiles = new Array(totalNeeded);
            for (let i = 0; i < totalNeeded; i++) {
                const idx = invertOrder ? i : totalNeeded - 1 - i;
                selectedFiles[idx] = loadedFiles[i * step];
            }

            // Rearrange into quilt order (rows bottom-up for Looking Glass)
            const quiltFiles = new Array(totalNeeded);
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const sourceIndex = r * cols + c;
                    const targetIndex = (rows - 1 - r) * cols + c;
                    quiltFiles[targetIndex] = selectedFiles[sourceIndex];
                }
            }

            // Load images
            const images = [];
            for (let i = 0; i < totalNeeded; i++) {
                setProgress((i / totalNeeded) * 50, `Loading image ${i + 1}/${totalNeeded}...`);
                images.push(await loadImage(quiltFiles[i]));
            }

            const imgW = images[0].width;
            const imgH = images[0].height;

            // Compute section crop geometry
            let secW = Math.round((deviceW / deviceH) * imgH);
            let totalCropW = sections * secW;
            let cropOffsetX = Math.round((imgW - totalCropW) / 2);
            let cropY = 0;
            let croppedImgH = imgH;
            let warnings = [];

            if (cropOffsetX < 0) {
                const zoomFactor = imgW / totalCropW;
                croppedImgH = Math.round(imgH * zoomFactor);
                cropY = Math.round((imgH - croppedImgH) / 2);
                secW = Math.round((deviceW / deviceH) * croppedImgH);
                totalCropW = sections * secW;
                cropOffsetX = Math.round((imgW - totalCropW) / 2);
                warnings.push(`Source ${imgW}×${imgH} too narrow — auto zoom-out factor ${zoomFactor.toFixed(3)}, cropping to ${imgW}×${croppedImgH}`);
            }

            // Generate each section
            for (let sec = 0; sec < sections; sec++) {
                setProgress(50 + (sec / sections) * 50, `Rendering section ${sec + 1}/${sections}...`);

                const sectionImages = images.map((img) =>
                    cropImage(img, cropOffsetX + sec * secW, cropY, secW, croppedImgH)
                );

                const asp = secW / croppedImgH;
                const quiltCanvas = createQuiltImage(sectionImages, cols, rows, scale);

                // Build output filename
                const baseName = folderName || getBaseName(loadedFiles[0].name);
                const sectionSuffix = sections > 1 ? `_s${sec + 1}of${sections}` : "";
                const filename = `${baseName}${sectionSuffix}_qs${cols}x${rows}a${asp.toFixed(4)}.png`;

                addOutputSection(quiltCanvas, filename, asp, sec + 1, sections, warnings);

                // Clean up section canvases
                sectionImages.forEach((c) => c.remove && c.remove());
            }

            setProgress(100, "Done!");
            output.hidden = false;
        } catch (err) {
            alert("Error: " + err.message);
            console.error(err);
        } finally {
            generateBtn.disabled = false;
            setTimeout(() => { progress.hidden = true; }, 2000);
        }
    }

    // --- Image utilities ---

    function getBaseName(filename) {
        return filename.replace(/\.[^.]+$/, '');
    }

    function loadImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(img.src);
                resolve(img);
            };
            img.onerror = () => reject(new Error(`Failed to load: ${file.name}`));
            img.src = URL.createObjectURL(file);
        });
    }

    function cropImage(img, x, y, w, h) {
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
        return canvas;
    }

    function createQuiltImage(images, columns, rows, scaleFactor) {
        const imageWidth = Math.round(images[0].width * scaleFactor);
        const imageHeight = Math.round(images[0].height * scaleFactor);
        const quiltWidth = columns * imageWidth;
        const quiltHeight = rows * imageHeight;

        const canvas = document.createElement("canvas");
        canvas.width = quiltWidth;
        canvas.height = quiltHeight;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, quiltWidth, quiltHeight);

        for (let i = 0; i < images.length; i++) {
            const x = (i % columns) * imageWidth;
            const y = Math.floor(i / columns) * imageHeight;
            ctx.drawImage(images[i], 0, 0, images[i].width, images[i].height, x, y, imageWidth, imageHeight);
        }

        return canvas;
    }

    // --- UI helpers ---

    function setProgress(pct, text) {
        progressFill.style.width = pct + "%";
        progressText.textContent = text;
    }

    function addOutputSection(canvas, filename, aspect, secNum, secTotal, warnings) {
        const section = document.createElement("div");
        section.className = "output-section";

        let warningHtml = "";
        if (warnings.length > 0 && secNum === 1) {
            warningHtml = warnings.map((w) => `<div class="warning">${w}</div>`).join("");
        }

        section.innerHTML = `
            <h3>Section ${secNum}/${secTotal}</h3>
            ${warningHtml}
            <div class="meta">Aspect: ${aspect.toFixed(4)} | Size: ${canvas.width}×${canvas.height} | File: ${filename}</div>
        `;

        // Append preview canvas
        const preview = document.createElement("canvas");
        preview.width = canvas.width;
        preview.height = canvas.height;
        preview.getContext("2d").drawImage(canvas, 0, 0);
        section.appendChild(preview);

        // Download button
        const btn = document.createElement("button");
        btn.className = "download-btn";
        btn.textContent = "Download PNG";
        btn.addEventListener("click", () => {
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
            }, "image/png");
        });
        section.appendChild(btn);

        outputSections.appendChild(section);
    }
})();
