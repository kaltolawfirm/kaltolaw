import re

with open('contact.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the script block we want to replace
start_marker = "document.getElementById('contactForm').addEventListener('submit'"
end_marker_candidates = ["        });\r\n    </script>", "        });\n    </script>"]

start_idx = content.find(start_marker)
if start_idx == -1:
    print("ERROR: start marker not found")
    exit(1)

# Find the end of this event listener (closing });)
# We look for the next });  followed by </script>
end_idx = -1
for em in end_marker_candidates:
    idx = content.find(em, start_idx)
    if idx != -1:
        end_idx = idx + len(em)
        break

if end_idx == -1:
    # Fallback: find the second }); after start_idx  
    # The form handler closes with });
    idx = content.find('        });', start_idx)
    if idx != -1:
        end_idx = idx + len('        });')
    else:
        print("ERROR: end marker not found")
        exit(1)

print(f"Found block: chars {start_idx} to {end_idx}")
print("Preview of end:", repr(content[end_idx-30:end_idx+10]))

new_script = """document.getElementById('contactForm').addEventListener('submit', async function (e) {
            e.preventDefault();
            const form = e.target;
            const btn = form.querySelector('button[type="submit"]');
            const toast = document.getElementById('toast');

            const originalBtnText = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
            btn.disabled = true;

            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            const isAppointment = !!(data.date && data.time);
            const docNumber = 'KALTO-' + Math.floor(100000 + Math.random() * 900000);

            try {
                // 1. Save to Firestore
                if (isAppointment) {
                    await db.collection('appointments').doc(docNumber).set({
                        name:     data.name    || '',
                        email:    data.email   || '',
                        phone:    data.phone   || '',
                        service:  data.service || 'General',
                        date:     data.date,
                        time:     data.time,
                        message:  data.message || '',
                        docNumber: docNumber,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        status: 'Pending'
                    });
                } else {
                    await db.collection('enquiries').doc(docNumber).set({
                        name:     data.name    || '',
                        email:    data.email   || '',
                        phone:    data.phone   || '',
                        service:  data.service || 'General',
                        message:  data.message || '',
                        docNumber: docNumber,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        status: 'unread'
                    });
                }

                // 2. Notify admin via Formspree (clean structured payload)
                const notifyPayload = new FormData();
                const subjectPrefix = isAppointment ? '[BOOKING] ' : '[ENQUIRY] ';
                notifyPayload.append('_subject', subjectPrefix + docNumber + ' - ' + (data.name || 'Client'));
                notifyPayload.append('_replyto', data.email || '');
                notifyPayload.append('Tracking Number', docNumber);
                notifyPayload.append('Type', isAppointment ? 'CONSULTATION BOOKING' : 'General Enquiry');
                notifyPayload.append('Client Name', data.name || '');
                notifyPayload.append('Client Email', data.email || '');
                notifyPayload.append('Client Phone', data.phone || '');
                notifyPayload.append('Service', data.service || 'Not specified');
                if (isAppointment) {
                    notifyPayload.append('Preferred Date', data.date);
                    notifyPayload.append('Preferred Time', data.time);
                }
                notifyPayload.append('Message', data.message || '(no message provided)');

                const response = await fetch('https://formspree.io/f/mzdjeape', {
                    method: 'POST',
                    body: notifyPayload,
                    headers: { 'Accept': 'application/json' }
                });

                if (response.ok) {
                    const label = isAppointment ? 'Consultation booked!' : 'Message received!';
                    toast.innerHTML = '<i class="fa-solid fa-circle-check" style="color: var(--color-accent);"></i> ' + label + ' Reference: <strong>' + docNumber + '</strong>. We will contact you shortly.';
                    toast.className = 'show';
                    const alertMsg = (isAppointment ? 'Consultation booked successfully!' : 'Message received!') + '\\n\\nYour tracking number is: ' + docNumber + '\\n\\nPlease save this. We will contact you shortly.';
                    setTimeout(function() { alert(alertMsg); }, 500);
                    form.reset();
                } else {
                    throw new Error('Formspree error: ' + response.status);
                }
            } catch (error) {
                console.error('Form Error:', error);
                toast.innerHTML = '<i class="fa-solid fa-circle-exclamation" style="color: #ff4444;"></i> There was a problem. Please call us at +250 790 750 000.';
                toast.className = 'show error';
            } finally {
                btn.innerHTML = originalBtnText;
                btn.disabled = false;
                setTimeout(function() { toast.className = ''; }, 7000);
            }
        });"""

# Build the replacement
replacement = new_script

# Replace in content
new_content = content[:start_idx] + replacement + content[end_idx - len(end_marker_candidates[0]) if end_idx else end_idx:]

# Actually, we need to keep the closing script tag
# Find what comes after our end_idx
after = content[end_idx:]
# Re-check end_idx: we included the closing script tag, so just keep after
new_content = content[:start_idx] + replacement + "\n" + after

# Verify the replacement happened
if new_script[:50] in new_content:
    print("SUCCESS: replacement found in new content")
else:
    print("WARNING: replacement not verified")

with open('contact.html', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("File written successfully")
print(f"New size: {len(new_content)} bytes (was {len(content)} bytes)")
