namespace MaktabApi.Models
{
    public class User
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty; // "Director", "Teacher", "Student"
        public string FullName { get; set; } = string.Empty;
        public string ClassName { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Status { get; set; } = "Approved"; // "Approved", "Pending", "Rejected"
    }

    public class Student
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string FullName { get; set; } = string.Empty;
        public string ClassName { get; set; } = string.Empty;
        public int RollNumber { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string ParentPhone { get; set; } = string.Empty;
        public double AverageScore { get; set; } = 9.0;
        public int SchoolRank { get; set; } = 1;
        public int ClassRank { get; set; } = 1;
        public string Status { get; set; } = "Approved";
    }

    public class Teacher
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string FullName { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;
        public List<string> AssignedClasses { get; set; } = new();
        public string Phone { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = "123";
        public string Status { get; set; } = "Approved";
    }

    public class JournalEntry
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string StudentId { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public string ClassName { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;
        public string Date { get; set; } = string.Empty;
        public string Grade { get; set; } = string.Empty;
        public string Homework { get; set; } = string.Empty;
        public string Topic { get; set; } = string.Empty;
        public string TeacherName { get; set; } = string.Empty;
    }

    public class BsbChsbEntry
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string StudentId { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public string ClassName { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;
        public int Term { get; set; } = 1;
        public int Bsb1Score { get; set; }
        public int Bsb2Score { get; set; }
        public int ChsbScore { get; set; }
        public double TotalScore { get; set; }
        public int TermGrade { get; set; }
    }

    public class AttendanceRecord
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string StudentId { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public string ClassName { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;
        public string Date { get; set; } = string.Empty;
        public string Status { get; set; } = "Present";
    }

    public class TimetableEntry
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string ClassName { get; set; } = string.Empty;
        public string DayOfWeek { get; set; } = "Dushanba";
        public int LessonNumber { get; set; } = 1; // 1..6
        public string Subject { get; set; } = string.Empty;
        public string TeacherName { get; set; } = string.Empty;
        public string Room { get; set; } = "101-xona";
    }

    public class StudentRemark
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string StudentId { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public string ClassName { get; set; } = string.Empty;
        public string TeacherName { get; set; } = string.Empty;
        public string Date { get; set; } = DateTime.Now.ToString("yyyy-MM-dd");
        public string Category { get; set; } = "Odob-ahloq";
        public string Comment { get; set; } = string.Empty;
    }

    public class SmsNotification
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string RecipientPhone { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string CreatedAt { get; set; } = DateTime.Now.ToString("yyyy-MM-dd HH:mm");
        public bool IsRead { get; set; } = false;
        public string PendingUserId { get; set; } = string.Empty;
    }

    // DTOs
    public record LoginRequest(string Username, string Password);
    public record RegisterRequest(string FullName, string Role, string ClassName, string Subject, string Phone, string Username, string Password);
    public record ApproveUserRequest(string UserId, bool Approve);
    public record UpdateDirectorProfileRequest(string UserId, string FullName, string Username, string Password);
    public record UpdateAnyUserRequest(string TargetUserId, string FullName, string Role, string ClassName, string Subject, string Phone, string Username, string Password);
    public record AddClassRequest(int GradeNumber, string ClassLetter);
    public record AddStudentRequest(string FullName, string ClassName, string ParentPhone, string Username, string Password);
    public record ChangePasswordRequest(string StudentId, string NewPassword, string NewUsername);
    public record AddTeacherRequest(string FullName, string Subject, List<string> AssignedClasses, string Phone, string Username, string Password);
    public record UpdateTeacherRequest(string TeacherId, string FullName, string Subject, List<string> AssignedClasses, string Phone, string Username, string Password);
    public record SaveGradeRequest(string StudentId, string ClassName, string Subject, string Date, string Grade, string Homework, string Topic);
    public record SaveBsbChsbRequest(string StudentId, string ClassName, string Subject, int Term, int Bsb1Score, int Bsb2Score, int ChsbScore);
    public record SaveAttendanceRequest(string StudentId, string ClassName, string Subject, string Date, string Status);
    public record SaveTimetableRequest(string ClassName, string DayOfWeek, int LessonNumber, string Subject, string TeacherName, string Room);
    public record SaveRemarkRequest(string StudentId, string Category, string Comment, string TeacherName);
}
