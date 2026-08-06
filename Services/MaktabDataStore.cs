using MaktabApi.Models;

namespace MaktabApi.Services
{
    public class MaktabDataStore
    {
        private readonly object _lock = new();

        public List<User> Users { get; set; } = new();
        public List<Student> Students { get; set; } = new();
        public List<Teacher> Teachers { get; set; } = new();
        public List<JournalEntry> JournalEntries { get; set; } = new();
        public List<BsbChsbEntry> BsbChsbEntries { get; set; } = new();
        public List<AttendanceRecord> AttendanceRecords { get; set; } = new();
        public List<SmsNotification> SmsNotifications { get; set; } = new();
        public List<TimetableEntry> TimetableEntries { get; set; } = new();
        public List<StudentRemark> StudentRemarks { get; set; } = new();

        public List<string> AvailableClasses { get; set; } = new() { "5-A", "5-B", "6-A", "7-A", "8-A", "9-A", "10-A", "11-A" };
        
        public Dictionary<string, List<string>> ClassSubjects { get; set; } = new()
        {
            { "5-A", new List<string> { "Matematika", "O'zbek tili", "Adabiyot", "Ingliz tili", "Tarix", "Informatika", "Jismoniy tarbiya", "Tasviriy san'at" } },
            { "5-B", new List<string> { "Matematika", "O'zbek tili", "Adabiyot", "Ingliz tili", "Tarix", "Informatika", "Jismoniy tarbiya", "Tasviriy san'at" } },
            { "6-A", new List<string> { "Matematika", "O'zbek tili", "Adabiyot", "Ingliz tili", "Tarix", "Informatika", "Biologiya", "Geografiya" } },
            { "7-A", new List<string> { "Algebra", "Geometriya", "Fizika", "Biologiya", "O'zbek tili", "Adabiyot", "Ingliz tili", "Tarix", "Informatika" } },
            { "8-A", new List<string> { "Algebra", "Geometriya", "Fizika", "Kimyo", "Biologiya", "O'zbek tili", "Adabiyot", "Ingliz tili", "Tarix" } },
            { "9-A", new List<string> { "Algebra", "Geometriya", "Fizika", "Kimyo", "Biologiya", "O'zbekiston tarixi", "Jahon tarixi", "Ingliz tili", "Informatika" } },
            { "10-A", new List<string> { "Algebra", "Geometriya", "Fizika", "Kimyo", "Biologiya", "Huquq", "Ingliz tili", "Informatika", "O'zbekiston tarixi" } },
            { "11-A", new List<string> { "Algebra", "Geometriya", "Fizika", "Kimyo", "Biologiya", "Huquq", "Ingliz tili", "Informatika", "O'zbekiston tarixi" } }
        };

        public MaktabDataStore()
        {
            SeedData();
        }

        private void SeedData()
        {
            lock (_lock)
            {
                // ONLY DIRECTOR ACCOUNT (Login: direktor, Password: direktor5maktab)
                Users.Add(new User
                {
                    Id = "dir-1",
                    Username = "direktor",
                    Password = "direktor5maktab",
                    Role = "Director",
                    FullName = "Karimov Shavkat Ravshanovich (Maktab Direktori)",
                    ClassName = "Barcha sinflar",
                    Phone = "+998 90 555 55 55",
                    Status = "Approved"
                });

                // Seed Default Sample Timetable for 5-A sinf
                var days = new[] { "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba" };
                var subjects5A = new[] { "Matematika", "O'zbek tili", "Ingliz tili", "Informatika", "Tarix", "Jismoniy tarbiya" };
                
                foreach (var day in days)
                {
                    for (int i = 1; i <= 5; i++)
                    {
                        TimetableEntries.Add(new TimetableEntry
                        {
                            ClassName = "5-A",
                            DayOfWeek = day,
                            LessonNumber = i,
                            Subject = subjects5A[(i - 1) % subjects5A.Length],
                            TeacherName = "O'qituvchi",
                            Room = $"{100 + i}-xona"
                        });
                    }
                }
            }
        }

        public void RecalculateRanks()
        {
            lock (_lock)
            {
                var sortedSchool = Students.Where(s => s.Status == "Approved").OrderByDescending(s => s.AverageScore).ToList();
                for (int i = 0; i < sortedSchool.Count; i++)
                {
                    sortedSchool[i].SchoolRank = i + 1;
                }

                var classes = Students.Select(s => s.ClassName).Distinct();
                foreach (var cls in classes)
                {
                    var sortedClass = Students.Where(s => s.ClassName == cls && s.Status == "Approved").OrderByDescending(s => s.AverageScore).ToList();
                    for (int i = 0; i < sortedClass.Count; i++)
                    {
                        sortedClass[i].ClassRank = i + 1;
                    }
                }
            }
        }
    }
}
