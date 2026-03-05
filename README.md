# Education Management System Backend API

A comprehensive RESTful API for managing educational institutions with role-based access control for Admin, Teachers, and Students.

## 🚀 Features

- ✅ **Authentication & Authorization** - JWT-based authentication with role-based access
- ✅ **Student Management** - Complete CRUD operations for students
- ✅ **Teacher Management** - Complete CRUD operations for teachers
- ✅ **Course Management** - Create, update, delete courses with teacher assignment
- ✅ **Enrollment Management** - Enroll students in courses, track progress
- ✅ **Grade Management** - Add and manage student grades
- ✅ **Schedule Management** - Create and manage class schedules
- ✅ **Reports & Analytics** - Dashboard stats, student/teacher counts, today's classes
- ✅ **Teacher Module** - Teachers can manage their courses, grades, and remarks
- ✅ **Student Module** - Students can view profile, courses, schedule, grades, and progress

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd backend
Install dependencies

bash
npm install
Create .env file in root directory

env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/education-management-system
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-2024
JWT_LIFETIME=30d
CLIENT_URL=http://localhost:3000
Start the server

bash
# Development
npm run dev

# Production
npm start
📁 Project Structure
text
backend/
├── controllers/          # Route controllers
├── db/                    # Database connection
├── errors/                # Custom error classes
├── middleware/            # Custom middleware
├── models/                 # Mongoose models
├── routes/                 # Express routes
├── .env                    # Environment variables
├── app.js                  # Express app
├── server.js               # Server entry point
└── package.json            # Dependencies
🔐 Authentication
All protected routes require a Bearer token in the Authorization header:

text
Authorization: Bearer <your_jwt_token>
📌 API ENDPOINTS
🟢 Authentication Routes (/api/v1/auth)
Method	Endpoint	Description	Access	Request Body
POST	/register	Register new user	Public	{ firstName, lastName, email, password, role }
POST	/login	Login user	Public	{ email, password, role }
GET	/me	Get current user	Private	-
GET	/profile	Get user profile	Private	-
GET	/admin	Test admin route	Admin	-
GET	/teacher	Test teacher route	Teacher	-
GET	/student	Test student route	Student	-
📝 Sample Requests
Register User

json
POST /api/v1/auth/register
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "student"
}
Login

json
POST /api/v1/auth/login
{
  "email": "john@example.com",
  "password": "password123",
  "role": "student"
}
🔵 User Routes (/api/v1/users)
Method	Endpoint	Description	Access
GET	/search?searchQuery=xyz	Search users	Private
GET	/	Get all users	Admin
GET	/:id	Get user by ID	Private
PUT	/:id	Update user	Private/Owner
DELETE	/:id	Delete user	Admin
👑 ADMIN MODULE ROUTES
🟠 Student Management (/api/admin/students)
Method	Endpoint	Description	Access	Request Body
POST	/	Add new student	Admin	{ firstName, lastName, email, password, class, section, rollNumber, ... }
GET	/	Get all students	Admin	Query: ?page=1&limit=10&search=john&class=10th&status=active
GET	/:id	Get single student	Admin	-
PUT	/:id	Update student	Admin	{ firstName, lastName, email, class, section, ... }
DELETE	/:id	Delete student	Admin	-
📝 Sample Request - Add Student
json
POST /api/admin/students
{
  "firstName": "Alice",
  "lastName": "Johnson",
  "email": "alice@example.com",
  "password": "student123",
  "class": "10th Grade",
  "section": "A",
  "rollNumber": "STU001",
  "contactNumber": "+1234567890",
  "parentName": "Bob Johnson",
  "parentContact": "+1234567891"
}
🟠 Teacher Management (/api/admin/teachers)
Method	Endpoint	Description	Access	Request Body
POST	/	Add new teacher	Admin	{ firstName, lastName, email, employeeId, qualification, specialization, ... }
GET	/	Get all teachers	Admin	Query: ?page=1&limit=10&search=john&specialization=math&status=active
GET	/:id	Get single teacher	Admin	-
PUT	/:id	Update teacher	Admin	{ firstName, lastName, email, qualification, ... }
DELETE	/:id	Delete teacher	Admin	-
GET	/stats	Get teacher statistics	Admin	-
📝 Sample Request - Add Teacher
json
POST /api/admin/teachers
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane.smith@example.com",
  "employeeId": "TCH001",
  "qualification": "M.Sc. Mathematics",
  "specialization": "Mathematics",
  "experience": 5,
  "contactNumber": "+1234567892",
  "bio": "Experienced mathematics teacher"
}
🟠 Course Management (/api/admin/courses)
Method	Endpoint	Description	Access	Request Body
POST	/	Add new course	Admin	{ name, code, description, teacherId, credits, duration, department, ... }
GET	/	Get all courses	Admin	Query: ?page=1&limit=10&search=math&department=CS&level=beginner
GET	/:id	Get single course	Admin	-
PUT	/:id	Update course	Admin	{ name, description, credits, ... }
DELETE	/:id	Delete course	Admin	-
POST	/:courseId/assign-teacher	Assign teacher to course	Admin	{ teacherId }
GET	/stats	Get course statistics	Admin	-
📝 Sample Request - Add Course
json
POST /api/admin/courses
{
  "name": "Introduction to Programming",
  "code": "CS101",
  "description": "Learn programming fundamentals",
  "teacherId": "60d21b4667d0d8992e610c85",
  "credits": 3,
  "duration": "16 weeks",
  "department": "Computer Science",
  "level": "beginner",
  "maxStudents": 30
}
📝 Sample Request - Assign Teacher
json
POST /api/admin/courses/60d21b4667d0d8992e610c85/assign-teacher
{
  "teacherId": "60d21b4667d0d8992e610c86"
}
🟠 Schedule Management (/api/admin/schedules)
Method	Endpoint	Description	Access	Request Body
POST	/	Create schedule	Admin	{ courseId, teacherId, dayOfWeek, startTime, endTime, room, semester, academicYear }
GET	/	Get all schedules	Admin	Query: ?dayOfWeek=monday&teacherId=123&semester=Fall2024
GET	/:id	Get schedule by ID	Admin	-
PUT	/:id	Update schedule	Admin	{ room, startTime, endTime, status }
DELETE	/:id	Delete schedule	Admin	-
GET	/weekly	Get weekly schedule	Admin	Query: ?semester=Fall2024
📝 Sample Request - Create Schedule
json
POST /api/admin/schedules
{
  "courseId": "60d21b4667d0d8992e610c85",
  "teacherId": "60d21b4667d0d8992e610c86",
  "dayOfWeek": "monday",
  "startTime": "09:00",
  "endTime": "10:30",
  "room": "101",
  "building": "Science Block",
  "semester": "Fall 2026",
  "academicYear": "2026-2027"
}
🟠 Enrollment Management (/api/admin/enrollments)
Method	Endpoint	Description	Access	Request Body
POST	/	Enroll student	Admin	{ studentId, courseId, status }
POST	/bulk	Bulk enroll students	Admin	{ courseId, studentIds: [...] }
GET	/	Get all enrollments	Admin	Query: ?page=1&limit=10&studentId=123&courseId=456&status=enrolled
GET	/:id	Get enrollment by ID	Admin	-
GET	/student/:studentId	Get student's courses	Admin	Query: ?status=enrolled
PUT	/:id	Update enrollment	Admin	{ status, progress, grade, marksObtained }
DELETE	/:id	Remove enrollment	Admin	-
📝 Sample Request - Enroll Student
json
POST /api/admin/enrollments
{
  "studentId": "60d21b4667d0d8992e610c87",
  "courseId": "60d21b4667d0d8992e610c85",
  "status": "enrolled"
}
📝 Sample Request - Bulk Enroll
json
POST /api/admin/enrollments/bulk
{
  "courseId": "60d21b4667d0d8992e610c85",
  "studentIds": [
    "60d21b4667d0d8992e610c87",
    "60d21b4667d0d8992e610c88"
  ]
}
🟠 Reports & Analytics (/api/admin/reports)
Method	Endpoint	Description	Access
GET	/dashboard	Get dashboard statistics	Admin
GET	/students-count	Get detailed student statistics	Admin
GET	/courses-count	Get detailed course statistics	Admin
GET	/today-classes	Get today's classes with status	Admin
GET	/teacher-workload	Get teacher workload analysis	Admin
👨‍🏫 TEACHER MODULE ROUTES (/api/teacher)
📚 Teacher's Courses
Method	Endpoint	Description	Access
GET	/courses	Get assigned courses	Teacher
GET	/courses/:courseId/students	Get enrolled students in a course	Teacher
📊 Grade Management
Method	Endpoint	Description	Request Body
POST	/grades	Add grade for student	{ studentId, courseId, assessmentType, assessmentName, maxMarks, obtainedMarks, remarks }
PUT	/grades/:id	Update grade	{ obtainedMarks, remarks, ... }
GET	/grades/course/:courseId	Get all grades for a course	-
GET	/grades/student/:studentId	Get student's grades	-
📝 Sample Request - Add Grade
json
POST /api/teacher/grades
{
  "studentId": "60d21b4667d0d8992e610c87",
  "courseId": "60d21b4667d0d8992e610c85",
  "assessmentType": "assignment",
  "assessmentName": "Assignment 1",
  "maxMarks": 100,
  "obtainedMarks": 85,
  "remarks": "Good work!"
}
📅 Schedule Management
Method	Endpoint	Description	Access
GET	/schedules	Get teacher's class schedule	Teacher
PUT	/schedules/:id	Update schedule (status/room)	Teacher
💬 Remarks
Method	Endpoint	Description	Request Body
POST	/remarks	Add remark for student	{ studentId, courseId, remark }
GET	/remarks/student/:studentId	Get student's remarks	-
📝 Sample Request - Add Remark
json
POST /api/teacher/remarks
{
  "studentId": "60d21b4667d0d8992e610c87",
  "courseId": "60d21b4667d0d8992e610c85",
  "remark": "Good progress in class"
}
🧑‍🎓 STUDENT MODULE ROUTES (/api/student)
👤 Student Profile
Method	Endpoint	Description	Access
GET	/profile	Get own profile	Student
PUT	/profile	Update profile	Student
📝 Sample Request - Update Profile
json
PUT /api/student/profile
{
  "contactNumber": "+1234567899",
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001"
  }
}
📚 Student's Courses
Method	Endpoint	Description	Access
GET	/courses	Get enrolled courses	Student
GET	/courses/:courseId	Get course details	Student
📅 Student's Schedule
Method	Endpoint	Description	Access
GET	/schedule	Get class schedule	Student
📊 Student's Grades
Method	Endpoint	Description	Access
GET	/grades	Get all grades	Student
GET	/grades/course/:courseId	Get course-wise grades	Student
📈 Student's Progress
Method	Endpoint	Description	Access
GET	/progress	Get overall progress	Student
🔧 COMMON ROUTES (For both Teachers & Students)
👥 Account Routes (/api/account)
Method	Endpoint	Description	Access
GET	/profile	Get my profile	Teacher/Student
PUT	/profile	Update my profile	Teacher/Student
PUT	/change-password	Change password	Teacher/Student
GET	/notifications	Get notifications	Teacher/Student
📅 Calendar Routes (/api/calendar)
Method	Endpoint	Description	Access
GET	/schedule	Get my schedule	Teacher/Student
GET	/events	Get upcoming events	Teacher/Student
POST	/attendance	Mark attendance	Teacher
💬 Message Routes (/api/messages)
Method	Endpoint	Description	Access
GET	/messages	Get my messages	Teacher/Student
POST	/messages	Send message	Teacher/Student
DELETE	/messages/:id	Delete message	Teacher/Student
📊 Dashboard Routes (/api/dashboard)
Method	Endpoint	Description	Access
GET	/stats	Get dashboard stats	Teacher/Student
GET	/recent-activity	Get recent activity	Teacher/Student
GET	/announcements	Get announcements	Teacher/Student
🔔 Notification Routes (/api/notifications)
Method	Endpoint	Description	Access
GET	/	Get notifications	Teacher/Student
PUT	/:id/read	Mark as read	Teacher/Student
DELETE	/clear	Clear all notifications	Teacher/Student
📚 Library Routes (/api/library)
Method	Endpoint	Description	Access
GET	/borrowed	Get borrowed books	Teacher/Student
GET	/search	Search books	Teacher/Student
POST	/request	Request book	Teacher/Student
💰 Fee Routes (/api/fees)
Method	Endpoint	Description	Access
GET	/fees	Get my fees	Student
POST	/pay	Pay fee	Student
GET	/history	Get fee history	Student
🧪 TEST ROUTES (/api/v1/test)
Method	Endpoint	Description	Access
GET	/public	Public route	Public
GET	/protected	Protected route	Any authenticated user
GET	/admin	Admin only route	Admin
GET	/teacher	Teacher route	Teacher/Admin
GET	/student	Student route	Student/Admin
GET	/staff	Staff route	Admin/Teacher
GET	/my-role	Get role information	Any authenticated user
📦 Postman Collection
📥 Import Postman Collection
Create a new Postman collection and add these requests:

Authentication
text
1. Register - POST {{base_url}}/api/v1/auth/register
2. Login - POST {{base_url}}/api/v1/auth/login
3. Get Profile - GET {{base_url}}/api/v1/auth/me
Admin Routes
text
4. Add Student - POST {{base_url}}/api/admin/students
5. Get All Students - GET {{base_url}}/api/admin/students
6. Get Student By ID - GET {{base_url}}/api/admin/students/:id
7. Update Student - PUT {{base_url}}/api/admin/students/:id
8. Delete Student - DELETE {{base_url}}/api/admin/students/:id

9. Add Teacher - POST {{base_url}}/api/admin/teachers
10. Get All Teachers - GET {{base_url}}/api/admin/teachers
11. Get Teacher By ID - GET {{base_url}}/api/admin/teachers/:id
12. Update Teacher - PUT {{base_url}}/api/admin/teachers/:id
13. Delete Teacher - DELETE {{base_url}}/api/admin/teachers/:id
14. Teacher Stats - GET {{base_url}}/api/admin/teachers/stats

15. Add Course - POST {{base_url}}/api/admin/courses
16. Get All Courses - GET {{base_url}}/api/admin/courses
17. Get Course By ID - GET {{base_url}}/api/admin/courses/:id
18. Update Course - PUT {{base_url}}/api/admin/courses/:id
19. Delete Course - DELETE {{base_url}}/api/admin/courses/:id
20. Assign Teacher - POST {{base_url}}/api/admin/courses/:courseId/assign-teacher
21. Course Stats - GET {{base_url}}/api/admin/courses/stats

22. Create Schedule - POST {{base_url}}/api/admin/schedules
23. Get All Schedules - GET {{base_url}}/api/admin/schedules
24. Get Schedule By ID - GET {{base_url}}/api/admin/schedules/:id
25. Update Schedule - PUT {{base_url}}/api/admin/schedules/:id
26. Delete Schedule - DELETE {{base_url}}/api/admin/schedules/:id
27. Weekly Schedule - GET {{base_url}}/api/admin/schedules/weekly

28. Enroll Student - POST {{base_url}}/api/admin/enrollments
29. Bulk Enroll - POST {{base_url}}/api/admin/enrollments/bulk
30. Get All Enrollments - GET {{base_url}}/api/admin/enrollments
31. Get Enrollment By ID - GET {{base_url}}/api/admin/enrollments/:id
32. Get Student Courses - GET {{base_url}}/api/admin/enrollments/student/:studentId
33. Update Enrollment - PUT {{base_url}}/api/admin/enrollments/:id
34. Delete Enrollment - DELETE {{base_url}}/api/admin/enrollments/:id

35. Dashboard Stats - GET {{base_url}}/api/admin/reports/dashboard
36. Students Count - GET {{base_url}}/api/admin/reports/students-count
37. Courses Count - GET {{base_url}}/api/admin/reports/courses-count
38. Today Classes - GET {{base_url}}/api/admin/reports/today-classes
39. Teacher Workload - GET {{base_url}}/api/admin/reports/teacher-workload
Teacher Routes
text
40. Get Teacher Courses - GET {{base_url}}/api/teacher/courses
41. Get Course Students - GET {{base_url}}/api/teacher/courses/:courseId/students
42. Add Grade - POST {{base_url}}/api/teacher/grades
43. Update Grade - PUT {{base_url}}/api/teacher/grades/:id
44. Get Course Grades - GET {{base_url}}/api/teacher/grades/course/:courseId
45. Get Student Grades - GET {{base_url}}/api/teacher/grades/student/:studentId
46. Get Teacher Schedule - GET {{base_url}}/api/teacher/schedules
47. Update Schedule - PUT {{base_url}}/api/teacher/schedules/:id
48. Add Remark - POST {{base_url}}/api/teacher/remarks
49. Get Student Remarks - GET {{base_url}}/api/teacher/remarks/student/:studentId
Student Routes
text
50. Get Student Profile - GET {{base_url}}/api/student/profile
51. Update Student Profile - PUT {{base_url}}/api/student/profile
52. Get Student Courses - GET {{base_url}}/api/student/courses
53. Get Course Details - GET {{base_url}}/api/student/courses/:courseId
54. Get Student Schedule - GET {{base_url}}/api/student/schedule
55. Get All Grades - GET {{base_url}}/api/student/grades
56. Get Course Grades - GET {{base_url}}/api/student/grades/course/:courseId
57. Get Student Progress - GET {{base_url}}/api/student/progress
Common Routes
text
58. Get Account Profile - GET {{base_url}}/api/account/profile
59. Update Account Profile - PUT {{base_url}}/api/account/profile
60. Change Password - PUT {{base_url}}/api/account/change-password
61. Get Notifications - GET {{base_url}}/api/account/notifications

62. Get Calendar Schedule - GET {{base_url}}/api/calendar/schedule
63. Get Upcoming Events - GET {{base_url}}/api/calendar/events
64. Mark Attendance - POST {{base_url}}/api/calendar/attendance

65. Get Messages - GET {{base_url}}/api/messages/messages
66. Send Message - POST {{base_url}}/api/messages/messages
67. Delete Message - DELETE {{base_url}}/api/messages/messages/:id

68. Get Dashboard Stats - GET {{base_url}}/api/dashboard/stats
69. Get Recent Activity - GET {{base_url}}/api/dashboard/recent-activity
70. Get Announcements - GET {{base_url}}/api/dashboard/announcements

71. Get Notifications List - GET {{base_url}}/api/notifications
72. Mark Notification Read - PUT {{base_url}}/api/notifications/:id/read
73. Clear All Notifications - DELETE {{base_url}}/api/notifications/clear

74. Get Borrowed Books - GET {{base_url}}/api/library/borrowed
75. Search Books - GET {{base_url}}/api/library/search?query=programming
76. Request Book - POST {{base_url}}/api/library/request

77. Get My Fees - GET {{base_url}}/api/fees/fees
78. Pay Fee - POST {{base_url}}/api/fees/pay
79. Get Fee History - GET {{base_url}}/api/fees/history
Test Routes
text
80. Public Route - GET {{base_url}}/api/v1/test/public
81. Protected Route - GET {{base_url}}/api/v1/test/protected
82. Admin Route - GET {{base_url}}/api/v1/test/admin
83. Teacher Route - GET {{base_url}}/api/v1/test/teacher
84. Student Route - GET {{base_url}}/api/v1/test/student
85. Staff Route - GET {{base_url}}/api/v1/test/staff
86. My Role - GET {{base_url}}/api/v1/test/my-role
🔧 Environment Variables for Postman
Create a new environment in Postman with:

json
{
  "base_url": "http://localhost:5000",
  "admin_token": "",
  "teacher_token": "",
  "student_token": "",
  "student_id": "",
  "teacher_id": "",
  "course_id": "",
  "enrollment_id": ""
}
