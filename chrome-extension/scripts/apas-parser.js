const APAS_PARSER = {
    //initialize sync button
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

    //helper to clean course codes
    normalizeCourse: (dept, num) => {
        const cleanDept = dept.replace(/[^A-Z]/gi, '').toUpperCase();
        const cleanNum = num.replace(/[^0-9A-Z]/gi, '').toUpperCase();
        if (cleanDept.length >= 2 && cleanNum.length >= 4) {
            return { dept: cleanDept, num: cleanNum };
        }
        return null;
    },

    //actual APAS html parsing logic
    run: async () => {
        const iframe = document.getElementById('auditReports');
        const doc = iframe ? (iframe.contentDocument || iframe.contentWindow.document) : document;
        const auditData = [];

        // Internal helper to handle spacing and tag stripping
        const cleanApasText = (html) => {
            if (!html) return "";
            return html
                .replace(/<br\s*\/?>/gi, ' ')
                .replace(/<[^>]+>/g, '')      
                .replace(/\s\s+/g, ' ')       
                .trim();
        };

        //search reqs for unmet reqs with courses to select from (actionable for schedule builder)
        doc.querySelectorAll('.requirement').forEach(req => {
            const titleEl = req.querySelector('.reqTitle h4') || req.querySelector('.reqTitle');
            const titleText = titleEl?.innerText.trim() || "Untitled Requirement";

            req.querySelectorAll('.subrequirement').forEach((sub) => {
                // Check status immediately - skip if already 'MET' or 'OK'
                const statusClass = (sub.querySelector('.status')?.className || "").toLowerCase();
                if (statusClass.includes('ok')) return;

                const subTitleEl = sub.querySelector('.subreqTitle');
                if (!subTitleEl) return;

                // 1. Extract Course Options from attributes (the most reliable source)
                const options = [];
                const courseSpans = sub.querySelectorAll('.course.draggable');
                
                courseSpans.forEach(span => {
                    let dept = span.getAttribute('department') || "";
                    let num = span.getAttribute('number') || "";
                    dept = dept.replace(/^\d+/, ''); // Clean "1MATH" -> "MATH"

                    const cleaned = APAS_PARSER.normalizeCourse(dept, num);
                    if (cleaned) options.push(cleaned);
                });

                // 2. Only proceed if there are actual courses to choose from
                if (options.length > 0) {
                    const rawHtml = subTitleEl.innerHTML;
                    let displayTitle = "";
                    let description = "";

                    // Split Title and Description using the <br> logic
                    if (rawHtml.toLowerCase().includes('<br>')) {
                        const parts = rawHtml.split(/<br\s*\/?>/i);
                        displayTitle = cleanApasText(parts[0]);
                        description = cleanApasText(parts.slice(1).join(' '));
                    } else {
                        displayTitle = cleanApasText(rawHtml);
                        description = ""; 
                    }

                    const rawPretext = sub.querySelector('.subreqNumber')?.innerText.trim() || "";
                    // Clean the logic label to just "1)", "OR)", etc.
                    const cleanLogicLabel = rawPretext.match(/\d+\)|OR\)/i)?.[0] || rawPretext;
                    
                    const subData = {
                        requirementTitle: cleanApasText(titleText),
                        title: displayTitle,
                        description: description,
                        options,
                        logic: cleanLogicLabel.includes("OR") ? 'OR' : 'MANDATORY',
                        logicLabel: cleanLogicLabel
                    };
                    
                    auditData.push(subData);
                }
            });
        });
        
        return { 
            "gg_apas_unmet": auditData,
            "gg_apas_last_sync": new Date().getTime()
        };
    }
};

APAS_PARSER.init();