const fs = require('fs');
const file = 'js/admin.js';
let content = fs.readFileSync(file, 'utf8');

const regex1 = /const codeHtml = task\.caseCode \? <div style="margin-top:8px;"><code style="background:#f1f5f9;color:#4361ee;padding:2px 6px;border-radius:4px;font-size:0\.7rem;">\\<\/code><\/div> : '';/g;
content = content.replace(regex1, 'const codeHtml = task.caseCode ? <div style="margin-top:8px;"><code style="background:#f1f5f9;color:#4361ee;padding:2px 6px;border-radius:4px;font-size:0.7rem;">\</code></div> : \'\';');

const regex2 = /const dateHtml = task\.deadline \? <div style="margin-top:8px;font-size:0\.75rem;color:#dc2626;"><i class="fa-regular fa-clock"><\/i> Due: \\<\/div> : '';/g;
content = content.replace(regex2, 'const dateHtml = task.deadline ? <div style="margin-top:8px;font-size:0.75rem;color:#dc2626;"><i class="fa-regular fa-clock"></i> Due: \</div> : \'\';');

const regex3 = /el\.innerHTML = [\s\S]*?;\s+if \(status/m;
content = content.replace(regex3, 'el.innerHTML = \\n                        <div style="font-weight:600;font-size:0.9rem;color:#1e293b;">\</div>\\n                        <div style="font-size:0.8rem;color:#64748b;margin-top:4px;">\</div>\\n                        \\\n                        \\\n                    ;\\n\\n                    if (status');

const regex4 = /contentHTML: [\s\S]*?confirmText: 'Create Task'/m;
content = content.replace(regex4, 'contentHTML: \\n                        <div class="form-group mb-md">\\n                            <label>Task Title *</label>\\n                            <input type="text" id="taskTitle" class="form-control" placeholder="e.g. Draft corporate bylaws">\\n                        </div>\\n                        <div class="form-group mb-md">\\n                            <label>Description</label>\\n                            <textarea id="taskDesc" class="form-control" rows="2"></textarea>\\n                        </div>\\n                        <div class="grid grid-2" style="gap:16px;">\\n                            <div class="form-group">\\n                                <label>Link to Case (Tracking Code)</label>\\n                                <input type="text" id="taskCode" class="form-control" placeholder="KL-XXXX-XXXX">\\n                            </div>\\n                            <div class="form-group">\\n                                <label>Deadline</label>\\n                                <input type="date" id="taskDate" class="form-control">\\n                            </div>\\n                        </div>\\n                    ,\\n                    confirmText: \'Create Task\'');

fs.writeFileSync(file, content);
