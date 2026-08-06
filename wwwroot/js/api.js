// 5-MAKTAB REST API CLIENT MODULE

const API_BASE = '';

async function fetchApi(endpoint, options = {}) {
    try {
        const response = await fetch(API_BASE + endpoint, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Server xatoligi yuz berdi');
        }
        return data;
    } catch (error) {
        console.error(`API Error [${endpoint}]:`, error);
        throw error;
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
