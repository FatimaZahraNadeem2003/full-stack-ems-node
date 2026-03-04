const mongoose = require('mongoose');
const { User, Student, Teacher, Course, Enrollment, Schedule } = require('./models');

const MONGO_URI = 'mongodb://localhost:27017/EMS';

async function populateData() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    const userCount = await User.countDocuments();
    const studentCount = await Student.countDocuments();
    const teacherCount = await Teacher.countDocuments();
    const courseCount = await Course.countDocuments();
    
    console.log('\n📊 Current Database Statistics:');
    console.log('====================');
    console.log(`Users: ${userCount}`);
    console.log(`Students: ${studentCount}`);
    console.log(`Teachers: ${teacherCount}`);
    console.log(`Courses: ${courseCount}`);
    
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('\n❌ No admin user found. Please register an admin first.');
      await mongoose.connection.close();
      return;
    }
    console.log(`\n✅ Admin user found: ${adminUser.email}`);
    
    let teacher = await Teacher.findOne();
    if (!teacher) {
      console.log('\n📝 Creating sample teacher...');
      const teacherUser = await User.create({
        firstName: 'John',
        lastName: 'Doe',
        email: `john.doe${Date.now()}@ems.com`,
        password: 'teacher123',
        role: 'teacher'
      });
      
      teacher = await Teacher.create({
        userId: teacherUser._id,
        employeeId: `TCH${Date.now()}`,
        qualification: 'M.Sc Computer Science',
        specialization: 'Mathematics',
        experience: 5,
        contactNumber: '+1234567890',
        status: 'active'
      });
      console.log('✅ Teacher created');
    } else {
      console.log(`\n✅ Teacher found: ${teacher.userId}`);
    }
    
    let student = await Student.findOne();
    if (!student) {
      console.log('\n📝 Creating sample student...');
      const studentUser = await User.create({
        firstName: 'Alice',
        lastName: 'Smith',
        email: `alice.smith${Date.now()}@ems.com`,
        password: 'student123',
        role: 'student'
      });
      
      student = await Student.create({
        userId: studentUser._id,
        class: '10th',
        section: 'A',
        rollNumber: `STU${Date.now()}`,
        contactNumber: '+1234567891',
        parentName: 'Bob Smith',
        parentContact: '+1234567892',
        status: 'active'
      });
      console.log('✅ Student created');
    } else {
      console.log(`\n✅ Student found: ${student.userId}`);
    }
    
    console.log('\n📚 Creating courses...');
    const courses = [];
    const courseData = [
      { name: 'Mathematics 101', code: 'MATH101', department: 'Mathematics' },
      { name: 'Physics Fundamentals', code: 'PHYS101', department: 'Physics' },
      { name: 'Computer Science Basics', code: 'CS101', department: 'Computer Science' },
      { name: 'English Literature', code: 'ENG101', department: 'English' },
      { name: 'Chemistry Introduction', code: 'CHEM101', department: 'Chemistry' }
    ];
    
    for (const data of courseData) {
      const course = await Course.findOneAndUpdate(
        { code: data.code },
        {
          ...data,
          description: `${data.name} - Comprehensive course`,
          teacherId: teacher._id,
          credits: 3,
          duration: '16 weeks',
          level: 'beginner',
          maxStudents: 30,
          status: 'active'
        },
        { upsert: true, new: true }
      );
      courses.push(course);
      console.log(`  ✅ Course created: ${course.name}`);
    }
    
    console.log('\n📝 Creating enrollments...');
    for (let i = 0; i < Math.min(3, courses.length); i++) {
      await Enrollment.findOneAndUpdate(
        {
          studentId: student._id,
          courseId: courses[i]._id
        },
        {
          studentId: student._id,
          courseId: courses[i]._id,
          status: 'enrolled',
          progress: 0
        },
        { upsert: true }
      );
      console.log(`  ✅ Enrolled student in: ${courses[i].name}`);
    }
    
    console.log('\n📅 Creating class schedules...');
    const today = new Date();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayDay = days[today.getDay()];
    
    for (let i = 0; i < Math.min(2, courses.length); i++) {
      await Schedule.findOneAndUpdate(
        {
          courseId: courses[i]._id,
          dayOfWeek: todayDay
        },
        {
          courseId: courses[i]._id,
          teacherId: teacher._id,
          dayOfWeek: todayDay,
          startTime: `${9 + i}:00`,
          endTime: `${10 + i}:00`,
          room: `Room ${i + 1}`,
          building: 'Main Building',
          semester: 'Fall',
          academicYear: '2024-2025',
          status: 'scheduled'
        },
        { upsert: true }
      );
      console.log(`  ✅ Schedule created for: ${courses[i].name}`);
    }
    
    console.log('\n✅ Sample data population completed!');
    console.log('\n📊 Final Statistics:');
    console.log('====================');
    console.log(`Total Students: ${await Student.countDocuments()}`);
    console.log(`Total Teachers: ${await Teacher.countDocuments()}`);
    console.log(`Total Courses: ${await Course.countDocuments()}`);
    console.log(`Total Enrollments: ${await Enrollment.countDocuments()}`);
    console.log(`Total Schedules: ${await Schedule.countDocuments()}`);
    
    await mongoose.connection.close();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

populateData();