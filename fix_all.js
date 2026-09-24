const fs = require('fs');
const https = require('https');
const file = 'js/admin.js';

https.get('https://kalto-law.web.app/js/admin.js', (res) => {
    let content = '';
    res.on('data', chunk => content += chunk);
    res.on('end', () => {
        // Fix backticks
        content = content.replace('await showConfirmModal(Approve → Create Case?, This will approve the message and immediately create a new case file for  in the Case Manager.);', 'await showConfirmModal(\'Approve → Create Case?\', \This will approve the message and immediately create a new case file for \ in the Case Manager.\);');
        content = content.replace('description: Approved via contact form — ,', 'description: \Approved via contact form — \\,');
        content = content.replace('showToast(✅ Case Created! Tracking Code: );', 'showToast(\✅ Case Created! Tracking Code: \\);');
        content = content.replace('if (parts.length === 3) isoDate = \--;', 'if (parts.length === 3) isoDate = \\-\-\\;');
        content = content.replace('conflictSearchTermDisplay.innerHTML = Searching for: <strong>+term+</strong>;', 'conflictSearchTermDisplay.innerHTML = \Searching for: <strong>\</strong>\;');
        content = content.replace('results.push({ type: \\'Case\\', name: data.clientName, detail: Status: +data.status+ (Code: +data.trackingCode+) });', 'results.push({ type: \\'Case\\', name: data.clientName, detail: \Status: \ (Code: \)\ });');
        content = content.replace('results.push({ type: \\'Inquiry\\', name: data.name, detail: Service: +(data.service || \\'General\\')+ (+(data.email||\\'\\')+) });', 'results.push({ type: \\'Inquiry\\', name: data.name, detail: \Service: \ (\)\ });');
        content = content.replace('results.push({ type: \\'Appointment\\', name: data.name, detail: Date: +data.date+ +data.time });', 'results.push({ type: \\'Appointment\\', name: data.name, detail: \Date: \ \\ });');

        content = content.replace(/html \+= [\s\S]*?;\s+        }\)/, 
\html += \\\
                            <div style="padding:16px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
                                <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                                    <strong style="color:#0f172a;">\</strong>
                                    <span style="background:\20;color:\;padding:2px 8px;border-radius:50px;font-size:0.75rem;font-weight:700;">\</span>
                                </div>
                                <div style="font-size:0.85rem;color:#64748b;">\</div>
                            </div>
                        \\\;
                    })\);
                    
        content = content.replace('rows.push(rowMap(d).map(v => "+(v||\\'\\').toString().replace(/\\"/g, \\'""\\')+").join(\\',\\'));', 'rows.push(rowMap(d).map(v => \"\"\).join(\\',\\'));');

        content = content.replace('const codeHtml = task.caseCode ? <div style="margin-top:8px;"><code style="background:#f1f5f9;color:#4361ee;padding:2px 6px;border-radius:4px;font-size:0.7rem;">+task.caseCode+</code></div> : \\'\\';', 'const codeHtml = task.caseCode ? \<div style="margin-top:8px;"><code style="background:#f1f5f9;color:#4361ee;padding:2px 6px;border-radius:4px;font-size:0.7rem;">\</code></div>\ : \\'\\';');
        content = content.replace('const dateHtml = task.deadline ? <div style="margin-top:8px;font-size:0.75rem;color:#dc2626;"><i class="fa-regular fa-clock"></i> Due: +task.deadline+</div> : \\'\\';', 'const dateHtml = task.deadline ? \<div style="margin-top:8px;font-size:0.75rem;color:#dc2626;"><i class="fa-regular fa-clock"></i> Due: \</div>\ : \\'\\';');
        
        content = content.replace(/el\.innerHTML = [\s\S]*?;\s+if \(status === 'todo'\)/, 
\el.innerHTML = \\\
                        <div style="font-weight:600;font-size:0.9rem;color:#1e293b;">\</div>
                        <div style="font-size:0.8rem;color:#64748b;margin-top:4px;">\</div>
                        \
                        \
                    \\\;

                    if (status === 'todo')\);

        content = content.replace(/contentHTML: [\s\S]*?,\s+confirmText: 'Create Task'/m, 
\contentHTML: \\\
                        <div class="form-group mb-md">
                            <label>Task Title *</label>
                            <input type="text" id="taskTitle" class="form-control" placeholder="e.g. Draft corporate bylaws">
                        </div>
                        <div class="form-group mb-md">
                            <label>Description</label>
                            <textarea id="taskDesc" class="form-control" rows="2"></textarea>
                        </div>
                        <div class="grid grid-2" style="gap:16px;">
                            <div class="form-group">
                                <label>Link to Case (Tracking Code)</label>
                                <input type="text" id="taskCode" class="form-control" placeholder="KL-XXXX-XXXX">
                            </div>
                            <div class="form-group">
                                <label>Deadline</label>
                                <input type="date" id="taskDate" class="form-control">
                            </div>
                        </div>
                    \\\,
                    confirmText: 'Create Task'\);

        content = content.replace(/const adminDocs = [\s\S]*?return [\s\S]*?<\/div>;\s+}/m, 
\const adminDocs = (c.documents || []).map((d, index) => {
                        const sigBadge = d.signed ? '<span style="background:#f0fdf4;color:#166534;font-size:0.65rem;padding:2px 6px;border-radius:50px;margin-left:auto;"><i class="fa-solid fa-check"></i> Signed</span>' : 
                                       d.requiresSignature ? '<span style="background:#fff7ed;color:#c2410c;font-size:0.65rem;padding:2px 6px;border-radius:50px;margin-left:auto;"><i class="fa-solid fa-clock"></i> Pending Sig</span>' :
                                       '\\\<button class="btn-req-sig" data-case="\" data-idx="\" style="margin-left:auto;background:none;border:none;color:#4361ee;font-size:0.7rem;cursor:pointer;font-weight:600;"><i class="fa-solid fa-pen-nib"></i> Req. Sign</button>\\\';
                        return \\\<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid #d0d5dd;border-radius:8px;background:#f9fafb;margin-bottom:6px;"><a href="\" target="_blank" style="text-decoration:none;font-size:0.8rem;color:#344054;display:flex;align-items:center;gap:8px;"><i class="fa-solid fa-file-pdf" style="color:#4361ee;"></i>\</a>\</div>\\\;
                    }).join('');
                    
                    const date = c.lastUpdated ? new Date(c.lastUpdated.toDate()).toLocaleDateString('en-RW') : 'N/A';
                    return \\\
                        <div style="background:#fff;border:1px solid var(--admin-border);border-radius:12px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
                            <div style="font-weight:700;color:#0d1b35;margin-bottom:4px;font-size:1.05rem;">\</div>
                            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                                <code style="background:#f1f5f9;padding:2px 8px;border-radius:4px;font-size:0.75rem;color:#4361ee;font-weight:700;">\</code>
                                <span style="font-size:0.75rem;color:#667085;">Status: <strong style="color:#344054;">\</strong></span>
                            </div>
                            <div style="font-size:0.8rem;color:#667085;margin-bottom:16px;">Updated: \</div>
                            <div style="border-top:1px solid #f1f5f9;padding-top:12px;">
                                <div style="font-size:0.72rem;font-weight:700;color:#98a2b3;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Saved Documents (\)</div>
                                \
                            </div>
                        </div>\\\;
                }\);
                
        // Remove orphaned lines at 812
        const orphanStr = 
                openView.style.display = 'none'; closedView.style.display = 'block';
                btnOpen.style.borderBottomColor = 'transparent'; btnOpen.style.color = 'var(--admin-text-muted)';
                btnClosed.style.borderBottomColor = 'var(--admin-accent)'; btnClosed.style.color = 'var(--admin-sidebar-bg)';
            }
        };;
        content = content.replace(orphanStr, '');
        
        fs.writeFileSync(file, content);
        console.log("Fixes applied.");
    });
});
