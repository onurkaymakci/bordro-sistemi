require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const masterRoutes = require('./routes/master.routes');
const authRoutes = require('./routes/auth.routes');
const companyRoutes = require('./routes/company.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const employeeRoutes = require('./routes/employee.routes');
const documentRoutes = require('./routes/document.routes');
const leaveRoutes = require('./routes/leave.routes');
const reportRoutes = require('./routes/report.routes');
const userRoutes = require('./routes/user.routes');
const systemParameterRoutes = require('./routes/system-parameter.routes');

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use(express.static(path.join(__dirname, 'public')));

/* API ROUTES */

app.use('/api/auth', authRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/master', masterRoutes);
app.use('/api/system-parameters', systemParameterRoutes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/login.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/dashboard.html'));
});

app.get('/system-parameters', (req, res) => {
    res.sendFile(
        path.join(
            __dirname,
            '../views/system-parameters.html'
        )
    );
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'personel-yonetim-sistemi'
  });
});

app.get('/personel', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/personel.html'));
});

app.get('/evrak', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/evrak.html'));
});

app.get('/izin', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/izin.html'));
});

app.get('/raporlar', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/raporlar.html'));
});

module.exports = app;