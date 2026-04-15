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
            btn.innerHTML = `<span>⏳</span><span>SYNCING...</span>`;
            
            const data = await APAS_PARSER.run();
            
            chrome.storage.local.set(data, () => {
                btn.classList.replace('syncing', 'success');
                btn.innerHTML = `<span>✅</span><span>SYNC SUCCESSFUL</span>`;
                
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
            // 1. Skip filler/university requirements
            if (req.classList.contains('category_University')) return;

            // 2. TRUST THE HEADER STATUS
            // We look for any class containing "statusOK" or "statusNO" inside the header area
            const headerStatusEl = req.querySelector('.reqStatusGroup .status, .reqHeaderTable .status');
            const headerClass = (headerStatusEl?.className || "").toLowerCase();
            
            let categoryStatus = "UNMET";
            if (headerClass.includes('ok')) categoryStatus = "MET";
            else if (headerClass.includes('ip')) categoryStatus = "IP";
            // If it specifically has "no", it's unmet (already defaulted, but for clarity)
            else if (headerClass.includes('no')) categoryStatus = "UNMET";

            const overallTitle = req.querySelector('.reqTitle h4')?.innerText.trim() || "Requirement";

            req.querySelectorAll('.subrequirement').forEach(sub => {
                const titleEl = sub.querySelector('.subreqTitle');
                if (!titleEl) return;

                const parts = titleEl.innerHTML.split(/<br\s*\/?>/i);
                const title = parts[0].replace(/<[^>]*>/g, '').trim();
                const desc = parts.slice(1).join(' ').replace(/<[^>]*>/g, '').trim();
                
                // 3. TRUST THE SUB-REQUIREMENT STATUS
                const subStatusEl = sub.querySelector('.status');
                const subClass = (subStatusEl?.className || "").toLowerCase();
                let subStatus = 'UNMET';
                if (subClass.includes('ok')) subStatus = 'MET';
                else if (subClass.includes('ip')) subStatus = 'IP';

                const options = [];
                let lastDept = "";

                // Course scraping (keep this so the cards have data inside them)
                const courseCells = sub.querySelectorAll('.course, .completedCourses .course');
                courseCells.forEach(cell => {
                    const text = cell.innerText.trim().toUpperCase();
                    const fullMatch = text.match(/([A-Z]{2,4})\s*(\d{4}[A-Z]?)/) || text.match(/(\d)?([A-Z]{2,4})(\d{4}[A-Z]?)/);
                    const numOnlyMatch = text.match(/^(\d{4}[A-Z]?)$/);

                    if (fullMatch) {
                        const dept = fullMatch[1] || fullMatch[2];
                        const num = (fullMatch[1] && !isNaN(fullMatch[1])) ? fullMatch[2] : (fullMatch[3] || fullMatch[2]);
                        const cleaned = APAS_PARSER.normalizeCourse(dept, num);
                        if (cleaned) {
                            options.push(cleaned);
                            lastDept = cleaned.dept;
                        }
                    } else if (numOnlyMatch && lastDept) {
                        const cleaned = APAS_PARSER.normalizeCourse(lastDept, numOnlyMatch[1]);
                        if (cleaned) options.push(cleaned);
                    }
                });

                // Push the data
                auditData.push({
                    requirementTitle: overallTitle,
                    categoryStatus: categoryStatus, // This is the 'Trust APAS' field
                    title, 
                    description: desc,
                    status: subStatus, 
                    options,
                    logic: sub.querySelector('.subreqNumber')?.innerText.includes("OR") ? 'OR' : 'MANDATORY'
                });
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