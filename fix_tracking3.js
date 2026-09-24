const fs = require('fs');
let c = fs.readFileSync('js/tracking.js', 'utf8');

const startIdx = c.indexOf('            try {');
const endIdx = c.indexOf('            } catch (error) {');

const replacementStr = `            try {
                // 1. Search in cases
                let docSnap = await db.collection("cases").doc(code).get();
                let caseData = null;

                if (docSnap.exists) {
                    caseData = docSnap.data();
                } else {
                    // 2. Search in appointments
                    let apptSnap = await db.collection("appointments").doc(code).get();
                    if (apptSnap.exists) {
                        const appt = apptSnap.data();
                        let mappedStatus = 'initiated';
                        const origStatus = (appt.status || '').toLowerCase();
                        if (origStatus === 'confirmed') mappedStatus = 'approved';
                        if (origStatus === 'completed') mappedStatus = 'closed';

                        caseData = {
                            clientName: appt.name || appt.clientName || 'Client',
                            description: \`Consultation Booking: \${appt.service || 'General'}\`,
                            status: mappedStatus,
                            documents: []
                        };
                    } else {
                        // 3. Search in enquiries
                        let enqSnap = await db.collection("enquiries").doc(code).get();
                        if (enqSnap.exists) {
                            const enq = enqSnap.data();
                            let mappedStatus = 'initiated';
                            const origStatus = (enq.status || '').toLowerCase();
                            if (origStatus === 'read') mappedStatus = 'review';
                            if (origStatus === 'replied') mappedStatus = 'approved';
                            if (origStatus === 'closed') mappedStatus = 'closed';

                            caseData = {
                                clientName: enq.name || enq.clientName || 'Client',
                                description: \`General Enquiry: \${enq.service || 'Contact Form'}\`,
                                status: mappedStatus,
                                documents: []
                            };
                        }
                    }
                }

                if (!caseData) {
                    showError("Invalid tracking code. Please check and try again.");
                } else {
                    renderCaseStatus(caseData, code);
                }
`;

c = c.slice(0, startIdx) + replacementStr + c.slice(endIdx);
fs.writeFileSync('js/tracking.js', c);
console.log('Done tracking.js');
