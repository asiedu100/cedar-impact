// Networking Hub JavaScript
class NetworkingHub {
    constructor() {
        this.currentUser = null;
        this.events = [];
        this.attendance = [];
        this.isAdmin = false;
        this.scanner = null;
        this._cameraFacing = 'environment'; // 'environment' (rear) or 'user' (front)
        this._preferredDeviceId = null; // optional deviceId selected after enumeration
        this.chart = null;
        
        this.init();
    }

    init() {
        this.loadData();
        this.setupEventListeners();
        this._setupPasswordListeners();
        this.updateUI();
        this._ensureToastContainer();
    }

    _ensureToastContainer() {
        if (!document.querySelector('.toast-container')) {
            const c = document.createElement('div');
            c.className = 'toast-container';
            document.body.appendChild(c);
        }
    }

    _showToast(message, type='success', timeout=3000) {
        this._ensureToastContainer();
        const c = document.querySelector('.toast-container');
        const t = document.createElement('div');
        t.className = `toast ${type}`;
        t.textContent = message;
        c.appendChild(t);
        setTimeout(() => {
            t.style.opacity = '0';
            setTimeout(() => t.remove(), 300);
        }, timeout);
    }

    // Data Management
    loadData() {
        // Load from localStorage or initialize with sample data
        const savedUser = localStorage.getItem('networkingHubUser');
        const savedEvents = localStorage.getItem('networkingHubEvents');
        const savedAttendance = localStorage.getItem('networkingHubAttendance');

        // Only restore a saved user if they explicitly chose 'Remember me'
        const rememberFlag = localStorage.getItem('networkingHubRemember') === 'true';
        if (savedUser && rememberFlag) {
            this.currentUser = JSON.parse(savedUser);
            this.isAdmin = this.currentUser.email === 'admin@networkinghub.com';
        }

        if (savedEvents) {
            this.events = JSON.parse(savedEvents);
        } else {
            // Sample events
            this.events = [
                {
                    id: 1,
                    name: 'Cedar Impact Meetup',
                    description: 'Connect with fellow  professionals',
                    date: '2025-10-25',
                    time: '10:00 AM',
                    location: 'Impact Building, KNUST',
                    image: 'MEETUP.JPG',
                    qrCode: null
                },
                {
                    id: 2,
                    name: 'Ladies Hangout',
                    description: 'A session to empower young women',
                    date: '2025-11-29',
                    time: '01:00 PM',
                    location: 'Casa restaurant, Ahodwo',
                    image: 'LADIESNEW.JPG',
                    qrCode: null
                }
            ];
            this.saveEvents();
        }

        if (savedAttendance) {
            this.attendance = JSON.parse(savedAttendance);
        }

        const savedRegistrations = localStorage.getItem('networkingHubRegistrations');
        if (savedRegistrations) {
            this.registrations = JSON.parse(savedRegistrations);
        } else {
            this.registrations = [];
        }

        this.generateQRCodes();
    }

    saveData() {
        // Persist current user only when the remember flag is set
        if (this.currentUser && localStorage.getItem('networkingHubRemember') === 'true') {
            localStorage.setItem('networkingHubUser', JSON.stringify(this.currentUser));
        }
        localStorage.setItem('networkingHubEvents', JSON.stringify(this.events));
        localStorage.setItem('networkingHubAttendance', JSON.stringify(this.attendance));
        localStorage.setItem('networkingHubRegistrations', JSON.stringify(this.registrations || []));
    }

    saveEvents() {
        localStorage.setItem('networkingHubEvents', JSON.stringify(this.events));
    }

    // Event Listeners
    setupEventListeners() {
        // Navigation
        document.getElementById('login-btn').addEventListener('click', () => this.showModal('login-modal'));
        document.getElementById('signup-btn').addEventListener('click', () => this.showModal('signup-modal'));
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());
        document.getElementById('get-started').addEventListener('click', () => this.showModal('signup-modal'));

        // Modal controls
        document.getElementById('close-login').addEventListener('click', () => this.hideModal('login-modal'));
        document.getElementById('close-signup').addEventListener('click', () => this.hideModal('signup-modal'));
        document.getElementById('close-create-event').addEventListener('click', () => this.hideModal('create-event-modal'));

        // Form switches
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

        // Forms
    document.getElementById('login-form').addEventListener('submit', (e) => this.handleServerLogin(e));
        document.getElementById('signup-form').addEventListener('submit', (e) => this.handleSignup(e));
        document.getElementById('create-event-form').addEventListener('submit', (e) => this.handleCreateEvent(e));

        // initialize remember-me checkbox from persisted preference
        try {
            const rememberPref = localStorage.getItem('networkingHubRememberPref') === 'true';
            const rememberCheckbox = document.getElementById('login-remember');
            if (rememberCheckbox) {
                rememberCheckbox.checked = rememberPref;
                rememberCheckbox.addEventListener('change', (e) => {
                    localStorage.setItem('networkingHubRememberPref', e.target.checked ? 'true' : 'false');
                });
            }
        } catch (err) {
            // ignore storage errors
        }

        // Show admin code input when role=admin
        const roleSelect = document.getElementById('signup-role');
        if (roleSelect) {
            roleSelect.addEventListener('change', (e) => {
                const adminGroup = document.getElementById('admin-code-group');
                if (e.target.value === 'admin') {
                    if (adminGroup) adminGroup.style.display = 'block';
                } else {
                    if (adminGroup) adminGroup.style.display = 'none';
                }
            });
        }

        // No server-side invite flow: admin code is entered in the signup form when role=admin.

    // OTP and invite functionality removed

        // QR Scanner
        document.getElementById('start-scan').addEventListener('click', () => {
            if (!this.currentUser) {
                this.showNotification('Please login to use the QR scanner', 'error');
                return;
            }
            this.startQRScanner();
        });
        document.getElementById('stop-scan').addEventListener('click', () => this.stopQRScanner());
        // Camera facing toggle (front/back)
        const toggleCameraBtn = document.getElementById('toggle-camera');
        if (toggleCameraBtn) {
            toggleCameraBtn.addEventListener('click', async () => {
                // flip facing
                this._cameraFacing = this._cameraFacing === 'environment' ? 'user' : 'environment';
                toggleCameraBtn.textContent = this._cameraFacing === 'environment' ? 'Rear camera' : 'Front camera';
                // If scanner currently active, restart with new facing
                if (this._scanActive) {
                    this.stopQRScanner();
                    // small delay to allow tracks to stop
                    setTimeout(() => this.startQRScanner(), 300);
                }
            });
        }

        // Ensure taps/clicks on the scanner area/video by guests show a clear login message
        const scannerArea = document.getElementById('qr-scanner');
        const scannerVideo = document.getElementById('scanner-video');
        const scannerClickHandler = (e) => {
            if (!this.currentUser) {
                // Prevent accidental interaction and show login prompt
                e.stopPropagation();
                this.showNotification('Please login to use the QR scanner', 'error');
            }
        };
        if (scannerArea) scannerArea.addEventListener('click', scannerClickHandler);
        if (scannerVideo) scannerVideo.addEventListener('click', scannerClickHandler);

        // Admin controls
        document.getElementById('add-event-btn').addEventListener('click', () => this.showModal('create-event-modal'));
        document.getElementById('create-event-btn').addEventListener('click', () => this.showModal('create-event-modal'));
    // Open send-email modal (admin)
    const openSendEmail = document.getElementById('open-send-email');
    if (openSendEmail) openSendEmail.addEventListener('click', () => this.showModal('send-email-modal'));
    const openSendHistory = document.getElementById('open-send-history'); if (openSendHistory) openSendHistory.addEventListener('click', () => this.showSendHistory());
    const closeSend = document.getElementById('close-send-email'); if (closeSend) closeSend.addEventListener('click', () => this.hideModal('send-email-modal'));
    const cancelSend = document.getElementById('cancel-send-email'); if (cancelSend) cancelSend.addEventListener('click', () => this.hideModal('send-email-modal'));
    const doSend = document.getElementById('do-send-email'); if (doSend) doSend.addEventListener('click', () => this.handleSendEmail());
    const closeHistory = document.getElementById('close-send-history'); if (closeHistory) closeHistory.addEventListener('click', () => this.hideModal('send-history-modal'));
    const populateBtn = document.getElementById('populate-send-template'); if (populateBtn) populateBtn.addEventListener('click', () => this.populateSendTemplate());

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Event filtering
        document.getElementById('event-filter').addEventListener('change', (e) => this.filterAttendance(e.target.value));

        // Registrations filter & export
        const regFilter = document.getElementById('registration-event-filter');
        if (regFilter) {
            regFilter.addEventListener('change', () => this.updateRegistrationsTable());
        }
        const exportRegs = document.getElementById('export-registrations');
        if (exportRegs) exportRegs.addEventListener('click', () => this.exportRegistrations());

        // Export functionality
        document.getElementById('export-attendance').addEventListener('click', () => this.exportAttendance());

        // Scanner event select (populate on UI update)
        const scannerSelect = document.getElementById('scanner-event-select');
        if (scannerSelect) {
            scannerSelect.addEventListener('change', () => {
                // no-op here; scanLoop will read the current value
            });
        }

        // Mobile menu
        document.getElementById('hamburger').addEventListener('click', () => this.toggleMobileMenu());

        // Dev reset button (clears localStorage keys and reloads)
        // ...existing code...

        // Close modals on outside click
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModal(e.target.id);
            }
        });

        // Registration modal wiring
        const registerConfirm = document.getElementById('register-confirm-modal');
        const closeRegister = document.getElementById('close-register-confirm');
        const cancelRegister = document.getElementById('cancel-register');
        const confirmRegister = document.getElementById('confirm-register');

        if (closeRegister) closeRegister.addEventListener('click', () => this.hideModal('register-confirm-modal'));
        if (cancelRegister) cancelRegister.addEventListener('click', () => this.hideModal('register-confirm-modal'));
        if (confirmRegister) confirmRegister.addEventListener('click', () => {
            const pending = this._pendingRegistrationEventId;
            if (pending) {
                this._pendingRegistrationEventId = null;
                this._confirmRegistration(pending);
            }
            this.hideModal('register-confirm-modal');
        });
    }

    async showSendHistory() {
        if (!this.isAdmin) { this.showNotification('Only admins can view send history', 'error'); return; }
        this.showModal('send-history-modal');
        const container = document.getElementById('send-history-list');
        if (!container) return;
        container.innerHTML = '<p>Loading...</p>';
        try {
            const res = await fetch('/admin/send-history/', { credentials: 'same-origin' });
            if (!res.ok) { container.innerHTML = '<p>Failed to load history</p>'; return; }
            const data = await res.json();
            if (!data.history || !data.history.length) { container.innerHTML = '<p>No history found</p>'; return; }
            container.innerHTML = '';
            data.history.forEach(h => {
                const div = document.createElement('div');
                div.style.padding = '10px'; div.style.borderBottom = '1px solid #eee';
                div.innerHTML = `<strong>${h.subject}</strong><div style="font-size:0.9rem;color:#666">sent to ${h.recipient_count} on ${new Date(h.created_at).toLocaleString()} by ${h.created_by || 'system'}</div>`;
                container.appendChild(div);
            });
        } catch (e) {
            container.innerHTML = '<p>Error loading history</p>';
        }
    }

    async handleSendEmail() {
        // Only admins should reach this UI; double-check
        if (!this.isAdmin) { this.showNotification('Only admins can send emails', 'error'); return; }

        const sendAll = document.getElementById('send-to-all') ? document.getElementById('send-to-all').checked : false;
        const listRaw = document.getElementById('send-email-list') ? document.getElementById('send-email-list').value : '';
        const subject = document.getElementById('send-subject') ? document.getElementById('send-subject').value : '';
        const body = document.getElementById('send-body') ? document.getElementById('send-body').value : '';

        let emails = [];
        // If send-to-registered is checked, gather emails from local registrations for selected event
        const sendRegistered = document.getElementById('send-to-registered') ? document.getElementById('send-to-registered').checked : false;
        const selectedEvent = document.getElementById('send-event-select') ? document.getElementById('send-event-select').value : '';
        if (sendRegistered && selectedEvent) {
            emails = (this.registrations || []).filter(r => String(r.eventId) === String(selectedEvent)).map(r => r.userEmail).filter(Boolean);
        }
        if (!sendAll && emails.length === 0 && listRaw) {
            emails = listRaw.split(',').map(s => s.trim()).filter(Boolean);
        }

        if (!sendAll && emails.length === 0) { this.showNotification('Provide recipient emails or choose Send to all', 'error'); return; }
        if (!subject || !body) { this.showNotification('Subject and message required', 'error'); return; }

        try {
            const payload = { subject, body };
            if (sendAll) payload.all = true; else payload.emails = emails;
            const res = await fetch('/admin/send-email/', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (res.ok) {
                const data = await res.json();
                this.showNotification(`Emails sent: ${data.sent}`, 'success');
                this.hideModal('send-email-modal');
            } else {
                const err = await res.json().catch(()=>({}));
                this.showNotification((err && err.error) ? err.error : 'Failed to send emails', 'error');
            }
        } catch (e) {
            this.showNotification('Network error sending emails', 'error');
        }
    }

    populateSendTemplate() {
        const tpl = document.getElementById('send-template-type') ? document.getElementById('send-template-type').value : 'custom';
        const eventId = document.getElementById('send-event-select') ? document.getElementById('send-event-select').value : '';
        const ev = this.events.find(e => String(e.id) === String(eventId));
        let subject = '';
        let body = '';
        if (tpl === '3days' && ev) {
            subject = `Reminder: ${ev.name} in 3 days`;
            body = `Hi,\n\nThis is a reminder that the event \"${ev.name}\" will take place on ${ev.date} at ${ev.time} at ${ev.location}.\n\nWe look forward to seeing you!\n\n- Cedar Impact`;
        } else if (tpl === 'dayof' && ev) {
            subject = `Today: ${ev.name} is happening`;
            body = `Hi,\n\nToday is the day! ${ev.name} starts at ${ev.time} at ${ev.location}. Please arrive on time.\n\n- Cedar Impact`;
        } else if (tpl === 'thankyou' && ev) {
            subject = `Thank you for attending ${ev.name}`;
            body = `Hi,\n\nThank you for attending ${ev.name}. We appreciate your participation and hope you found it valuable. Stay connected for future events.\n\n- Cedar Impact`;
        }
        if (subject) document.getElementById('send-subject').value = subject;
        if (body) document.getElementById('send-body').value = body;
        // If send-to-registered is checked, prefill the email list with registered emails for event
        const sendRegistered = document.getElementById('send-to-registered') ? document.getElementById('send-to-registered').checked : false;
        if (sendRegistered && ev) {
            const emails = (this.registrations || []).filter(r => r.eventId == ev.id).map(r => r.userEmail).filter(Boolean);
            document.getElementById('send-email-list').value = emails.join(', ');
        }
    }

    // Authentication
    handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const remember = document.getElementById('login-remember').checked;

        // Simple validation (in real app, this would be server-side)
        if (email && password) {
            const userObj = { email: email, name: email.split('@')[0], gender: 'other', role: 'participant' };
            this.setCurrentUser(userObj, remember);
            this.hideModal('login-modal');
            this.showNotification('Login successful!', 'success');
        } else {
            this.showNotification('Please fill in all fields', 'error');
        }
    }

    async handleServerLogin(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        if (!email || !password) { this.showNotification('Fill login fields', 'error'); return; }
        try {
            const res = await fetch('/auth/login/', {
                method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            if (res.ok) {
                const data = await res.json();
                const userObj = { email: data.email, name: data.name, role: data.is_staff ? 'admin' : 'participant' };
                this.setCurrentUser(userObj, document.getElementById('login-remember') ? document.getElementById('login-remember').checked : false);
                this.hideModal('login-modal');
                this.clearLoginForm();
                this.showNotification('Login successful', 'success');
            } else {
                // server rejected login - attempt local fallback auth
                const local = this._localAuthenticate(email, password);
                if (local) {
                    this.setCurrentUser(local, document.getElementById('login-remember') ? document.getElementById('login-remember').checked : false);
                    this.hideModal('login-modal');
                    this.clearLoginForm();
                    this.showNotification('Login successful (offline mode)', 'success');
                } else {
                    this.showNotification('Invalid credentials', 'error');
                }
            }
        } catch (e) {
            // network error — try local auth
            const local = this._localAuthenticate(email, password);
            if (local) {
                this.setCurrentUser(local, document.getElementById('login-remember') ? document.getElementById('login-remember').checked : false);
                this.hideModal('login-modal');
                this.clearLoginForm();
                this.showNotification('Login successful (offline mode)', 'success');
            } else {
                this.showNotification('Network error', 'error');
            }
        }
    }

    async handleSignup(e) {
        e.preventDefault();
        // Disable submit to prevent double submissions
        const submitBtn = document.querySelector('#signup-form button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const gender = document.getElementById('signup-gender').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm').value;

        if (password !== confirmPassword) {
            // inline error
            const errEl = document.getElementById('signup-confirm-error');
            if (errEl) { errEl.textContent = 'Passwords do not match'; errEl.style.display = 'block'; }
            this.showNotification('Passwords do not match', 'error');
            return;
        }

        const remember = document.getElementById('login-remember') ? document.getElementById('login-remember').checked : false;

    const phone = document.getElementById('signup-phone') ? document.getElementById('signup-phone').value : '';

        if (name && email && gender && password) {
            // client-side password policy: at least 8 chars and a special character
            const pwdOk = password.length >= 8 && /[!@#$%^&*()_+\-=[\]{};:'"\\|,.<>\/?]/.test(password);
            if (!pwdOk) {
                this.showNotification('Password must be at least 8 characters and include a special character', 'error');
                return;
            }
            const role = document.getElementById('signup-role') ? document.getElementById('signup-role').value : 'participant';
            const adminCode = document.getElementById('admin-code') ? document.getElementById('admin-code').value : '';

            // Send signup request to server; server will validate admin_code and set staff flag
            const payload = { name, email, password, role, phone };
            if (adminCode) payload.admin_code = adminCode;
            try {
                const res = await fetch('/auth/signup/', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    // Signup succeeded — server created user but did not log in (no auto-login)
                    this.hideModal('signup-modal');
                    this.clearSignupForm();
                    this.showNotification('Account created. Please login to continue.', 'success');
                    this._showToast('Account created', 'success');
                } else {
                    // server failed to create user
                    const err = await res.json().catch(()=>({}));
                    if (err && err.error === 'user exists') {
                        // Inform user the email is already registered
                        this.showNotification('Email already registered — try logging in', 'error');
                        const emailEl = document.getElementById('signup-email'); if (emailEl) emailEl.focus();
                    } else {
                        // Other server-side error: attempt local fallback but detect duplicates explicitly
                        const localOk = this._localSaveUser({ name, email, password, gender, role, phone });
                        if (localOk) {
                            this.hideModal('signup-modal');
                            this.clearSignupForm();
                            this.showNotification('Account created (offline). Please login to continue.', 'success');
                            this._showToast('Account created (offline)', 'success');
                        } else {
                            // local save failed (likely duplicate locally)
                            this.showNotification('Email already registered (offline) — try logging in', 'error');
                            const emailEl = document.getElementById('signup-email'); if (emailEl) emailEl.focus();
                        }
                    }
                }
            } catch (e) {
                // Network error — save locally for offline/demo usage
                const localOk = this._localSaveUser({ name, email, password, gender, role, phone });
                if (localOk) {
                    this.hideModal('signup-modal');
                    this.clearSignupForm();
                    this.showNotification('Account created (offline). Please login to continue.', 'success');
                    this._showToast('Account created (offline)', 'success');
                } else {
                    // Clarify duplicate condition to the user
                    this.showNotification('Network error and email already exists locally — try logging in', 'error');
                    const emailEl = document.getElementById('signup-email'); if (emailEl) emailEl.focus();
                }
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        } else {
            this.showNotification('Please fill in all fields', 'error');
            if (submitBtn) submitBtn.disabled = false;
        }
    }

    clearSignupForm() {
        const ids = ['signup-name','signup-email','signup-gender','signup-role','admin-code','signup-phone','signup-password','signup-confirm'];
        ids.forEach(id => { const el = document.getElementById(id); if (el) { if (el.type === 'select-one') el.selectedIndex = 0; else el.value = ''; } });
        const errEl = document.getElementById('signup-confirm-error'); if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }
        const toggle = document.getElementById('signup-show-password'); if (toggle) { toggle.checked = false; const pwd = document.getElementById('signup-password'); const conf = document.getElementById('signup-confirm'); if (pwd) pwd.type='password'; if (conf) conf.type='password'; }
    }

    clearLoginForm() {
        const email = document.getElementById('login-email'); if (email) email.value = '';
        const pwd = document.getElementById('login-password'); if (pwd) pwd.value = '';
        const remember = document.getElementById('login-remember'); if (remember) remember.checked = false;
        const toggle = document.getElementById('login-show-password'); if (toggle) { toggle.checked = false; if (pwd) pwd.type='password'; }
    }

    // clear confirm error when typing
    _setupPasswordListeners() {
        const pwd = document.getElementById('signup-password');
        const confirm = document.getElementById('signup-confirm');
        const errEl = document.getElementById('signup-confirm-error');
        if (!pwd || !confirm || !errEl) return;
        const clear = () => { if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; } };
        pwd.addEventListener('input', clear);
        confirm.addEventListener('input', clear);
        // show/hide toggles
        const signupToggle = document.getElementById('signup-show-password');
        if (signupToggle && pwd && confirm) {
            signupToggle.addEventListener('change', (e) => {
                const t = e.target.checked ? 'text' : 'password';
                pwd.type = t; confirm.type = t;
            });
        }
        const loginPwd = document.getElementById('login-password');
        const loginToggle = document.getElementById('login-show-password');
        if (loginToggle && loginPwd) {
            loginToggle.addEventListener('change', (e) => { loginPwd.type = e.target.checked ? 'text' : 'password'; });
        }
    }

    // invite/OTP flows removed: admin signups are validated client-side by admin code "ADMIN-CEDAR".

    logout() {
        this.setCurrentUser(null, false);
        this.showNotification('Logged out successfully', 'success');
    }

    setCurrentUser(userObj, remember) {
        // userObj: { email, name, role, gender, phone } or null to logout
        if (userObj) {
            this.currentUser = userObj;
            this.isAdmin = userObj.role === 'admin';
            if (remember) {
                localStorage.setItem('networkingHubUser', JSON.stringify(this.currentUser));
                localStorage.setItem('networkingHubRemember', 'true');
            } else {
                localStorage.removeItem('networkingHubUser');
                localStorage.setItem('networkingHubRemember', 'false');
            }
        } else {
            this.currentUser = null;
            this.isAdmin = false;
            localStorage.removeItem('networkingHubUser');
            localStorage.setItem('networkingHubRemember', 'false');
        }
        this.saveData();
        this.updateUI();
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

    // Populate scanner event select dropdown
    populateScannerEventSelect() {
        const select = document.getElementById('scanner-event-select');
        if (!select) return;
        select.innerHTML = '';
        const emptyOpt = document.createElement('option');
        emptyOpt.value = '';
        emptyOpt.textContent = '-- Choose event (or scan QR) --';
        select.appendChild(emptyOpt);
        this.events.forEach(ev => {
            const opt = document.createElement('option');
            opt.value = ev.id;
            opt.textContent = ev.name;
            select.appendChild(opt);
        });
    }

    // QR Scanner
    async startQRScanner() {
        if (!this.currentUser) {
            this.showNotification('Please login to use the QR scanner', 'error');
            return;
        }

        try {
            // Prefer the selected deviceId if available. Otherwise try facingMode.
            let constraints = { video: { facingMode: this._cameraFacing } };
            if (this._preferredDeviceId) {
                constraints = { video: { deviceId: { exact: this._preferredDeviceId } } };
            }

            // Try to get a stream that respects the facingMode. Some browsers (and mobile) may ignore facingMode
            // so we attempt getUserMedia and, on failure, enumerate devices and pick a suitable deviceId.
            let stream = null;
            try {
                stream = await navigator.mediaDevices.getUserMedia(constraints);
            } catch (err) {
                // Fallback: enumerate and pick a device matching the facing preference if possible
                try {
                    const devices = await navigator.mediaDevices.enumerateDevices();
                    const videoDevices = devices.filter(d => d.kind === 'videoinput');
                    if (videoDevices.length) {
                        // Heuristic: label contains 'back' or 'rear' or 'environment' for rear cameras; 'front' for selfie
                        const pick = videoDevices.find(d => {
                            const lbl = (d.label || '').toLowerCase();
                            if (this._cameraFacing === 'environment') return lbl.includes('back') || lbl.includes('rear') || lbl.includes('environment');
                            return lbl.includes('front') || lbl.includes('selfie') || lbl.includes('user');
                        }) || videoDevices[0];
                        this._preferredDeviceId = pick.deviceId;
                        stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: pick.deviceId } } });
                    } else {
                        // last resort: simple true
                        stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    }
                } catch (err2) {
                    // If enumeration or fallback fails, rethrow the original error
                    throw err;
                }
            }
            const video = document.getElementById('scanner-video');
            video.srcObject = stream;
            video.play();

            document.getElementById('start-scan').style.display = 'none';
            document.getElementById('stop-scan').style.display = 'inline-block';

            // Start real scanning loop using jsQR
            this._qrCanvas = document.createElement('canvas');
            this._qrCanvasCtx = this._qrCanvas.getContext('2d');
            this._lastDecoded = null;
            this._scanActive = true;
            const scanLoop = () => {
                if (!this._scanActive) return;
                try {
                    const video = document.getElementById('scanner-video');
                    if (video.videoWidth && video.videoHeight) {
                        this._qrCanvas.width = video.videoWidth;
                        this._qrCanvas.height = video.videoHeight;
                        this._qrCanvasCtx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
                        const imageData = this._qrCanvasCtx.getImageData(0, 0, video.videoWidth, video.videoHeight);
                        const code = jsQR(imageData.data, imageData.width, imageData.height);
                        if (code && code.data) {
                            // Debounce repeated scans: require change or 3s gap
                            if (code.data !== this._lastDecoded || (Date.now() - (this._lastDecodedTime || 0)) > 3000) {
                                this._lastDecoded = code.data;
                                this._lastDecodedTime = Date.now();
                                // Try to parse JSON payload (we generate JSON for event QR)
                                try {
                                    const payload = JSON.parse(code.data);
                                    let eventId = null;
                                    // If the user has selected an event to scan for, prefer that
                                    const select = document.getElementById('scanner-event-select');
                                    if (select && select.value) {
                                        eventId = parseInt(select.value, 10);
                                    } else if (payload && payload.eventId) {
                                        eventId = payload.eventId;
                                    }
                                    if (eventId) {
                                        this.markAttendance(eventId);
                                    }
                                } catch (e) {
                                    console.warn('QR decoded but payload parse failed', e, code.data);
                                }
                            }
                        }
                    }
                } catch (err) {
                    console.warn('scanLoop error', err);
                }
                requestAnimationFrame(scanLoop);
            };
            requestAnimationFrame(scanLoop);

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

        // stop real scan loop
        this._scanActive = false;
        if (this._qrCanvas) {
            this._qrCanvasCtx = null;
            this._qrCanvas.remove();
            this._qrCanvas = null;
        }

        document.getElementById('start-scan').style.display = 'inline-block';
        document.getElementById('stop-scan').style.display = 'none';
    }

    simulateQRDetection() {
        // Simulate QR code detection for demo
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

        // Check if already attended
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
            userPhone: this.currentUser.phone || '',
            userGender: this.currentUser.gender,
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
        this.populateScannerEventSelect();
        this.populateRegistrationEventFilter();
        this.updateRegistrationsTable();
        this.populateSendEventSelect();
    }

    populateSendEventSelect() {
        const sel = document.getElementById('send-event-select');
        if (!sel) return;
        sel.innerHTML = '<option value="">-- Select event --</option>';
        this.events.forEach(ev => {
            const opt = document.createElement('option'); opt.value = ev.id; opt.textContent = ev.name; sel.appendChild(opt);
        });
    }

    updateNavigation() {
        const loginBtn = document.getElementById('login-btn');
        const signupBtn = document.getElementById('signup-btn');
        const logoutBtn = document.getElementById('logout-btn');

        if (this.currentUser) {
            loginBtn.style.display = 'none';
            signupBtn.style.display = 'none';
            logoutBtn.style.display = 'inline-block';
            // enable QR start button when logged in
            const startBtn = document.getElementById('start-scan');
            if (startBtn) startBtn.disabled = false;
        } else {
            loginBtn.style.display = 'inline-block';
            signupBtn.style.display = 'inline-block';
            logoutBtn.style.display = 'none';
            // disable QR start button for guests
            const startBtn = document.getElementById('start-scan');
            if (startBtn) startBtn.disabled = true;
        }
    }

    handleRegister(eventId) {
        if (!this.currentUser) {
            this.showNotification('Please login or sign up to register for events', 'error');
            this.showModal('signup-modal');
            return;
        }

        // Show confirmation modal and remember pending event
        this._pendingRegistrationEventId = eventId;
        const text = document.getElementById('register-confirm-text');
        const ev = this.events.find(e => e.id === eventId);
        if (text && ev) text.textContent = `Register for "${ev.name}"?`;
        this.showModal('register-confirm-modal');
    }

    _confirmRegistration(eventId) {
        // Prevent duplicate registrations
        const existing = (this.registrations || []).find(r => r.eventId === eventId && r.userEmail === this.currentUser.email);
        if (existing) {
            this.showNotification('You have already registered for this event', 'error');
            return;
        }

        const record = {
            id: Date.now(),
            eventId: eventId,
            eventName: (this.events.find(e => e.id === eventId) || {}).name || '',
            userEmail: this.currentUser.email,
            userName: this.currentUser.name,
            userPhone: this.currentUser.phone || '',
            timestamp: new Date().toISOString()
        };

        this.registrations.push(record);
        this.saveData();
        this.showNotification('Registration confirmed', 'success');
        this.updateUI();
    }

    updateEvents() {
        const eventsGrid = document.getElementById('events-grid');
        if (!eventsGrid) return;
        eventsGrid.innerHTML = '';

        this.events.forEach(event => {
            const eventCard = document.createElement('div');
            eventCard.className = 'event-card';

            // ...existing code... (per-event class assignment removed to keep uniform styling)

            const registered = (this.registrations || []).some(r => r.eventId === event.id && r.userEmail === (this.currentUser && this.currentUser.email));

            if (event.image) {
                // First set innerHTML content, then apply background so DOM children remain intact
                eventCard.innerHTML = `
                    <div class="event-card-overlay">
                        <div class="event-card-content">
                            <h3>${event.name}</h3>
                            <p class="meta"><strong>Date:</strong> ${event.date} &nbsp; <strong>Time:</strong> ${event.time}</p>
                            <p class="meta"><strong>Location:</strong> ${event.location}</p>
                            <p class="desc">${event.description}</p>
                            ${this.isAdmin ? `<button class="btn btn-primary" onclick="networkingHub.showEventQR(${event.id})">Show QR Code</button>` : ''}
                            <button class="btn btn-register" onclick="networkingHub.handleRegister(${event.id})">Register</button>
                        </div>
                    </div>
                `;

                // Use helper to probe image paths and apply the background when loaded.
                this.setEventCardBackground(eventCard, event.image);
                // Defensive: ensure text nodes exist (fixes cases where innerHTML might be affected by CSS/DOM quirks)
                const titleEl = eventCard.querySelector('h3');
                if (titleEl) titleEl.textContent = event.name;
                const descEl = eventCard.querySelector('.desc');
                if (descEl) descEl.textContent = event.description;
            } else {
                eventCard.innerHTML = `
                    <div class="event-card-content">
                        <h3>${event.name}</h3>
                        <p class="meta"><strong>Date:</strong> ${event.date}</p>
                        <p class="meta"><strong>Time:</strong> ${event.time}</p>
                        <p class="meta"><strong>Location:</strong> ${event.location}</p>
                        <p class="desc">${event.description}</p>
                        ${this.isAdmin ? `<button class="btn btn-primary" onclick="networkingHub.showEventQR(${event.id})">Show QR Code</button>` : ''}
                        <button class="btn btn-register" onclick="networkingHub.handleRegister(${event.id})">Register</button>
                    </div>
                `;
                // Defensive: ensure text nodes exist for non-image cards
                const titleEl2 = eventCard.querySelector('h3');
                if (titleEl2) titleEl2.textContent = event.name;
                const descEl2 = eventCard.querySelector('.desc');
                if (descEl2) descEl2.textContent = event.description;
            }

            // If registered, add a small badge element (after innerHTML so it's not removed)
            if (registered) {
                const badge = document.createElement('div');
                badge.className = 'event-registered-badge';
                badge.textContent = 'Registered';
                eventCard.appendChild(badge);
            }

            eventsGrid.appendChild(eventCard);
        });
    }

    // Registrations rendering & export
    populateRegistrationEventFilter() {
        const sel = document.getElementById('registration-event-filter');
        if (!sel) return;
        sel.innerHTML = '<option value="">All Events</option>';
        this.events.forEach(ev => {
            const opt = document.createElement('option'); opt.value = ev.id; opt.textContent = ev.name; sel.appendChild(opt);
        });
    }

    updateRegistrationsTable() {
        const tbody = document.getElementById('registrations-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        const filtered = (() => {
            const sel = document.getElementById('registration-event-filter');
            if (sel && sel.value) return this.registrations.filter(r => r.eventId == sel.value);
            return this.registrations;
        })();

        filtered.forEach(r => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${r.userName}</td>
                <td>${r.userEmail}</td>
                <td>${r.userPhone || ''}</td>
                <td>${r.eventName}</td>
                <td>${new Date(r.timestamp).toLocaleString()}</td>
            `;
            tbody.appendChild(row);
        });
    }

    exportRegistrations() {
        const headers = ['Name', 'Email', 'Phone', 'Event', 'Timestamp'];
        const rows = this.registrations.map(r => [
            r.userName, r.userEmail, r.userPhone || '', r.eventName, new Date(r.timestamp).toLocaleString()
        ]);
        const csv = [headers, ...rows].map(row => row.map(f => `"${f}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'registrations_export.csv'; a.click(); window.URL.revokeObjectURL(url);
    }

    // Try multiple path variants for event images and apply the background only if an image loads successfully.
    setEventCardBackground(eventCard, imagePath) {
        eventCard.classList.add('has-bg');
        const baseDir = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
        const candidates = [
            imagePath,
            './' + imagePath,
            '/' + imagePath,
            baseDir + imagePath
        ];

        let tried = 0;
        const tryNext = () => {
            if (tried >= candidates.length) {
                console.warn('NetworkingHub: image not found for event:', imagePath, 'tried:', candidates);
                // fallback styling so the card is not blank
                eventCard.style.background = '#333';
                return;
            }

            const candidate = candidates[tried++];
            const img = new Image();
            img.onload = () => {
                // apply the successfully loaded image path
                eventCard.style.backgroundImage = `url('${candidate}')`;
                eventCard.style.backgroundSize = 'cover';
                eventCard.style.backgroundPosition = 'center';
                console.debug('NetworkingHub: loaded event image:', candidate);
            };
            img.onerror = () => {
                // try the next candidate
                tryNext();
            };
            // start loading
            img.src = candidate;
        };

        tryNext();
    }

    updateAttendanceTable() {
        const tbody = document.getElementById('attendance-tbody');
        tbody.innerHTML = '';

        this.attendance.forEach(record => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${record.userName}</td>
                <td>${record.userEmail}</td>
                <td>${record.userPhone || ''}</td>
                <td>${record.userGender}</td>
                <td>${record.eventName}</td>
                <td>${new Date(record.timestamp).toLocaleString()}</td>
            `;
            tbody.appendChild(row);
        });

        // Update event filter
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

        // Update chart
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
                    backgroundColor: ['#4A148C', '#7B1FA2', '#95a5a6'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    updateAdminVisibility() {
        const adminElements = document.querySelectorAll('.admin-only');
        adminElements.forEach(element => {
            element.style.display = this.isAdmin ? 'block' : 'none';
        });

        // Show dev-only elements when on localhost or when admin
        const devElements = document.querySelectorAll('.dev-only');
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        devElements.forEach(el => {
            el.style.display = (this.isAdmin || isLocal) ? 'inline-block' : 'none';
        });
    }

    // Developer helper: clear local storage keys that may override seeded data
    // (resetSeededData removed)

    // Utility Functions
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

        setTimeout(() => {
            status.style.display = 'none';
        }, 3000);
    }

    // Local fallback user store for offline/demo mode
    _localSaveUser(user) {
        // user: { name, email, password, gender, role, phone }
        const key = 'networkingHubLocalUsers';
        const raw = localStorage.getItem(key);
        const users = raw ? JSON.parse(raw) : [];
        if (users.find(u => u.email === user.email)) return false; // exists
        users.push({ name: user.name, email: user.email, password: user.password, gender: user.gender, role: user.role, phone: user.phone });
        localStorage.setItem(key, JSON.stringify(users));
        return true;
    }

    _localAuthenticate(email, password) {
        const key = 'networkingHubLocalUsers';
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const users = JSON.parse(raw);
        const u = users.find(x => x.email === email && x.password === password);
        if (!u) return null;
        return { email: u.email, name: u.name, gender: u.gender || 'other', role: u.role || 'participant', phone: u.phone };
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    filterAttendance(eventId) {
        const tbody = document.getElementById('attendance-tbody');
        tbody.innerHTML = '';

        const filteredAttendance = eventId ? 
            this.attendance.filter(a => a.eventId == eventId) : 
            this.attendance;

        filteredAttendance.forEach(record => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${record.userName}</td>
                <td>${record.userEmail}</td>
                <td>${record.userPhone || ''}</td>
                <td>${record.userGender}</td>
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
        const headers = ['Name', 'Email', 'Phone', 'Gender', 'Event', 'Timestamp'];
        const rows = this.attendance.map(record => [
            record.userName,
            record.userEmail,
            record.userPhone || '',
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
            // Create QR code modal
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

            // Generate QR code
            QRCode.toCanvas(document.getElementById(`qr-code-${eventId}`), event.qrCode, {
                width: 200,
                height: 200
            });
        }
    }

    toggleMobileMenu() {
        const navMenu = document.getElementById('nav-menu');
        navMenu.classList.toggle('active');
    }
}

// Initialize the application
const networkingHub = new NetworkingHub();

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Development helper: log to confirm the updated script is loaded
console.log('NetworkingHub script loaded at', new Date().toISOString());