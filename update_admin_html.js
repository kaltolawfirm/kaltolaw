const fs = require('fs');

let html = fs.readFileSync('admin.html', 'utf8');

// 1. Update Dashboard Metrics Cards
let oldMetrics = `<div class="grid grid-3" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;">
                    <div class="dashboard-card">
                        <span class="card-label">Server Status</span>
                        <div class="card-value">Live</div>
                        <div class="card-stat stat-up">
                            <i class="fa-solid fa-circle-check" style="margin-right: 6px;"></i> 100% Uptime
                        </div>
                    </div>
                    <div class="dashboard-card">
                        <span class="card-label">Active Insights</span>
                        <div class="card-value" id="insightCount">...</div>
                        <div class="card-stat" style="color: var(--admin-text-muted);">
                            Live on website
                        </div>
                    </div>
                    <div class="dashboard-card">
                        <span class="card-label">Stored Documents</span>
                        <div class="card-value" id="vaultCount">...</div>
                        <div class="card-stat" style="color: var(--admin-text-muted);">
                            In secure vault
                        </div>
                    </div>
                </div>`;

let newMetrics = `<div class="grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px;">
                    <div class="dashboard-card">
                        <span class="card-label">Pending Appointments</span>
                        <div class="card-value" id="apptCount" style="color: #c5a059;">...</div>
                        <div class="card-stat" style="color: var(--admin-text-muted);">
                            Require review
                        </div>
                    </div>
                    <div class="dashboard-card">
                        <span class="card-label">Total Messages</span>
                        <div class="card-value" id="msgCount" style="color: #4361ee;">...</div>
                        <div class="card-stat" style="color: var(--admin-text-muted);">
                            Client leads
                        </div>
                    </div>
                    <div class="dashboard-card">
                        <span class="card-label">Active Insights</span>
                        <div class="card-value" id="insightCount">...</div>
                        <div class="card-stat" style="color: var(--admin-text-muted);">
                            Live on website
                        </div>
                    </div>
                    <div class="dashboard-card">
                        <span class="card-label">Stored Documents</span>
                        <div class="card-value" id="vaultCount">...</div>
                        <div class="card-stat" style="color: var(--admin-text-muted);">
                            In secure vault
                        </div>
                    </div>
                </div>`;

html = html.replace(oldMetrics, newMetrics);

// 2. Add Export button to Appointments Tab & Update Table Headers
let oldApptHeader = `                    <div>
                        <h3 style="font-family: 'Playfair Display', serif; font-size: 1.5rem; color: var(--admin-sidebar-bg);">Consultation Appointments</h3>
                        <p style="color: var(--admin-text-muted);">Manage scheduled consultations from the website.</p>
                    </div>
                </div>`;
let newApptHeader = `                    <div>
                        <h3 style="font-family: 'Playfair Display', serif; font-size: 1.5rem; color: var(--admin-sidebar-bg);">Consultation Appointments</h3>
                        <p style="color: var(--admin-text-muted);">Manage scheduled consultations from the website.</p>
                    </div>
                    <button class="btn-outline" onclick="exportAppointmentsCSV()" style="padding: 8px 16px; font-weight: 600;"><i class="fa-solid fa-download"></i> Export CSV</button>
                </div>`;
html = html.replace(oldApptHeader, newApptHeader);

let oldApptTable = `                            <tr>
                                <th>Client</th>
                                <th>Service</th>
                                <th>Date & Time</th>
                                <th>Status</th>
                                <th style="text-align: right;">Action</th>
                            </tr>`;
let newApptTable = `                            <tr>
                                <th>Client</th>
                                <th>Service</th>
                                <th>Date & Time</th>
                                <th>Tracking #</th>
                                <th>Status</th>
                                <th style="text-align: right;">Action</th>
                            </tr>`;
html = html.replace(oldApptTable, newApptTable);


// 3. Add Export button to Messages Tab
let oldMsgHeader = `                    <div>
                        <h3
                            style="font-family: 'Playfair Display', serif; font-size: 1.5rem; color: var(--admin-sidebar-bg);">
                            Client Message Inquiries</h3>
                        <p style="color: var(--admin-text-muted);">Real-time inquiries submitted via the website contact
                            form.</p>
                    </div>
                </div>`;
let newMsgHeader = `                    <div>
                        <h3
                            style="font-family: 'Playfair Display', serif; font-size: 1.5rem; color: var(--admin-sidebar-bg);">
                            Client Message Inquiries</h3>
                        <p style="color: var(--admin-text-muted);">Real-time inquiries submitted via the website contact
                            form.</p>
                    </div>
                    <button class="btn-outline" onclick="exportMessagesCSV()" style="padding: 8px 16px; font-weight: 600;"><i class="fa-solid fa-download"></i> Export CSV</button>
                </div>`;
html = html.replace(oldMsgHeader, newMsgHeader);


fs.writeFileSync('admin.html', html);
console.log('admin.html updated successfully.');
