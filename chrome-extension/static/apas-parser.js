const APAS_PARSER = {
    init: () => {
        if (document.getElementById('gg-apas-sync')) return;

        // 1. Inject the CSS into the page head
        const style = document.createElement('style');
        style.innerHTML = `
            #gg-apas-sync {
                position: fixed !important;
                bottom: 30px !important;
                right: 30px !important;
                z-index: 2147483647 !important; /* Max z-index to stay above APAS */
                padding: 10px 22px;
                background-color: #7a0019; /* Maroon */
                color: #ffcc33; /* Gold */
                border: 2px solid #ffcc33;
                border-radius: 30px;
                font-weight: 800;
                font-size: 13px;
                font-family: sans-serif;
                text-transform: uppercase;
                cursor: pointer;
                box-shadow: 0 6px 20px rgba(0,0,0,0.3);
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            #gg-apas-sync:hover {
                transform: translateY(-3px);
                background-color: #8a001c;
            }
            #gg-apas-sync.success {
                background-color: #2e7d32 !important;
                border-color: #fff !important;
                color: #fff !important;
            }
        `;
        document.head.appendChild(style);

        // 2. Create the button
        const btn = document.createElement('button');
        btn.id = "gg-apas-sync";
        btn.innerHTML = `<span>🔄</span> SYNC APAS`;

        btn.onclick = () => {
            btn.innerHTML = `<span>⏳</span> SYNCING...`;
            APAS_PARSER.run();
            
            setTimeout(() => {
                btn.classList.add('success');
                btn.innerHTML = `<span>✅</span> SYNCED!`;
                
                setTimeout(() => {
                    btn.classList.remove('success');
                    btn.innerHTML = `<span>🔄</span> SYNC APAS`;
                }, 3000);
            }, 800);
        };

        document.body.appendChild(btn);
    },

    run: async () => {
        console.log("[APAS Parser] Starting sync...");
        let doc = document;
        const iframe = document.getElementById('auditReports');
        if (iframe) doc = iframe.contentDocument || iframe.contentWindow.document;

        const auditData = [];
        const mainReqs = doc.querySelectorAll('.requirement');

        mainReqs.forEach(req => {
            if (req.classList.contains('category_University')) return;
            
            const overallTitle = req.querySelector('.reqTitle')?.innerText.trim() || "Major Requirement";
            const subReqs = req.querySelectorAll('.subrequirement');

            // Tracker for OR grouping logic
            let lastSeq = "";

            subReqs.forEach(sub => {
                const titleEl = sub.querySelector('.subreqTitle');
                if (!titleEl) return;

                // 1. SEQUENCE & LOGIC
                const rawSeq = sub.querySelector('.subreqNumber')?.innerText.trim() || "";
                const isOr = rawSeq.includes("OR") || (rawSeq !== "" && rawSeq === lastSeq);
                
                if (rawSeq !== "") {
                    lastSeq = rawSeq.replace("OR", "").trim();
                }

                // 2. TITLE/DESC SPLIT (Splits at the VERY FIRST <br> for safety)
                const rawHTML = titleEl.innerHTML;
                const firstBreakIndex = rawHTML.toLowerCase().indexOf('<br');
                
                let cleanTitle = "";
                let description = "";

                if (firstBreakIndex !== -1) {
                    // Title is everything before the first break
                    cleanTitle = rawHTML.substring(0, firstBreakIndex).replace(/<[^>]*>/g, '').trim();
                    // Description is everything after, with breaks preserved as newlines
                    description = rawHTML.substring(firstBreakIndex)
                        .replace(/<br\s*\/?>/gi, '\n')
                        .replace(/<[^>]*>/g, '')
                        .trim();
                } else {
                    const text = titleEl.innerText.trim();
                    const lines = text.split('\n');
                    cleanTitle = lines[0].trim();
                    description = lines.slice(1).join(' ').trim();
                }

                const finalTitle = rawSeq ? `${rawSeq} ${cleanTitle}` : cleanTitle;

                // 3. STATUS SCRAPING
                const statusEl = sub.querySelector('.status');
                const status = statusEl?.classList.contains('Status_OK') ? 'MET' : 
                            (statusEl?.classList.contains('Status_IP') ? 'IP' : 'UNMET');

                // 4. COURSE SCRAPING
                const options = [];
                const courseCells = sub.querySelectorAll('.course, .course.draggable');
                let lastDept = ""; 

                courseCells.forEach(cell => {
                    const text = cell.innerText.trim();
                    const match = text.match(/([A-Z]{2,4})\s*(\d{4}[A-Z]?)/) || text.match(/(\d{4}[A-Z]?)/);
                    
                    if (match) {
                        const dept = match[2] ? match[1].toUpperCase() : lastDept;
                        const num = match[2] ? match[2].toUpperCase() : match[1].toUpperCase();
                        if (dept) {
                            lastDept = dept;
                            options.push({ dept, num });
                        }
                    }
                });

                if (options.length > 0) {
                    auditData.push({
                        requirementTitle: overallTitle,
                        title: finalTitle,
                        description: description,
                        status: status,
                        options: options,
                        logic: isOr ? 'OR' : 'MANDATORY'
                    });
                }
            });
        });

        const dataToSave = {
            "gg_apas_unmet": auditData,
            "gg_apas_completed": auditData
                .filter(r => r.status === 'MET' || r.status === 'IP')
                .flatMap(r => r.options.map(o => (o.dept + o.num).toUpperCase()))
        };

        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set(dataToSave, () => {
                console.log(`[GG] Sync Complete. Scraped ${auditData.length} sub-requirements.`);
            });
        }
    }
};

if (document.readyState === 'complete') {
    APAS_PARSER.init();
} else {
    window.addEventListener('load', APAS_PARSER.init);
}