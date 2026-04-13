const APAS_PARSER = {
    init: () => {
        // 1. Prevent the button from rendering inside the iframe
        if (window.self !== window.top) return; 

        // 2. Prevent duplicate buttons if the script re-runs
        if (document.getElementById('gg-apas-sync')) return;

        const btn = document.createElement('button');
        btn.id = "gg-apas-sync";
        btn.textContent = "Sync Degree Progress";

        btn.onclick = async () => {
            btn.classList.add('syncing');
            btn.textContent = "Processing...";
            
            // This 'run' function will look for the iframe 
            // from the parent's perspective
            const data = await APAS_PARSER.run();
            
            chrome.storage.local.set(data, () => {
                btn.classList.replace('syncing', 'success');
                btn.textContent = "Sync Successful";
                setTimeout(() => {
                    btn.classList.remove('success');
                    btn.textContent = "Sync Degree Progress";
                }, 3000);
            });
        };
        document.body.appendChild(btn);
    },

    run: async () => {
        // UMN APAS uses an iframe with ID 'auditReports'
        const iframe = document.getElementById('auditReports');
        const doc = iframe ? (iframe.contentDocument || iframe.contentWindow.document) : document;
        const auditData = [];

        doc.querySelectorAll('.requirement').forEach(req => {
            if (req.classList.contains('category_University')) return;
            const overallTitle = req.querySelector('.reqTitle')?.innerText.trim() || "Requirement";

            req.querySelectorAll('.subrequirement').forEach(sub => {
                const titleEl = sub.querySelector('.subreqTitle');
                if (!titleEl) return;

                // Title/Desc Split: APAS uses <br> to separate the headline from instructions
                const parts = titleEl.innerHTML.split(/<br\s*\/?>/i);
                const title = parts[0].replace(/<[^>]*>/g, '').trim();
                const desc = parts.slice(1).join(' ').replace(/<[^>]*>/g, '').trim();
                
                const statusEl = sub.querySelector('.status');
                const status = statusEl?.classList.contains('Status_OK') ? 'MET' : 
                               (statusEl?.classList.contains('Status_IP') ? 'IP' : 'UNMET');

                const options = [];
                let lastDept = "";
                sub.querySelectorAll('.course').forEach(cell => {
                    const text = cell.innerText.trim();
                    const match = text.match(/([A-Z]{2,4})\s*(\d{4}[A-Z]?)/) || text.match(/(\d{4}[A-Z]?)/);
                    if (match) {
                        const dept = match[2] ? match[1].toUpperCase() : lastDept;
                        const num = match[2] ? match[2].toUpperCase() : match[1].toUpperCase();
                        if (dept) { lastDept = dept; options.push({ dept, num }); }
                    }
                });

                if (options.length) {
                    auditData.push({
                        requirementTitle: overallTitle,
                        title, description: desc,
                        status, options,
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