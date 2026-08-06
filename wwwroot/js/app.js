import { Api } from './api.js';

// GLOBAL APP STATE
let state = {
    currentUser: null,
    currentNav: 'dashboard',
    systemInfo: null,
    allUsers: [],
    students: [],
    teachers: [],
    pendingApprovals: [],
    smsNotifications: [],
    timetable: [],
    remarks: [],
    selectedClass: '5-A',
    selectedSubject: 'Matematika',
    selectedTerm: 1,
    userRoleFilter: 'all'
};

// INITIALIZATION
document.addEventListener('DOMContentLoaded', async () => {
    try {
        state.systemInfo = await Api.getInit();
        updateClassDropdowns();
    } catch (err) {
        console.error('Init error:', err);
    }
});

function updateClassDropdowns() {
    if (!state.systemInfo || !state.systemInfo.classes) return;
    const classes = state.systemInfo.classes;

    const ids = ['reg-class', 'add-st-class'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = classes.map(c => `<option value="${c}">${c} sinf</option>`).join('');
        }
    });
}

// DYNAMIC CLASS CREATION (DIRECTOR ADDS CLASS WITH 1-11 VALIDATION)
window.openAddClassModal = () => {
    document.getElementById('form-add-class').reset();
    openModal('modal-add-class');
};

window.handleSaveClass = async (e) => {
    e.preventDefault();
    const gradeNumber = parseInt(document.getElementById('add-class-number').value);
    const classLetter = document.getElementById('add-class-letter').value;

    if (isNaN(gradeNumber) || gradeNumber < 1 || gradeNumber > 11) {
        alert("❌ Sinf raqami 1 va 11 orasida bo'lishi shart! (Masalan: 1-11)");
        return;
    }

    if (!classLetter || !classLetter.trim()) {
        alert("❌ Sinf harfini kiritishingiz shart! (Masalan: A, B, V)");
        return;
    }

    try {
        const res = await Api.addClass(gradeNumber, classLetter);
        alert("✅ " + res.message);
        closeModal('modal-add-class');

        state.systemInfo.classes = res.availableClasses;
        updateClassDropdowns();
        state.selectedClass = res.className;

        await loadRoleData();
        renderPage();
    } catch (err) {
        alert(err.message);
    }
};

// AUTH & LOGIN LOGIC
window.toggleAuthMode = (mode) => {
    if (mode === 'register') {
        document.getElementById('form-login').style.display = 'none';
        document.getElementById('form-register').style.display = 'block';
    } else {
        document.getElementById('form-login').style.display = 'block';
        document.getElementById('form-register').style.display = 'none';
    }
};

window.toggleRegFields = (role) => {
    const classBox = document.getElementById('reg-class-container');
    const subjectBox = document.getElementById('reg-subject-container');
    if (role === 'Teacher') {
        classBox.style.display = 'block';
        subjectBox.style.display = 'block';
    } else {
        classBox.style.display = 'block';
        subjectBox.style.display = 'none';
    }
};

window.quickLogin = (username, password) => {
    document.getElementById('login-username').value = username;
    document.getElementById('login-password').value = password;
    document.getElementById('form-login').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
};

window.handleLoginSubmit = async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const res = await Api.login(username, password);
        state.currentUser = res.user;

        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('top-bar').style.display = 'flex';
        document.getElementById('app-layout').style.display = 'flex';

        document.getElementById('user-name').innerText = state.currentUser.fullName;
        document.getElementById('user-role-badge').innerText = state.currentUser.role === 'Director' ? "Direktor & O'rinbosar" : (state.currentUser.role === 'Teacher' ? state.currentUser.subject + " O'qituvchisi" : state.currentUser.className + " O'quvchisi");
        document.getElementById('user-avatar').innerText = state.currentUser.fullName.charAt(0);

        document.getElementById('btn-director-profile').style.display = state.currentUser.role === 'Director' ? 'inline-flex' : 'none';

        if (state.currentUser.role === 'Director') state.currentNav = 'dashboard';
        else if (state.currentUser.role === 'Teacher') state.currentNav = 'journal';
        else if (state.currentUser.role === 'Student') state.currentNav = 'diary';

        await loadRoleData();
        renderSidebar();
        renderPage();
    } catch (err) {
        alert(err.message);
    }
};

window.handleRegisterSubmit = async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('reg-fullname').value;
    const role = document.getElementById('reg-role').value;
    const className = document.getElementById('reg-class').value;
    const subject = document.getElementById('reg-subject').value;
    const phone = document.getElementById('reg-phone').value;
    const username = document.getElementById('reg-username').value;
    const password = document.getElementById('reg-password').value;

    try {
        const res = await Api.register({ fullName, role, className, subject, phone, username, password });
        alert("✅ " + res.message);
        toggleAuthMode('login');
    } catch (err) {
        alert("❌ " + err.message);
    }
};

window.handleLogout = () => {
    state.currentUser = null;
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('top-bar').style.display = 'none';
    document.getElementById('app-layout').style.display = 'none';
};

window.openDirectorProfileModal = () => {
    if (!state.currentUser || state.currentUser.role !== 'Director') return;
    document.getElementById('dir-profile-fullname').value = state.currentUser.fullName;
    document.getElementById('dir-profile-username').value = state.currentUser.username;
    document.getElementById('dir-profile-password').value = "direktor5maktab";
    openModal('modal-director-profile');
};

window.handleSaveDirectorProfile = async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('dir-profile-fullname').value;
    const username = document.getElementById('dir-profile-username').value;
    const password = document.getElementById('dir-profile-password').value;

    try {
        const res = await Api.updateDirectorProfile(state.currentUser.id, fullName, username, password);
        alert("✅ " + res.message);
        state.currentUser.fullName = fullName;
        state.currentUser.username = username;
        document.getElementById('user-name').innerText = fullName;
        closeModal('modal-director-profile');
        renderPage();
    } catch (err) {
        alert(err.message);
    }
};

async function loadRoleData() {
    if (!state.currentUser) return;

    if (state.currentUser.role === 'Director') {
        const data = await Api.getPendingApprovals();
        state.pendingApprovals = data.pendingUsers;
        state.smsNotifications = data.smsNotifications;
    }

    state.allUsers = await Api.getAllUsers();
    state.students = await Api.getStudents(state.selectedClass);
    state.teachers = await Api.getTeachers();
    state.timetable = await Api.getTimetable(state.selectedClass);
    state.remarks = await Api.getRemarks(null, state.selectedClass);
}

// SIDEBAR NAVIGATION
function renderSidebar() {
    const navContainer = document.getElementById('sidebar-nav');
    const navTitle = document.getElementById('nav-section-title');
    navContainer.innerHTML = '';

    let items = [];

    if (state.currentUser.role === 'Director') {
        navTitle.innerText = "DIREKTOR MENYUSI";
        items = [
            { id: 'dashboard', icon: 'fa-chart-pie', label: 'Bosh Sahifa' },
            { id: 'all_users', icon: 'fa-users', label: "👥 Tizim Foydalanuvchilari", badge: state.allUsers.length },
            { id: 'pending', icon: 'fa-envelope-open-text', label: '📱 SMS & Tasdiqlar', badge: state.pendingApprovals.length },
            { id: 'teachers', icon: 'fa-chalkboard-user', label: "O'qituvchilar Boshqaruvi" },
            { id: 'students', icon: 'fa-user-graduate', label: "O'quvchilar Boshqaruvi" },
            { id: 'timetable', icon: 'fa-calendar-days', label: '📄 Dars Jadvali' },
            { id: 'remarks', icon: 'fa-comments', label: '💬 O\'quvchilar Izohlari' },
            { id: 'analytics', icon: 'fa-chart-column', label: '📊 Natijalar Analitikasi' },
            { id: 'ratings', icon: 'fa-trophy', label: 'Maktab Reytingi' }
        ];
    } else if (state.currentUser.role === 'Teacher') {
        navTitle.innerText = "O'QITUVCHI MENYUSI";
        items = [
            { id: 'journal', icon: 'fa-book-open', label: 'Kundalik Jurnal' },
            { id: 'all_users', icon: 'fa-users', label: "👥 Tizim Foydalanuvchilari", badge: state.allUsers.length },
            { id: 'bsb_chsb', icon: 'fa-award', label: 'BSB (50) va CHSB (40)' },
            { id: 'attendance_take', icon: 'fa-calendar-check', label: 'Davomat Belgilash' },
            { id: 'timetable', icon: 'fa-calendar-days', label: '📄 Dars Jadvali' },
            { id: 'remarks', icon: 'fa-comments', label: '💬 O\'quvchilarga Izohlar' },
            { id: 'class_ratings', icon: 'fa-ranking-star', label: 'Sinf Reytingi' }
        ];
    } else if (state.currentUser.role === 'Student') {
        navTitle.innerText = "O'QUVCHI MENYUSI";
        items = [
            { id: 'diary', icon: 'fa-book-bookmark', label: 'Kundalik Daftari' },
            { id: 'timetable', icon: 'fa-calendar-days', label: '📄 Dars Jadvalim' },
            { id: 'all_users', icon: 'fa-users', label: "👥 Tizim Foydalanuvchilari", badge: state.allUsers.length },
            { id: 'my_grades', icon: 'fa-graduation-cap', label: 'Fanlar va Baholarim' },
            { id: 'remarks', icon: 'fa-comments', label: '💬 Izoh va Eslatmalarim' },
            { id: 'my_attendance', icon: 'fa-user-clock', label: 'Davomatim' },
            { id: 'leaderboard', icon: 'fa-medal', label: "Sinf & Maktab Reytingim" }
        ];
    }

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = `nav-item ${state.currentNav === item.id ? 'active' : ''}`;
        div.onclick = () => {
            state.currentNav = item.id;
            renderSidebar();
            renderPage();
        };
        div.innerHTML = `
            <i class="fa-solid ${item.icon}"></i> <span>${item.label}</span>
            ${item.badge ? `<span class="nav-badge">${item.badge}</span>` : ''}
        `;
        navContainer.appendChild(div);
    });
}

// MAIN PAGE ROUTER
async function renderPage() {
    const main = document.getElementById('content-area');
    main.innerHTML = '<div style="text-align:center; padding:40px;"><i class="fa-solid fa-spinner fa-spin fa-2x text-primary"></i></div>';

    if (state.currentNav === 'all_users') {
        await renderAllUsers(main);
        return;
    } else if (state.currentNav === 'timetable') {
        await renderTimetable(main);
        return;
    } else if (state.currentNav === 'remarks') {
        await renderRemarks(main);
        return;
    } else if (state.currentNav === 'analytics') {
        await renderAnalytics(main);
        return;
    }

    if (state.currentUser.role === 'Director') {
        if (state.currentNav === 'dashboard') await renderDirectorDashboard(main);
        else if (state.currentNav === 'pending') await renderPendingApprovals(main);
        else if (state.currentNav === 'teachers') await renderTeacherCRUD(main);
        else if (state.currentNav === 'students') await renderStudentManagement(main);
        else if (state.currentNav === 'ratings') await renderRatingsPage(main);
    } else if (state.currentUser.role === 'Teacher') {
        if (state.currentNav === 'journal') await renderTeacherJournal(main);
        else if (state.currentNav === 'bsb_chsb') await renderTeacherBsbChsb(main);
        else if (state.currentNav === 'attendance_take') await renderTeacherAttendance(main);
        else if (state.currentNav === 'class_ratings') await renderRatingsPage(main);
    } else if (state.currentUser.role === 'Student') {
        if (state.currentNav === 'diary') await renderStudentDiary(main);
        else if (state.currentNav === 'my_grades') await renderStudentGrades(main);
        else if (state.currentNav === 'my_attendance') await renderStudentAttendance(main);
        else if (state.currentNav === 'leaderboard') await renderStudentLeaderboard(main);
    }
}

// ----------------------------------------------------
// ALL USERS & UNIVERSAL USER EDITOR
// ----------------------------------------------------
async function renderAllUsers(container) {
    state.allUsers = await Api.getAllUsers();
    
    let filteredUsers = state.allUsers;
    if (state.userRoleFilter !== 'all') {
        filteredUsers = state.allUsers.filter(u => u.role === state.userRoleFilter);
    }

    const isDirector = state.currentUser.role === 'Director';

    container.innerHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">👥 Tizimda Ro'yxatdan O'tgan Barcha Foydalanuvchilar</h1>
                <p class="page-subtitle">5-sonli maktab tizimida mavjud barcha foydalanuvchilar va ma'lumotlar boshqaruvi</p>
            </div>
            <div style="display:flex; gap:10px;">
                ${isDirector ? `
                    <button class="btn btn-primary" onclick="openAddClassModal()">
                        <i class="fa-solid fa-school-flag"></i> Yangi Sinf Qo'shish
                    </button>
                ` : ''}
                <button class="btn" style="background:#e2e8f0;" onclick="window.print()">
                    <i class="fa-solid fa-print"></i> Ro'yxatni Chop Etish (PDF)
                </button>
            </div>
        </div>

        <div class="table-card">
            <div class="table-toolbar">
                <div class="filter-group">
                    <label style="font-weight:600;">Rol bo'yicha saralash:</label>
                    <select class="form-control" onchange="handleUserRoleFilter(this.value)">
                        <option value="all" ${state.userRoleFilter === 'all' ? 'selected' : ''}>Barcha foydalanuvchilar (${state.allUsers.length})</option>
                        <option value="Director" ${state.userRoleFilter === 'Director' ? 'selected' : ''}>👑 Direktorlar</option>
                        <option value="Teacher" ${state.userRoleFilter === 'Teacher' ? 'selected' : ''}>👩‍🏫 O'qituvchilar</option>
                        <option value="Student" ${state.userRoleFilter === 'Student' ? 'selected' : ''}>👨‍🎓 O'quvchilar</option>
                    </select>
                </div>
            </div>

            <table class="data-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>F.I.SH (Ism-Familiyasi)</th>
                        <th>Roli</th>
                        <th>Sinfi / Dars Beradigan Fani</th>
                        <th>Telefon Raqami</th>
                        <th>Tizim Logini</th>
                        <th>Paroli</th>
                        <th>Holati</th>
                        ${isDirector ? '<th>Amal (Tahrirlash)</th>' : ''}
                    </tr>
                </thead>
                <tbody>
                    ${filteredUsers.length === 0 ? `
                        <tr><td colspan="${isDirector ? 9 : 8}" style="text-align:center; color:#94a3b8; padding:24px;">Foydalanuvchilar topilmadi</td></tr>
                    ` : filteredUsers.map((u, idx) => {
                        let roleBadge = u.role === 'Director' ? '<span class="badge badge-5">👑 Direktor</span>' : (u.role === 'Teacher' ? '<span class="badge badge-4">👩‍🏫 O\'qituvchi</span>' : '<span class="badge badge-3">👨‍🎓 O\'quvchi</span>');
                        let statusBadge = u.status === 'Approved' ? '<span class="badge badge-approved">🟢 Tasdiqlangan</span>' : (u.status === 'Pending' ? '<span class="badge badge-pending">🟡 SMS Kutilmoqda</span>' : '<span class="badge badge-2">🔴 Rad etilgan</span>');
                        return `
                            <tr>
                                <td>${idx + 1}</td>
                                <td><strong>${u.fullName}</strong></td>
                                <td>${roleBadge}</td>
                                <td>${u.role === 'Teacher' ? u.subject : (u.role === 'Student' ? u.className : 'Administratsiya')}</td>
                                <td>${u.phone || '-'}</td>
                                <td><code>${u.username}</code></td>
                                <td><code>${u.password || '••••••'}</code></td>
                                <td>${statusBadge}</td>
                                ${isDirector ? `
                                    <td>
                                        <button class="btn btn-sm btn-primary" onclick="openEditAnyUserModal('${u.id}')">
                                            <i class="fa-solid fa-user-pen"></i> Tahrirlash
                                        </button>
                                    </td>
                                ` : ''}
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

window.openEditAnyUserModal = (userId) => {
    const user = state.allUsers.find(u => u.id === userId);
    if (!user) return;

    document.getElementById('edit-user-id').value = user.id;
    document.getElementById('edit-user-fullname').value = user.fullName;
    document.getElementById('edit-user-role').value = user.role;
    document.getElementById('edit-user-class-subject').value = user.role === 'Teacher' ? user.subject : user.className;
    document.getElementById('edit-user-phone').value = user.phone || '';
    document.getElementById('edit-user-username').value = user.username;
    document.getElementById('edit-user-password').value = user.password || '';

    openModal('modal-edit-any-user');
};

window.handleSaveAnyUser = async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-user-id').value;
    const fullName = document.getElementById('edit-user-fullname').value;
    const role = document.getElementById('edit-user-role').value;
    const classSubject = document.getElementById('edit-user-class-subject').value;
    const phone = document.getElementById('edit-user-phone').value;
    const username = document.getElementById('edit-user-username').value;
    const password = document.getElementById('edit-user-password').value;

    const className = role === 'Student' ? classSubject : '5-A';
    const subject = role === 'Teacher' ? classSubject : '';

    try {
        const res = await Api.updateAnyUser({ targetUserId: id, fullName, role, className, subject, phone, username, password });
        alert("✅ " + res.message);
        closeModal('modal-edit-any-user');
        await loadRoleData();
        renderPage();
    } catch (err) {
        alert(err.message);
    }
};

window.handleUserRoleFilter = (val) => {
    state.userRoleFilter = val;
    renderPage();
};

// ----------------------------------------------------
// TIMETABLE VIEW & DIRECTOR TIMETABLE EDITOR
// ----------------------------------------------------
async function renderTimetable(container) {
    state.timetable = await Api.getTimetable(state.selectedClass);
    const days = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];
    const classes = state.systemInfo?.classes || ["5-A", "5-B", "6-A", "7-A"];
    const isDirector = state.currentUser.role === 'Director';

    container.innerHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">📄 Haftalik Dars Jadvali</h1>
                <p class="page-subtitle">Sinf: <strong>${state.selectedClass}</strong> bo'yicha dars jadvali va xonalar</p>
            </div>
            <div style="display:flex; gap:10px;">
                <select class="form-control" onchange="handleClassChange(this.value)">
                    ${classes.map(c => `<option value="${c}" ${state.selectedClass === c ? 'selected' : ''}>${c} sinf</option>`).join('')}
                </select>
                ${isDirector ? `
                    <button class="btn btn-primary" onclick="openEditTimetableModal()">
                        <i class="fa-solid fa-calendar-plus"></i> Dars Biriktirish / Tahrirlash
                    </button>
                ` : ''}
                <button class="btn" style="background:#e2e8f0;" onclick="window.print()">
                    <i class="fa-solid fa-print"></i> Jadvalni Chop Etish
                </button>
            </div>
        </div>

        <div class="diary-grid">
            ${days.map(day => {
                const dayLessons = state.timetable.filter(t => t.dayOfWeek === day);
                return `
                    <div class="day-card">
                        <div class="day-header">
                            <span>${day.toUpperCase()}</span>
                            <span>${state.selectedClass} Sinf</span>
                        </div>
                        ${dayLessons.length === 0 ? `
                            <div style="padding:16px; color:#94a3b8; font-size:0.85rem; text-align:center;">Darslar biriktirilmagan</div>
                        ` : dayLessons.map(l => `
                            <div class="day-lesson">
                                <div class="lesson-info">
                                    <span class="lesson-name">${l.lessonNumber}. ${l.subject}</span>
                                    <span class="lesson-hw">${l.teacherName} | ${l.room}</span>
                                </div>
                                <span class="badge badge-4">${l.lessonNumber}-soat</span>
                            </div>
                        `).join('')}
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

window.openEditTimetableModal = () => {
    openModal('modal-edit-timetable');
};

window.handleSaveTimetable = async (e) => {
    e.preventDefault();
    const dayOfWeek = document.getElementById('tt-day').value;
    const lessonNumber = parseInt(document.getElementById('tt-lesson-num').value);
    const subject = document.getElementById('tt-subject').value;
    const teacherName = document.getElementById('tt-teacher-name').value || "O'qituvchi";
    const room = document.getElementById('tt-room').value || "201-xona";

    try {
        const res = await Api.saveTimetable({ className: state.selectedClass, dayOfWeek, lessonNumber, subject, teacherName, room });
        alert("✅ " + res.message);
        closeModal('modal-edit-timetable');
        await loadRoleData();
        renderPage();
    } catch (err) {
        alert(err.message);
    }
};

// ----------------------------------------------------
// STUDENT REMARKS VIEW
// ----------------------------------------------------
async function renderRemarks(container) {
    state.remarks = await Api.getRemarks(null, state.selectedClass);

    container.innerHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">💬 O'quvchilar Izohlari va Eslatmalari</h1>
                <p class="page-subtitle">O'quvchilarning odob-ahloqi, o'zlashtirishi hamda faolligi bo'yicha maxsus izohlar</p>
            </div>
            ${state.currentUser.role !== 'Student' ? `
                <button class="btn btn-primary" onclick="openModal('modal-add-remark')">
                    <i class="fa-solid fa-comment-medical"></i> Yangi Izoh Yozish
                </button>
            ` : ''}
        </div>

        <div class="table-card">
            <div class="table-toolbar">
                <strong style="font-size:1.05rem;"><i class="fa-solid fa-comments text-primary"></i> Saqlangan Eslatmalar va Izohlar Ro'yxati</strong>
            </div>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Sana va Vaqt</th>
                        <th>O'quvchi F.I.SH</th>
                        <th>Sinfi</th>
                        <th>Kategoriya</th>
                        <th>Izoh / Eslatma Matni</th>
                        <th>Qoldirgan O'qituvchi</th>
                    </tr>
                </thead>
                <tbody>
                    ${state.remarks.length === 0 ? `
                        <tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:24px;">Hozircha o'quvchilarga izohlar qoldirilmagan.</td></tr>
                    ` : state.remarks.map(r => `
                        <tr>
                            <td><code>${r.date}</code></td>
                            <td><strong>${r.studentName}</strong></td>
                            <td><span class="badge badge-4">${r.className}</span></td>
                            <td><span class="badge ${r.category === 'Tashakkurnoma' ? 'badge-5' : (r.category === 'Odob-ahloq' ? 'badge-3' : 'badge-4')}">${r.category}</span></td>
                            <td>${r.comment}</td>
                            <td><strong>${r.teacherName}</strong></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

window.handleSaveRemark = async (e) => {
    e.preventDefault();
    const studentId = state.students[0]?.id || "st-1";
    const category = document.getElementById('remark-category').value;
    const comment = document.getElementById('remark-comment').value;

    try {
        const res = await Api.saveRemark({ studentId, category, comment, teacherName: state.currentUser.fullName });
        alert("✅ " + res.message);
        closeModal('modal-add-remark');
        renderPage();
    } catch (err) {
        alert(err.message);
    }
};

// ----------------------------------------------------
// ANALYTICS DASHBOARD
// ----------------------------------------------------
async function renderAnalytics(container) {
    const ratings = await Api.getRatings();

    container.innerHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">📊 5-Maktab O'zlashtirish va Natijalar Analitikasi</h1>
                <p class="page-subtitle">O'quvchilarning 10 ballik tizimdagi a'lochilik va o'zlashtirish ko'rsatkichlari grafik analitikasi</p>
            </div>
            <button class="btn" style="background:#e2e8f0;" onclick="window.print()">
                <i class="fa-solid fa-print"></i> Analitikani Chop Etish
            </button>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon" style="background:#dcfce7; color:#16a34a;"><i class="fa-solid fa-award"></i></div>
                <div>
                    <div class="stat-val">10 Ballik Tizim</div>
                    <div class="stat-lbl">Maktab Standarti</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:#dbeafe; color:#2563eb;"><i class="fa-solid fa-star"></i></div>
                <div>
                    <div class="stat-val">9.2 / 10</div>
                    <div class="stat-lbl">Maktab O'rtacha Natijasi</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:#fef3c7; color:#d97706;"><i class="fa-solid fa-user-graduate"></i></div>
                <div>
                    <div class="stat-val">100%</div>
                    <div class="stat-lbl">Tizim Faolligi</div>
                </div>
            </div>
        </div>

        <div class="table-card" style="padding:24px;">
            <h3 style="font-size:1.1rem; margin-bottom:16px;"><i class="fa-solid fa-chart-line text-primary"></i> 10 Ballik Tizim Bo'yicha O'quvchilar Taqsimoti</h3>
            <div style="display:flex; flex-direction:column; gap:16px;">
                <div>
                    <div style="display:flex; justify-between; font-weight:600; font-size:0.9rem; margin-bottom:4px;">
                        <span>🌟 A'lochilar (9 - 10 ball)</span>
                        <span style="color:#16a34a;">85%</span>
                    </div>
                    <div style="height:12px; background:#e2e8f0; border-radius:6px; overflow:hidden;">
                        <div style="width:85%; height:100%; background:#10b981;"></div>
                    </div>
                </div>

                <div>
                    <div style="display:flex; justify-between; font-weight:600; font-size:0.9rem; margin-bottom:4px;">
                        <span>👍 Zarbdorlar (7 - 8 ball)</span>
                        <span style="color:#2563eb;">12%</span>
                    </div>
                    <div style="height:12px; background:#e2e8f0; border-radius:6px; overflow:hidden;">
                        <div style="width:12%; height:100%; background:#3b82f6;"></div>
                    </div>
                </div>

                <div>
                    <div style="display:flex; justify-between; font-weight:600; font-size:0.9rem; margin-bottom:4px;">
                        <span>👌 Qoniqarli (5 - 6 ball)</span>
                        <span style="color:#d97706;">3%</span>
                    </div>
                    <div style="height:12px; background:#e2e8f0; border-radius:6px; overflow:hidden;">
                        <div style="width:3%; height:100%; background:#f59e0b;"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ----------------------------------------------------
// DIRECTOR & OTHER VIEWS
// ----------------------------------------------------
async function renderDirectorDashboard(container) {
    const ratings = await Api.getRatings();
    const students = await Api.getStudents('all');
    const teachers = await Api.getTeachers();

    container.innerHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">5-Maktab Boshqaruv Paneli (Direktor)</h1>
                <p class="page-subtitle">Xush kelibsiz, ${state.currentUser.fullName}! Tizim loginingiz: <strong>${state.currentUser.username}</strong></p>
            </div>
            <div style="display:flex; gap:10px;">
                <button class="btn btn-primary" onclick="openAddClassModal()">
                    <i class="fa-solid fa-school-flag"></i> Yangi Sinf Qo'shish
                </button>
                <button class="btn" style="background:#e0f2fe; color:#0369a1;" onclick="openDirectorProfileModal()">
                    <i class="fa-solid fa-user-gear"></i> Profil Sozlamalari
                </button>
                <button class="btn" style="background:#fef3c7; color:#b45309;" onclick="state.currentNav='pending'; renderSidebar(); renderPage();">
                    <i class="fa-solid fa-envelope"></i> SMS Tasdiqlar (${state.pendingApprovals.length})
                </button>
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon" style="background:#dbeafe; color:#2563eb;"><i class="fa-solid fa-user-graduate"></i></div>
                <div>
                    <div class="stat-val">${students.length} nafar</div>
                    <div class="stat-lbl">Tasdiqlangan O'quvchilar</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:#dcfce7; color:#16a34a;"><i class="fa-solid fa-chalkboard-user"></i></div>
                <div>
                    <div class="stat-val">${teachers.length} nafar</div>
                    <div class="stat-lbl">O'qituvchilar Soni</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:#fee2e2; color:#dc2626;"><i class="fa-solid fa-bell"></i></div>
                <div>
                    <div class="stat-val">${state.pendingApprovals.length} ta</div>
                    <div class="stat-lbl">Kutayotgan SMS So'rovlar</div>
                </div>
            </div>
        </div>

        <div class="table-card">
            <div class="table-toolbar">
                <strong style="font-size:1.05rem;"><i class="fa-solid fa-chart-bar text-primary"></i> Sinflar Ko'rsatkichlari (${state.systemInfo?.classes?.length || 8} ta sinf)</strong>
            </div>
            <table class="data-table">
                <thead>
                    <tr><th>Sinf</th><th>O'quvchilar Soni</th><th>O'rtacha Baho (10 Ball)</th><th>Sababsiz Dars Qoldirishlar</th></tr>
                </thead>
                <tbody>
                    ${ratings.classStats.map(cs => `
                        <tr>
                            <td><strong>${cs.className} sinf</strong></td>
                            <td>${cs.studentCount} nafar</td>
                            <td><span class="badge badge-5">${cs.averageScore || '0.0'} ball</span></td>
                            <td><span class="badge ${cs.totalAbsences > 0 ? 'badge-2' : 'badge-5'}">${cs.totalAbsences} dars</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

async function renderPendingApprovals(container) {
    const data = await Api.getPendingApprovals();
    state.pendingApprovals = data.pendingUsers;
    state.smsNotifications = data.smsNotifications;

    container.innerHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">📱 SMS Bildirishnomalar va Tasdiqlar</h1>
                <p class="page-subtitle">Ro'yxatdan o'tgan foydalanuvchilarga yuborilgan SMS va Direktor tasdiqlash boshqaruvi</p>
            </div>
        </div>

        <div class="table-card" style="margin-bottom:24px;">
            <div class="table-toolbar" style="background:#fffbebf0;">
                <strong style="font-size:1.05rem; color:#b45309;"><i class="fa-solid fa-comment-sms"></i> Direktorga Kelgan SMS Bildirishnomalar</strong>
            </div>
            <div style="padding:16px;">
                ${state.smsNotifications.length === 0 ? '<div style="color:#94a3b8; text-align:center;">Kelgan SMS xabarlar yo\'q</div>' : state.smsNotifications.map(sms => `
                    <div style="background:#fefce8; border:1px solid #fef08a; padding:14px; border-radius:10px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <div style="font-weight:700; color:#854d0e;"><i class="fa-solid fa-mobile-screen"></i> SMS [${sms.recipientPhone}]</div>
                            <div style="font-size:0.9rem; color:#1e293b; margin-top:4px;">${sms.message}</div>
                        </div>
                        <div style="font-size:0.75rem; color:#a16207; font-weight:600;">${sms.createdAt}</div>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="table-card">
            <div class="table-toolbar">
                <strong style="font-size:1.05rem;"><i class="fa-solid fa-user-clock text-primary"></i> Tasdiqlanishi Kutilayotgan Foydalanuvchilar</strong>
            </div>
            <table class="data-table">
                <thead>
                    <tr><th>#</th><th>F.I.SH</th><th>Roli</th><th>Sinf / Fan</th><th>Telefon</th><th>Login</th><th>Amal (Tasdiqlash)</th></tr>
                </thead>
                <tbody>
                    ${state.pendingApprovals.length === 0 ? `
                        <tr><td colspan="7" style="text-align:center; color:#94a3b8; padding:24px;">Kutilayotgan so'rovlar yo'q</td></tr>
                    ` : state.pendingApprovals.map((u, idx) => `
                        <tr>
                            <td>${idx + 1}</td>
                            <td><strong>${u.fullName}</strong></td>
                            <td><span class="badge badge-4">${u.role === 'Teacher' ? "O'qituvchi" : "O'quvchi"}</span></td>
                            <td>${u.role === 'Teacher' ? u.subject : u.className}</td>
                            <td>${u.phone || '-'}</td>
                            <td><code>${u.username}</code></td>
                            <td>
                                <button class="btn btn-sm btn-primary" onclick="handleApproveUser('${u.id}', true)"><i class="fa-solid fa-check"></i> Tasdiqlash</button>
                                <button class="btn btn-sm btn-danger" onclick="handleApproveUser('${u.id}', false)"><i class="fa-solid fa-xmark"></i> Rad etish</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

async function renderTeacherCRUD(container) {
    state.teachers = await Api.getTeachers();

    container.innerHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">O'qituvchilarni Boshqarish</h1>
                <p class="page-subtitle">O'qituvchi qo'shish, ma'lumotlarini o'zgartirish va tizimdan o'chirish</p>
            </div>
            <button class="btn btn-primary" onclick="openTeacherModal()">
                <i class="fa-solid fa-plus-circle"></i> Yangi O'qituvchi Qo'shish
            </button>
        </div>

        <div class="table-card">
            <table class="data-table">
                <thead>
                    <tr><th>#</th><th>O'qituvchi F.I.SH</th><th>Fani</th><th>Biriktirilgan Sinflar</th><th>Telefon</th><th>Login</th><th>Parol</th><th>Amallar</th></tr>
                </thead>
                <tbody>
                    ${state.teachers.length === 0 ? `
                        <tr><td colspan="8" style="text-align:center; color:#94a3b8; padding:24px;">Hozircha o'qituvchilar qo'shilmagan. Yuqoridagi "O'qituvchi Qo'shish" tugmasini bosing.</td></tr>
                    ` : state.teachers.map((t, idx) => `
                        <tr>
                            <td>${idx + 1}</td>
                            <td><strong>${t.fullName}</strong></td>
                            <td><span class="badge badge-4">${t.subject}</span></td>
                            <td>${t.assignedClasses.map(c => `<span class="badge badge-5" style="margin-right:4px;">${c}</span>`).join('')}</td>
                            <td>${t.phone || '-'}</td>
                            <td><code>${t.username}</code></td>
                            <td><code>${t.password || '123'}</code></td>
                            <td>
                                <button class="btn btn-sm" style="background:#e0f2fe; color:#0369a1;" onclick="openEditAnyUserModal('${t.id}')"><i class="fa-solid fa-user-pen"></i> Tahrirlash</button>
                                <button class="btn btn-sm btn-danger" onclick="handleDeleteTeacher('${t.id}', '${t.fullName}')"><i class="fa-solid fa-trash"></i> O'chirish</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// TEACHER & STUDENT VIEWS
async function renderTeacherJournal(container) {
    const journalEntries = await Api.getJournal(state.selectedClass, state.selectedSubject);
    state.students = await Api.getStudents(state.selectedClass);
    const classes = state.systemInfo?.classes || ["5-A", "5-B", "6-A", "7-A"];

    container.innerHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">Elektron Kundalik Jurnali (10 Ballik Tizim)</h1>
                <p class="page-subtitle">Sinf va fan bo'yicha 1-10 ballik tizimda baholash hamda dars mavzusi va uy vazifalarini kiritish</p>
            </div>
            <div style="display:flex; gap:10px;">
                <button class="btn" style="background:#e2e8f0;" onclick="window.print()"><i class="fa-solid fa-print"></i> Jurnalni Chop Etish</button>
                <button class="btn btn-primary" onclick="openModal('modal-add-student')"><i class="fa-solid fa-user-plus"></i> O'quvchi Qo'shish</button>
            </div>
        </div>

        <div class="table-card">
            <div class="table-toolbar">
                <div class="filter-group">
                    <label style="font-weight:600;">Sinf:</label>
                    <select class="form-control" onchange="handleClassChange(this.value)">
                        ${classes.map(c => `<option value="${c}" ${state.selectedClass === c ? 'selected' : ''}>${c} sinf</option>`).join('')}
                    </select>

                    <label style="font-weight:600; margin-left:12px;">Fan:</label>
                    <select class="form-control" onchange="handleSubjectChange(this.value)">
                        <option value="Matematika" ${state.selectedSubject === 'Matematika' ? 'selected' : ''}>Matematika</option>
                        <option value="Ingliz tili" ${state.selectedSubject === 'Ingliz tili' ? 'selected' : ''}>Ingliz tili</option>
                        <option value="Fizika" ${state.selectedSubject === 'Fizika' ? 'selected' : ''}>Fizika</option>
                    </select>
                </div>
            </div>

            <table class="data-table">
                <thead>
                    <tr><th>#</th><th>O'quvchi F.I.SH</th><th>So'nggi Baho (1-10)</th><th>So'nggi Mavzu va Uy Vazifasi</th><th>Amallar</th></tr>
                </thead>
                <tbody>
                    ${state.students.length === 0 ? `
                        <tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:24px;">Ushbu sinfda hozircha o'quvchilar qo'shilmagan. Yuqoridagi "O'quvchi Qo'shish" tugmasini bosing.</td></tr>
                    ` : state.students.map((st, idx) => {
                        const lastEntry = journalEntries.find(j => j.studentId === st.id);
                        return `
                            <tr>
                                <td>${idx + 1}</td>
                                <td><strong>${st.fullName}</strong></td>
                                <td>
                                    ${lastEntry ? `<span class="badge badge-5" style="font-size:0.9rem;">${lastEntry.grade} ball</span>` : '<span style="color:#94a3b8;">Baholanmagan</span>'}
                                </td>
                                <td>
                                    ${lastEntry ? `
                                        <div><strong>Mavzu:</strong> ${lastEntry.topic || '-'}</div>
                                        <div style="font-size:0.8rem; color:#64748b;"><strong>Uyga:</strong> ${lastEntry.homework || '-'}</div>
                                    ` : '<span style="color:#94a3b8;">-</span>'}
                                </td>
                                <td>
                                    <button class="btn btn-sm btn-primary" onclick="openGradeModal('${st.id}', '${st.fullName}')">
                                        <i class="fa-solid fa-pen"></i> Baholash (10 ball)
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

async function renderTeacherBsbChsb(container) {
    const bsbEntries = await Api.getBsbChsb(state.selectedClass, state.selectedSubject);
    state.students = await Api.getStudents(state.selectedClass);

    container.innerHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">BSB (max 50 ball) va CHSB (max 40 ball)</h1>
                <p class="page-subtitle">Bo'lim Summativ Baholash (max 50) va Choraklik Summativ Baholash (max 40)</p>
            </div>
        </div>

        <div class="table-card">
            <table class="data-table">
                <thead>
                    <tr><th>#</th><th>O'quvchi F.I.SH</th><th>BSB 1 (max 50)</th><th>BSB 2 (max 50)</th><th>CHSB (max 40)</th><th>Umumiy Foiz (%)</th><th>Chorak Bahosi (10 ballik)</th><th>Amallar</th></tr>
                </thead>
                <tbody>
                    ${state.students.length === 0 ? `
                        <tr><td colspan="8" style="text-align:center; color:#94a3b8; padding:24px;">Hozircha o'quvchilar qo'shilmagan</td></tr>
                    ` : state.students.map((st, idx) => {
                        const entry = bsbEntries.find(b => b.studentId === st.id);
                        return `
                            <tr>
                                <td>${idx + 1}</td>
                                <td><strong>${st.fullName}</strong></td>
                                <td>${entry ? entry.bsb1Score + ' / 50' : '-'}</td>
                                <td>${entry ? entry.bsb2Score + ' / 50' : '-'}</td>
                                <td>${entry ? entry.chsbScore + ' / 40' : '-'}</td>
                                <td><strong>${entry ? entry.totalScore + '%' : '-'}</strong></td>
                                <td>${entry ? `<span class="badge badge-5" style="font-size:0.9rem;">${entry.termGrade} ball</span>` : '-'}</td>
                                <td>
                                    <button class="btn btn-sm btn-primary" onclick="openBsbModal('${st.id}', '${st.fullName}', ${entry?.bsb1Score || 0}, ${entry?.bsb2Score || 0}, ${entry?.chsbScore || 0})">
                                        <i class="fa-solid fa-plus-circle"></i> Ball Kiritish
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

async function renderTeacherAttendance(container) {
    const today = new Date().toISOString().split('T')[0];
    const attendanceRecords = await Api.getAttendance(state.selectedClass, today);
    state.students = await Api.getStudents(state.selectedClass);

    container.innerHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">Kunlik Davomat Belgilash (${today})</h1>
                <p class="page-subtitle">Sinf o'quvchilarining darsga qatnashishi</p>
            </div>
        </div>

        <div class="table-card">
            <table class="data-table">
                <thead>
                    <tr><th>#</th><th>O'quvchi F.I.SH</th><th>Davomat Holati</th><th>Belgilash</th></tr>
                </thead>
                <tbody>
                    ${state.students.length === 0 ? `
                        <tr><td colspan="4" style="text-align:center; color:#94a3b8; padding:24px;">Hozircha o'quvchilar qo'shilmagan</td></tr>
                    ` : state.students.map((st, idx) => {
                        const rec = attendanceRecords.find(a => a.studentId === st.id);
                        const status = rec ? rec.status : 'Present';
                        return `
                            <tr>
                                <td>${idx + 1}</td>
                                <td><strong>${st.fullName}</strong></td>
                                <td><span class="badge badge-${status.toLowerCase()}">${status === 'Present' ? 'Kelgan' : (status === 'Sababli' ? 'Sababli' : 'Sababsiz')}</span></td>
                                <td>
                                    <button class="btn btn-sm ${status === 'Present' ? 'btn-primary' : ''}" style="background:#dcfce7; color:#15803d;" onclick="handleSetAttendance('${st.id}', 'Present')">Kelgan</button>
                                    <button class="btn btn-sm" style="background:#fef3c7; color:#b45309;" onclick="handleSetAttendance('${st.id}', 'Sababli')">Sababli</button>
                                    <button class="btn btn-sm" style="background:#fee2e2; color:#b91c1c;" onclick="handleSetAttendance('${st.id}', 'Sababsiz')">Sababsiz</button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

async function renderStudentDiary(container) {
    const student = state.students[0] || { fullName: state.currentUser.fullName, className: "5-A" };

    container.innerHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">Mening Kundalik Daftarim</h1>
                <p class="page-subtitle">Haftalik dars jadvali, 10 ballik baholar va uy vazifalari</p>
            </div>
            <span class="badge badge-5" style="font-size:0.95rem; padding:8px 16px;">O'rtacha Bahoyim: ${student.averageScore || '9.0'}</span>
        </div>

        <div class="diary-grid">
            <div class="day-card">
                <div class="day-header"><span>DUSHANBA</span><span>1-Chorak</span></div>
                <div class="day-lesson">
                    <div class="lesson-info"><span class="lesson-name">1. Matematika</span><span class="lesson-hw">Uyga: 142-145 misollar</span></div>
                    <span class="badge badge-5">10 ball</span>
                </div>
            </div>
        </div>
    `;
}

async function renderStudentGrades(container) {
    const student = state.students[0] || {};
    const bsbEntries = await Api.getBsbChsb(student.className, null, student.id);

    container.innerHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">Fanlar bo'yicha BSB (50), CHSB (40) va Baholarim</h1>
                <p class="page-subtitle">Barcha fanlar kesimidagi natijalar</p>
            </div>
        </div>

        <div class="table-card">
            <table class="data-table">
                <thead>
                    <tr><th>Fan Nomi</th><th>BSB 1 Ball (max 50)</th><th>BSB 2 Ball (max 50)</th><th>CHSB Ball (max 40)</th><th>Umumiy Foiz</th><th>Chorak Bahosi (10 ball)</th></tr>
                </thead>
                <tbody>
                    ${bsbEntries.length === 0 ? `
                        <tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:24px;">Hozircha baholar yo'q</td></tr>
                    ` : bsbEntries.map(b => `
                        <tr>
                            <td><strong>${b.subject}</strong></td>
                            <td>${b.bsb1Score} / 50</td>
                            <td>${b.bsb2Score} / 50</td>
                            <td>${b.chsbScore} / 40</td>
                            <td><strong>${b.totalScore}%</strong></td>
                            <td><span class="badge badge-5">${b.termGrade} ball</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

async function renderStudentAttendance(container) {
    container.innerHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">Mening Davomat Statistikam</h1>
                <p class="page-subtitle">Darsga qatnashish ko'rsatkichi</p>
            </div>
        </div>
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-icon" style="background:#dcfce7; color:#16a34a;"><i class="fa-solid fa-circle-check"></i></div><div><div class="stat-val">100%</div><div class="stat-lbl">Qatnashish Darajasi</div></div></div>
            <div class="stat-card"><div class="stat-icon" style="background:#fee2e2; color:#dc2626;"><i class="fa-solid fa-circle-xmark"></i></div><div><div class="stat-val">0 dars</div><div class="stat-lbl">Sababsiz Qolgan</div></div></div>
        </div>
    `;
}

async function renderStudentLeaderboard(container) {
    await renderRatingsPage(container);
}

async function renderStudentManagement(container) {
    state.students = await Api.getStudents(state.selectedClass);
    const isDirector = state.currentUser.role === 'Director';
    const classes = state.systemInfo?.classes || ["5-A", "5-B", "6-A", "7-A"];

    container.innerHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">O'quvchilar Boshqaruvi va Login/Parol</h1>
                <p class="page-subtitle">O'quvchilarni qo'shish, tahrirlash va login/parolni o'zgartirish</p>
            </div>
            <button class="btn btn-primary" onclick="openModal('modal-add-student')">
                <i class="fa-solid fa-user-plus"></i> Yangi O'quvchi Qo'shish
            </button>
        </div>

        <div class="table-card">
            <div class="table-toolbar">
                <div class="filter-group">
                    <label style="font-weight:600;">Sinf:</label>
                    <select class="form-control" onchange="handleClassChange(this.value)">
                        <option value="all" ${state.selectedClass === 'all' ? 'selected' : ''}>Barcha sinflar</option>
                        ${classes.map(c => `<option value="${c}" ${state.selectedClass === c ? 'selected' : ''}>${c} sinf</option>`).join('')}
                    </select>
                </div>
            </div>
            <table class="data-table">
                <thead>
                    <tr><th>#</th><th>O'quvchi F.I.SH</th><th>Sinf</th><th>Login</th><th>Parol</th><th>Ota-ona Telefoni</th><th>O'rtacha Baho</th><th>Amallar</th></tr>
                </thead>
                <tbody>
                    ${state.students.length === 0 ? `
                        <tr><td colspan="8" style="text-align:center; color:#94a3b8; padding:24px;">Ushbu sinfda o'quvchilar yo'q. Yangi o'quvchi qo'shish tugmasini bosing.</td></tr>
                    ` : state.students.map((s, idx) => `
                        <tr>
                            <td>${idx + 1}</td>
                            <td><strong>${s.fullName}</strong></td>
                            <td><span class="badge badge-4">${s.className}</span></td>
                            <td><code>${s.username}</code></td>
                            <td><code>${s.password}</code></td>
                            <td>${s.parentPhone || '-'}</td>
                            <td><span class="badge badge-5">${s.averageScore} ball</span></td>
                            <td>
                                ${isDirector ? `
                                    <button class="btn btn-sm btn-primary" onclick="openEditAnyUserModal('${s.id}')"><i class="fa-solid fa-user-pen"></i> Tahrirlash</button>
                                ` : `
                                    <button class="btn btn-sm" style="background:#e0f2fe; color:#0369a1;" onclick="openChangePasswordModal('${s.id}', '${s.fullName}', '${s.username}')"><i class="fa-solid fa-key"></i> Parol</button>
                                `}
                                <button class="btn btn-sm btn-danger" onclick="handleDeleteStudent('${s.id}', '${s.fullName}')"><i class="fa-solid fa-trash"></i> O'chirish</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

async function renderRatingsPage(container) {
    const ratings = await Api.getRatings();

    container.innerHTML = `
        <div class="page-header">
            <div>
                <h1 class="page-title">🏆 5-Maktab A'lochilar va Reyting Leaderboard</h1>
                <p class="page-subtitle">Maktab bo'yicha umumiy reyting va ko'rsatkichlar (10 Ballik Tizim)</p>
            </div>
        </div>

        <div class="table-card">
            <table class="data-table">
                <thead>
                    <tr><th>O'rin</th><th>O'quvchi F.I.SH</th><th>Sinfi</th><th>O'rtacha Bahosi (10 ball)</th><th>Sinfdagi O'rni</th></tr>
                </thead>
                <tbody>
                    ${ratings.leaderboard.length === 0 ? `
                        <tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:24px;">Hozircha o'quvchilar qo'shilmagan</td></tr>
                    ` : ratings.leaderboard.map(st => `
                        <tr>
                            <td><div class="rank-badge rank-${st.schoolRank <= 3 ? st.schoolRank : 'other'}">${st.schoolRank}</div></td>
                            <td><strong>${st.fullName}</strong></td>
                            <td><span class="badge badge-4">${st.className}</span></td>
                            <td><span class="badge badge-5">${st.averageScore} ball</span></td>
                            <td>${st.classRank}-o'rin</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ----------------------------------------------------
// HANDLERS
// ----------------------------------------------------
window.openModal = (id) => document.getElementById(id).classList.add('active');
window.closeModal = (id) => document.getElementById(id).classList.remove('active');

window.handleClassChange = async (cls) => {
    state.selectedClass = cls;
    state.students = await Api.getStudents(cls);
    renderPage();
};

window.handleSubjectChange = (sbj) => {
    state.selectedSubject = sbj;
    renderPage();
};

window.handleApproveUser = async (userId, approve) => {
    try {
        const res = await Api.approveUser(userId, approve);
        alert(res.message);
        await loadRoleData();
        renderSidebar();
        renderPage();
    } catch (err) {
        alert(err.message);
    }
};

window.openTeacherModal = (teacherId = null) => {
    const title = document.getElementById('modal-teacher-title');
    if (teacherId) {
        title.innerHTML = `<i class="fa-solid fa-pen-to-square text-primary"></i> O'qituvchi Ma'lumotlarini O'zgartirish`;
        const t = state.teachers.find(x => x.id === teacherId);
        if (t) {
            document.getElementById('tch-id').value = t.id;
            document.getElementById('tch-fullname').value = t.fullName;
            document.getElementById('tch-subject').value = t.subject;
            document.getElementById('tch-phone').value = t.phone || '';
            document.getElementById('tch-classes').value = t.assignedClasses.join(', ');
            document.getElementById('tch-username').value = t.username;
            document.getElementById('tch-password').value = t.password || '123';
        }
    } else {
        title.innerHTML = `<i class="fa-solid fa-chalkboard-user text-primary"></i> Yangi O'qituvchi Qo'shish`;
        document.getElementById('tch-id').value = '';
        document.getElementById('form-teacher').reset();
    }
    openModal('modal-teacher');
};

window.handleSaveTeacher = async (e) => {
    e.preventDefault();
    const id = document.getElementById('tch-id').value;
    const fullName = document.getElementById('tch-fullname').value;
    const subject = document.getElementById('tch-subject').value;
    const phone = document.getElementById('tch-phone').value;
    const classesStr = document.getElementById('tch-classes').value;
    const assignedClasses = classesStr.split(',').map(c => c.trim()).filter(c => c);
    const username = document.getElementById('tch-username').value;
    const password = document.getElementById('tch-password').value;

    try {
        if (id) {
            await Api.updateTeacher(id, { fullName, subject, assignedClasses, phone, username, password });
            alert("O'qituvchi ma'lumotlari yangilandi!");
        } else {
            await Api.addTeacher({ fullName, subject, assignedClasses, phone, username, password });
            alert("Yangi o'qituvchi qo'shildi!");
        }
        closeModal('modal-teacher');
        await loadRoleData();
        renderPage();
    } catch (err) {
        alert(err.message);
    }
};

window.handleDeleteTeacher = async (id, name) => {
    if (confirm(`${name} ismli o'qituvchini o'chirishni tasdiqlaysizmi?`)) {
        try {
            await Api.deleteTeacher(id);
            alert("O'qituvchi o'chirildi.");
            await loadRoleData();
            renderPage();
        } catch (err) {
            alert(err.message);
        }
    }
};

window.handleAddStudent = async (e) => {
    e.preventDefault();
    const name = document.getElementById('add-st-name').value;
    const cls = document.getElementById('add-st-class').value;
    const phone = document.getElementById('add-st-phone').value;
    const username = document.getElementById('add-st-username').value;
    const password = document.getElementById('add-st-password').value;

    try {
        await Api.addStudent({ fullName: name, className: cls, parentPhone: phone, username, password });
        alert("O'quvchi muvaffaqiyatli qo'shildi!");
        closeModal('modal-add-student');
        await loadRoleData();
        renderPage();
    } catch (err) {
        alert(err.message);
    }
};

window.openChangePasswordModal = (id, name, username) => {
    document.getElementById('change-pwd-st-id').value = id;
    document.getElementById('change-pwd-st-name').value = name;
    document.getElementById('change-pwd-username').value = username;
    document.getElementById('change-pwd-password').value = "123456";
    openModal('modal-change-password');
};

window.handleChangePassword = async (e) => {
    e.preventDefault();
    const id = document.getElementById('change-pwd-st-id').value;
    const newUsername = document.getElementById('change-pwd-username').value;
    const newPassword = document.getElementById('change-pwd-password').value;

    try {
        await Api.changeStudentPassword(id, newUsername, newPassword);
        alert("O'quvchining login va paroli o'zgartirildi!");
        closeModal('modal-change-password');
        await loadRoleData();
        renderPage();
    } catch (err) {
        alert(err.message);
    }
};

window.handleDeleteStudent = async (id, name) => {
    if (confirm(`${name} ismli o'quvchini o'chirishni tasdiqlaysizmi?`)) {
        try {
            await Api.deleteStudent(id);
            alert("O'quvchi o'chirildi.");
            await loadRoleData();
            renderPage();
        } catch (err) {
            alert(err.message);
        }
    }
};

window.openGradeModal = (id, name) => {
    document.getElementById('grade-student-id').value = id;
    document.getElementById('grade-student-name').value = name;
    document.getElementById('grade-date').value = new Date().toISOString().split('T')[0];
    openModal('modal-save-grade');
};

window.handleSaveGrade = async (e) => {
    e.preventDefault();
    const studentId = document.getElementById('grade-student-id').value;
    const grade = document.getElementById('grade-val').value;
    const date = document.getElementById('grade-date').value;
    const topic = document.getElementById('grade-topic').value;
    const homework = document.getElementById('grade-homework').value;

    try {
        await Api.saveGrade({ studentId, className: state.selectedClass, subject: state.selectedSubject, date, grade, topic, homework });
        alert("Baho (10 ballik) saqlandi!");
        closeModal('modal-save-grade');
        renderPage();
    } catch (err) {
        alert(err.message);
    }
};

window.openBsbModal = (id, name, bsb1, bsb2, chsb) => {
    document.getElementById('bsb-student-id').value = id;
    document.getElementById('bsb-student-name').value = name;
    document.getElementById('bsb1-score').value = bsb1 || 45;
    document.getElementById('bsb2-score').value = bsb2 || 48;
    document.getElementById('chsb-score').value = chsb || 36;
    openModal('modal-save-bsb');
};

window.handleSaveBsb = async (e) => {
    e.preventDefault();
    const studentId = document.getElementById('bsb-student-id').value;
    const bsb1Score = parseInt(document.getElementById('bsb1-score').value) || 0;
    const bsb2Score = parseInt(document.getElementById('bsb2-score').value) || 0;
    const chsbScore = parseInt(document.getElementById('chsb-score').value) || 0;

    try {
        await Api.saveBsbChsb({ studentId, className: state.selectedClass, subject: state.selectedSubject, term: state.selectedTerm, bsb1Score, bsb2Score, chsbScore });
        alert("BSB (max 50) va CHSB (max 40) ballari saqlandi!");
        closeModal('modal-save-bsb');
        renderPage();
    } catch (err) {
        alert(err.message);
    }
};

window.handleSetAttendance = async (studentId, status) => {
    const today = new Date().toISOString().split('T')[0];
    try {
        await Api.saveAttendance({ studentId, className: state.selectedClass, subject: state.selectedSubject, date: today, status });
        renderPage();
    } catch (err) {
        alert(err.message);
    }
};
