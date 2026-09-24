const fs = require('fs');
let c = fs.readFileSync('js/tracking.js', 'utf8');

const targetStr = `            try {
                // 1. Search in cases
                let querySnapshot = await db.collection("cases").where("trackingCode", "==", code).get();
                let caseData = null;

                if (!querySnapshot.empty) {
                    caseData = querySnapshot.docs[0].data();
                } else {
                    // 2. Search in appointments
                    let apptSnapshot = await db.collection("appointments").where("docNumber", "==", code).get();
                    if (!apptSnapshot.empty) {
                        const appt = apptSnapshot.docs[0].data();
                        
                        let mappedStatus = 'initiated';
                        const origStatus = (appt.status || '').toLowerCase();
                        if (origStatus === 'confirmed') mappedStatus = 'approved';
                        if (origStatus === 'completed') mappedStatus = 'closed';

                        caseData = {
                            clientName: appt.name || 'Client',
                            description: \`Consultation Booking: \${appt.service || 'General'}\`,
                            status: mappedStatus,
                            documents: []
                        };
                    } else {
                        // 3. Search in enquiries
                        let enqSnapshot = await db.collection("enquiries").where("docNumber", "==", code).get();
                        if (!enqSnapshot.empty) {
                            const enq = enqSnapshot.docs[0].data();
                            
                            let mappedStatus = 'initiated';
                            const origStatus = (enq.status || '').toLowerCase();
                            if (origStatus === 'read') mappedStatus = 'review';
                            if (origStatus === 'replied') mappedStatus = 'approved';
                            if (origStatus === 'closed') mappedStatus = 'closed';

                            caseData = {
                                clientName: enq.name || 'Client',
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
            } catch (error) {`;

const replacementStr = `            try {
                // Ensure firebase functions is initialized
                const trackCaseFn = firebase.functions().httpsCallable('trackCase');
                const result = await trackCaseFn({ code: code });
                
                if (result && result.data && result.data.data) {
                    renderCaseStatus(result.data.data, code);
                } else {
                    showError("Invalid tracking code. Please check and try again.");
                }
            } catch (error) {`;

c = c.replace(targetStr, replacementStr);
fs.writeFileSync('js/tracking.js', c);
console.log("Done");
