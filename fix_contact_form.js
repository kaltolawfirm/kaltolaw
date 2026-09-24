const fs = require('fs');

let c = fs.readFileSync('contact.html', 'utf8');

c = c.replace(/<\/select>\s*<\/div>\s*<div class="form-group">\s*<label for="message"/g, `</select>
                            </div>
                            <div class="grid grid-2" style="gap: var(--spacing-md); margin-bottom: 0;">
                                <div class="form-group">
                                    <label for="date"><i class="fa-solid fa-calendar-day"></i> Preferred Date (Optional)</label>
                                    <input type="date" id="date" name="date" class="form-control" min="">
                                    <script>document.getElementById('date').min = new Date().toISOString().split('T')[0];</script>
                                </div>
                                <div class="form-group">
                                    <label for="time"><i class="fa-solid fa-clock"></i> Preferred Time (Optional)</label>
                                    <select id="time" name="time" class="form-control">
                                        <option value="">Select Time</option>
                                        <option value="09:00">09:00 AM</option>
                                        <option value="10:00">10:00 AM</option>
                                        <option value="11:00">11:00 AM</option>
                                        <option value="14:00">02:00 PM</option>
                                        <option value="15:00">03:00 PM</option>
                                        <option value="16:00">04:00 PM</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="message"`);

c = c.replace(
    /await db\.collection\('enquiries'\)\.doc\(docNumber\)\.set\(\{\s*\.\.\.data,\s*docNumber: docNumber,\s*createdAt: firebase\.firestore\.FieldValue\.serverTimestamp\(\),\s*status: 'unread'\s*\}\);/g,
    `if (data.date && data.time) {
                    await db.collection('appointments').doc(docNumber).set({
                        ...data,
                        docNumber: docNumber,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        status: 'Pending'
                    });
                } else {
                    await db.collection('enquiries').doc(docNumber).set({
                        ...data,
                        docNumber: docNumber,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        status: 'unread'
                    });
                }`
);

fs.writeFileSync('contact.html', c);
console.log('Fixed contact.html');
