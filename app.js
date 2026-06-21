require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const packageJson = require('./package.json');

const authRoutes = require('./src/routes/auth');
const telemedRoutes = require('./src/routes/telemed');
const settingsRoutes = require('./src/routes/settings');
const queryToolRoutes = require('./src/routes/queryTool');
const executiveRoutes = require('./src/routes/executive');
const adminUsersRoutes = require('./src/routes/adminUsers');
const todayPatientsRoutes = require('./src/routes/todayPatients');
const { ensureAuth, ensureRole } = require('./src/middleware/auth');

const app = express();
const port = Number(process.env.PORT || 4300);
const enableHsts = String(process.env.ENABLE_HSTS || '').trim().toLowerCase() === 'true';
const enableHttpsUpgrade = String(process.env.ENABLE_HTTPS_UPGRADE || '').trim().toLowerCase() === 'true';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.locals.assetVersion = process.env.ASSET_VERSION || `${packageJson.version}-${Date.now()}`;

app.use(helmet({
  hsts: enableHsts,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
      fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      upgradeInsecureRequests: enableHttpsUpgrade ? [] : null
    }
  }
}));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  name: 'telemed.sid',
  secret: process.env.SESSION_SECRET || 'replace-this-development-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 1000 * 60 * 60 * 8
  }
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false
}));

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.assetVersion = app.locals.assetVersion;
  next();
});

app.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/telemed');
  return res.redirect('/login');
});

app.use('/', authRoutes);
app.use('/telemed', ensureAuth, telemedRoutes);
app.use('/executive', ensureAuth, ensureRole(['admin', 'executive']), executiveRoutes);
app.use('/', ensureAuth, ensureRole(['admin', 'executive']), todayPatientsRoutes.publicRouter);
app.use('/settings', ensureAuth, ensureRole(['admin']), settingsRoutes);
app.use('/admin/query-tool', ensureAuth, ensureRole(['admin']), queryToolRoutes);
app.use('/admin/users', ensureAuth, ensureRole(['admin']), adminUsersRoutes);
app.use('/', ensureAuth, ensureRole(['admin']), todayPatientsRoutes.adminRouter);
app.use('/admin', ensureAuth, ensureRole(['admin']), (req, res) => {
  res.status(404).render('errors/404', { title: 'ไม่พบหน้า' });
});

app.use((req, res) => {
  res.status(404).render('errors/404', { title: 'ไม่พบหน้า' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('errors/500', { title: 'เกิดข้อผิดพลาด', error: err });
});

app.listen(port, () => {
  console.log(`Telemed Dashboard running at http://localhost:${port}`);
});
