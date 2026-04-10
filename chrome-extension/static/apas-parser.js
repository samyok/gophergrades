const APAS_PARSER = {
    init: () => {
        if (document.getElementById('gg-apas-sync')) return;

        const btn = document.createElement('button');
        btn.id = "gg-apas-sync";
        btn.innerText = "🔄 Sync with Gopher Grades";

        Object.assign(btn.style, {
            position: 'fixed', 
            bottom: '30px',
            right: '30px', 
            zIndex: 10000,
            padding: '12px 20px', 
            backgroundColor: '#7a0019', 
            color: '#ffcc33',
            border: '2px solid #ffcc33', 
            borderRadius: '25px',
            fontWeight: 'bold', 
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
            fontSize: '14px',
            fontFamily: 'sans-serif'
        });

        btn.onclick = () => {
            btn.innerText = "⏳ Syncing...";
            btn.style.opacity = "0.7";
            APAS_PARSER.run();
            
            setTimeout(() => {
                btn.innerText = "✅ Synced!";
                btn.style.backgroundColor = "#2e7d32";
                btn.style.border = "2px solid #fff";
            }, 800);
        };

        document.body.appendChild(btn);
    },

    run: () => {
        console.log("[APAS Parser] Starting sync...");
        let doc = document;
        const iframe = document.getElementById('auditReports');
        if (iframe) doc = iframe.contentDocument || iframe.contentWindow.document;

        const auditData = [];
        const mainReqs = doc.querySelectorAll('.requirement');

        mainReqs.forEach(req => {
            const overallTitle = req.querySelector('.reqTitle')?.innerText.trim() || "Requirement";
            if (overallTitle.includes("Student Name") || overallTitle.includes("ID:")) return;
            const subReqs = req.querySelectorAll('.subrequirement');

            subReqs.forEach(sub => {
                const subTitle = sub.querySelector('.subreqTitle')?.innerText.trim();
                if (!subTitle) return;

                const statusEl = sub.querySelector('.status');
                const status = statusEl?.classList.contains('Status_OK') ? 'MET' : 
                               (statusEl?.classList.contains('Status_IP') ? 'IP' : 'UNMET');

                const options = [];
                const courseCells = sub.querySelectorAll('.course, .course.draggable');
                
                const courseRegex = /([A-Z]{2,4})\s*(\d{4}[A-Z]?)/;

                courseCells.forEach(cell => {
                    let text = cell.innerText.trim();
                    
                    text = text.replace(/^\d+(?=[A-Z])/, '');

                    const match = text.match(courseRegex);
                    if (match) {
                        options.push({
                            dept: match[1].toUpperCase(),
                            num: match[2].toUpperCase()
                        });
                    }
                });

                const uniqueOptions = options.filter((v, i, a) => 
                    a.findIndex(t => (t.dept === v.dept && t.num === v.num)) === i
                );

                if (uniqueOptions.length > 0) {
                    auditData.push({
                        requirementTitle: overallTitle,
                        title: subTitle,
                        status: status,
                        options: uniqueOptions
                    });
                }
            });
        });

        const completedCourses = auditData
            .filter(r => r.status === 'MET' || r.status === 'IP')
            .flatMap(r => r.options.map(o => (o.dept + o.num).toUpperCase()));

        console.log("[GG] Audit Data to save:", auditData);
        console.log("[GG] Completed Courses to save:", completedCourses);

        chrome.storage.local.set({ 
            "gg_apas_unmet": auditData,
            "gg_apas_completed": completedCourses
        }, () => {
            console.log("[GG] APAS Data Synced.");
        });
    }
};

if (document.readyState === 'complete') {
    APAS_PARSER.init();
} else {
    window.addEventListener('load', APAS_PARSER.init);
}