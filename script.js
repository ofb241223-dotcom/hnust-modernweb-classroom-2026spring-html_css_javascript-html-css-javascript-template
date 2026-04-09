document.addEventListener('DOMContentLoaded', () => {
    const rippleCanvas = document.getElementById('rippleCanvas');
    const rippleCtx = rippleCanvas.getContext('2d');
    const maxActiveRipples = 18;
    const maxRippleDepth = 2;
    const rippleReflectionDecay = 0.55;
    let rippleWidth = 0;
    let rippleHeight = 0;
    let rippleFrame = 0;
    let ripplePalette = getRipplePalette();
    let ripples = [];

    function getRipplePalette() {
        if (document.body.classList.contains('dark-mode')) {
            return {
                primary: [214, 236, 255],
                secondary: [94, 177, 255],
                shadow: [56, 128, 255]
            };
        }

        return {
            primary: [255, 255, 255],
            secondary: [120, 170, 226],
            shadow: [91, 143, 214]
        };
    }

    function rgba(color, alpha) {
        return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
    }

    function resizeRippleCanvas() {
        const devicePixelRatio = window.devicePixelRatio || 1;
        rippleWidth = window.innerWidth;
        rippleHeight = window.innerHeight;

        rippleCanvas.width = Math.round(rippleWidth * devicePixelRatio);
        rippleCanvas.height = Math.round(rippleHeight * devicePixelRatio);
        rippleCanvas.style.width = `${rippleWidth}px`;
        rippleCanvas.style.height = `${rippleHeight}px`;

        rippleCtx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
        rippleCtx.clearRect(0, 0, rippleWidth, rippleHeight);
    }

    function makeRipple(x, y, options = {}) {
        return {
            x,
            y,
            startTime: options.startTime ?? performance.now(),
            amplitude: options.amplitude ?? 1,
            speed: options.speed ?? 0.3,
            depth: options.depth ?? 0,
            blockedEdge: options.blockedEdge ?? '',
            reflectedEdges: new Set()
        };
    }

    function pushRipple(ripple) {
        ripples.push(ripple);
        while (ripples.length > maxActiveRipples) {
            ripples.shift();
        }

        if (!rippleFrame) {
            rippleFrame = requestAnimationFrame(renderRipples);
        }
    }

    function getMirroredPosition(ripple, edge) {
        if (edge === 'left') return { x: -ripple.x, y: ripple.y };
        if (edge === 'right') return { x: (2 * rippleWidth) - ripple.x, y: ripple.y };
        if (edge === 'top') return { x: ripple.x, y: -ripple.y };
        return { x: ripple.x, y: (2 * rippleHeight) - ripple.y };
    }

    function getEdgeDistance(ripple, edge) {
        if (edge === 'left') return Math.abs(ripple.x);
        if (edge === 'right') return Math.abs(rippleWidth - ripple.x);
        if (edge === 'top') return Math.abs(ripple.y);
        return Math.abs(rippleHeight - ripple.y);
    }

    function spawnReflectedRipple(sourceRipple, edge) {
        if (sourceRipple.depth >= maxRippleDepth || sourceRipple.blockedEdge === edge) {
            return;
        }

        const position = getMirroredPosition(sourceRipple, edge);
        pushRipple(makeRipple(position.x, position.y, {
            startTime: sourceRipple.startTime,
            amplitude: sourceRipple.amplitude * rippleReflectionDecay,
            speed: sourceRipple.speed * 0.98,
            depth: sourceRipple.depth + 1,
            blockedEdge: edge
        }));
    }

    function drawSingleRippleRing(radius, opacity, width, strokeColor, shadowColor) {
        rippleCtx.lineWidth = width;
        rippleCtx.strokeStyle = strokeColor;
        rippleCtx.shadowBlur = 24;
        rippleCtx.shadowColor = shadowColor;
        rippleCtx.beginPath();
        rippleCtx.arc(0, 0, radius, 0, Math.PI * 2);
        rippleCtx.stroke();
    }

    function drawRipple(ripple, radius, opacity) {
        const ringOffsets = [0, -10, -21, -33, -46, -60, -76, -94];
        const ringWidths = [3.2, 3, 2.8, 2.5, 2.2, 1.9, 1.6, 1.3];

        rippleCtx.save();
        rippleCtx.translate(ripple.x, ripple.y);

        ringOffsets.forEach((offset, index) => {
            const ringRadius = radius + offset;
            if (ringRadius <= 4) return;

            const ringOpacity = Math.max(0, opacity * (1 - (index * 0.1)));
            drawSingleRippleRing(
                ringRadius,
                ringOpacity,
                ringWidths[index] * Math.max(0.78, ripple.amplitude),
                rgba(index === 0 ? ripplePalette.primary : ripplePalette.secondary, ringOpacity),
                rgba(ripplePalette.shadow, ringOpacity * 0.45)
            );
        });

        rippleCtx.restore();
    }

    function renderRipples(now) {
        rippleFrame = 0;
        rippleCtx.clearRect(0, 0, rippleWidth, rippleHeight);

        const maxRadius = Math.hypot(rippleWidth, rippleHeight) * 1.08;
        const finishedRipples = new Set();
        const rippleSnapshot = [...ripples];

        for (const ripple of rippleSnapshot) {
            const elapsed = now - ripple.startTime;
            const radius = elapsed * ripple.speed;
            const progress = radius / maxRadius;
            const opacity = ripple.amplitude * Math.pow(Math.max(0, 1 - progress), 1.35);

            if (opacity < 0.015 || radius > maxRadius) {
                finishedRipples.add(ripple);
                continue;
            }

            ['left', 'right', 'top', 'bottom'].forEach(edge => {
                if (ripple.reflectedEdges.has(edge) || ripple.blockedEdge === edge) return;
                if (radius >= getEdgeDistance(ripple, edge)) {
                    ripple.reflectedEdges.add(edge);
                    spawnReflectedRipple(ripple, edge);
                }
            });

            drawRipple(ripple, radius, opacity);
        }

        ripples = ripples.filter(ripple => !finishedRipples.has(ripple));

        if (ripples.length) {
            rippleFrame = requestAnimationFrame(renderRipples);
        }
    }

    document.addEventListener('pointerdown', (event) => {
        if (!event.isPrimary || event.button !== 0) return;
        if (event.pointerType && event.pointerType !== 'mouse') return;

        pushRipple(makeRipple(event.clientX, event.clientY));
    });

    window.addEventListener('resize', resizeRippleCanvas);
    resizeRippleCanvas();

    // --- 业务功能 ---
    const nodes = {
        themeBtn: document.getElementById('themeToggleBtn'),
        editToggle: document.getElementById('editToggleBtn'),
        editPanel: document.getElementById('editPanel'),
        saveBtn: document.getElementById('saveBtn'),
        cancelBtn: document.getElementById('cancelBtn'),
        avatarInput: document.getElementById('avatarInput'),
        avatarPreview: document.getElementById('avatarPreview'),
        avatarInitials: document.getElementById('avatarInitials'),
        avatarArea: document.getElementById('avatarClickRegion'),
        detailsAvatarTrigger: document.getElementById('detailsAvatarTrigger'),
        avatarPicker: document.getElementById('avatarPicker'),
        avatarPickerGrid: document.getElementById('avatarPresetGrid'),
        avatarPickerClose: document.getElementById('avatarPickerClose'),
        avatarUploadBtn: document.getElementById('avatarUploadBtn'),
        avatarResetBtn: document.getElementById('avatarResetBtn'),
        
        display: {
            name: document.getElementById('displayName'),
            bio: document.getElementById('displayBio'),
            email: document.getElementById('displayEmail'),
            phone: document.getElementById('displayPhone'),
            location: document.getElementById('displayLocation'),
            school: document.getElementById('displaySchool')
        },
        input: {
            name: document.getElementById('nameInput'),
            bio: document.getElementById('bioInput'),
            email: document.getElementById('emailInput'),
            phone: document.getElementById('phoneInput'),
            school: document.getElementById('schoolInput')
        },
        error: {
            name: document.getElementById('nameError'),
            email: document.getElementById('emailError'),
            phone: document.getElementById('phoneError')
        }
    };

    const editableFields = ['name', 'bio', 'email', 'phone', 'school'];
    const validationFields = ['name', 'email', 'phone'];
    const personalTextStorageKey = 'profile_personal_text';
    const avatarPresetFiles = [
        'almalinux-logo.svg',
        'arch-logo.svg',
        'asahilinux-logo.svg',
        'bazzite-logo.svg',
        'cachyos-logo.svg',
        'centos-logo.svg',
        'clear-linux-logo.svg',
        'debian-logo.svg',
        'endeavouros_logo.svg',
        'fedora-logo.svg',
        'freebsd-logo.svg',
        'gentoo-logo.svg',
        'gnome-logo.svg',
        'kali-linux-logo.svg',
        'manjaro-logo.svg',
        'netbsd-logo.svg',
        'nixos-logo.svg',
        'openbsd-logo.svg',
        'opensuse-logo.svg',
        'pop-os-logo.svg',
        'redhat-logo.svg',
        'rockylinux-logo.svg',
        'shastraos-logo.svg',
        'solus-logo.svg',
        'steam-deck-le-logo.svg',
        'steam-deck-logo.svg',
        'tux-logo.svg',
        'ublue-logo.svg',
        'ubuntu-logo.svg',
        'vanilla-logo.svg',
        'void-logo.svg',
        'zorin-logo.svg'
    ];
    const defaultAwardFiles = [
        '0D3E211D5DA8E5475A01A0AD1CA2D911.jpg',
        '12871327523DF608BF8132D8E6724C0B.jpg',
        '1BC56C1588CE92A6663E19BBAF916682.jpg',
        '20E0B36BB114DAF483E08DB6C915D475.jpg',
        '43A40DDF1C823DJ2K1L23DJKL.jpg',
        '4CE0EF0D01B8658DE0E1C91EB1D186CF.jpg',
        '504651E3B85B35E37E57F5E70FD3E119.jpg',
        '57D969C824EC502A0C9DE46A40001F6F.jpg',
        '61A1DD2FC05FE8F436BFA281E053F88F.jpg',
        '76446FED2B55C67520A4ABCD260E05DD.jpg',
        '8376F18E3282424510232E7EC2C250FA.jpg',
        'BB048D6468B0319C86CBEA75EE12B907.jpg',
        'CF4BDF40F504725C32DCE4DB01CDD1C7.jpg',
        'F4877A669B5A50C2250E85ACAC913FD6.jpg'
    ];
    const awardsStorageKey = 'uploaded_awards';
    let uploadedAwardFiles = [];
    let awardFiles = [...defaultAwardFiles];
    let avatarPresetButtons = [];

    function clearFieldError(field) {
        nodes.input[field].classList.remove('input-invalid');
        nodes.error[field].textContent = '';
    }

    function clearValidationErrors() {
        validationFields.forEach(clearFieldError);
    }

    function showFieldError(field, message) {
        nodes.input[field].classList.add('input-invalid');
        nodes.error[field].textContent = message;
    }

    function getFormData() {
        return {
            name: nodes.input.name.value.trim(),
            bio: nodes.input.bio.value,
            email: nodes.input.email.value.trim(),
            phone: nodes.input.phone.value.trim(),
            location: nodes.display.location ? nodes.display.location.textContent : '',
            school: nodes.input.school.value
        };
    }

    function validateFormData(data) {
        let isValid = true;

        if (!data.name) {
            showFieldError('name', '姓名不能为空');
            isValid = false;
        }

        if (!/^[^\s@]+@[^\s@]+\.com$/i.test(data.email)) {
            showFieldError('email', '邮箱格式需为 *@*.com');
            isValid = false;
        }

        if (!/^\d{11}$/.test(data.phone)) {
            showFieldError('phone', '手机号必须为 11 位数字');
            isValid = false;
        }

        return isValid;
    }

    validationFields.forEach(field => {
        nodes.input[field].addEventListener('input', () => clearFieldError(field));
    });

    // 头像
    function formatAvatarLabel(filename) {
        return filename
            .replace('.svg', '')
            .replace(/[-_]/g, ' ')
            .replace(/\blogo\b/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/\b\w/g, char => char.toUpperCase());
    }

    function getCurrentInitial() {
        const currentName = nodes.input.name.value.trim() || nodes.display.name.textContent.trim();
        return currentName ? currentName.charAt(0).toUpperCase() : 'U';
    }

    function normalizeAvatarPath(src) {
        if (!src) return '';

        try {
            return new URL(src, window.location.href).pathname;
        } catch {
            return src;
        }
    }

    function updateAvatarPresetSelection(currentSrc = nodes.avatarPreview.src) {
        const normalizedCurrent = normalizeAvatarPath(currentSrc);

        avatarPresetButtons.forEach(button => {
            const normalizedPreset = normalizeAvatarPath(button.dataset.avatar);
            button.classList.toggle('is-active', normalizedCurrent === normalizedPreset);
        });
    }

    function openAvatarPicker() {
        updateAvatarPresetSelection();
        nodes.avatarPicker.classList.add('active');
        nodes.avatarPicker.setAttribute('aria-hidden', 'false');
    }

    function closeAvatarPicker() {
        nodes.avatarPicker.classList.remove('active');
        nodes.avatarPicker.setAttribute('aria-hidden', 'true');
    }

    function applyAvatar(src) {
        nodes.avatarPreview.src = src;
        nodes.avatarPreview.style.display = 'block';
        nodes.avatarInitials.style.display = 'none';
        localStorage.setItem('profile_avatar', src);
        updateAvatarPresetSelection(src);
        updateDetailsProfile();
    }

    function resetAvatar() {
        nodes.avatarPreview.removeAttribute('src');
        nodes.avatarPreview.style.display = 'none';
        nodes.avatarInitials.style.display = 'flex';
        nodes.avatarInitials.textContent = getCurrentInitial();
        localStorage.removeItem('profile_avatar');
        updateAvatarPresetSelection('');
        updateDetailsProfile();
    }

    function renderAvatarPresetButtons() {
        nodes.avatarPickerGrid.innerHTML = avatarPresetFiles.map(file => {
            const src = `assets/avatar-presets/${file}`;
            const label = formatAvatarLabel(file);

            return `
                <button type="button" class="avatar-preset-btn" data-avatar="${src}" aria-label="${label}">
                    <img src="${src}" alt="${label}">
                </button>
            `;
        }).join('');

        avatarPresetButtons = Array.from(nodes.avatarPickerGrid.querySelectorAll('.avatar-preset-btn'));
        avatarPresetButtons.forEach(button => {
            button.onclick = () => {
                applyAvatar(button.dataset.avatar);
                closeAvatarPicker();
            };
        });
    }

    renderAvatarPresetButtons();

    nodes.avatarArea.onclick = () => openAvatarPicker();
    nodes.detailsAvatarTrigger.onclick = () => openAvatarPicker();
    nodes.detailsAvatarTrigger.onkeydown = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openAvatarPicker();
        }
    };
    nodes.avatarInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                applyAvatar(ev.target.result);
                closeAvatarPicker();
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    };

    nodes.avatarPicker.onclick = (event) => {
        if (event.target === nodes.avatarPicker) closeAvatarPicker();
    };
    nodes.avatarPickerClose.onclick = () => closeAvatarPicker();
    nodes.avatarUploadBtn.onclick = () => {
        closeAvatarPicker();
        nodes.avatarInput.click();
    };
    nodes.avatarResetBtn.onclick = () => {
        resetAvatar();
        closeAvatarPicker();
    };
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && nodes.avatarPicker.classList.contains('active')) {
            closeAvatarPicker();
        }
        if (event.key === 'Escape' && awardPreviewModal.classList.contains('active')) {
            closeAwardPreview();
        }
        if (event.key === 'ArrowLeft' && awardPreviewModal.classList.contains('active')) {
            changeAwardPreview(-1);
        }
        if (event.key === 'ArrowRight' && awardPreviewModal.classList.contains('active')) {
            changeAwardPreview(1);
        }
    });

    // 编辑资料
    nodes.editToggle.onclick = () => {
        editableFields.forEach(key => {
            nodes.input[key].value = nodes.display[key].textContent;
        });
        clearValidationErrors();
        nodes.editPanel.classList.remove('hidden');
    };

    nodes.cancelBtn.onclick = () => nodes.editPanel.classList.add('hidden');

    nodes.saveBtn.onclick = () => {
        const data = getFormData();

        clearValidationErrors();
        if (!validateFormData(data)) return;

        Object.keys(nodes.display).forEach(key => {
            if (data[key] !== undefined) {
                nodes.display[key].textContent = data[key];
            }
        });

        editableFields.forEach(key => {
            nodes.input[key].value = data[key];
        });
        
        if (data.name && nodes.avatarInitials.style.display !== 'none') {
            nodes.avatarInitials.textContent = data.name.charAt(0).toUpperCase();
        }

        localStorage.setItem('profile_data', JSON.stringify(data));
        nodes.editPanel.classList.add('hidden');
        updateDetailsProfile();
    };

    // 主题切换
    nodes.themeBtn.onclick = () => {
        const isDark = document.body.classList.toggle('dark-mode');
        nodes.themeBtn.textContent = isDark ? "☀️" : "🌙";
        localStorage.setItem('profile_theme', isDark ? 'dark' : 'light');
        ripplePalette = getRipplePalette();
    };

    // 页面跳转逻辑
    const viewDetailsBtn = document.getElementById('viewDetailsBtn');
    const backToCardBtn = document.getElementById('backToCardBtn');
    const mainContainer = document.getElementById('mainContainer');
    const detailsPage = document.getElementById('detailsPage');
    const antigravityWrapper = document.getElementById('antigravityWrapper');
    const antigravityBox = document.getElementById('antigravityBox');
    const gpaTab = document.getElementById('tab-gpa');
    const gpaChart = gpaTab.querySelector('.gpa-chart');
    const gpaTooltip = document.getElementById('gpaHoverTooltip');
    const gpaTooltipGradeRank = document.getElementById('gpaTooltipGradeRank');
    const gpaTooltipClassRank = document.getElementById('gpaTooltipClassRank');
    const gpaBarWrappers = Array.from(gpaTab.querySelectorAll('.gpa-bar-wrapper'));
    const gpaBars = gpaTab.querySelectorAll('.gpa-bar-wrapper .gpa-bar');
    const awardsGrid = document.getElementById('awardsGrid');
    const awardsPrevBtn = document.getElementById('awardsPrevBtn');
    const awardsNextBtn = document.getElementById('awardsNextBtn');
    const awardsPageInfo = document.getElementById('awardsPageInfo');
    const awardsUploadBtn = document.getElementById('awardsUploadBtn');
    const awardsUploadInput = document.getElementById('awardsUploadInput');
    const awardPreviewModal = document.getElementById('awardPreviewModal');
    const awardPreviewImage = document.getElementById('awardPreviewImage');
    const awardPreviewPrev = document.getElementById('awardPreviewPrev');
    const awardPreviewNext = document.getElementById('awardPreviewNext');
    const awardPreviewClose = document.getElementById('awardPreviewClose');
    const awardPreviewCount = document.getElementById('awardPreviewCount');
    const awardsPerPage = 4;
    let currentAwardsPage = 1;
    let currentAwardPreviewIndex = 0;
    const personalTextArea = document.getElementById('personalTextArea');
    const typewriterText = document.getElementById('typewriterText');

    function getAwardsPageCount() {
        return Math.max(1, Math.ceil(awardFiles.length / awardsPerPage));
    }

    function refreshAwardFiles() {
        awardFiles = [...defaultAwardFiles, ...uploadedAwardFiles];
    }

    function persistUploadedAwards() {
        try {
            localStorage.setItem(awardsStorageKey, JSON.stringify(uploadedAwardFiles));
        } catch {
            // Ignore quota issues and keep uploaded awards for the current session.
        }
    }

    try {
        const storedAwards = JSON.parse(localStorage.getItem(awardsStorageKey) || '[]');
        if (Array.isArray(storedAwards)) {
            uploadedAwardFiles = storedAwards;
        }
    } catch {
        uploadedAwardFiles = [];
    }
    refreshAwardFiles();
    syncGpaBarHeights();

    personalTextArea.addEventListener('input', () => {
        localStorage.setItem(personalTextStorageKey, personalTextArea.value);
    });

    function updateDetailsProfile() {
        document.getElementById('detailsPageName').textContent = nodes.display.name.textContent;
        document.getElementById('detailsPageBio').textContent = nodes.display.bio.textContent;
        
        const detailsAvatar = document.getElementById('detailsPageAvatar');
        const detailsInitials = document.getElementById('detailsPageInitials');
        
        if (nodes.avatarPreview.style.display !== 'none') {
            detailsAvatar.src = nodes.avatarPreview.src;
            detailsAvatar.style.display = 'block';
            detailsInitials.style.display = 'none';
        } else {
            detailsInitials.textContent = nodes.avatarInitials.textContent;
            detailsAvatar.style.display = 'none';
            detailsInitials.style.display = 'flex';
        }
    }

    function triggerGpaAnimation() {
        hideGpaTooltip();
        gpaTab.classList.remove('gpa-animate');
        void gpaTab.offsetWidth;
        gpaTab.classList.add('gpa-animate');
    }

    function syncGpaBarHeights() {
        const gpaValues = gpaBarWrappers
            .map(wrapper => Number(wrapper.dataset.gpa))
            .filter(value => Number.isFinite(value));

        if (!gpaValues.length) return;

        const minValue = Math.min(...gpaValues);
        const maxValue = Math.max(...gpaValues);
        const minHeight = 72;
        const maxHeight = 100;

        gpaBarWrappers.forEach(wrapper => {
            const value = Number(wrapper.dataset.gpa);
            if (!Number.isFinite(value)) return;

            const height = maxValue === minValue
                ? 86
                : minHeight + (((value - minValue) / (maxValue - minValue)) * (maxHeight - minHeight));

            wrapper.style.setProperty('--h', `${height.toFixed(2)}%`);
        });
    }

    function renderAwardsPage(page) {
        const awardsPageCount = getAwardsPageCount();
        currentAwardsPage = Math.min(Math.max(page, 1), awardsPageCount);

        const startIndex = (currentAwardsPage - 1) * awardsPerPage;
        const currentAwards = awardFiles.slice(startIndex, startIndex + awardsPerPage);

        awardsGrid.innerHTML = currentAwards.map((file, index) => {
            const awardNumber = startIndex + index + 1;
            const src = file.startsWith('data:') ? file : `assets/awards/${file}`;

            return `
                <button type="button" class="award-item" data-award-src="${src}" data-award-alt="Award ${awardNumber}" data-award-index="${startIndex + index}">
                    <img src="${src}" alt="Award ${awardNumber}" loading="lazy">
                </button>
            `;
        }).join('');

        awardsPageInfo.textContent = `${currentAwardsPage} / ${awardsPageCount}`;
        awardsPrevBtn.disabled = currentAwardsPage === 1;
        awardsNextBtn.disabled = currentAwardsPage === awardsPageCount;
    }

    function updateAwardPreview() {
        const file = awardFiles[currentAwardPreviewIndex];
        const src = file.startsWith('data:') ? file : `assets/awards/${file}`;

        awardPreviewImage.src = src;
        awardPreviewImage.alt = `Award ${currentAwardPreviewIndex + 1}`;
        awardPreviewCount.textContent = `${currentAwardPreviewIndex + 1} / ${awardFiles.length}`;
        awardPreviewPrev.disabled = currentAwardPreviewIndex === 0;
        awardPreviewNext.disabled = currentAwardPreviewIndex === awardFiles.length - 1;
    }

    function openAwardPreview(index) {
        currentAwardPreviewIndex = Math.min(Math.max(index, 0), awardFiles.length - 1);
        updateAwardPreview();
        awardPreviewModal.classList.add('active');
        awardPreviewModal.setAttribute('aria-hidden', 'false');
    }

    function closeAwardPreview() {
        awardPreviewModal.classList.remove('active');
        awardPreviewModal.setAttribute('aria-hidden', 'true');
    }

    function changeAwardPreview(step) {
        const nextIndex = currentAwardPreviewIndex + step;
        if (nextIndex < 0 || nextIndex >= awardFiles.length) return;

        currentAwardPreviewIndex = nextIndex;
        updateAwardPreview();
    }

    function hideGpaTooltip() {
        gpaTooltip.classList.remove('is-visible');
        gpaTooltip.setAttribute('aria-hidden', 'true');
    }

    function showGpaTooltip(event) {
        const wrapper = event.currentTarget.parentElement;
        const chartRect = gpaChart.getBoundingClientRect();
        const pointerX = event.clientX - chartRect.left;
        const pointerY = event.clientY - chartRect.top;
        const gradeTotal = wrapper.dataset.gradeTotal || '271';
        const classTotal = wrapper.dataset.classTotal || '29';

        gpaTooltipGradeRank.textContent = `年级排名：${wrapper.dataset.gradeRank}/${gradeTotal}`;
        gpaTooltipClassRank.textContent = `班级排名：${wrapper.dataset.classRank}/${classTotal}`;
        gpaTooltip.classList.add('is-visible');
        gpaTooltip.setAttribute('aria-hidden', 'false');

        const tooltipWidth = gpaTooltip.offsetWidth;
        const tooltipHeight = gpaTooltip.offsetHeight;
        const margin = 14;

        let left = pointerX + 14;
        let top = pointerY - tooltipHeight - 14;

        if (left + tooltipWidth > chartRect.width - margin) {
            left = chartRect.width - tooltipWidth - margin;
        }
        if (left < margin) {
            left = margin;
        }

        if (top < margin) {
            top = Math.min(chartRect.height - tooltipHeight - margin, pointerY + 14);
        }
        if (top < margin) {
            top = margin;
        }

        gpaTooltip.style.left = `${left}px`;
        gpaTooltip.style.top = `${top}px`;
    }

    function activateDetailsTab(target) {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        const activeBtn = document.querySelector(`.tab-btn[data-tab="${target}"]`);
        const activeContent = document.getElementById(`tab-${target}`);

        if (!activeBtn || !activeContent) return;

        activeBtn.classList.add('active');
        activeContent.classList.add('active');

        if (target === 'personal') {
            hideGpaTooltip();
            gpaTab.classList.remove('gpa-animate');
            startTypewriter();
        }

        if (target === 'gpa') {
            triggerGpaAnimation();
        }

        if (target !== 'gpa') {
            hideGpaTooltip();
            gpaTab.classList.remove('gpa-animate');
        }
    }

    function resetAntigravityBox() {
        antigravityBox.style.transform = 'rotateX(0deg) rotateY(0deg)';
    }

    viewDetailsBtn.onclick = () => {
        updateDetailsProfile();
        mainContainer.classList.add('hidden');
        detailsPage.classList.add('active');
        resetAntigravityBox();

        const activeTab = document.querySelector('.tab-btn.active')?.getAttribute('data-tab') || 'personal';
        if (activeTab === 'gpa') {
            triggerGpaAnimation();
        } else if (activeTab === 'personal') {
            startTypewriter(); // 触发打字机效果
        }
    };

    backToCardBtn.onclick = () => {
        hideGpaTooltip();
        resetAntigravityBox();
        detailsPage.classList.remove('active');
        mainContainer.classList.remove('hidden');
    };

    // Details 页面 Tabs 切换
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.onclick = () => activateDetailsTab(btn.getAttribute('data-tab'));
    });

    antigravityWrapper.addEventListener('mousemove', (event) => {
        const rect = antigravityWrapper.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const xNorm = (x / rect.width) - 0.5;
        const yNorm = (y / rect.height) - 0.5;

        const rotateX = yNorm * -20;
        const rotateY = xNorm * 20;

        antigravityBox.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    antigravityWrapper.addEventListener('mouseleave', resetAntigravityBox);

    awardsPrevBtn.onclick = () => renderAwardsPage(currentAwardsPage - 1);
    awardsNextBtn.onclick = () => renderAwardsPage(currentAwardsPage + 1);
    awardsUploadBtn.onclick = () => awardsUploadInput.click();
    awardsGrid.onclick = (event) => {
        const awardButton = event.target.closest('.award-item');
        if (!awardButton) return;

        openAwardPreview(Number(awardButton.dataset.awardIndex));
    };
    awardPreviewModal.onclick = (event) => {
        if (event.target === awardPreviewModal) closeAwardPreview();
    };
    awardPreviewPrev.onclick = () => changeAwardPreview(-1);
    awardPreviewNext.onclick = () => changeAwardPreview(1);
    awardPreviewClose.onclick = () => closeAwardPreview();
    awardsUploadInput.onchange = (event) => {
        const files = Array.from(event.target.files || []).filter(file => file.type.startsWith('image/'));
        if (!files.length) {
            event.target.value = '';
            return;
        }

        Promise.all(files.map(file => new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve(ev.target.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
        }))).then(results => {
            const uploadedImages = results.filter(Boolean);
            if (!uploadedImages.length) return;

            uploadedAwardFiles = [...uploadedAwardFiles, ...uploadedImages];
            refreshAwardFiles();
            persistUploadedAwards();
            renderAwardsPage(getAwardsPageCount());
        });

        event.target.value = '';
    };
    renderAwardsPage(1);

    gpaBars.forEach(bar => {
        bar.addEventListener('mouseenter', showGpaTooltip);
        bar.addEventListener('mouseleave', hideGpaTooltip);
    });

    // 打字机效果
    let typewriterTimeout;
    function startTypewriter() {
        const fullText = personalTextArea.value;

        personalTextArea.style.opacity = '0';
        personalTextArea.style.pointerEvents = 'none';
        typewriterText.style.opacity = '1';
        typewriterText.textContent = '';

        clearTimeout(typewriterTimeout);

        let index = 0;

        function finishTypewriter() {
            typewriterTimeout = setTimeout(() => {
                typewriterText.style.opacity = '0';
                personalTextArea.style.opacity = '1';
                personalTextArea.style.pointerEvents = 'auto';
            }, 420);
        }

        function typeNextCharacter() {
            if (index >= fullText.length) {
                finishTypewriter();
                return;
            }

            const currentChar = fullText[index];
            typewriterText.textContent += currentChar;
            index += 1;

            let delay = 42;
            if (currentChar === '\n') delay = 140;
            if (/[,.!?，。！？：；]/.test(currentChar)) delay = 110;

            typewriterTimeout = setTimeout(typeNextCharacter, delay);
        }

        typeNextCharacter();
    }

    // 数据初始化
    (function load() {
        const data = JSON.parse(localStorage.getItem('profile_data'));
        if (data) {
            Object.keys(data).forEach(k => {
                if (nodes.display[k]) nodes.display[k].textContent = data[k];
            });
        }
        const avatar = localStorage.getItem('profile_avatar');
        if (avatar) {
            applyAvatar(avatar);
        } else {
            updateAvatarPresetSelection('');
        }
        const theme = localStorage.getItem('profile_theme');
        if (theme === 'light') {
            document.body.classList.remove('dark-mode');
            nodes.themeBtn.textContent = "🌙";
        } else {
            nodes.themeBtn.textContent = "☀️";
        }

        const savedPersonalText = localStorage.getItem(personalTextStorageKey);
        if (savedPersonalText !== null) {
            personalTextArea.value = savedPersonalText;
        }
        
        // 确保名字首字母同步
        if (!avatar && nodes.display.name.textContent) {
             nodes.avatarInitials.textContent = nodes.display.name.textContent.trim().charAt(0).toUpperCase();
        }
    })();
});
