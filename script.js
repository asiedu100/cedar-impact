// CedarImpact JavaScript
class CedarImpact {
    constructor() {
        this.currentUser = null;
        this.events = [];
        this.attendance = [];
        this.isAdmin = false;
        this.scanner = null;
        this.chart = null;
        
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

        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.isAdmin = this.currentUser.email === 'admin@cedarimpact.com';
        }

        try {
            if (savedEvents) {
                this.events = JSON.parse(savedEvents);
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
                qrCode: null
            },
            {
                id: 2,
                name: 'Ladies Hangout',
                description: 'Empowering young females to grow and connect',
                date: '2025-02-20',
                time: '19:00',
                location: 'Casa Restaurant, Ahodwo',
                qrCode: null
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

        document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('signup-form').addEventListener('submit', (e) => this.handleSignup(e));
        document.getElementById('create-event-form').addEventListener('submit', (e) => this.handleCreateEvent(e));

        document.getElementById('start-scan').addEventListener('click', () => this.startQRScanner());
        document.getElementById('stop-scan').addEventListener('click', () => this.stopQRScanner());

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
            // Attempt to load existing user to preserve role if previously signed up
            const saved = localStorage.getItem('cedarImpactUser');
            let role = 'participant';
            try {
                const parsed = saved ? JSON.parse(saved) : null;
                if (parsed && parsed.email === email && parsed.role) {
                    role = parsed.role;
                }
            } catch {}

            this.currentUser = {
                email: email,
                name: email.split('@')[0],
                gender: 'other',
                role: role
            };
            this.isAdmin = role === 'executive' || email === 'admin@cedarimpact.com';
            this.saveData();
            this.hideModal('login-modal');
            this.updateUI();
            this.showNotification('Login successful!', 'success');
        } else {
            this.showNotification('Please fill in all fields', 'error');
        }
    }

    handleSignup(e) {
        e.preventDefault();
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const gender = document.getElementById('signup-gender').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm').value;
        const role = (document.getElementById('signup-role') && document.getElementById('signup-role').value) || 'participant';

        if (password !== confirmPassword) {
            this.showNotification('Passwords do not match', 'error');
            return;
        }

        if (name && email && gender && password && role) {
            this.currentUser = {
                name: name,
                email: email,
                gender: gender,
                role: role
            };
            this.isAdmin = role === 'executive' || email === 'admin@cedarimpact.com';
            this.saveData();
            this.hideModal('signup-modal');
            this.updateUI();
            this.showNotification('Account created successfully!', 'success');
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
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            const video = document.getElementById('scanner-video');
            video.srcObject = stream;
            video.play();

            document.getElementById('start-scan').style.display = 'none';
            document.getElementById('stop-scan').style.display = 'inline-block';

            // Decode frames for QR code
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
            this.showNotification('Camera access denied', 'error');
        }
    }

    stopQRScanner() {
        const video = document.getElementById('scanner-video');
        if (video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
            video.srcObject = null;
        }

        if (this.scanner) {
            cancelAnimationFrame(this.scanner);
            this.scanner = null;
        }

        document.getElementById('start-scan').style.display = 'inline-block';
        document.getElementById('stop-scan').style.display = 'none';
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
            eventCard.className = 'event-card';
            eventCard.innerHTML = `
                <h3>${event.name}</h3>
                <p><strong>Date:</strong> ${event.date}</p>
                <p><strong>Time:</strong> ${event.time}</p>
                <p><strong>Location:</strong> ${event.location}</p>
                <p>${event.description}</p>
                ${this.isAdmin ? `<button class="btn btn-primary" onclick="cedarImpact.showEventQR(${event.id})">Show QR Code</button>` : ''}
            `;
            eventsGrid.appendChild(eventCard);
        });
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
        status.textContent = message;
        status.className = `attendance-status ${type}`;
        status.style.display = 'block';

        setTimeout(() => { status.style.display = 'none'; }, 3000);
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
        const navLinks = document.querySelector('.nav-links');
        navLinks.classList.toggle('active');
    }
}

// Initialize App
const cedarImpact = new CedarImpact();
