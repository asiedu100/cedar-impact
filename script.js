// CedarImpact JavaScript
class CedarImpact {
    constructor() {
        this.currentUser = null;
        this.events = [];
        this.attendance = [];
        this.isAdmin = false;
        this.scanner = null;
        this.chart = null;
        this.currentStream = null;
        this.currentFacingMode = "environment"; // default to back camera on phones
        
        this.init();
    }

    init() {
        this.loadData();
        this.setupEventListeners();
        this.updateUI();
    }

    // Data Management
    loadData() {
        const savedUser = localStorage.getItem('cedarImpactUser');
        const savedEvents = localStorage.getItem('cedarImpactEvents');
        const savedAttendance = localStorage.getItem('cedarImpactAttendance');
        const savedUsers = localStorage.getItem('cedarImpactUsers');

        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.isAdmin = this.currentUser.email === 'admin@cedarimpact.com';
        }

        try {
            if (savedEvents) {
                this.events = JSON.parse(savedEvents);
                // Backfill images for older saved events that don't have the image property
                this.events.forEach(ev => {
                    if (!ev.image) {
                        if (ev.name && ev.name.toLowerCase().includes('ladies')) {
                            ev.image = 'LADIESNEW.JPG';
                        } else if (ev.name && ev.name.toLowerCase().includes('meetup')) {
                            ev.image = 'MEETUP.JPG';
                        }
                    }
                });
            }

            if (!this.events || this.events.length === 0) {
                this.resetDefaultEvents();
            }
        } catch (err) {
            this.resetDefaultEvents();
        }

        if (savedAttendance) {
            this.attendance = JSON.parse(savedAttendance);
        }

        if (savedUsers) {
            try { this._users = JSON.parse(savedUsers); } catch { this._users = []; }
        } else {
            this._users = [];
        }
        const savedRequests = localStorage.getItem('cedarImpactRequests');
        if (savedRequests) {
            try { this._requests = JSON.parse(savedRequests); } catch { this._requests = []; }
        } else {
            this._requests = [];
        }

        this.generateQRCodes();
    }

    resetDefaultEvents() {
        this.events = [
            {
                id: 1,
                name: 'CedarImpact Meetup',
                description: 'Connect with fellow professionals',
                date: '2025-02-15',
                time: '18:00',
                location: 'Impact Building, KNUST',
                qrCode: null,
                image: 'MEETUP.JPG'
            },
            {
                id: 2,
                name: 'Ladies Hangout',
                description: 'Empowering young females to grow and connect',
                date: '2025-02-20',
                time: '19:00',
                location: 'Casa Restaurant, Ahodwo',
                qrCode: null,
                image: 'LADIESNEW.JPG'
            }
        ];
        this.saveEvents();
    }

    saveData() {
        if (this.currentUser) {
            localStorage.setItem('cedarImpactUser', JSON.stringify(this.currentUser));
        }
        localStorage.setItem('cedarImpactEvents', JSON.stringify(this.events));
        localStorage.setItem('cedarImpactAttendance', JSON.stringify(this.attendance));
    }

    saveEvents() {
        localStorage.setItem('cedarImpactEvents', JSON.stringify(this.events));
    }

    // User storage helpers
    getUsers() {
        return this._users || [];
    }

    saveUsers() {
        localStorage.setItem('cedarImpactUsers', JSON.stringify(this._users || []));
    }

    saveRequests() {
        localStorage.setItem('cedarImpactRequests', JSON.stringify(this._requests || []));
    }

    // Event Listeners
    setupEventListeners() {
        document.getElementById('login-btn').addEventListener('click', () => this.showModal('login-modal'));
        document.getElementById('signup-btn').addEventListener('click', () => this.showModal('signup-modal'));
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());
        document.getElementById('get-started').addEventListener('click', () => this.showModal('signup-modal'));

        document.getElementById('close-login').addEventListener('click', () => this.hideModal('login-modal'));
        document.getElementById('close-signup').addEventListener('click', () => this.hideModal('signup-modal'));
        document.getElementById('close-create-event').addEventListener('click', () => this.hideModal('create-event-modal'));

        document.getElementById('switch-to-signup').addEventListener('click', (e) => {
            e.preventDefault();
            this.hideModal('login-modal');
            this.showModal('signup-modal');
        });

        document.getElementById('switch-to-login').addEventListener('click', (e) => {
            e.preventDefault();
            this.hideModal('signup-modal');
            this.showModal('login-modal');
        });

        // Welcome modal buttons
        const welcomeClose = document.getElementById('close-welcome');
        if (welcomeClose) welcomeClose.addEventListener('click', () => this.hideModal('welcome-modal'));
        const welcomeEvents = document.getElementById('welcome-events');
        if (welcomeEvents) welcomeEvents.addEventListener('click', () => { this.hideModal('welcome-modal'); window.location.hash = '#events'; });
        const welcomeDashboard = document.getElementById('welcome-dashboard');
        if (welcomeDashboard) welcomeDashboard.addEventListener('click', () => { this.hideModal('welcome-modal'); window.location.hash = '#admin'; });
        const welcomeLogout = document.getElementById('welcome-logout');
        if (welcomeLogout) welcomeLogout.addEventListener('click', () => { this.hideModal('welcome-modal'); this.logout(); });
    const requestAccessBtn = document.getElementById('request-access-btn');
    if (requestAccessBtn) requestAccessBtn.addEventListener('click', () => this.showModal('request-access-modal'));
    const closeRequest = document.getElementById('close-request');
    if (closeRequest) closeRequest.addEventListener('click', () => this.hideModal('request-access-modal'));
    const cancelRequest = document.getElementById('cancel-request');
    if (cancelRequest) cancelRequest.addEventListener('click', () => this.hideModal('request-access-modal'));
    const submitRequest = document.getElementById('submit-request');
    if (submitRequest) submitRequest.addEventListener('click', () => this.submitAccessRequest());

        // Show/hide admin code input when role is selected
        const signupRoleEl = document.getElementById('signup-role');
        if (signupRoleEl) {
            signupRoleEl.addEventListener('change', (e) => {
                const adminGroup = document.getElementById('signup-admin-code-group');
                if (e.target.value === 'executive') {
                    adminGroup.style.display = 'block';
                } else {
                    adminGroup.style.display = 'none';
                }
            });
        }

        document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('signup-form').addEventListener('submit', (e) => this.handleSignup(e));
        document.getElementById('create-event-form').addEventListener('submit', (e) => this.handleCreateEvent(e));

        document.getElementById('start-scan').addEventListener('click', () => this.startQRScanner());
        document.getElementById('stop-scan').addEventListener('click', () => this.stopQRScanner());
        const switchCameraBtn = document.getElementById('switch-camera');
        if (switchCameraBtn) {
            switchCameraBtn.addEventListener('click', () => this.switchCamera());
        }

        document.getElementById('add-event-btn').addEventListener('click', () => this.showModal('create-event-modal'));
        document.getElementById('create-event-btn').addEventListener('click', () => this.showModal('create-event-modal'));

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        document.getElementById('event-filter').addEventListener('change', () => this.applyAttendanceFilters());
        const roleFilterEl = document.getElementById('role-filter');
        if (roleFilterEl) {
            roleFilterEl.addEventListener('change', () => this.applyAttendanceFilters());
        }
        document.getElementById('export-attendance').addEventListener('click', () => this.exportAttendance());
        document.getElementById('hamburger').addEventListener('click', () => this.toggleMobileMenu());

        const attendanceSelect = document.getElementById('attendance-event-select');
        if (attendanceSelect) {
            attendanceSelect.addEventListener('change', (e) => this.generateAttendanceQR(e.target.value));
        }

        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModal(e.target.id);
            }
        });
    }

    // Authentication
    handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        if (email && password) {
            // Verify against saved users
            const users = this.getUsers();
            const found = users.find(u => u.email === email && u.password === password);
            if (found) {
                this.currentUser = {
                    name: found.name,
                    email: found.email,
                    gender: found.gender || 'other',
                    role: found.role || 'participant'
                };
                this.isAdmin = this.currentUser.role === 'executive' || this.currentUser.email === 'admin@cedarimpact.com';
                this.saveData();
                this.hideModal('login-modal');
                this.updateUI();
                this.showNotification('Login successful!', 'success');
            } else {
                this.showNotification('Invalid credentials', 'error');
            }
        } else {
            this.showNotification('Please fill in all fields', 'error');
        }
    }

    handleSignup(e) {
        e.preventDefault();
        const name = document.getElementById('signup-name').value;
        const phone = (document.getElementById('signup-phone') && document.getElementById('signup-phone').value) || '';
        const email = document.getElementById('signup-email').value;
        const gender = document.getElementById('signup-gender').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm').value;
        const role = (document.getElementById('signup-role') && document.getElementById('signup-role').value) || 'participant';
        const adminCode = (document.getElementById('signup-admin-code') && document.getElementById('signup-admin-code').value) || '';

        if (password !== confirmPassword) {
            this.showNotification('Passwords do not match', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showNotification('Passwords do not match', 'error');
            return;
        }

        if (name && email && gender && password && role) {
            // If executive, require admin code
            const ADMIN_CODE = 'CEDAR-ADMIN-2025'; // hardcoded admin code — change in production
            if (role === 'executive') {
                const provided = (adminCode || '').trim().toUpperCase();
                const expected = (ADMIN_CODE || '').trim().toUpperCase();
                if (provided !== expected) {
                    this.showNotification('Invalid admin code for executive role', 'error');
                    return;
                }
            }

            // Save user to users list
            this._users = this._users || [];
            const existing = this._users.find(u => u.email === email);
            if (existing) {
                this.showNotification('User already exists with this email', 'error');
                return;
            }

            const newUser = { name, phone, email, gender, role, password };
            this._users.push(newUser);
            this.saveUsers();

            this.currentUser = { name, email, gender, role };
            this.isAdmin = role === 'executive' || email === 'admin@cedarimpact.com';
            this.saveData();
            this.hideModal('signup-modal');
            this.updateUI();
            // Configure welcome modal
            const welcomeDashboard = document.getElementById('welcome-dashboard');
            if (welcomeDashboard) welcomeDashboard.style.display = this.isAdmin ? 'inline-block' : 'none';
            const welcomeMessage = document.getElementById('welcome-message');
            if (welcomeMessage) welcomeMessage.textContent = `Welcome to Cedar Impact, ${name}! You can now explore events or go to your dashboard.`;
            this.showModal('welcome-modal');
        } else {
            this.showNotification('Please fill in all fields', 'error');
        }
    }

    logout() {
        this.currentUser = null;
        this.isAdmin = false;
        this.saveData();
        this.updateUI();
        this.showNotification('Logged out successfully', 'success');
    }

    // Event Management
    handleCreateEvent(e) {
        e.preventDefault();
        const name = document.getElementById('event-name').value;
        const description = document.getElementById('event-description').value;
        const date = document.getElementById('event-date').value;
        const time = document.getElementById('event-time').value;
        const location = document.getElementById('event-location').value;

        if (name && date && time && location) {
            const newEvent = {
                id: Date.now(),
                name: name,
                description: description,
                date: date,
                time: time,
                location: location,
                qrCode: null
            };

            this.events.push(newEvent);
            this.generateQRCodes();
            this.saveEvents();
            this.hideModal('create-event-modal');
            this.updateUI();
            this.showNotification('Event created successfully!', 'success');
        } else {
            this.showNotification('Please fill in required fields', 'error');
        }
    }

    generateQRCodes() {
        this.events.forEach(event => {
            if (!event.qrCode) {
                const qrData = JSON.stringify({
                    eventId: event.id,
                    eventName: event.name,
                    url: `${window.location.origin}/attendance.html?event=${event.id}`
                });
                event.qrCode = qrData;
            }
        });
    }

    // QR Scanner
    async startQRScanner() {
    try {
        // Stop previous stream if running
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
        }

        const constraints = { video: { facingMode: this.currentFacingMode } };

        // Try selected camera
        this.currentStream = await navigator.mediaDevices.getUserMedia(constraints);

        const video = document.getElementById('scanner-video');
        video.srcObject = this.currentStream;
        await video.play();

        document.getElementById('start-scan').style.display = 'none';
        document.getElementById('stop-scan').style.display = 'inline-block';
        document.getElementById('switch-camera').style.display = 'inline-block'; // show button

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const tick = () => {
            if (!video.srcObject) return;
            canvas.width = video.videoWidth || 300;
            canvas.height = video.videoHeight || 200;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, canvas.width, canvas.height);

            if (code && code.data) {
                try {
                    const payload = JSON.parse(code.data);
                    if (payload && payload.eventId) {
                        this.markAttendance(payload.eventId);
                        this.stopQRScanner();
                    }
                } catch {}
            }
            this.scanner = requestAnimationFrame(tick);
        };
        this.scanner = requestAnimationFrame(tick);

    } catch (error) {
        this.showNotification('Camera not available or permission denied', 'error');
        console.error(error);
    }
}

stopQRScanner() {
    const video = document.getElementById('scanner-video');
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
            this.currentStream = null;
        }
    if (this.scanner) {
        cancelAnimationFrame(this.scanner);
        this.scanner = null;
    }
    video.srcObject = null;

    document.getElementById('start-scan').style.display = 'inline-block';
    document.getElementById('stop-scan').style.display = 'none';
    document.getElementById('switch-camera').style.display = 'none';
}

switchCamera() {
    this.currentFacingMode = (this.currentFacingMode === "environment") ? "user" : "environment";
    // Restart scanner with the new camera if it was running
    if (this.scanner || this.currentStream) {
        this.startQRScanner();
    }
}


    simulateQRDetection() {
        const eventId = Math.floor(Math.random() * this.events.length) + 1;
        this.markAttendance(eventId);
    }

    markAttendance(eventId) {
        if (!this.currentUser) {
            this.showNotification('Please login first', 'error');
            return;
        }

        const event = this.events.find(e => e.id === eventId);
        if (!event) {
            this.showNotification('Event not found', 'error');
            return;
        }

        const existingAttendance = this.attendance.find(a => 
            a.userEmail === this.currentUser.email && a.eventId === eventId
        );

        if (existingAttendance) {
            this.showNotification('You have already marked attendance for this event', 'error');
            return;
        }

        const attendanceRecord = {
            id: Date.now(),
            userName: this.currentUser.name,
            userEmail: this.currentUser.email,
            userGender: this.currentUser.gender,
            userRole: this.currentUser.role || 'participant',
            eventId: eventId,
            eventName: event.name,
            timestamp: new Date().toISOString()
        };

        this.attendance.push(attendanceRecord);
        this.saveData();
        this.updateUI();
        this.showNotification(`Attendance marked for ${event.name}`, 'success');
    }

    // UI Updates
    updateUI() {
        this.updateNavigation();
        this.updateEvents();
        this.updateAttendanceTable();
        this.updateAnalytics();
        this.updateAdminVisibility();
    }

    updateNavigation() {
        const loginBtn = document.getElementById('login-btn');
        const signupBtn = document.getElementById('signup-btn');
        const logoutBtn = document.getElementById('logout-btn');

        if (this.currentUser) {
            loginBtn.style.display = 'none';
            signupBtn.style.display = 'none';
            logoutBtn.style.display = 'inline-block';
        } else {
            loginBtn.style.display = 'inline-block';
            signupBtn.style.display = 'inline-block';
            logoutBtn.style.display = 'none';
        }
    }

    updateEvents() {
        const eventsGrid = document.getElementById('events-grid');
        eventsGrid.innerHTML = '';

        this.events.forEach(event => {
            const eventCard = document.createElement('div');
            // If event has an image, render as background
            if (event.image) {
                eventCard.className = 'event-card has-bg';
                eventCard.style.backgroundImage = `url('${event.image}')`;
                eventCard.style.backgroundSize = 'cover';
                eventCard.style.backgroundPosition = 'center';
                eventCard.innerHTML = `
                    <div class="event-card-content">
                        <h3>${event.name}</h3>
                        <p><strong>Date:</strong> ${event.date}</p>
                        <p><strong>Time:</strong> ${event.time}</p>
                        <p><strong>Location:</strong> ${event.location}</p>
                        <p>${event.description}</p>
                        ${this.isAdmin ? `<button class="btn btn-primary" onclick="cedarImpact.showEventQR(${event.id})">Show QR Code</button>` : ''}
                    </div>
                `;
            } else {
                eventCard.className = 'event-card';
                eventCard.innerHTML = `
                    <h3>${event.name}</h3>
                    <p><strong>Date:</strong> ${event.date}</p>
                    <p><strong>Time:</strong> ${event.time}</p>
                    <p><strong>Location:</strong> ${event.location}</p>
                    <p>${event.description}</p>
                    ${this.isAdmin ? `<button class="btn btn-primary" onclick="cedarImpact.showEventQR(${event.id})">Show QR Code</button>` : ''}
                `;
            }
            eventsGrid.appendChild(eventCard);
        });

        // Populate attendance event select for QR generation
        const attendanceSelect = document.getElementById('attendance-event-select');
        const attendanceQR = document.getElementById('attendance-qr');
        if (attendanceSelect) {
            attendanceSelect.innerHTML = '<option value="">Select event</option>';
            this.events.forEach(ev => {
                const opt = document.createElement('option');
                opt.value = ev.id;
                opt.textContent = ev.name;
                attendanceSelect.appendChild(opt);
            });
        }
        if (attendanceQR) attendanceQR.innerHTML = '';
    }

    generateAttendanceQR(eventId) {
        const container = document.getElementById('attendance-qr');
        if (!container) return;
        container.innerHTML = '';
        const ev = this.events.find(e => String(e.id) === String(eventId));
        if (!ev) return;
        const qrDiv = document.createElement('div');
        container.appendChild(qrDiv);
        new QRCode(qrDiv, { text: ev.qrCode || JSON.stringify({ eventId: ev.id, eventName: ev.name }), width: 160, height: 160 });
    }

    updateAttendanceTable() {
        const tbody = document.getElementById('attendance-tbody');
        tbody.innerHTML = '';

        this.attendance.forEach(record => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${record.userName}</td>
                <td>${record.userEmail}</td>
                <td>${record.userGender}</td>
                <td>${record.userRole || 'participant'}</td>
                <td>${record.eventName}</td>
                <td>${new Date(record.timestamp).toLocaleString()}</td>
            `;
            tbody.appendChild(row);
        });

        const eventFilter = document.getElementById('event-filter');
        eventFilter.innerHTML = '<option value="">All Events</option>';
        this.events.forEach(event => {
            const option = document.createElement('option');
            option.value = event.id;
            option.textContent = event.name;
            eventFilter.appendChild(option);
        });
    }

    updateAnalytics() {
        const totalAttendance = this.attendance.length;
        const maleCount = this.attendance.filter(a => a.userGender === 'male').length;
        const femaleCount = this.attendance.filter(a => a.userGender === 'female').length;
        const otherCount = this.attendance.filter(a => a.userGender === 'other').length;

        const malePercentage = totalAttendance > 0 ? Math.round((maleCount / totalAttendance) * 100) : 0;
        const femalePercentage = totalAttendance > 0 ? Math.round((femaleCount / totalAttendance) * 100) : 0;

        document.getElementById('total-attendance').textContent = totalAttendance;
        document.getElementById('male-percentage').textContent = `${malePercentage}%`;
        document.getElementById('female-percentage').textContent = `${femalePercentage}%`;

        this.updateChart(maleCount, femaleCount, otherCount);
    }

    updateChart(maleCount, femaleCount, otherCount) {
        const ctx = document.getElementById('gender-chart');
        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Male', 'Female', 'Other'],
                datasets: [{
                    data: [maleCount, femaleCount, otherCount],
                    backgroundColor: ['#667eea', '#764ba2', '#95a5a6'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }

    updateAdminVisibility() {
        const adminElements = document.querySelectorAll('.admin-only');
        adminElements.forEach(element => {
            element.style.display = this.isAdmin ? 'block' : 'none';
        });
        // If admin, render pending access requests into admin events tab
        if (this.isAdmin) this.renderAccessRequests();
    }

    submitAccessRequest() {
        const reason = (document.getElementById('request-reason') && document.getElementById('request-reason').value) || '';
        if (!this.currentUser) {
            this.showNotification('Please login before requesting executive access', 'error');
            return;
        }
        if (!reason.trim()) {
            this.showNotification('Please provide a reason for your request', 'error');
            return;
        }
        this._requests = this._requests || [];
        const req = {
            id: Date.now(),
            userEmail: this.currentUser.email,
            userName: this.currentUser.name,
            reason: reason.trim(),
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        this._requests.push(req);
        this.saveRequests();
        this.hideModal('request-access-modal');
        this.showNotification('Request submitted. An admin will review it.', 'success');
    }

    renderAccessRequests() {
        const container = document.getElementById('admin-events-list');
        if (!container) return;
        // Find requests list area (append above existing events list)
        let requestsArea = document.getElementById('access-requests-area');
        if (!requestsArea) {
            requestsArea = document.createElement('div');
            requestsArea.id = 'access-requests-area';
            requestsArea.innerHTML = '<h3>Pending Executive Access Requests</h3><div id="requests-list"></div>';
            container.parentElement.insertBefore(requestsArea, container);
        }
        const list = document.getElementById('requests-list');
        list.innerHTML = '';
        (this._requests || []).filter(r => r.status === 'pending').forEach(r => {
            const row = document.createElement('div');
            row.style = 'border:1px solid #e0e0e0;padding:12px;border-radius:8px;margin-bottom:8px;';
            row.innerHTML = `
                <strong>${r.userName} &lt;${r.userEmail}&gt;</strong>
                <p>${r.reason}</p>
                <div style="display:flex;gap:8px;">
                    <button class="btn btn-primary" data-action="approve" data-id="${r.id}">Approve</button>
                    <button class="btn btn-danger" data-action="deny" data-id="${r.id}">Deny</button>
                </div>
            `;
            list.appendChild(row);
        });
        // Attach handlers
        list.querySelectorAll('button[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = Number(e.target.dataset.id);
                const action = e.target.dataset.action;
                if (action === 'approve') this.handleRequestApproval(id, true);
                if (action === 'deny') this.handleRequestApproval(id, false);
            });
        });
    }

    handleRequestApproval(id, approve) {
        const req = (this._requests || []).find(r => r.id === id);
        if (!req) return;
        req.status = approve ? 'approved' : 'denied';
        req.reviewedAt = new Date().toISOString();
        req.reviewedBy = this.currentUser ? this.currentUser.email : 'system';
        this.saveRequests();
        if (approve) {
            // Promote user to executive if exists
            const user = (this._users || []).find(u => u.email === req.userEmail);
            if (user) {
                user.role = 'executive';
                this.saveUsers();
            }
            this.showNotification('Request approved and user promoted.', 'success');
        } else {
            this.showNotification('Request denied.', 'success');
        }
        this.renderAccessRequests();
        this.updateUI();
    }

    // Utilities
    showModal(modalId) {
        document.getElementById(modalId).style.display = 'block';
    }

    hideModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    showNotification(message, type) {
        const status = document.getElementById('attendance-status');
        if (status) {
            status.textContent = message;
            status.className = `attendance-status ${type}`;
            status.style.display = 'block';
        }

        const global = document.getElementById('global-notification');
        if (global) {
            global.textContent = message;
            global.style.display = 'block';
            global.style.background = type === 'error' ? '#c0392b' : (type === 'success' ? '#27ae60' : '#333');
            setTimeout(() => { global.style.display = 'none'; }, 3000);
        }
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    applyAttendanceFilters() {
        const tbody = document.getElementById('attendance-tbody');
        tbody.innerHTML = '';

        const eventId = document.getElementById('event-filter').value;
        const role = (document.getElementById('role-filter') && document.getElementById('role-filter').value) || '';

        const filtered = this.attendance.filter(a => {
            const byEvent = eventId ? a.eventId == eventId : true;
            const byRole = role ? (a.userRole || 'participant') === role : true;
            return byEvent && byRole;
        });

        filtered.forEach(record => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${record.userName}</td>
                <td>${record.userEmail}</td>
                <td>${record.userGender}</td>
                <td>${record.userRole || 'participant'}</td>
                <td>${record.eventName}</td>
                <td>${new Date(record.timestamp).toLocaleString()}</td>
            `;
            tbody.appendChild(row);
        });
    }

    exportAttendance() {
        const csvContent = this.generateCSV();
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'attendance_export.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    }

    generateCSV() {
        const headers = ['Name', 'Email', 'Gender', 'Event', 'Timestamp'];
        const rows = this.attendance.map(record => [
            record.userName,
            record.userEmail,
            record.userGender,
            record.eventName,
            new Date(record.timestamp).toLocaleString()
        ]);

        return [headers, ...rows].map(row => 
            row.map(field => `"${field}"`).join(',')
        ).join('\n');
    }

    showEventQR(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (event) {
            const qrModal = document.createElement('div');
            qrModal.className = 'modal';
            qrModal.style.display = 'block';
            qrModal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>QR Code for ${event.name}</h2>
                        <span class="close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</span>
                    </div>
                    <div style="padding: 30px; text-align: center;">
                        <div id="qr-code-${eventId}" style="margin: 20px 0;"></div>
                        <p>Scan this QR code to mark attendance</p>
                    </div>
                </div>
            `;
            document.body.appendChild(qrModal);

            new QRCode(document.getElementById(`qr-code-${eventId}`), {
                text: event.qrCode,
                width: 200,
                height: 200
            });
        }
    }

    toggleMobileMenu() {
        const navMenu = document.getElementById('nav-menu');
        if (navMenu) {
            navMenu.classList.toggle('active');
        }
    }
}

// Initialize App
const cedarImpact = new CedarImpact();
