// 5-MAKTAB REST API CLIENT MODULE WITH HYBRID LOCALSTORAGE FALLBACK ENGINE

const API_BASE = '';

// Default Mock Data for LocalStorage Fallback (matches C# MaktabDataStore)
const DEFAULT_MOCK_DATA = {
    users: [
        {
            id: "dir-1",
            username: "direktor",
            password: "direktor5maktab",
            role: "Director",
            fullName: "Karimov Shavkat Ravshanovich (Maktab Direktori)",
            className: "Barcha sinflar",
            subject: "Barcha fanlar",
            phone: "+998 90 555 55 55",
            status: "Approved"
        },
        {
            id: "tch-1",
            username: "ustoz1",
            password: "123",
            role: "Teacher",
            fullName: "Sobirova Dilnoza Alimovna",
            className: "5-A",
            subject: "Matematika",
            phone: "+998 91 123 45 67",
            status: "Approved"
        },
        {
            id: "std-1",
            username: "oqituvchi1",
            password: "123",
            role: "Student",
            fullName: "Aliyev Jasur",
            className: "5-A",
            subject: "Matematika",
            phone: "+998 93 987 65 43",
            status: "Approved"
        }
    ],
    availableClasses: ["5-A", "5-B", "6-A", "7-A", "8-A", "9-A", "10-A", "11-A"],
    classSubjects: {
        "5-A": ["Matematika", "O'zbek tili", "Adabiyot", "Ingliz tili", "Tarix", "Informatika", "Jismoniy tarbiya", "Tasviriy san'at"],
        "5-B": ["Matematika", "O'zbek tili", "Adabiyot", "Ingliz tili", "Tarix", "Informatika", "Jismoniy tarbiya", "Tasviriy san'at"],
        "6-A": ["Matematika", "O'zbek tili", "Adabiyot", "Ingliz tili", "Tarix", "Informatika", "Biologiya", "Geografiya"],
        "7-A": ["Algebra", "Geometriya", "Fizika", "Biologiya", "O'zbek tili", "Adabiyot", "Ingliz tili", "Tarix", "Informatika"],
        "8-A": ["Algebra", "Geometriya", "Fizika", "Kimyo", "Biologiya", "O'zbek tili", "Adabiyot", "Ingliz tili", "Tarix"],
        "9-A": ["Algebra", "Geometriya", "Fizika", "Kimyo", "Biologiya", "O'zbekiston tarixi", "Jahon tarixi", "Ingliz tili", "Informatika"],
        "10-A": ["Algebra", "Geometriya", "Fizika", "Kimyo", "Biologiya", "Huquq", "Ingliz tili", "Informatika", "O'zbekiston tarixi"],
        "11-A": ["Algebra", "Geometriya", "Fizika", "Kimyo", "Biologiya", "Huquq", "Ingliz tili", "Informatika", "O'zbekiston tarixi"]
    },
    students: [
        {
            id: "std-1",
            fullName: "Aliyev Jasur",
            className: "5-A",
            rollNumber: 1,
            username: "oqituvchi1",
            password: "123",
            parentPhone: "+998 93 987 65 43",
            averageScore: 9.5,
            schoolRank: 1,
            classRank: 1,
            status: "Approved"
        },
        {
            id: "std-2",
            fullName: "Valiyeva Madina",
            className: "5-A",
            rollNumber: 2,
            username: "madina",
            password: "123",
            parentPhone: "+998 94 111 22 33",
            averageScore: 9.0,
            schoolRank: 2,
            classRank: 2,
            status: "Approved"
        }
    ],
    teachers: [
        {
            id: "tch-1",
            fullName: "Sobirova Dilnoza Alimovna",
            subject: "Matematika",
            assignedClasses: ["5-A", "5-B"],
            phone: "+998 91 123 45 67",
            username: "ustoz1",
            password: "123",
            status: "Approved"
        }
    ],
    journalEntries: [
        {
            studentId: "std-1",
            studentName: "Aliyev Jasur",
            className: "5-A",
            subject: "Matematika",
            date: new Date().toISOString().split('T')[0],
            grade: "5",
            homework: "12-mashq",
            topic: "Kasrlar ustida amallar",
            teacherName: "Sobirova Dilnoza"
        }
    ],
    bsbChsbEntries: [],
    attendanceRecords: [],
    smsNotifications: [],
    timetableEntries: (function() {
        const days = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];
        const subjects5A = ["Matematika", "O'zbek tili", "Ingliz tili", "Informatika", "Tarix", "Jismoniy tarbiya"];
        const entries = [];
        days.forEach(day => {
            for (let i = 1; i <= 5; i++) {
                entries.push({
                    className: "5-A",
                    dayOfWeek: day,
                    lessonNumber: i,
                    subject: subjects5A[(i - 1) % subjects5A.Length || (i-1)%subjects5A.length],
                    teacherName: "O'qituvchi",
                    room: `${100 + i}-xona`
                });
            }
        });
        return entries;
    })(),
    studentRemarks: []
};

// Initialize LocalStorage Data Store if empty
function getLocalStore() {
    let data = localStorage.getItem('maktab_data_store_v1');
    if (!data) {
        localStorage.setItem('maktab_data_store_v1', JSON.stringify(DEFAULT_MOCK_DATA));
        return JSON.parse(JSON.stringify(DEFAULT_MOCK_DATA));
    }
    return JSON.parse(data);
}

function saveLocalStore(store) {
    localStorage.setItem('maktab_data_store_v1', JSON.stringify(store));
}

function recalculateLocalRanks(store) {
    const approved = store.students.filter(s => s.status === 'Approved');
    approved.sort((a, b) => b.averageScore - a.averageScore);
    approved.forEach((s, idx) => { s.schoolRank = idx + 1; });

    const classes = [...new Set(approved.map(s => s.className))];
    classes.forEach(cls => {
        const classStudents = approved.filter(s => s.className === cls);
        classStudents.sort((a, b) => b.averageScore - a.averageScore);
        classStudents.forEach((s, idx) => { s.classRank = idx + 1; });
    });
}

function handleMockApi(endpoint, options = {}) {
    console.log(`[LocalStorage Demo Engine] Handling API call: ${options.method || 'GET'} ${endpoint}`);
    const store = getLocalStore();
    const urlParts = endpoint.split('?');
    const path = urlParts[0];
    const queryParams = new URLSearchParams(urlParts[1] || '');

    const method = (options.method || 'GET').toUpperCase();
    const body = options.body ? JSON.parse(options.body) : {};

    // 1. GET /api/init
    if (path === '/api/init' && method === 'GET') {
        const approvedStudents = store.students.filter(s => s.status === 'Approved');
        const approvedTeachers = store.teachers.filter(t => t.status === 'Approved');
        const pendingUsers = store.users.filter(u => u.status === 'Pending');

        return Promise.resolve({
            schoolName: "5-sonli Umumta'lim Maktabi",
            classes: store.availableClasses,
            classSubjects: store.classSubjects,
            studentsCount: approvedStudents.length,
            teachersCount: approvedTeachers.length,
            pendingCount: pendingUsers.length
        });
    }

    // 2. POST /api/classes
    if (path === '/api/classes' && method === 'POST') {
        const { gradeNumber, classLetter } = body;
        if (gradeNumber < 1 || gradeNumber > 11) {
            return Promise.reject(new Error("❌ Sinf raqami 1 va 11 orasida bo'lishi shart! (Masalan: 1-11)"));
        }
        if (!classLetter || !classLetter.trim()) {
            return Promise.reject(new Error("❌ Sinf harfini kiritishingiz shart! (Masalan: A, B, V)"));
        }
        const className = `${gradeNumber}-${classLetter.trim().toUpperCase()}`;
        if (store.availableClasses.includes(className)) {
            return Promise.reject(new Error(`❌ ${className} sinfi tizimda allaqachon mavjud!`));
        }

        store.availableClasses.push(className);
        store.classSubjects[className] = ["Matematika", "O'zbek tili", "Adabiyot", "Ingliz tili", "Tarix", "Informatika", "Fizika"];
        saveLocalStore(store);

        return Promise.resolve({
            message: `✅ ${className} sinfi muvaffaqiyatli yaratildi va tizimga qo'shildi!`,
            className,
            availableClasses: store.availableClasses
        });
    }

    // 3. POST /api/auth/login
    if (path === '/api/auth/login' && method === 'POST') {
        const { username, password } = body;
        const user = store.users.find(u => u.username.toLowerCase() === (username || '').toLowerCase() && u.password === password);
        if (!user) {
            return Promise.reject(new Error("Login yoki parol noto'g'ri kiritildi!"));
        }
        if (user.status === 'Pending') {
            return Promise.reject(new Error("Sizning ro'yxatdan o'tish so'rovingiz Direktorga SMS orqali yuborilgan. Tasdiqlanishini kuting!"));
        }
        if (user.status === 'Rejected') {
            return Promise.reject(new Error("Sizning ro'yxatdan o'tish so'rovingiz Direktor tomonidan rad etilgan!"));
        }
        return Promise.resolve({
            message: "Xush kelibsiz!",
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                fullName: user.fullName,
                className: user.className,
                subject: user.subject,
                status: user.status
            }
        });
    }

    // 4. POST /api/auth/register
    if (path === '/api/auth/register' && method === 'POST') {
        const { fullName, role, className, subject, phone, username, password } = body;
        if (!fullName || !username || !password) {
            return Promise.reject(new Error("Barcha majburiy maydonlarni to'ldiring!"));
        }
        const existing = store.users.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (existing) {
            return Promise.reject(new Error("Ushbu login tizimda allaqachon mavjud!"));
        }

        const newUser = {
            id: "user-" + Date.now(),
            fullName,
            role,
            className: className || "5-A",
            subject: subject || "Matematika",
            phone: phone || "",
            username,
            password,
            status: "Pending"
        };
        store.users.push(newUser);

        if (role === 'Teacher') {
            store.teachers.push({
                id: newUser.id,
                fullName: newUser.fullName,
                subject: newUser.subject,
                assignedClasses: [newUser.className],
                phone: newUser.phone,
                username: newUser.username,
                password: newUser.password,
                status: "Pending"
            });
        } else {
            const classStudents = store.students.filter(s => s.className === newUser.className);
            store.students.push({
                id: newUser.id,
                fullName: newUser.fullName,
                className: newUser.className,
                rollNumber: classStudents.length + 1,
                username: newUser.username,
                password: newUser.password,
                parentPhone: newUser.phone,
                averageScore: 9.0,
                schoolRank: 0,
                classRank: 0,
                status: "Pending"
            });
        }

        const sms = {
            id: "sms-" + Date.now(),
            recipientPhone: "+998 90 555 55 55",
            message: `📱 SMS Bildirishnoma (Direktorga): Yangi ro'yxatdan o'tish: ${newUser.fullName}, Rol: ${newUser.role}, Tel: ${newUser.phone}. Tasdiqlashingiz kutilmoqda.`,
            pendingUserId: newUser.id,
            createdAt: new Date().toISOString()
        };
        store.smsNotifications.push(sms);
        saveLocalStore(store);

        return Promise.resolve({
            message: "Ro'yxatdan o'tish so'rovi yuborildi! Direktorga SMS xabar yuborildi. Direktor tasdiqlagach, tizimga kirishingiz mumkin bo'ladi.",
            smsSent: sms
        });
    }

    // 5. GET /api/users/all
    if (path === '/api/users/all' && method === 'GET') {
        return Promise.resolve(store.users);
    }

    // 6. PUT /api/admin/users/update
    if (path === '/api/admin/users/update' && method === 'PUT') {
        const { targetUserId, username, fullName, password, role, className, subject, phone } = body;
        const user = store.users.find(u => u.id === targetUserId);
        if (!user) return Promise.reject(new Error("Foydalanuvchi topilmadi!"));

        if (username && username.toLowerCase() !== user.username.toLowerCase()) {
            const existing = store.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.id !== targetUserId);
            if (existing) return Promise.reject(new Error("Ushbu login tizimda allaqachon band!"));
            user.username = username;
        }

        if (fullName) user.fullName = fullName;
        if (password) user.password = password;
        if (role) user.role = role;
        if (className) user.className = className;
        if (subject) user.subject = subject;
        if (phone) user.phone = phone;

        const teacher = store.teachers.find(t => t.id === targetUserId);
        if (teacher) {
            teacher.fullName = user.fullName;
            teacher.subject = user.subject;
            teacher.phone = user.phone;
            teacher.username = user.username;
            teacher.password = user.password;
        }

        const student = store.students.find(s => s.id === targetUserId);
        if (student) {
            student.fullName = user.fullName;
            student.className = user.className;
            student.parentPhone = user.phone;
            student.username = user.username;
            student.password = user.password;
            recalculateLocalRanks(store);
        }

        saveLocalStore(store);
        return Promise.resolve({
            message: `${user.fullName} foydalanuvchi ma'lumotlari muvaffaqiyatli yangilandi!`,
            user
        });
    }

    // 7. PUT /api/director/profile
    if (path === '/api/director/profile' && method === 'PUT') {
        const { userId, username, fullName, password } = body;
        const director = store.users.find(u => u.role === 'Director' && u.id === userId);
        if (!director) return Promise.reject(new Error("Direktor akkounti topilmadi!"));

        if (username && username.toLowerCase() !== director.username.toLowerCase()) {
            const existing = store.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.id !== userId);
            if (existing) return Promise.reject(new Error("Ushbu login tizimda band!"));
            director.username = username;
        }

        if (fullName) director.fullName = fullName;
        if (password) director.password = password;

        saveLocalStore(store);
        return Promise.resolve({
            message: "Direktor profil ma'lumotlari (Ism, Login va Parol) muvaffaqiyatli yangilandi!",
            user: director
        });
    }

    // 8. GET /api/director/pending-approvals
    if (path === '/api/director/pending-approvals' && method === 'GET') {
        const pendingUsers = store.users.filter(u => u.status === 'Pending');
        return Promise.resolve({
            pendingUsers,
            smsNotifications: store.smsNotifications
        });
    }

    // 9. POST /api/director/approve-user
    if (path === '/api/director/approve-user' && method === 'POST') {
        const { userId, approve } = body;
        const user = store.users.find(u => u.id === userId);
        if (!user) return Promise.reject(new Error("Foydalanuvchi topilmadi!"));

        user.status = approve ? "Approved" : "Rejected";

        const teacher = store.teachers.find(t => t.id === userId);
        if (teacher) teacher.status = user.status;

        const student = store.students.find(s => s.id === userId);
        if (student) student.status = user.status;

        recalculateLocalRanks(store);
        saveLocalStore(store);

        const statusMsg = approve ? "tasdiqlandi! Endi foydalanuvchi tizimga kira oladi." : "rad etildi.";
        return Promise.resolve({ message: `${user.fullName} ro'yxatdan o'tishi ${statusMsg}` });
    }

    // 10. GET /api/timetable
    if (path === '/api/timetable' && method === 'GET') {
        const className = queryParams.get('className');
        let list = store.timetableEntries;
        if (className) list = list.filter(t => t.className.toLowerCase() === className.toLowerCase());
        return Promise.resolve(list.sort((a, b) => a.lessonNumber - b.lessonNumber));
    }

    // 11. POST /api/timetable
    if (path === '/api/timetable' && method === 'POST') {
        const { className, dayOfWeek, lessonNumber, subject, teacherName, room } = body;
        let existing = store.timetableEntries.find(t =>
            t.className.toLowerCase() === className.toLowerCase() &&
            t.dayOfWeek.toLowerCase() === dayOfWeek.toLowerCase() &&
            t.lessonNumber === lessonNumber
        );

        if (existing) {
            existing.subject = subject;
            existing.teacherName = teacherName;
            existing.room = room;
        } else {
            store.timetableEntries.push({ className, dayOfWeek, lessonNumber, subject, teacherName, room });
        }
        saveLocalStore(store);
        return Promise.resolve({ message: "Dars jadvali yangilandi!" });
    }

    // 12. GET /api/remarks
    if (path === '/api/remarks' && method === 'GET') {
        const studentId = queryParams.get('studentId');
        const className = queryParams.get('className');
        let list = store.studentRemarks;
        if (studentId) list = list.filter(r => r.studentId === studentId);
        if (className) list = list.filter(r => r.className === className);
        return Promise.resolve(list);
    }

    // 13. POST /api/remarks
    if (path === '/api/remarks' && method === 'POST') {
        const { studentId, teacherName, category, comment } = body;
        const student = store.students.find(s => s.id === studentId);
        if (!student) return Promise.reject(new Error("O'quvchi topilmadi"));

        const remark = {
            id: "rem-" + Date.now(),
            studentId,
            studentName: student.fullName,
            className: student.className,
            teacherName: teacherName || "O'qituvchi",
            date: new Date().toISOString().replace('T', ' ').substring(0, 16),
            category,
            comment
        };
        store.studentRemarks.unshift(remark);
        saveLocalStore(store);
        return Promise.resolve({ message: "O'quvchiga izoh/eslatma saqlandi!", remark });
    }

    // 14. GET /api/students
    if (path === '/api/students' && method === 'GET') {
        const className = queryParams.get('className');
        let approved = store.students.filter(s => s.status === 'Approved');
        if (className && className !== 'all') {
            approved = approved.filter(s => s.className.toLowerCase() === className.toLowerCase());
        }
        return Promise.resolve(approved.sort((a, b) => a.rollNumber - b.rollNumber));
    }

    // 15. POST /api/students
    if (path === '/api/students' && method === 'POST') {
        const { fullName, className, username, password, parentPhone } = body;
        if (!fullName || !className) return Promise.reject(new Error("Ism va sinf kiritilishi shart!"));

        const uname = username || ("st_" + Math.floor(1000 + Math.random() * 9000));
        const pwd = password || "123";

        const existing = store.users.find(u => u.username.toLowerCase() === uname.toLowerCase());
        if (existing) return Promise.reject(new Error("Ushbu login band, boshqa login tanlang!"));

        const classStudents = store.students.filter(s => s.className === className);
        const newStudent = {
            id: "std-" + Date.now(),
            fullName,
            className,
            rollNumber: classStudents.length + 1,
            username: uname,
            password: pwd,
            parentPhone: parentPhone || "",
            averageScore: 9.0,
            schoolRank: 0,
            classRank: 0,
            status: "Approved"
        };
        store.students.push(newStudent);
        store.users.push({
            id: newStudent.id,
            username: uname,
            password: pwd,
            role: "Student",
            fullName,
            className,
            status: "Approved"
        });

        recalculateLocalRanks(store);
        saveLocalStore(store);
        return Promise.resolve({ message: "O'quvchi muvaffaqiyatli qo'shildi!", student: newStudent });
    }

    // 16. PUT /api/students/:id/password
    if (path.match(/\/api\/students\/[^\/]+\/password/) && method === 'PUT') {
        const studentId = path.split('/')[3];
        const { newUsername, newPassword } = body;
        const student = store.students.find(s => s.id === studentId);
        const user = store.users.find(u => u.id === studentId);
        if (!student || !user) return Promise.reject(new Error("O'quvchi topilmadi!"));

        if (newUsername && newUsername.toLowerCase() !== student.username.toLowerCase()) {
            const existing = store.users.find(u => u.username.toLowerCase() === newUsername.toLowerCase() && u.id !== studentId);
            if (existing) return Promise.reject(new Error("Ushbu login mavjud!"));
            student.username = newUsername;
            user.username = newUsername;
        }

        if (newPassword) {
            student.password = newPassword;
            user.password = newPassword;
        }

        saveLocalStore(store);
        return Promise.resolve({ message: "O'quvchi login/paroli yangilandi!", student });
    }

    // 17. DELETE /api/students/:id
    if (path.match(/\/api\/students\/[^\/]+$/) && method === 'DELETE') {
        const studentId = path.split('/')[3];
        const index = store.students.findIndex(s => s.id === studentId);
        if (index === -1) return Promise.reject(new Error("O'quvchi topilmadi!"));

        store.students.splice(index, 1);
        store.users = store.users.filter(u => u.id !== studentId);
        store.journalEntries = store.journalEntries.filter(j => j.studentId !== studentId);
        store.bsbChsbEntries = store.bsbChsbEntries.filter(b => b.studentId !== studentId);
        store.attendanceRecords = store.attendanceRecords.filter(a => a.studentId !== studentId);

        recalculateLocalRanks(store);
        saveLocalStore(store);
        return Promise.resolve({ message: "O'quvchi o'chirildi!" });
    }

    // 18. GET /api/teachers
    if (path === '/api/teachers' && method === 'GET') {
        return Promise.resolve(store.teachers.filter(t => t.status === 'Approved'));
    }

    // 19. POST /api/teachers
    if (path === '/api/teachers' && method === 'POST') {
        const { fullName, subject, assignedClasses, phone, username, password } = body;
        const existing = store.users.find(u => u.username.toLowerCase() === (username || '').toLowerCase());
        if (existing) return Promise.reject(new Error("Ushbu login mavjud!"));

        const teacher = {
            id: "tch-" + Date.now(),
            fullName,
            subject,
            assignedClasses: assignedClasses || [],
            phone: phone || "",
            username,
            password,
            status: "Approved"
        };
        store.teachers.push(teacher);
        store.users.push({
            id: teacher.id,
            username,
            password,
            role: "Teacher",
            fullName,
            subject,
            phone: teacher.phone,
            status: "Approved"
        });

        saveLocalStore(store);
        return Promise.resolve({ message: "O'qituvchi muvaffaqiyatli qo'shildi!", teacher });
    }

    // 20. PUT /api/teachers/:id
    if (path.match(/\/api\/teachers\/[^\/]+$/) && method === 'PUT') {
        const teacherId = path.split('/')[3];
        const { fullName, subject, assignedClasses, phone, username, password } = body;
        const teacher = store.teachers.find(t => t.id === teacherId);
        const user = store.users.find(u => u.id === teacherId);
        if (!teacher || !user) return Promise.reject(new Error("O'qituvchi topilmadi!"));

        teacher.fullName = fullName;
        teacher.subject = subject;
        teacher.assignedClasses = assignedClasses;
        teacher.phone = phone;
        if (username) teacher.username = username;
        if (password) teacher.password = password;

        user.fullName = fullName;
        user.subject = subject;
        user.phone = phone;
        if (username) user.username = username;
        if (password) user.password = password;

        saveLocalStore(store);
        return Promise.resolve({ message: "O'qituvchi ma'lumotlari yangilandi!", teacher });
    }

    // 21. DELETE /api/teachers/:id
    if (path.match(/\/api\/teachers\/[^\/]+$/) && method === 'DELETE') {
        const teacherId = path.split('/')[3];
        const idx = store.teachers.findIndex(t => t.id === teacherId);
        if (idx === -1) return Promise.reject(new Error("O'qituvchi topilmadi!"));

        store.teachers.splice(idx, 1);
        store.users = store.users.filter(u => u.id !== teacherId);

        saveLocalStore(store);
        return Promise.resolve({ message: "O'qituvchi tizimdan o'chirildi!" });
    }

    // 22. GET /api/journal
    if (path === '/api/journal' && method === 'GET') {
        const className = queryParams.get('className');
        const subject = queryParams.get('subject');
        const studentId = queryParams.get('studentId');
        let list = store.journalEntries;
        if (className) list = list.filter(j => j.className.toLowerCase() === className.toLowerCase());
        if (subject) list = list.filter(j => j.subject.toLowerCase() === subject.toLowerCase());
        if (studentId) list = list.filter(j => j.studentId === studentId);

        return Promise.resolve(list);
    }

    // 23. POST /api/journal
    if (path === '/api/journal' && method === 'POST') {
        const { studentId, className, subject, date, grade, homework, topic } = body;
        const student = store.students.find(s => s.id === studentId);
        if (!student) return Promise.reject(new Error("O'quvchi topilmadi"));

        let existing = store.journalEntries.find(j => j.studentId === studentId && j.subject === subject && j.date === date);
        if (existing) {
            existing.grade = grade;
            existing.homework = homework;
            existing.topic = topic;
        } else {
            store.journalEntries.push({
                studentId,
                studentName: student.fullName,
                className,
                subject,
                date,
                grade,
                homework,
                topic,
                teacherName: "O'qituvchi"
            });
        }

        const studentGrades = store.journalEntries
            .filter(j => j.studentId === studentId && !isNaN(parseInt(j.grade)))
            .map(j => parseInt(j.grade));

        if (studentGrades.length > 0) {
            const avg = studentGrades.reduce((a, b) => a + b, 0) / studentGrades.length;
            student.averageScore = Math.round(avg * 10) / 10;
            recalculateLocalRanks(store);
        }

        saveLocalStore(store);
        return Promise.resolve({ message: "Baho va jurnal ma'lumotlari saqlandi!" });
    }

    // 24. GET /api/bsb-chsb
    if (path === '/api/bsb-chsb' && method === 'GET') {
        const className = queryParams.get('className');
        const subject = queryParams.get('subject');
        const studentId = queryParams.get('studentId');
        const term = queryParams.get('term');
        let list = store.bsbChsbEntries;
        if (className) list = list.filter(b => b.className === className);
        if (subject) list = list.filter(b => b.subject === subject);
        if (studentId) list = list.filter(b => b.studentId === studentId);
        if (term) list = list.filter(b => b.term === parseInt(term));

        return Promise.resolve(list);
    }

    // 25. POST /api/bsb-chsb
    if (path === '/api/bsb-chsb' && method === 'POST') {
        const { studentId, className, subject, term, bsb1Score, bsb2Score, chsbScore } = body;
        const student = store.students.find(s => s.id === studentId);
        if (!student) return Promise.reject(new Error("O'quvchi topilmadi"));

        const bsb1 = Math.max(0, Math.min(50, parseInt(bsb1Score) || 0));
        const bsb2 = Math.max(0, Math.min(50, parseInt(bsb2Score) || 0));
        const chsb = Math.max(0, Math.min(40, parseInt(chsbScore) || 0));

        const bsbAvgRatio = ((bsb1 + bsb2) / 2.0) / 50.0;
        const chsbRatio = chsb / 40.0;
        const totalPercentage = Math.round((((bsbAvgRatio * 0.5) + (chsbRatio * 0.5)) * 100.0) * 10) / 10;

        let termGrade = Math.round((totalPercentage / 100.0) * 10);
        if (termGrade < 1) termGrade = 1;

        let existing = store.bsbChsbEntries.find(b => b.studentId === studentId && b.subject === subject && b.term === parseInt(term));
        if (existing) {
            existing.bsb1Score = bsb1;
            existing.bsb2Score = bsb2;
            existing.chsbScore = chsb;
            existing.totalScore = totalPercentage;
            existing.termGrade = termGrade;
        } else {
            store.bsbChsbEntries.push({
                studentId,
                studentName: student.fullName,
                className,
                subject,
                term: parseInt(term),
                bsb1Score: bsb1,
                bsb2Score: bsb2,
                chsbScore: chsb,
                totalScore: totalPercentage,
                termGrade
            });
        }

        saveLocalStore(store);
        return Promise.resolve({ message: "BSB (max 50) va CHSB (max 40) ballari saqlandi!", totalPercentage, termGrade });
    }

    // 26. GET /api/attendance
    if (path === '/api/attendance' && method === 'GET') {
        const className = queryParams.get('className');
        const date = queryParams.get('date');
        const studentId = queryParams.get('studentId');
        let list = store.attendanceRecords;
        if (className) list = list.filter(a => a.className === className);
        if (date) list = list.filter(a => a.date === date);
        if (studentId) list = list.filter(a => a.studentId === studentId);

        return Promise.resolve(list);
    }

    // 27. POST /api/attendance
    if (path === '/api/attendance' && method === 'POST') {
        const { studentId, className, subject, date, status } = body;
        const student = store.students.find(s => s.id === studentId);
        if (!student) return Promise.reject(new Error("O'quvchi topilmadi"));

        let existing = store.attendanceRecords.find(a => a.studentId === studentId && a.date === date && a.subject === subject);
        if (existing) {
            existing.status = status;
        } else {
            store.attendanceRecords.push({
                studentId,
                studentName: student.fullName,
                className,
                subject,
                date,
                status
            });
        }

        saveLocalStore(store);
        return Promise.resolve({ message: "Davomat belgilandi!" });
    }

    // 28. GET /api/ratings
    if (path === '/api/ratings' && method === 'GET') {
        recalculateLocalRanks(store);
        const approved = store.students.filter(s => s.status === 'Approved');
        approved.sort((a, b) => b.averageScore - a.averageScore);

        const leaderboard = approved.map(s => ({
            id: s.id,
            fullName: s.fullName,
            className: s.className,
            averageScore: s.averageScore,
            schoolRank: s.schoolRank,
            classRank: s.classRank
        }));

        const classStats = store.availableClasses.map(c => {
            const classStudents = approved.filter(s => s.className === c);
            const avgScore = classStudents.length > 0
                ? Math.round((classStudents.reduce((acc, curr) => acc + curr.averageScore, 0) / classStudents.length) * 100) / 100
                : 0;
            const totalAbsences = store.attendanceRecords.filter(a => a.className === c && (a.status === 'Unexcused' || a.status === 'Sababsiz')).length;
            return {
                className: c,
                studentCount: classStudents.length,
                averageScore: avgScore,
                totalAbsences
            };
        });

        return Promise.resolve({
            leaderboard,
            classStats
        });
    }

    return Promise.reject(new Error(`[Mock API] Endpoint handling missing: ${path}`));
}

async function fetchApi(endpoint, options = {}) {
    try {
        const response = await fetch(API_BASE + endpoint, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        const contentType = response.headers.get('content-type');
        // If static host returns HTML (e.g. 404/405 page from GitHub Pages), fall back to LocalStorage engine
        if (!response.ok || (contentType && contentType.includes('text/html'))) {
            return handleMockApi(endpoint, options);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.warn(`API call failed for [${endpoint}]. Falling back to LocalStorage Demo engine...`);
        return handleMockApi(endpoint, options);
    }
}

export const Api = {
    // Initial System Info & All Users
    getInit: () => fetchApi('/api/init'),
    getAllUsers: () => fetchApi('/api/users/all'),
    
    // Dynamic Class Creation (Director adds new class with 1-11 validation)
    addClass: (gradeNumber, classLetter) => fetchApi('/api/classes', {
        method: 'POST',
        body: JSON.stringify({ gradeNumber, classLetter })
    }),

    // Auth & Register
    login: (username, password) => fetchApi('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
    }),
    register: (userData) => fetchApi('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
    }),

    // Universal Admin User Editor (Director edits any user)
    updateAnyUser: (userData) => fetchApi('/api/admin/users/update', {
        method: 'PUT',
        body: JSON.stringify(userData)
    }),

    // Director Self Profile & Approvals
    updateDirectorProfile: (userId, fullName, username, password) => fetchApi('/api/director/profile', {
        method: 'PUT',
        body: JSON.stringify({ userId, fullName, username, password })
    }),
    getPendingApprovals: () => fetchApi('/api/director/pending-approvals'),
    approveUser: (userId, approve) => fetchApi('/api/director/approve-user', {
        method: 'POST',
        body: JSON.stringify({ userId, approve })
    }),

    // Students
    getStudents: (className = 'all') => fetchApi(`/api/students?className=${encodeURIComponent(className)}`),
    addStudent: (studentData) => fetchApi('/api/students', {
        method: 'POST',
        body: JSON.stringify(studentData)
    }),
    changeStudentPassword: (studentId, newUsername, newPassword) => fetchApi(`/api/students/${studentId}/password`, {
        method: 'PUT',
        body: JSON.stringify({ studentId, newUsername, newPassword })
    }),
    deleteStudent: (studentId) => fetchApi(`/api/students/${studentId}`, {
        method: 'DELETE'
    }),

    // Teachers CRUD
    getTeachers: () => fetchApi('/api/teachers'),
    addTeacher: (teacherData) => fetchApi('/api/teachers', {
        method: 'POST',
        body: JSON.stringify(teacherData)
    }),
    updateTeacher: (teacherId, teacherData) => fetchApi(`/api/teachers/${teacherId}`, {
        method: 'PUT',
        body: JSON.stringify({ teacherId, ...teacherData })
    }),
    deleteTeacher: (teacherId) => fetchApi(`/api/teachers/${teacherId}`, {
        method: 'DELETE'
    }),

    // Journal
    getJournal: (className, subject, studentId) => {
        let query = [];
        if (className) query.push(`className=${encodeURIComponent(className)}`);
        if (subject) query.push(`subject=${encodeURIComponent(subject)}`);
        if (studentId) query.push(`studentId=${encodeURIComponent(studentId)}`);
        return fetchApi(`/api/journal?${query.join('&')}`);
    },
    saveGrade: (gradeData) => fetchApi('/api/journal', {
        method: 'POST',
        body: JSON.stringify(gradeData)
    }),

    // BSB & CHSB
    getBsbChsb: (className, subject, studentId, term) => {
        let query = [];
        if (className) query.push(`className=${encodeURIComponent(className)}`);
        if (subject) query.push(`subject=${encodeURIComponent(subject)}`);
        if (studentId) query.push(`studentId=${encodeURIComponent(studentId)}`);
        if (term) query.push(`term=${term}`);
        return fetchApi(`/api/bsb-chsb?${query.join('&')}`);
    },
    saveBsbChsb: (bsbData) => fetchApi('/api/bsb-chsb', {
        method: 'POST',
        body: JSON.stringify(bsbData)
    }),

    // Attendance
    getAttendance: (className, date, studentId) => {
        let query = [];
        if (className) query.push(`className=${encodeURIComponent(className)}`);
        if (date) query.push(`date=${encodeURIComponent(date)}`);
        if (studentId) query.push(`studentId=${encodeURIComponent(studentId)}`);
        return fetchApi(`/api/attendance?${query.join('&')}`);
    },
    saveAttendance: (attendanceData) => fetchApi('/api/attendance', {
        method: 'POST',
        body: JSON.stringify(attendanceData)
    }),

    // Timetable (Dars Jadvali)
    getTimetable: (className) => fetchApi(`/api/timetable?className=${encodeURIComponent(className || '')}`),
    saveTimetable: (timetableData) => fetchApi('/api/timetable', {
        method: 'POST',
        body: JSON.stringify(timetableData)
    }),

    // Student Remarks (Izohlar)
    getRemarks: (studentId, className) => {
        let query = [];
        if (studentId) query.push(`studentId=${encodeURIComponent(studentId)}`);
        if (className) query.push(`className=${encodeURIComponent(className)}`);
        return fetchApi(`/api/remarks?${query.join('&')}`);
    },
    saveRemark: (remarkData) => fetchApi('/api/remarks', {
        method: 'POST',
        body: JSON.stringify(remarkData)
    }),

    // Ratings
    getRatings: (className) => fetchApi(`/api/ratings?className=${encodeURIComponent(className || '')}`)
};
