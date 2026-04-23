const APAS_COMPONENTS = {
    // standardized text spacing and remove extra whitespace
    fixSpacing: (text) => {
        if (!text) return "";
        return text.replace(/([a-zA-Z])(\d)/g, '$1 $2')
                   .replace(/([a-z])([A-Z])/g, '$1 $2')
                   .split('\n').map(line => line.replace(/\s+/g, ' ').trim()).join('\n').trim();
    },

    // nests unmet subreqs under their reqs
    nestData: (flatReqs) => {
        const nested = {};
        flatReqs.forEach(req => {
            const parentTitle = req.requirementTitle;
            if (!nested[parentTitle]) {
                nested[parentTitle] = { 
                    title: parentTitle, 
                    subRequirements: [] 
                };
            }
            nested[parentTitle].subRequirements.push(req);
        });
        return Object.values(nested);
    },

    // get current/relevant term for course search
    getActiveTerm: () => {
        const pathParts = window.location.pathname.split('/');
        const termIndex = pathParts.indexOf('explore') + 1;
        
        if (termIndex > 0 && pathParts[termIndex]) return pathParts[termIndex];

        const month = new Date().getMonth();
        const year = new Date().getFullYear();
        if (month <= 4) return `${year}Spring`;
        if (month <= 7) return `${year}Summer`;
        return `${year}Fall`;
    },

    // GPA calculation logic
    calculateAvgFromGrades: (grades) => {
        const weights = { "A": 4.0, "A-": 3.67, "B+": 3.33, "B": 3.0, "B-": 2.67, "C+": 2.33, "C": 2.0, "C-": 1.67, "D+": 1.33, "D": 1.0, "F": 0.0 };
        let pts = 0, count = 0;
        Object.entries(grades).forEach(([grade, n]) => {
            if (weights[grade] !== undefined) { pts += weights[grade] * n; count += n; }
        });
        return count > 0 ? (pts / count).toFixed(2) : "N/A";
    },

    // Static shell for the modal window
    modalShellHtml: () => `
        <div class="gopher-grades-modal-window">
            <div class="modal-header-main">
                <div class="header-title-container">
                    <img src="https://www.umn.lol/images/icon.png" class="header-logo"> 
                    <span>APAS EXPLORER</span>
                </div>
                <button id="close-apas" class="modal-close-btn">✕</button>
            </div>
            <div class="modal-scroll-area"></div>
            <div class="apas-disclaimer-container">
                <div class="apas-disclaimer-content">
                    <span class="disclaimer-icon">ⓘ</span>
                    <p>This is a processed estimate. <strong>Always verify</strong> requirements with your official APAS report and academic advisor.</p>
                </div>
            </div>
        </div>`,

    // Top-level categories
    categoryGridHtml: (categories) => {
        return categories.map((cat, idx) => `
            <div class="gopher-grades-req-card" data-idx="${idx}">
                <h4>${cat.title}</h4>
                <span>${cat.subRequirements.length} actionable items</span>
            </div>
        `).join('');
    },

    // Sub-requs within a category
    subReqListHtml: (category) => {
        return category.subRequirements.map((sub, idx) => `
            <div class="gopher-grades-sub-card" data-idx="${idx}">
                <h4 class="req-title">
                    <span class="req-index">${sub.logicLabel || (idx + 1 + ')')}</span>
                    ${APAS_COMPONENTS.fixSpacing(sub.title)}
                </h4>
                <div class="req-right-side">
                    <span class="chevron-icon">&rsaquo;</span>
                </div>
            </div>`).join('');
    },

    // Actionable course options
    courseRowsHtml: (options) => {
        const term = APAS_COMPONENTS.getActiveTerm();
        return options.map(opt => {
            const courseId = `${opt.dept}${opt.num}`;
            const url = `https://schedulebuilder.umn.edu/explore/${term}/${opt.dept}/${opt.num}/`;

            return `
                <div class="course-option-card" data-url="${url}">
                    <div class="course-left-content">
                        <div class="course-header-row">
                            <span class="course-id-text">${opt.dept} ${opt.num}</span> 
                            <span id="gpa-${courseId}" class="status-tag gpa-badge">... GPA</span>
                        </div>
                        <span id="name-${courseId}" class="course-name-text">Loading name...</span>
                    </div>
                    <div class="course-right-side">
                        <span class="action-label">VIEW COURSE</span>
                        <span class="chevron-icon">&rsaquo;</span>
                    </div>
                </div>`;
        }).join('');
    },

    // Instructions if no data is found
    emptyStateHtml: () => `
        <div class="apas-info-panel empty-state-container">
            <div class="empty-state-card">
                <h3 class="empty-title">No Data Synced Yet</h3>
                <p class="empty-desc">To see your unmet requirements and course GPAs, you need to sync your APAS report.</p>
                <div class="sync-instructions">
                    <strong class="sync-steps-title">How to sync:</strong>
                    <ol class="sync-steps-list">
                        <li>Open your <strong>APAS</strong> page in a new tab.</li>
                        <li>Click <strong>"Run Declared Programs"</strong>.</li>
                        <li>Once the report loads, click <strong>Sync APAS Explorer</strong> in the bottom corner.</li>
                    </ol>
                </div>
                <button id="open-apas-btn" class="back-btn primary">OPEN MYU / APAS</button>
            </div>
        </div>`
};