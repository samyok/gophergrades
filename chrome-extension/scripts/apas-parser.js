const APAS_PARSER = {
    init: () => {
        if (window.self !== window.top) return; 
        if (document.getElementById('gg-apas-sync')) return;

        const btn = document.createElement('button');
        btn.id = "gg-apas-sync";
        btn.innerHTML = `
            <img src="https://www.umn.lol/images/icon.png" style="width: 18px; height: 18px;">
            <span>SYNC APAS EXPLORER</span>
        `;

        btn.onclick = async () => {
            btn.classList.add('syncing');
            btn.innerHTML = `<img src="https://www.umn.lol/images/icon.png" style="width: 18px; height: 18px;"><span>SYNCING...</span>`;
            const data = await APAS_PARSER.run();
            chrome.storage.local.set(data, () => {
                btn.classList.replace('syncing', 'success');
                btn.innerHTML = `<img src="https://www.umn.lol/images/icon.png" style="width: 18px; height: 18px;"><span>SYNC SUCCESSFUL</span>`;
                setTimeout(() => {
                    btn.classList.remove('success');
                    btn.innerHTML = `
                        <img src="https://www.umn.lol/images/icon.png" style="width: 18px; height: 18px;">
                        <span>SYNC APAS EXPLORER</span>
                    `;
                }, 3000);
            });
        };
        document.body.appendChild(btn);
    },

    normalizeCourse: (dept, num) => {
        const cleanDept = dept.replace(/[^A-Z]/gi, '').toUpperCase();
        const cleanNum = num.replace(/[^0-9A-Z]/gi, '').toUpperCase();
        if (cleanDept.length >= 2 && cleanNum.length >= 4) {
            return { dept: cleanDept, num: cleanNum };
        }
        return null;
    },

    run: async () => {
        const iframe = document.getElementById('auditReports');
        const doc = iframe ? (iframe.contentDocument || iframe.contentWindow.document) : document;
        const auditData = [];

        doc.querySelectorAll('.requirement').forEach(req => {
            const titleEl = req.querySelector('.reqTitle h4') || req.querySelector('.reqTitle');
            const titleText = titleEl?.innerText.trim() || "";
            const titleUpper = titleText.toUpperCase();

            const isTarget = titleUpper.includes("TECHNICAL ELECTIVES");
            const isMajor = req.classList.contains('category_Major');
            const isWriting = titleUpper.includes("UPPER-DIVISION WRITING INTENSIVE");
            const isFluff = titleUpper.includes("CREDITS") || titleUpper.includes("UNIVERSITY OF MINNESOTA");

            if (!(isMajor || isWriting || isTarget) || isFluff) return;

            const headerStatusEl = req.querySelector('.reqStatusGroup .status, .reqHeaderTable .status');
            const headerClass = (headerStatusEl?.className || "").toLowerCase();
            let categoryStatus = headerClass.includes('ok') ? "MET" : (headerClass.includes('ip') ? "IP" : "UNMET");

            req.querySelectorAll('.subrequirement').forEach((sub) => {
                const subTitleEl = sub.querySelector('.subreqTitle');
                if (!subTitleEl) return;

                const rawHtml = subTitleEl.innerHTML;
                let displayTitle = "";
                let description = "";

                if (isWriting) {
                    displayTitle = "Major Writing Requirement";
                    description = subTitleEl.innerText.trim();
                } else if (rawHtml.toLowerCase().includes('<br>')) {
                    const parts = rawHtml.split(/<br\s*\/?>/i);
                    displayTitle = parts[0].replace(/<[^>]*>/g, '').trim();
                    description = parts.slice(1).join(' ').replace(/<[^>]*>/g, '').trim();
                } else {
                    displayTitle = subTitleEl.innerText.split('\n')[0].trim();
                }

               const options = [];
                const courseCells = sub.querySelectorAll('.course, .completedCourses .course, .selectfromcourselist .course');

                courseCells.forEach(cell => {
                    const text = cell.innerText.trim().toUpperCase();
                    
                    const match = text.match(/([A-Z]{2,4})\s*(\d{4}[A-Z]?)/) || 
                                text.match(/(\d)?([A-Z]{2,4})(\d{4}[A-Z]?)/);
                    
                    if (match) {

                        const dept = (match[2] && !isNaN(match[1])) ? match[2] : match[1];
                        const num = (match[2] && !isNaN(match[1])) ? match[3] : match[2];
                        
                        const cleaned = APAS_PARSER.normalizeCourse(dept, num);
                        if (cleaned) {
                            options.push(cleaned);
                        }
                    }
                });

                if (options.length > 0) {
                    auditData.push({
                        requirementTitle: String(titleText),
                        categoryStatus: categoryStatus,
                        title: displayTitle,
                        description: description,
                        status: (sub.querySelector('.status')?.className || "").toLowerCase().includes('ok') ? 'MET' : 'UNMET',
                        options,
                        logic: sub.querySelector('.subreqNumber')?.innerText.includes("OR") ? 'OR' : 'MANDATORY'
                    });
                }
            });
        });

        return { 
            "gg_apas_unmet": auditData,
            "gg_apas_completed": auditData
                .filter(r => r.status === 'MET' || r.status === 'IP')
                .flatMap(r => r.options.map(o => (o.dept + o.num).toUpperCase()))
        };
    }
};

APAS_PARSER.init();