const fs = require('fs');

let js = fs.readFileSync('js/admin.js', 'utf8');

// 1. Update renderAppointmentsList to include Tracking Number
let oldApptRow = `                        <td>
                            <div style="font-weight: 600;">\${appt.name}</div>
                            <div style="font-size: 0.8rem; color: #667085;">\${appt.email}</div>
                        </td>
                        <td><span class="badge" style="background: #f2f4f7; color: #344054;">\${appt.service}</span></td>
                        <td>
                            <div style="font-weight: 500;">\${appt.date}</div>
                            <div style="font-size: 0.8rem; color: #667085;">\${appt.time}</div>
                        </td>
                        <td><span class="status-badge status-\${statusClass}">\${appt.status}</span></td>
                        <td style="text-align: right;">`;

let newApptRow = `                        <td>
                            <div style="font-weight: 600;">\${appt.name}</div>
                            <div style="font-size: 0.8rem; color: #667085;">\${appt.email}</div>
                        </td>
                        <td><span class="badge" style="background: #f2f4f7; color: #344054;">\${appt.service}</span></td>
                        <td>
                            <div style="font-weight: 500;">\${appt.date}</div>
                            <div style="font-size: 0.8rem; color: #667085;">\${appt.time}</div>
                        </td>
                        <td><div style="font-weight: 700; color: #c5a059;">\${appt.docNumber || 'N/A'}</div></td>
                        <td><span class="status-badge status-\${statusClass}">\${appt.status}</span></td>
                        <td style="text-align: right;">`;

js = js.replace(oldApptRow, newApptRow);

// 2. Update renderMessagesList to include Quick Reply button
let oldMsgRow = `                        <td style="text-align: right; white-space: nowrap;">
                            \${isUnread ? \`<button class="btn-outline mark-read" data-id="\${doc.id}" style="padding: 6px 10px; margin-right: 5px;"><i class="fa-solid fa-check"></i></button>\` : ''}
                            <button class="btn-outline delete-msg" data-id="\${doc.id}" style="color: #d92d20; border-color: #fda29b; padding: 6px 10px;"><i class="fa-solid fa-trash"></i></button>
                        </td>`;

let newMsgRow = `                        <td style="text-align: right; white-space: nowrap;">
                            <a href="mailto:\${msg.email}?subject=RE: KALTO LAW - \${msg.service || 'Inquiry'}" class="btn-primary" style="padding: 6px 10px; margin-right: 5px; text-decoration: none;"><i class="fa-solid fa-reply"></i></a>
                            \${isUnread ? \`<button class="btn-outline mark-read" data-id="\${doc.id}" style="padding: 6px 10px; margin-right: 5px;"><i class="fa-solid fa-check"></i></button>\` : ''}
                            <button class="btn-outline delete-msg" data-id="\${doc.id}" style="color: #d92d20; border-color: #fda29b; padding: 6px 10px;"><i class="fa-solid fa-trash"></i></button>
                        </td>`;

js = js.replace(oldMsgRow, newMsgRow);

// 3. Append CSV Export Functions to the bottom of the file
let csvLogic = `

// --- EXPORT TO CSV LOGIC ---
window.exportAppointmentsCSV = async function() {
    try {
        if(typeof showToast === 'function') showToast("Preparing Appointments Export...", "info");
        const snapshot = await window.fbDb.collection("appointments").orderBy("createdAt", "desc").get();
        if (snapshot.empty) {
            alert("No appointments to export.");
            return;
        }
        let csvContent = "data:text/csv;charset=utf-8,Name,Email,Date,Time,Service,Tracking Number,Status,Created At\\n";
        snapshot.forEach(doc => {
            const data = doc.data();
            const created = data.createdAt ? data.createdAt.toDate().toLocaleString() : 'N/A';
            const row = [
                '"' + (data.name || '') + '"',
                '"' + (data.email || '') + '"',
                '"' + (data.date || '') + '"',
                '"' + (data.time || '') + '"',
                '"' + (data.service || '') + '"',
                '"' + (data.docNumber || '') + '"',
                '"' + (data.status || '') + '"',
                '"' + created + '"'
            ].join(",");
            csvContent += row + "\\n";
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "kalto_appointments.csv");
        document.body.appendChild(link);
        link.click();
        link.remove();
        if(typeof showToast === 'function') showToast("Export successful!", "success");
    } catch (e) {
        console.error("Export Error:", e);
        alert("Failed to export appointments.");
    }
};

window.exportMessagesCSV = async function() {
    try {
        if(typeof showToast === 'function') showToast("Preparing Messages Export...", "info");
        const snapshot = await window.fbDb.collection("enquiries").orderBy("createdAt", "desc").get();
        if (snapshot.empty) {
            alert("No messages to export.");
            return;
        }
        let csvContent = "data:text/csv;charset=utf-8,Name,Email,Phone,Service,Message,Status,Created At\\n";
        snapshot.forEach(doc => {
            const data = doc.data();
            const created = data.createdAt ? data.createdAt.toDate().toLocaleString() : 'N/A';
            // Clean message for CSV
            let msg = data.message ? data.message.replace(/\\n/g, " ").replace(/"/g, '""') : '';
            const row = [
                '"' + (data.name || '') + '"',
                '"' + (data.email || '') + '"',
                '"' + (data.phone || '') + '"',
                '"' + (data.service || '') + '"',
                '"' + msg + '"',
                '"' + (data.status || '') + '"',
                '"' + created + '"'
            ].join(",");
            csvContent += row + "\\n";
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "kalto_messages.csv");
        document.body.appendChild(link);
        link.click();
        link.remove();
        if(typeof showToast === 'function') showToast("Export successful!", "success");
    } catch (e) {
        console.error("Export Error:", e);
        alert("Failed to export messages.");
    }
};
`;

if (!js.includes('exportAppointmentsCSV')) {
    js += csvLogic;
}

fs.writeFileSync('js/admin.js', js);
console.log('js/admin.js updated successfully.');
