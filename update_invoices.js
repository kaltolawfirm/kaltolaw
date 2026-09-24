const fs = require('fs');
let js = fs.readFileSync('js/admin.js', 'utf8');

// 1. Add PDF Button to Invoices Table
let oldInvoiceRow = `                        <td style="text-align: right; white-space: nowrap;">
                            <button class="btn-outline toggle-status" data-id="\${doc.id}" data-current="\${data.status}" title="Toggle Status"><i class="fa-solid fa-rotate"></i></button>
                            <button class="btn-outline delete-invoice" data-id="\${doc.id}" style="color: #d92d20; border-color: #fda29b;" title="Delete"><i class="fa-solid fa-trash"></i></button>
                        </td>`;

let newInvoiceRow = `                        <td style="text-align: right; white-space: nowrap;">
                            <button class="btn-outline toggle-status" data-id="\${doc.id}" data-current="\${data.status}" title="Toggle Status"><i class="fa-solid fa-rotate"></i></button>
                            <button class="btn-outline generate-pdf" data-id="\${doc.id}" data-invoice='\${JSON.stringify(data).replace(/'/g, "&apos;")}' title="Download PDF"><i class="fa-solid fa-file-pdf"></i></button>
                            <button class="btn-outline delete-invoice" data-id="\${doc.id}" style="color: #d92d20; border-color: #fda29b;" title="Delete"><i class="fa-solid fa-trash"></i></button>
                        </td>`;

js = js.replace(oldInvoiceRow, newInvoiceRow);

// 2. Add Event Listener for PDF Button
let oldInvoiceEvents = `                document.querySelectorAll('.toggle-status').forEach(btn => {`;
let newInvoiceEvents = `                document.querySelectorAll('.generate-pdf').forEach(btn => {
                    btn.onclick = () => {
                        try {
                            const dataStr = btn.getAttribute('data-invoice');
                            const data = JSON.parse(dataStr);
                            if(window.generateInvoicePDF) {
                                window.generateInvoicePDF(data);
                            } else {
                                alert("PDF Engine not loaded yet.");
                            }
                        } catch(e) {
                            console.error(e);
                            alert("Could not generate PDF");
                        }
                    };
                });

                document.querySelectorAll('.toggle-status').forEach(btn => {`;
js = js.replace(oldInvoiceEvents, newInvoiceEvents);

// 3. Add PDF Generation Function to the bottom
let pdfLogic = `
// --- INVOICE PDF GENERATION ---
window.generateInvoicePDF = function(data) {
    if(!window.jspdf) {
        alert("jsPDF library not loaded. Refresh the page.");
        return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Theme Colors
    const gold = [197, 160, 89];
    const dark = [16, 24, 40];
    const gray = [102, 112, 133];

    // Header: KALTO LAW Logo/Brand
    doc.setFont("times", "bold");
    doc.setFontSize(28);
    doc.setTextColor(dark[0], dark[1], dark[2]);
    doc.text("KALTO", 20, 30);
    doc.setTextColor(gold[0], gold[1], gold[2]);
    doc.text("LAW", 65, 30);
    
    // Header: Address
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(gray[0], gray[1], gray[2]);
    doc.text("Kigali, Rwanda", 20, 40);
    doc.text("contact@kaltolaw.com", 20, 45);
    doc.text("+250 123 456 789", 20, 50);

    // Invoice Meta
    doc.setFontSize(16);
    doc.setTextColor(dark[0], dark[1], dark[2]);
    doc.text("INVOICE", 150, 30, null, null, "right");
    
    doc.setFontSize(10);
    doc.text(\`Invoice #: \${data.invoiceId}\`, 150, 40, null, null, "right");
    doc.text(\`Date: \${new Date().toLocaleDateString()}\`, 150, 45, null, null, "right");
    doc.text(\`Status: \${data.status.toUpperCase()}\`, 150, 50, null, null, "right");

    // Line separator
    doc.setDrawColor(gold[0], gold[1], gold[2]);
    doc.setLineWidth(0.5);
    doc.line(20, 60, 190, 60);

    // Billed To
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("BILLED TO:", 20, 75);
    doc.setFont("helvetica", "normal");
    doc.text(data.clientName, 20, 82);
    doc.text(data.email || '', 20, 87);

    // Services Table
    doc.autoTable({
        startY: 100,
        head: [['Description', 'Amount']],
        body: [
            ['Legal Services / Retainer Fee', \`RWF \${Number(data.amount).toLocaleString()}\`]
        ],
        theme: 'striped',
        headStyles: { fillColor: dark, textColor: [255, 255, 255], fontStyle: 'bold' },
        bodyStyles: { textColor: dark },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        margin: { top: 100, left: 20, right: 20 }
    });

    // Total
    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("TOTAL DUE:", 130, finalY);
    doc.setTextColor(gold[0], gold[1], gold[2]);
    doc.text(\`RWF \${Number(data.amount).toLocaleString()}\`, 190, finalY, null, null, "right");

    // Payment Info
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(dark[0], dark[1], dark[2]);
    doc.text("Payment Instructions:", 20, finalY + 20);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(gray[0], gray[1], gray[2]);
    doc.text("Please pay via Mobile Money or bank transfer.", 20, finalY + 26);
    doc.text(\`Payment Link: https://kalto-law.web.app/pay.html?invoice=\${data.invoiceId}\`, 20, finalY + 32);
    
    if(data.status === 'paid') {
        doc.setFontSize(30);
        doc.setTextColor(18, 183, 106); // green
        doc.text("PAID", 105, finalY + 40, null, null, "center");
    }

    doc.save(\`KALTO_LAW_Invoice_\${data.invoiceId}.pdf\`);
};
`;

if (!js.includes('generateInvoicePDF')) {
    js += pdfLogic;
}

fs.writeFileSync('js/admin.js', js);
console.log('js/admin.js PDF logic updated.');
