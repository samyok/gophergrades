const APAS_COMPONENTS = {
    fixSpacing: (text) => {
        if (!text) return "";
        return text.replace(/([a-zA-Z])(\d)/g, '$1 $2')
                   .replace(/([a-z])([A-Z])/g, '$1 $2')
                   .split('\n').map(line => line.replace(/\s+/g, ' ').trim()).join('\n').trim();
    },

    //nest rquirement/subreqirements for rendering
    nestData: (flatReqs) => {
        const nested = {};
        flatReqs.forEach(req => {
            const cat = req.requirementTitle;
            if (!nested[cat]) {
                nested[cat] = { 
                    title: cat, 
                    subReqs: [] 
                };
            }
            nested[cat].subReqs.push(req);
        });
        return Object.values(nested);
    },

    //helper, used to ensure course routing matches relevant term/semester
    getActiveTerm: () => {

        const pathParts = window.location.pathname.split('/');
        const termIndex = pathParts.indexOf('explore') + 1;
        
        if (termIndex > 0 && pathParts[termIndex]) {
            return pathParts[termIndex];
        }

        const month = new Date().getMonth();
        const year = new Date().getFullYear();
        if (month <= 4) return `${year}Spring`;
        if (month <= 7) return `${year}Summer`;
        return `${year}Fall`;
    },

    //shell of modal, static
    modalShell: () => `
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

    //grid of top level requirements
    categoryGrid: (categories) => {
        return Object.keys(categories).map(key => {
            const category = categories[key];
            const safeTitle = (category.title || "Unknown").toLowerCase();
            
            return `
                <div class="gopher-grades-req-card" data-idx="${key}">
                    <h4>${category.title || "Requirement"}</h4>
                    <span>${category.subReqs.length} actionable items</span>
                </div>
            `;
        }).join('');
    },

    //grid of subrequirements
    subReqList: (category) => {
        let currentNum = 0;
        return category.subReqs.map((sub, i) => {
            //ensure displaying OR logic correctly
            const isOr = sub.logic === 'OR';
            if (!isOr) currentNum++;

            return `
                <div class="gopher-grades-sub-card" data-idx="${i}">
                    <h4 class="req-title">
                        <span class="req-index">${isOr ? 'OR' : currentNum + ')'}</span>
                        ${APAS_COMPONENTS.fixSpacing(sub.title)}
                    </h4>
                    <div class="req-right-side">
                        <span class="chevron-icon">&rsaquo;</span>
                    </div>
                </div>`;
        }).join('');
    },

    //display of course options in unmet reqs
    courseRows: (options) => {
        const term = APAS_COMPONENTS.getActiveTerm();

        return options.map(opt => {
            const id = `${opt.dept}${opt.num}`;
            //clickable cards route to course pages in schedule builder
            const url = `https://schedulebuilder.umn.edu/explore/${term}/${opt.dept}/${opt.num}/`;

            return `
                <div class="course-option-card" data-url="${url}">
                    <div class="course-left-content">
                        <div class="course-header-row">
                            <span class="course-id-text">${opt.dept} ${opt.num}</span> 
                            <span id="gpa-${id}" class="status-tag gpa-badge">... GPA</span>
                        </div>
                        <span id="name-${id}" class="course-name-text">Loading course name...</span>
                    </div>
                    <div class="course-right-side">
                        <span class="action-label">VIEW COURSE</span>
                        <span class="chevron-icon">&rsaquo;</span>
                    </div>
                </div>`;
        }).join('');
    },

    //mdal layout if no APAS synced, instructions
    renderEmptyState: (overlay) => {
        overlay.querySelector('.modal-scroll-area').innerHTML = `
            <div class="apas-info-panel empty-state-container">
                <div class="empty-state-card">
                    <h3 class="empty-title">No Data Synced Yet</h3>
                    <p class="empty-desc">
                        To see your progress and GPA data here, you first need to sync your APAS report.
                    </p>
                    <div class="sync-instructions">
                        <strong class="sync-steps-title">How to sync:</strong>
                        <ol class="sync-steps-list">
                            <li>Open your <strong>APAS</strong> page in a new tab.</li>
                            <li>Click <strong>"Run Declared Programs"</strong>.</li>
                            <li>Once the report loads, click the <strong>Sync APAS Explorer</strong> button in the corner.</li>
                        </ol>
                    </div>
                    <button id="open-apas-btn" class="back-btn primary">OPEN MYU / APAS</button>
                </div>
            </div>`;

        overlay.querySelector('#open-apas-btn').onclick = () => {
            window.open('https://www.myu.umn.edu/','_blank');
        };
    }
};