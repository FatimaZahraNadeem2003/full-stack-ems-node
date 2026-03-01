require("express-async-errors");
require("dotenv").config({ path: "./.env" });

const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'JWT_LIFETIME', 'PORT'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

const express = require("express");
const cors = require("cors");
const app = express();

const helmet = require("helmet");
const xss = require("xss-clean");
const rateLimiter = require("express-rate-limit");

const connectDB = require("./db/connect");

const authRouter = require('./routes/auth');
const userRouter = require('./routes/user');
const testRoutes = require('./routes/test');

const studentRoutes = require('./routes/studentRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const courseRoutes = require('./routes/courseRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const enrollmentRoutes = require('./routes/enrollmentRoutes');
const reportsRoutes = require('./routes/reportsRoutes');

const accountRoutes = require('./routes/accountRoutes');
const calendarRoutes = require('./routes/calendarRoutes');
const messageRoutes = require('./routes/messageRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const libraryRoutes = require('./routes/libraryRoutes');
const feeRoutes = require('./routes/feeRoutes');

const notFoundMiddleware = require('./middleware/not-found');
const errorHandlerMiddleware = require('./middleware/error-handler');

app.set('trust proxy', 1);
app.use(
  rateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  })
);
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(xss());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);

app.use("/api/admin/students", studentRoutes);
app.use("/api/admin/teachers", teacherRoutes);
app.use("/api/admin/courses", courseRoutes);
app.use("/api/admin/schedules", scheduleRoutes);
app.use("/api/admin/enrollments", enrollmentRoutes);
app.use("/api/teacher/enrollments", enrollmentRoutes);
app.use("/api/student/enrollments", enrollmentRoutes);
app.use("/api/admin/reports", reportsRoutes);

app.use("/api/teacher", teacherRoutes);
app.use("/api/student", studentRoutes);

app.use("/api/account", accountRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/library", libraryRoutes);
app.use("/api/fees", feeRoutes);

app.use("/api/v1/test", testRoutes);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    msg: "Education Management System API",
    version: "1.0.0",
    timestamp: new Date().toISOString()
  });
});

app.get("/api/v1", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Education Management System API",
    endpoints: {
      auth: {
        register: "POST /api/v1/auth/register",
        login: "POST /api/v1/auth/login",
        profile: "GET /api/v1/auth/me",
        admin: "GET /api/v1/auth/admin",
        teacher: "GET /api/v1/auth/teacher",
        student: "GET /api/v1/auth/student"
      },
      users: {
        search: "GET /api/v1/users/search?searchQuery=xyz",
        getAll: "GET /api/v1/users",
        getOne: "GET /api/v1/users/:id",
        update: "PUT /api/v1/users/:id",
        delete: "DELETE /api/v1/users/:id"
      }
    }
  });
});

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

const port = process.env.PORT || 5000;

const start = async () => {
  try {
    await connectDB();
    app.listen(port, () => {
      console.log(`✅ Server is running on port ${port}`);
    });
  } catch (error) {
    console.error('❌ Server startup error:', error);
    process.exit(1);
  }
};

start();