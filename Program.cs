using MaktabApi.Models;
using MaktabApi.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<MaktabDataStore>();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy => policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});

var app = builder.Build();

app.UseCors();
app.UseDefaultFiles();
app.UseStaticFiles();

// ----------------------------------------------------
// REST API ENDPOINTS
// ----------------------------------------------------

// 1. Initial System Info
app.MapGet("/api/init", (MaktabDataStore store) =>
{
    return Results.Ok(new
    {
        SchoolName = "5-sonli Umumta'lim Maktabi",
        Classes = store.AvailableClasses,
        ClassSubjects = store.ClassSubjects,
        StudentsCount = store.Students.Count(s => s.Status == "Approved"),
        TeachersCount = store.Teachers.Count(t => t.Status == "Approved"),
        PendingCount = store.Users.Count(u => u.Status == "Pending")
    });
});

// 2. Dynamic Class Creation API (POST /api/classes)
app.MapPost("/api/classes", (AddClassRequest req, MaktabDataStore store) =>
{
    if (req.GradeNumber < 1 || req.GradeNumber > 11)
    {
        return Results.BadRequest(new { message = "❌ Sinf raqami 1 va 11 orasida bo'lishi shart! (Masalan: 1-11)" });
    }

    if (string.IsNullOrWhiteSpace(req.ClassLetter))
    {
        return Results.BadRequest(new { message = "❌ Sinf harfini kiritishingiz shart! (Masalan: A, B, V)" });
    }

    string className = $"{req.GradeNumber}-{req.ClassLetter.Trim().ToUpper()}";

    if (store.AvailableClasses.Contains(className, StringComparer.OrdinalIgnoreCase))
    {
        return Results.BadRequest(new { message = $"❌ {className} sinfi tizimda allaqachon mavjud!" });
    }

    store.AvailableClasses.Add(className);
    store.ClassSubjects[className] = new List<string> { "Matematika", "O'zbek tili", "Adabiyot", "Ingliz tili", "Tarix", "Informatika", "Fizika" };

    return Results.Ok(new
    {
        message = $"✅ {className} sinfi muvaffaqiyatli yaratildi va tizimga qo'shildi!",
        className,
        availableClasses = store.AvailableClasses
    });
});

// 3. Authentication (Login & Register)
app.MapPost("/api/auth/login", (LoginRequest req, MaktabDataStore store) =>
{
    var user = store.Users.FirstOrDefault(u => 
        u.Username.Equals(req.Username, StringComparison.OrdinalIgnoreCase) && 
        u.Password == req.Password);

    if (user == null)
    {
        return Results.BadRequest(new { message = "Login yoki parol noto'g'ri kiritildi!" });
    }

    if (user.Status == "Pending")
    {
        return Results.BadRequest(new { message = "Sizning ro'yxatdan o'tish so'rovingiz Direktorga SMS orqali yuborilgan. Tasdiqlanishini kuting!" });
    }

    if (user.Status == "Rejected")
    {
        return Results.BadRequest(new { message = "Sizning ro'yxatdan o'tish so'rovingiz Direktor tomonidan rad etilgan!" });
    }

    return Results.Ok(new
    {
        message = "Xush kelibsiz!",
        user = new
        {
            user.Id,
            user.Username,
            user.Role,
            user.FullName,
            user.ClassName,
            user.Subject,
            user.Status
        }
    });
});

app.MapPost("/api/auth/register", (RegisterRequest req, MaktabDataStore store) =>
{
    if (string.IsNullOrWhiteSpace(req.FullName) || string.IsNullOrWhiteSpace(req.Username) || string.IsNullOrWhiteSpace(req.Password))
    {
        return Results.BadRequest(new { message = "Barcha majburiy maydonlarni to'ldiring!" });
    }

    var existingUser = store.Users.FirstOrDefault(u => u.Username.Equals(req.Username, StringComparison.OrdinalIgnoreCase));
    if (existingUser != null)
    {
        return Results.BadRequest(new { message = "Ushbu login tizimda allaqachon mavjud!" });
    }

    var newUser = new User
    {
        Id = Guid.NewGuid().ToString(),
        FullName = req.FullName,
        Role = req.Role,
        ClassName = req.ClassName ?? "5-A",
        Subject = req.Subject ?? "Matematika",
        Phone = req.Phone ?? "",
        Username = req.Username,
        Password = req.Password,
        Status = "Pending"
    };

    store.Users.Add(newUser);

    if (req.Role == "Teacher")
    {
        store.Teachers.Add(new Teacher
        {
            Id = newUser.Id,
            FullName = newUser.FullName,
            Subject = newUser.Subject,
            AssignedClasses = new List<string> { newUser.ClassName },
            Phone = newUser.Phone,
            Username = newUser.Username,
            Password = newUser.Password,
            Status = "Pending"
        });
    }
    else
    {
        store.Students.Add(new Student
        {
            Id = newUser.Id,
            FullName = newUser.FullName,
            ClassName = newUser.ClassName,
            RollNumber = store.Students.Count(s => s.ClassName == newUser.ClassName) + 1,
            Username = newUser.Username,
            Password = newUser.Password,
            ParentPhone = newUser.Phone,
            Status = "Pending"
        });
    }

    var sms = new SmsNotification
    {
        RecipientPhone = "+998 90 555 55 55",
        Message = $"📱 SMS Bildirishnoma (Direktorga): Yangi ro'yxatdan o'tish: {newUser.FullName}, Rol: {newUser.Role}, Tel: {newUser.Phone}. Tasdiqlashingiz kutilmoqda.",
        PendingUserId = newUser.Id
    };
    store.SmsNotifications.Add(sms);

    return Results.Ok(new
    {
        message = "Ro'yxatdan o'tish so'rovi yuborildi! Direktorga SMS xabar yuborildi. Direktor tasdiqlagach, tizimga kirishingiz mumkin bo'ladi.",
        smsSent = sms
    });
});

// 4. ALL REGISTERED USERS API
app.MapGet("/api/users/all", (MaktabDataStore store) =>
{
    var allUsers = store.Users.Select(u => new
    {
        u.Id,
        u.FullName,
        u.Role,
        u.ClassName,
        u.Subject,
        u.Phone,
        u.Username,
        u.Password,
        u.Status
    }).ToList();

    return Results.Ok(allUsers);
});

// 5. DIRECTOR UNIVERSAL USER EDITOR
app.MapPut("/api/admin/users/update", (UpdateAnyUserRequest req, MaktabDataStore store) =>
{
    var user = store.Users.FirstOrDefault(u => u.Id == req.TargetUserId);
    if (user == null) return Results.NotFound(new { message = "Foydalanuvchi topilmadi!" });

    if (!string.IsNullOrWhiteSpace(req.Username) && !req.Username.Equals(user.Username, StringComparison.OrdinalIgnoreCase))
    {
        var existing = store.Users.FirstOrDefault(u => u.Username.Equals(req.Username, StringComparison.OrdinalIgnoreCase) && u.Id != user.Id);
        if (existing != null) return Results.BadRequest(new { message = "Ushbu login tizimda allaqachon band!" });
        user.Username = req.Username;
    }

    if (!string.IsNullOrWhiteSpace(req.FullName)) user.FullName = req.FullName;
    if (!string.IsNullOrWhiteSpace(req.Password)) user.Password = req.Password;
    if (!string.IsNullOrWhiteSpace(req.Role)) user.Role = req.Role;
    if (!string.IsNullOrWhiteSpace(req.ClassName)) user.ClassName = req.ClassName;
    if (!string.IsNullOrWhiteSpace(req.Subject)) user.Subject = req.Subject;
    if (!string.IsNullOrWhiteSpace(req.Phone)) user.Phone = req.Phone;

    var teacher = store.Teachers.FirstOrDefault(t => t.Id == req.TargetUserId);
    if (teacher != null)
    {
        teacher.FullName = user.FullName;
        teacher.Subject = user.Subject;
        teacher.Phone = user.Phone;
        teacher.Username = user.Username;
        teacher.Password = user.Password;
    }

    var student = store.Students.FirstOrDefault(s => s.Id == req.TargetUserId);
    if (student != null)
    {
        student.FullName = user.FullName;
        student.ClassName = user.ClassName;
        student.ParentPhone = user.Phone;
        student.Username = user.Username;
        student.Password = user.Password;
        store.RecalculateRanks();
    }

    return Results.Ok(new
    {
        message = $"{user.FullName} foydalanuvchi ma'lumotlari muvaffaqiyatli yangilandi!",
        user
    });
});

app.MapPut("/api/director/profile", (UpdateDirectorProfileRequest req, MaktabDataStore store) =>
{
    var director = store.Users.FirstOrDefault(u => u.Role == "Director" && u.Id == req.UserId);
    if (director == null) return Results.NotFound(new { message = "Direktor akkounti topilmadi!" });

    if (!string.IsNullOrWhiteSpace(req.Username) && !req.Username.Equals(director.Username, StringComparison.OrdinalIgnoreCase))
    {
        var existing = store.Users.FirstOrDefault(u => u.Username.Equals(req.Username, StringComparison.OrdinalIgnoreCase) && u.Id != director.Id);
        if (existing != null) return Results.BadRequest(new { message = "Ushbu login tizimda band!" });
        director.Username = req.Username;
    }

    if (!string.IsNullOrWhiteSpace(req.FullName)) director.FullName = req.FullName;
    if (!string.IsNullOrWhiteSpace(req.Password)) director.Password = req.Password;

    return Results.Ok(new
    {
        message = "Direktor profil ma'lumotlari (Ism, Login va Parol) muvaffaqiyatli yangilandi!",
        user = director
    });
});

app.MapGet("/api/director/pending-approvals", (MaktabDataStore store) =>
{
    var pendingUsers = store.Users.Where(u => u.Status == "Pending").ToList();
    return Results.Ok(new
    {
        PendingUsers = pendingUsers,
        SmsNotifications = store.SmsNotifications.OrderByDescending(s => s.CreatedAt).ToList()
    });
});

app.MapPost("/api/director/approve-user", (ApproveUserRequest req, MaktabDataStore store) =>
{
    var user = store.Users.FirstOrDefault(u => u.Id == req.UserId);
    if (user == null) return Results.NotFound(new { message = "Foydalanuvchi topilmadi!" });

    user.Status = req.Approve ? "Approved" : "Rejected";

    var teacher = store.Teachers.FirstOrDefault(t => t.Id == req.UserId);
    if (teacher != null) teacher.Status = user.Status;

    var student = store.Students.FirstOrDefault(s => s.Id == req.UserId);
    if (student != null) student.Status = user.Status;

    store.RecalculateRanks();

    string statusMsg = req.Approve ? "tasdiqlandi! Endi foydalanuvchi tizimga kira oladi." : "rad etildi.";
    return Results.Ok(new { message = $"{user.FullName} ro'yxatdan o'tishi {statusMsg}" });
});

// 6. TIMETABLE API (DARS JADVALI)
app.MapGet("/api/timetable", (string? className, MaktabDataStore store) =>
{
    var query = store.TimetableEntries.AsEnumerable();
    if (!string.IsNullOrEmpty(className)) query = query.Where(t => t.ClassName.Equals(className, StringComparison.OrdinalIgnoreCase));
    return Results.Ok(query.OrderBy(t => t.LessonNumber).ToList());
});

app.MapPost("/api/timetable", (SaveTimetableRequest req, MaktabDataStore store) =>
{
    var existing = store.TimetableEntries.FirstOrDefault(t => 
        t.ClassName.Equals(req.ClassName, StringComparison.OrdinalIgnoreCase) && 
        t.DayOfWeek.Equals(req.DayOfWeek, StringComparison.OrdinalIgnoreCase) && 
        t.LessonNumber == req.LessonNumber);

    if (existing != null)
    {
        existing.Subject = req.Subject;
        existing.TeacherName = req.TeacherName;
        existing.Room = req.Room;
    }
    else
    {
        store.TimetableEntries.Add(new TimetableEntry
        {
            ClassName = req.ClassName,
            DayOfWeek = req.DayOfWeek,
            LessonNumber = req.LessonNumber,
            Subject = req.Subject,
            TeacherName = req.TeacherName,
            Room = req.Room
        });
    }

    return Results.Ok(new { message = "Dars jadvali yangilandi!" });
});

// 7. STUDENT REMARKS API (O'QITUVCHI VA DIREKTOR IZOHLARI)
app.MapGet("/api/remarks", (string? studentId, string? className, MaktabDataStore store) =>
{
    var query = store.StudentRemarks.AsEnumerable();
    if (!string.IsNullOrEmpty(studentId)) query = query.Where(r => r.StudentId == studentId);
    if (!string.IsNullOrEmpty(className)) query = query.Where(r => r.ClassName == className);
    return Results.Ok(query.OrderByDescending(r => r.Date).ToList());
});

app.MapPost("/api/remarks", (SaveRemarkRequest req, MaktabDataStore store) =>
{
    var student = store.Students.FirstOrDefault(s => s.Id == req.StudentId);
    if (student == null) return Results.NotFound(new { message = "O'quvchi topilmadi" });

    var remark = new StudentRemark
    {
        StudentId = req.StudentId,
        StudentName = student.FullName,
        ClassName = student.ClassName,
        TeacherName = string.IsNullOrWhiteSpace(req.TeacherName) ? "O'qituvchi" : req.TeacherName,
        Date = DateTime.Now.ToString("yyyy-MM-dd HH:mm"),
        Category = req.Category,
        Comment = req.Comment
    };

    store.StudentRemarks.Add(remark);

    return Results.Ok(new { message = "O'quvchiga izoh/eslatma saqlandi!", remark });
});

// 8. Students API
app.MapGet("/api/students", (string? className, MaktabDataStore store) =>
{
    var query = store.Students.Where(s => s.Status == "Approved").AsEnumerable();
    if (!string.IsNullOrEmpty(className) && className != "all")
    {
        query = query.Where(s => s.ClassName.Equals(className, StringComparison.OrdinalIgnoreCase));
    }
    return Results.Ok(query.OrderBy(s => s.RollNumber).ToList());
});

app.MapPost("/api/students", (AddStudentRequest req, MaktabDataStore store) =>
{
    if (string.IsNullOrWhiteSpace(req.FullName) || string.IsNullOrWhiteSpace(req.ClassName))
    {
        return Results.BadRequest(new { message = "Ism va sinf kiritilishi shart!" });
    }

    var existingUser = store.Users.FirstOrDefault(u => u.Username.Equals(req.Username, StringComparison.OrdinalIgnoreCase));
    if (existingUser != null)
    {
        return Results.BadRequest(new { message = "Ushbu login band, boshqa login tanlang!" });
    }

    var newStudent = new Student
    {
        Id = Guid.NewGuid().ToString(),
        FullName = req.FullName,
        ClassName = req.ClassName,
        RollNumber = store.Students.Count(s => s.ClassName == req.ClassName) + 1,
        Username = string.IsNullOrWhiteSpace(req.Username) ? "st_" + Random.Shared.Next(1000, 9999) : req.Username,
        Password = string.IsNullOrWhiteSpace(req.Password) ? "123" : req.Password,
        ParentPhone = req.ParentPhone,
        AverageScore = 9.0,
        Status = "Approved"
    };

    store.Students.Add(newStudent);
    store.Users.Add(new User
    {
        Id = newStudent.Id,
        Username = newStudent.Username,
        Password = newStudent.Password,
        Role = "Student",
        FullName = newStudent.FullName,
        ClassName = newStudent.ClassName,
        Status = "Approved"
    });

    store.RecalculateRanks();

    return Results.Ok(new { message = "O'quvchi muvaffaqiyatli qo'shildi!", student = newStudent });
});

app.MapPut("/api/students/{id}/password", (string id, ChangePasswordRequest req, MaktabDataStore store) =>
{
    var student = store.Students.FirstOrDefault(s => s.Id == id);
    var user = store.Users.FirstOrDefault(u => u.Id == id);

    if (student == null || user == null) return Results.NotFound(new { message = "O'quvchi topilmadi!" });

    if (!string.IsNullOrWhiteSpace(req.NewUsername))
    {
        var existing = store.Users.FirstOrDefault(u => u.Username.Equals(req.NewUsername, StringComparison.OrdinalIgnoreCase) && u.Id != id);
        if (existing != null) return Results.BadRequest(new { message = "Ushbu login mavjud!" });
        student.Username = req.NewUsername;
        user.Username = req.NewUsername;
    }

    if (!string.IsNullOrWhiteSpace(req.NewPassword))
    {
        student.Password = req.NewPassword;
        user.Password = req.NewPassword;
    }

    return Results.Ok(new { message = "O'quvchi login/paroli yangilandi!", student });
});

app.MapDelete("/api/students/{id}", (string id, MaktabDataStore store) =>
{
    var student = store.Students.FirstOrDefault(s => s.Id == id);
    if (student == null) return Results.NotFound(new { message = "O'quvchi topilmadi!" });

    store.Students.Remove(student);
    store.Users.RemoveAll(u => u.Id == id);
    store.JournalEntries.RemoveAll(j => j.StudentId == id);
    store.BsbChsbEntries.RemoveAll(b => b.StudentId == id);
    store.AttendanceRecords.RemoveAll(a => a.StudentId == id);

    store.RecalculateRanks();

    return Results.Ok(new { message = "O'quvchi o'chirildi!" });
});

// 9. Teachers CRUD API
app.MapGet("/api/teachers", (MaktabDataStore store) =>
{
    return Results.Ok(store.Teachers.Where(t => t.Status == "Approved").ToList());
});

app.MapPost("/api/teachers", (AddTeacherRequest req, MaktabDataStore store) =>
{
    var existing = store.Users.FirstOrDefault(u => u.Username.Equals(req.Username, StringComparison.OrdinalIgnoreCase));
    if (existing != null) return Results.BadRequest(new { message = "Ushbu login mavjud!" });

    var teacher = new Teacher
    {
        Id = Guid.NewGuid().ToString(),
        FullName = req.FullName,
        Subject = req.Subject,
        AssignedClasses = req.AssignedClasses,
        Phone = req.Phone,
        Username = req.Username,
        Password = req.Password,
        Status = "Approved"
    };
    store.Teachers.Add(teacher);
    store.Users.Add(new User
    {
        Id = teacher.Id,
        Username = teacher.Username,
        Password = teacher.Password,
        Role = "Teacher",
        FullName = teacher.FullName,
        Subject = teacher.Subject,
        Phone = teacher.Phone,
        Status = "Approved"
    });
    return Results.Ok(new { message = "O'qituvchi muvaffaqiyatli qo'shildi!", teacher });
});

app.MapPut("/api/teachers/{id}", (string id, UpdateTeacherRequest req, MaktabDataStore store) =>
{
    var teacher = store.Teachers.FirstOrDefault(t => t.Id == id);
    var user = store.Users.FirstOrDefault(u => u.Id == id);

    if (teacher == null || user == null) return Results.NotFound(new { message = "O'qituvchi topilmadi!" });

    teacher.FullName = req.FullName;
    teacher.Subject = req.Subject;
    teacher.AssignedClasses = req.AssignedClasses;
    teacher.Phone = req.Phone;
    if (!string.IsNullOrWhiteSpace(req.Username)) teacher.Username = req.Username;
    if (!string.IsNullOrWhiteSpace(req.Password)) teacher.Password = req.Password;

    user.FullName = req.FullName;
    user.Subject = req.Subject;
    user.Phone = req.Phone;
    if (!string.IsNullOrWhiteSpace(req.Username)) user.Username = req.Username;
    if (!string.IsNullOrWhiteSpace(req.Password)) user.Password = req.Password;

    return Results.Ok(new { message = "O'qituvchi ma'lumotlari yangilandi!", teacher });
});

app.MapDelete("/api/teachers/{id}", (string id, MaktabDataStore store) =>
{
    var teacher = store.Teachers.FirstOrDefault(t => t.Id == id);
    if (teacher == null) return Results.NotFound(new { message = "O'qituvchi topilmadi!" });

    store.Teachers.Remove(teacher);
    store.Users.RemoveAll(u => u.Id == id);

    return Results.Ok(new { message = "O'qituvchi tizimdan o'chirildi!" });
});

// 10. Journal (Kundalik) API
app.MapGet("/api/journal", (string? className, string? subject, string? studentId, MaktabDataStore store) =>
{
    var query = store.JournalEntries.AsEnumerable();
    if (!string.IsNullOrEmpty(className)) query = query.Where(j => j.ClassName.Equals(className, StringComparison.OrdinalIgnoreCase));
    if (!string.IsNullOrEmpty(subject)) query = query.Where(j => j.Subject.Equals(subject, StringComparison.OrdinalIgnoreCase));
    if (!string.IsNullOrEmpty(studentId)) query = query.Where(j => j.StudentId == studentId);
    
    return Results.Ok(query.OrderByDescending(j => j.Date).ToList());
});

app.MapPost("/api/journal", (SaveGradeRequest req, MaktabDataStore store) =>
{
    var student = store.Students.FirstOrDefault(s => s.Id == req.StudentId);
    if (student == null) return Results.NotFound(new { message = "O'quvchi topilmadi" });

    var existing = store.JournalEntries.FirstOrDefault(j => 
        j.StudentId == req.StudentId && 
        j.Subject == req.Subject && 
        j.Date == req.Date);

    if (existing != null)
    {
        existing.Grade = req.Grade;
        existing.Homework = req.Homework;
        existing.Topic = req.Topic;
    }
    else
    {
        store.JournalEntries.Add(new JournalEntry
        {
            StudentId = req.StudentId,
            StudentName = student.FullName,
            ClassName = req.ClassName,
            Subject = req.Subject,
            Date = req.Date,
            Grade = req.Grade,
            Homework = req.Homework,
            Topic = req.Topic,
            TeacherName = "O'qituvchi"
        });
    }

    var studentGrades = store.JournalEntries
        .Where(j => j.StudentId == req.StudentId && int.TryParse(j.Grade, out _))
        .Select(j => int.Parse(j.Grade))
        .ToList();

    if (studentGrades.Any())
    {
        student.AverageScore = Math.Round(studentGrades.Average(), 1);
        store.RecalculateRanks();
    }

    return Results.Ok(new { message = "Baho va jurnal ma'lumotlari saqlandi!" });
});

// 11. BSB (50 ball) & CHSB (40 ball) API
app.MapGet("/api/bsb-chsb", (string? className, string? subject, string? studentId, int? term, MaktabDataStore store) =>
{
    var query = store.BsbChsbEntries.AsEnumerable();
    if (!string.IsNullOrEmpty(className)) query = query.Where(b => b.ClassName == className);
    if (!string.IsNullOrEmpty(subject)) query = query.Where(b => b.Subject == subject);
    if (!string.IsNullOrEmpty(studentId)) query = query.Where(b => b.StudentId == studentId);
    if (term.HasValue) query = query.Where(b => b.Term == term.Value);

    return Results.Ok(query.ToList());
});

app.MapPost("/api/bsb-chsb", (SaveBsbChsbRequest req, MaktabDataStore store) =>
{
    var student = store.Students.FirstOrDefault(s => s.Id == req.StudentId);
    if (student == null) return Results.NotFound(new { message = "O'quvchi topilmadi" });

    int bsb1 = Math.Clamp(req.Bsb1Score, 0, 50);
    int bsb2 = Math.Clamp(req.Bsb2Score, 0, 50);
    int chsb = Math.Clamp(req.ChsbScore, 0, 40);

    double bsbAvgRatio = ((bsb1 + bsb2) / 2.0) / 50.0;
    double chsbRatio = chsb / 40.0;
    double totalPercentage = ((bsbAvgRatio * 0.5) + (chsbRatio * 0.5)) * 100.0;
    
    int termGrade = (int)Math.Round((totalPercentage / 100.0) * 10);
    if (termGrade < 1) termGrade = 1;

    var existing = store.BsbChsbEntries.FirstOrDefault(b => 
        b.StudentId == req.StudentId && 
        b.Subject == req.Subject && 
        b.Term == req.Term);

    if (existing != null)
    {
        existing.Bsb1Score = bsb1;
        existing.Bsb2Score = bsb2;
        existing.ChsbScore = chsb;
        existing.TotalScore = Math.Round(totalPercentage, 1);
        existing.TermGrade = termGrade;
    }
    else
    {
        store.BsbChsbEntries.Add(new BsbChsbEntry
        {
            StudentId = req.StudentId,
            StudentName = student.FullName,
            ClassName = req.ClassName,
            Subject = req.Subject,
            Term = req.Term,
            Bsb1Score = bsb1,
            Bsb2Score = bsb2,
            ChsbScore = chsb,
            TotalScore = Math.Round(totalPercentage, 1),
            TermGrade = termGrade
        });
    }

    return Results.Ok(new { message = "BSB (max 50) va CHSB (max 40) ballari saqlandi!", totalPercentage, termGrade });
});

// 12. Attendance API
app.MapGet("/api/attendance", (string? className, string? date, string? studentId, MaktabDataStore store) =>
{
    var query = store.AttendanceRecords.AsEnumerable();
    if (!string.IsNullOrEmpty(className)) query = query.Where(a => a.ClassName == className);
    if (!string.IsNullOrEmpty(date)) query = query.Where(a => a.Date == date);
    if (!string.IsNullOrEmpty(studentId)) query = query.Where(a => a.StudentId == studentId);

    return Results.Ok(query.ToList());
});

app.MapPost("/api/attendance", (SaveAttendanceRequest req, MaktabDataStore store) =>
{
    var student = store.Students.FirstOrDefault(s => s.Id == req.StudentId);
    if (student == null) return Results.NotFound(new { message = "O'quvchi topilmadi" });

    var existing = store.AttendanceRecords.FirstOrDefault(a => 
        a.StudentId == req.StudentId && 
        a.Date == req.Date && 
        a.Subject == req.Subject);

    if (existing != null)
    {
        existing.Status = req.Status;
    }
    else
    {
        store.AttendanceRecords.Add(new AttendanceRecord
        {
            StudentId = req.StudentId,
            StudentName = student.FullName,
            ClassName = req.ClassName,
            Subject = req.Subject,
            Date = req.Date,
            Status = req.Status
        });
    }

    return Results.Ok(new { message = "Davomat belgilandi!" });
});

// 13. Ratings & Leaderboards
app.MapGet("/api/ratings", (string? className, MaktabDataStore store) =>
{
    var schoolLeaderboard = store.Students
        .Where(s => s.Status == "Approved")
        .OrderByDescending(s => s.AverageScore)
        .Select(s => new
        {
            s.Id,
            s.FullName,
            s.ClassName,
            s.AverageScore,
            s.SchoolRank,
            s.ClassRank
        })
        .ToList();

    var classStats = store.AvailableClasses.Select(c =>
    {
        var classStudents = store.Students.Where(s => s.ClassName == c && s.Status == "Approved").ToList();
        double avgScore = classStudents.Any() ? Math.Round(classStudents.Average(s => s.AverageScore), 2) : 0;
        int totalAbsences = store.AttendanceRecords.Count(a => a.ClassName == c && (a.Status == "Unexcused" || a.Status == "Sababsiz"));
        return new
        {
            ClassName = c,
            StudentCount = classStudents.Count,
            AverageScore = avgScore,
            TotalAbsences = totalAbsences
        };
    }).ToList();

    return Results.Ok(new
    {
        Leaderboard = schoolLeaderboard,
        ClassStats = classStats
    });
});

app.Run();
