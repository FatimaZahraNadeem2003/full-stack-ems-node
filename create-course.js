const mongoose = require('mongoose');
const { Course, Teacher } = require('./models');

const MONGO_URI = 'mongodb://localhost:27017/EMS';

async function createSampleCourse() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    const teacher = await Teacher.findOne();
    if (!teacher) {
      console.log('❌ No teacher found');
      await mongoose.connection.close();
      return;
    }
    
    console.log(`Found teacher: ${teacher.userId}`);
    
    const course = await Course.create({
      name: 'Mathematics 101',
      code: 'MATH101',
      description: 'Basic Mathematics Course for beginners',
      teacherId: teacher._id,
      credits: 3,
      duration: '16 weeks',
      department: 'Mathematics',
      level: 'beginner',
      maxStudents: 30,
      status: 'active'
    });
    
    console.log('✅ Sample course created:');
    console.log(`Course ID: ${course._id}`);
    console.log(`Name: ${course.name}`);
    console.log(`Code: ${course.code}`);
    console.log(`Teacher ID: ${course.teacherId}`);
    
    await mongoose.connection.close();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createSampleCourse();