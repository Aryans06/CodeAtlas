/* ═══════════════════════════════════════════════════════════
   CodeAtlas — Main Application Logic (Enhanced)
   ═══════════════════════════════════════════════════════════ */

// ── Mock file contents for preview ──
const MOCK_FILE_CONTENTS = {
  'authController.js': `const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.register = async (req, res) => {
  const { name, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, password: hashedPassword });
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
  res.status(201).json({ token, user: { id: user._id, name } });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !await bcrypt.compare(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user: { id: user._id, name: user.name } });
};

exports.refreshToken = async (req, res) => {
  const { token } = req.body;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const newToken = jwt.sign({ id: decoded.id }, process.env.JWT_SECRET, { expiresIn: '24h' });
  res.json({ token: newToken });
};`,
  'userController.js': `const User = require('../models/User');

exports.getProfile = async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  res.json(user);
};

exports.updateProfile = async (req, res) => {
  const { name, email } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user.id, { name, email }, { new: true }
  ).select('-password');
  res.json(user);
};`,
  'projectController.js': `const Project = require('../models/Project');

exports.getAll = async (req, res) => {
  const projects = await Project.find({ owner: req.user.id });
  res.json(projects);
};

exports.create = async (req, res) => {
  const project = await Project.create({ ...req.body, owner: req.user.id });
  res.status(201).json(project);
};

exports.getById = async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  res.json(project);
};`,
  'auth.js': `const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

module.exports = { authenticate, authorize };`,
  'validate.js': `const { body, validationResult } = require('express-validator');

const schemas = {
  register: [
    body('name').trim().notEmpty(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
  ],
  login: [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
};

const validate = (schema) => [
  ...schemas[schema],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  },
];

module.exports = { validate };`,
  'errorHandler.js': `const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid ID format' });
  }
  if (err.code === 11000) {
    return res.status(409).json({ error: 'Duplicate entry' });
  }

  res.status(500).json({ error: 'Internal server error' });
};

module.exports = errorHandler;`,
  'User.js': `const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 8 },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);`,
  'Project.js': `const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['active', 'archived'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Project', projectSchema);`,
  'server.js': `const express = require('express');
const cors = require('cors');
const { connectDB } = require('./src/config/db');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();
app.use(cors());
app.use(express.json());

connectDB();

app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/users', require('./src/routes/users'));
app.use('/api/projects', require('./src/routes/projects'));

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(\`Server running on port \${PORT}\`));`,
  'package.json': `{
  "name": "my-app",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.0",
    "mongoose": "^7.0.0"
  }
}`,
  '.env': `PORT=3000
MONGODB_URI=mongodb://localhost:27017/myapp
JWT_SECRET=your-secret-key-here
NODE_ENV=development`,
  'README.md': `# My App

A RESTful API built with Express.js and MongoDB.

## Setup
1. Install dependencies: \`npm install\`
2. Create \`.env\` file with required variables
3. Run: \`npm run dev\`

## API Endpoints
- POST /api/auth/register
- POST /api/auth/login
- GET /api/users/me
- CRUD /api/projects`,
  'db.js': `const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('DB connection error:', err);
    process.exit(1);
  }
};

module.exports = { connectDB };`,
  'env.js': `require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  nodeEnv: process.env.NODE_ENV || 'development',
};`,
  'helpers.js': `const crypto = require('crypto');

exports.generateId = () => crypto.randomUUID();

exports.formatDate = (date) => {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium', timeStyle: 'short'
  }).format(new Date(date));
};

exports.paginate = (query, page = 1, limit = 10) => {
  return query.skip((page - 1) * limit).limit(limit);
};`,
  'constants.js': `module.exports = {
  ROLES: { USER: 'user', ADMIN: 'admin' },
  STATUS: { ACTIVE: 'active', ARCHIVED: 'archived' },
  PAGINATION: { DEFAULT_PAGE: 1, DEFAULT_LIMIT: 10 },
};`,
  'authService.js': `const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');

exports.generateToken = (payload) => {
  return jwt.sign(payload, jwtSecret, { expiresIn: '24h' });
};

exports.verifyToken = (token) => {
  return jwt.verify(token, jwtSecret);
};`,
  'emailService.js': `// Email service placeholder
exports.sendWelcomeEmail = async (email, name) => {
  console.log(\`Sending welcome email to \${name} <\${email}>\`);
  // TODO: Integrate with email provider
};

exports.sendResetEmail = async (email, token) => {
  console.log(\`Sending reset email to \${email}\`);
};`,
  'index.js': `const router = require('express').Router();
const { authenticate } = require('../middleware/auth');

router.use('/auth', require('./auth'));
router.use('/users', authenticate, require('./users'));
router.use('/projects', authenticate, require('./projects'));

module.exports = router;`,
  'users.js': `const router = require('express').Router();
const userCtrl = require('../controllers/userController');
const { authorize } = require('../middleware/auth');

router.get('/me', userCtrl.getProfile);
router.put('/me', userCtrl.updateProfile);
router.get('/:id', authorize('admin'), userCtrl.getProfile);

module.exports = router;`,
  'projects.js': `const router = require('express').Router();
const projectCtrl = require('../controllers/projectController');

router.get('/', projectCtrl.getAll);
router.post('/', projectCtrl.create);
router.get('/:id', projectCtrl.getById);

module.exports = router;`,
  'auth.test.js': `const request = require('supertest');
const app = require('../server');

describe('Auth Endpoints', () => {
  it('should register a new user', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test User', email: 'test@example.com', password: 'password123'
    });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('token');
  });
});`,
  'users.test.js': `const request = require('supertest');
const app = require('../server');

describe('User Endpoints', () => {
  it('should get current user profile', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Bearer valid-token');
    expect(res.statusCode).toBe(200);
  });
});`,
};

// ── Mock AI Responses ──
const MOCK_RESPONSES = {
  'Where is authentication handled?': {
    text: `<p>Authentication in this codebase is handled across several key files:</p>
<p>The main authentication middleware lives in <span class="code-ref" data-file="src/middleware/auth.js" data-lines="12-45">src/middleware/auth.js</span>. It uses JWT tokens to validate user sessions on every protected route.</p>
<p>The login and registration logic is in <span class="code-ref" data-file="src/controllers/authController.js" data-lines="1-38">src/controllers/authController.js</span>, which handles:</p>
<ul><li>Password hashing with bcrypt</li><li>Token generation and refresh</li><li>Session management</li></ul>
<pre>// src/middleware/auth.js
const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};</pre>
<p>Route protection is applied in <span class="code-ref" data-file="src/routes/index.js" data-lines="8-22">src/routes/index.js</span> where the middleware is attached to protected route groups.</p>`,
    snippets: [
      { file: 'src/middleware/auth.js', lines: '12-45',
        code: `<span class="line-num">12</span><span class="keyword">const</span> jwt = <span class="function">require</span>(<span class="string">'jsonwebtoken'</span>);
<span class="line-num">13</span>
<span class="line-num">14</span><span class="keyword">const</span> <span class="function">authenticate</span> = (req, res, next) => {
<span class="line-num">15</span>  <span class="keyword">const</span> token = req.headers.authorization?.<span class="function">split</span>(<span class="string">' '</span>)[<span class="number">1</span>];
<span class="line-num">16</span>  <span class="keyword">if</span> (!token) {
<span class="line-num">17</span>    <span class="keyword">return</span> res.<span class="function">status</span>(<span class="number">401</span>).<span class="function">json</span>({ error: <span class="string">'Unauthorized'</span> });
<span class="line-num">18</span>  }
<span class="line-num">19</span>  <span class="keyword">try</span> {
<span class="line-num">20</span>    <span class="keyword">const</span> decoded = jwt.<span class="function">verify</span>(token, process.env.JWT_SECRET);
<span class="line-num">21</span>    req.user = decoded;
<span class="line-num">22</span>    <span class="function">next</span>();
<span class="line-num">23</span>  } <span class="keyword">catch</span> (err) {
<span class="line-num">24</span>    <span class="keyword">return</span> res.<span class="function">status</span>(<span class="number">403</span>).<span class="function">json</span>({ error: <span class="string">'Invalid token'</span> });
<span class="line-num">25</span>  }
<span class="line-num">26</span>};` },
      { file: 'src/controllers/authController.js', lines: '1-24',
        code: `<span class="line-num"> 1</span><span class="keyword">const</span> bcrypt = <span class="function">require</span>(<span class="string">'bcryptjs'</span>);
<span class="line-num"> 2</span><span class="keyword">const</span> jwt = <span class="function">require</span>(<span class="string">'jsonwebtoken'</span>);
<span class="line-num"> 3</span><span class="keyword">const</span> User = <span class="function">require</span>(<span class="string">'../models/User'</span>);
<span class="line-num"> 4</span>
<span class="line-num"> 5</span><span class="keyword">exports</span>.<span class="function">login</span> = <span class="keyword">async</span> (req, res) => {
<span class="line-num"> 6</span>  <span class="keyword">const</span> { email, password } = req.body;
<span class="line-num"> 7</span>  <span class="keyword">const</span> user = <span class="keyword">await</span> User.<span class="function">findOne</span>({ email });
<span class="line-num"> 8</span>  <span class="keyword">if</span> (!user) <span class="keyword">return</span> res.<span class="function">status</span>(<span class="number">401</span>).<span class="function">json</span>({});
<span class="line-num"> 9</span>  <span class="keyword">const</span> token = jwt.<span class="function">sign</span>({ id: user._id }, process.env.JWT_SECRET);
<span class="line-num">10</span>  res.<span class="function">json</span>({ token });
<span class="line-num">11</span>};` }
    ]
  },
  'Explain the project structure': {
    text: `<p>This project follows a well-organized <strong>MVC architecture</strong>:</p>
<pre>├── src/
│   ├── controllers/     # Request handlers
│   ├── middleware/       # Auth, validation, errors
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic layer
│   ├── utils/           # Helper functions
│   └── config/          # Environment & DB config
├── tests/               # Unit & integration tests
├── package.json
└── server.js            # Entry point</pre>
<p>The entry point is <span class="code-ref" data-file="server.js" data-lines="1-20">server.js</span> which initializes Express, connects to MongoDB, and mounts route groups.</p>
<p>Key architectural decisions:</p>
<ul><li><strong>Service layer</strong> separates business logic from controllers</li><li><strong>Middleware chain</strong> handles auth, rate limiting, and validation</li><li><strong>Centralized error handling</strong> via <span class="code-ref" data-file="src/middleware/errorHandler.js" data-lines="1-30">errorHandler.js</span></li></ul>`,
    snippets: [{ file: 'server.js', lines: '1-20',
      code: `<span class="line-num"> 1</span><span class="keyword">const</span> express = <span class="function">require</span>(<span class="string">'express'</span>);
<span class="line-num"> 2</span><span class="keyword">const</span> cors = <span class="function">require</span>(<span class="string">'cors'</span>);
<span class="line-num"> 3</span><span class="keyword">const</span> { connectDB } = <span class="function">require</span>(<span class="string">'./src/config/db'</span>);
<span class="line-num"> 4</span>
<span class="line-num"> 5</span><span class="keyword">const</span> app = <span class="function">express</span>();
<span class="line-num"> 6</span>app.<span class="function">use</span>(cors());
<span class="line-num"> 7</span>app.<span class="function">use</span>(express.<span class="function">json</span>());
<span class="line-num"> 8</span><span class="function">connectDB</span>();
<span class="line-num"> 9</span>
<span class="line-num">10</span>app.<span class="function">use</span>(<span class="string">'/api/auth'</span>, <span class="function">require</span>(<span class="string">'./src/routes/auth'</span>));
<span class="line-num">11</span>app.<span class="function">use</span>(<span class="string">'/api/users'</span>, <span class="function">require</span>(<span class="string">'./src/routes/users'</span>));
<span class="line-num">12</span>app.<span class="function">use</span>(<span class="string">'/api/projects'</span>, <span class="function">require</span>(<span class="string">'./src/routes/projects'</span>));
<span class="line-num">13</span>
<span class="line-num">14</span><span class="keyword">const</span> PORT = process.env.PORT || <span class="number">3000</span>;
<span class="line-num">15</span>app.<span class="function">listen</span>(PORT);` }]
  },
  'Find all API endpoints': {
    text: `<p>Here are all the API endpoints found:</p>
<p><strong>Auth</strong> (<span class="code-ref" data-file="src/routes/auth.js" data-lines="1-10">auth.js</span>)</p>
<pre>POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh-token
DELETE /api/auth/logout</pre>
<p><strong>Users</strong> (<span class="code-ref" data-file="src/routes/users.js" data-lines="1-8">users.js</span>)</p>
<pre>GET    /api/users/me
PUT    /api/users/me
GET    /api/users/:id  (admin)</pre>
<p><strong>Projects</strong> (<span class="code-ref" data-file="src/routes/projects.js" data-lines="1-8">projects.js</span>)</p>
<pre>GET    /api/projects
POST   /api/projects
GET    /api/projects/:id</pre>
<p>Total: <strong>10 endpoints</strong> across 3 modules.</p>`,
    snippets: [{ file: 'src/routes/auth.js', lines: '1-10',
      code: `<span class="line-num">1</span><span class="keyword">const</span> router = <span class="function">require</span>(<span class="string">'express'</span>).<span class="function">Router</span>();
<span class="line-num">2</span><span class="keyword">const</span> authCtrl = <span class="function">require</span>(<span class="string">'../controllers/authController'</span>);
<span class="line-num">3</span>
<span class="line-num">4</span>router.<span class="function">post</span>(<span class="string">'/register'</span>, authCtrl.register);
<span class="line-num">5</span>router.<span class="function">post</span>(<span class="string">'/login'</span>, authCtrl.login);
<span class="line-num">6</span>router.<span class="function">post</span>(<span class="string">'/refresh-token'</span>, authCtrl.refreshToken);
<span class="line-num">7</span>
<span class="line-num">8</span>module.exports = router;` }]
  },
  'Explain this file': {
    text: `<p>This is <span class="code-ref" data-file="server.js" data-lines="1-15">server.js</span> — the <strong>main entry point</strong>. It handles:</p>
<ul><li><strong>Express setup</strong> — CORS, JSON parsing</li><li><strong>Database</strong> — MongoDB connection via <code>connectDB()</code></li><li><strong>Routes</strong> — Mounts auth, users, projects APIs</li><li><strong>Error handling</strong> — Global error middleware</li></ul>
<p>The file follows the <strong>single responsibility principle</strong> well — it delegates all concerns to dedicated modules.</p>`,
    snippets: [{ file: 'server.js', lines: '1-15',
      code: `<span class="line-num"> 1</span><span class="keyword">const</span> express = <span class="function">require</span>(<span class="string">'express'</span>);
<span class="line-num"> 2</span><span class="keyword">const</span> cors = <span class="function">require</span>(<span class="string">'cors'</span>);
<span class="line-num"> 3</span><span class="function">connectDB</span>();
<span class="line-num"> 4</span>
<span class="line-num"> 5</span>app.<span class="function">use</span>(<span class="string">'/api/auth'</span>, <span class="function">require</span>(<span class="string">'./src/routes/auth'</span>));
<span class="line-num"> 6</span>app.<span class="function">use</span>(<span class="string">'/api/users'</span>, <span class="function">require</span>(<span class="string">'./src/routes/users'</span>));
<span class="line-num"> 7</span>
<span class="line-num"> 8</span><span class="keyword">const</span> PORT = process.env.PORT || <span class="number">3000</span>;
<span class="line-num"> 9</span>app.<span class="function">listen</span>(PORT);` }]
  }
};

const DEFAULT_RESPONSE = {
  text: `<p>I've analyzed your question against the codebase. Based on the project structure, this uses a <strong>Node.js + Express</strong> backend with MVC architecture.</p>
<ul><li>MVC-style organization</li><li>JWT-based authentication</li><li>MongoDB with Mongoose</li></ul>
<p>Could you be more specific? I can help with file explanations, architecture, endpoints, or dependency analysis.</p>`,
  snippets: []
};

// ── File tree ──
const SAMPLE_FILE_TREE = [
  { name: 'src', type: 'folder', expanded: true, children: [
    { name: 'controllers', type: 'folder', expanded: false, children: [
      { name: 'authController.js', type: 'file' },
      { name: 'userController.js', type: 'file' },
      { name: 'projectController.js', type: 'file' }
    ]},
    { name: 'middleware', type: 'folder', expanded: false, children: [
      { name: 'auth.js', type: 'file' },
      { name: 'validate.js', type: 'file' },
      { name: 'errorHandler.js', type: 'file' }
    ]},
    { name: 'models', type: 'folder', expanded: false, children: [
      { name: 'User.js', type: 'file' },
      { name: 'Project.js', type: 'file' }
    ]},
    { name: 'routes', type: 'folder', expanded: false, children: [
      { name: 'auth.js', type: 'file' },
      { name: 'users.js', type: 'file' },
      { name: 'projects.js', type: 'file' },
      { name: 'index.js', type: 'file' }
    ]},
    { name: 'services', type: 'folder', expanded: false, children: [
      { name: 'authService.js', type: 'file' },
      { name: 'emailService.js', type: 'file' }
    ]},
    { name: 'utils', type: 'folder', expanded: false, children: [
      { name: 'helpers.js', type: 'file' },
      { name: 'constants.js', type: 'file' }
    ]},
    { name: 'config', type: 'folder', expanded: false, children: [
      { name: 'db.js', type: 'file' },
      { name: 'env.js', type: 'file' }
    ]}
  ]},
  { name: 'tests', type: 'folder', expanded: false, children: [
    { name: 'auth.test.js', type: 'file' },
    { name: 'users.test.js', type: 'file' }
  ]},
  { name: 'server.js', type: 'file' },
  { name: 'package.json', type: 'file' },
  { name: '.env', type: 'file' },
  { name: 'README.md', type: 'file' }
];

// ═══ DOM ═══
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const themeToggle=$('#themeToggle'),uploadBtn=$('#uploadBtn'),uploadModal=$('#uploadModal');
const modalClose=$('#modalClose'),cancelUpload=$('#cancelUpload'),confirmUpload=$('#confirmUpload');
const dropzone=$('#dropzone'),fileInput=$('#fileInput'),fileList=$('#fileList');
const fileListItems=$('#fileListItems'),fileCount=$('#fileCount'),clearFiles=$('#clearFiles');
const fileTree=$('#fileTree'),sidebarEmpty=$('#sidebarEmpty'),sidebarToggle=$('#sidebarToggle');
const sidebar=$('#sidebar'),chatMessages=$('#chatMessages'),chatWelcome=$('#chatWelcome');
const chatSuggestions=$('#chatSuggestions'),chatInput=$('#chatInput');
const sendBtn=$('#sendBtn'),attachBtn=$('#attachBtn');
const contextPanel=$('#contextPanel'),contextClose=$('#contextClose');
const contextEmpty=$('#contextEmpty'),contextSnippets=$('#contextSnippets');
const dragOverlay=$('#dragOverlay');
const chatView=$('#chatView');
const filePreview=$('#filePreview'),previewPath=$('#previewPath');
const previewSize=$('#previewSize'),previewCode=$('#previewCode');
const contextTitleText=$('#contextTitleText');

let pendingFiles=[],chatHistory=[];

// ═══ Theme ═══
function getTheme(){return localStorage.getItem('codeatlas-theme')||'dark'}
function setTheme(t){
  document.documentElement.setAttribute('data-theme',t);
  localStorage.setItem('codeatlas-theme',t);
  $('.theme-icon--dark').style.display=t==='dark'?'block':'none';
  $('.theme-icon--light').style.display=t==='light'?'block':'none';
}
setTheme(getTheme());
themeToggle.addEventListener('click',()=>setTheme(getTheme()==='dark'?'light':'dark'));

// ═══ Tab Navigation (removed — single page) ═══
function switchTab() {}

// ═══ Upload Modal ═══
function openModal(){uploadModal.style.display='flex'}
function closeModal(){uploadModal.style.display='none';pendingFiles=[];updateFileList()}
uploadBtn.addEventListener('click',openModal);
modalClose.addEventListener('click',closeModal);
cancelUpload.addEventListener('click',closeModal);
uploadModal.addEventListener('click',(e)=>{if(e.target===uploadModal)closeModal()});
dropzone.addEventListener('click',()=>fileInput.click());
dropzone.addEventListener('dragover',(e)=>{e.preventDefault();dropzone.classList.add('dragover')});
dropzone.addEventListener('dragleave',()=>dropzone.classList.remove('dragover'));
dropzone.addEventListener('drop',(e)=>{e.preventDefault();dropzone.classList.remove('dragover');handleFiles(e.dataTransfer.files)});
fileInput.addEventListener('change',(e)=>handleFiles(e.target.files));
function handleFiles(f){pendingFiles=[...pendingFiles,...Array.from(f)];updateFileList()}
function updateFileList(){
  if(!pendingFiles.length){fileList.style.display='none';confirmUpload.disabled=true;return}
  fileList.style.display='block';confirmUpload.disabled=false;
  fileCount.textContent=`${pendingFiles.length} file${pendingFiles.length!==1?'s':''} selected`;
  fileListItems.innerHTML=pendingFiles.map(f=>`<li><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 1h5l3 3v7a1 1 0 01-1 1H2a1 1 0 01-1-1V2a1 1 0 011-1z" stroke="currentColor" stroke-width="1"/><path d="M7 1v3h3" stroke="currentColor" stroke-width="1"/></svg>${f.webkitRelativePath||f.name}</li>`).join('');
}
clearFiles.addEventListener('click',()=>{pendingFiles=[];fileInput.value='';updateFileList()});
confirmUpload.addEventListener('click', async () => {
  if (pendingFiles.length === 0) return;

  // Build FormData with all files
  const formData = new FormData();
  pendingFiles.forEach(f => formData.append('files', f));

  // Update UI to show progress
  confirmUpload.disabled = true;
  confirmUpload.textContent = 'Indexing...';

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();

    if (res.ok) {
      console.log('✅ Upload complete:', data.stats);
      // Build file tree from uploaded files
      const tree = buildFileTree(pendingFiles.map(f => f.webkitRelativePath || f.name));
      loadFileTree(tree);
      closeModal();
    } else {
      alert('Upload failed: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    alert('Upload failed: ' + err.message + '. Is the backend running?');
  } finally {
    confirmUpload.disabled = false;
    confirmUpload.textContent = 'Upload Files';
  }
});

// Build a file tree structure from flat file paths
function buildFileTree(paths) {
  const root = [];
  
  paths.forEach(p => {
    const parts = p.split('/').filter(Boolean);
    let currentLevel = root;
    
    parts.forEach((part, i) => {
      const isFile = i === parts.length - 1;
      
      let existingNode = currentLevel.find(n => n.name === part);
      
      if (!existingNode) {
        existingNode = {
          name: part,
          type: isFile ? 'file' : 'folder',
          expanded: false
        };
        if (!isFile) {
          existingNode.children = [];
        }
        currentLevel.push(existingNode);
      }
      
      if (!isFile) {
        currentLevel = existingNode.children;
      }
    });
  });
  
  // Sort: folders first, then alphabetically
  function sortTree(nodes) {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach(n => {
      if (n.children) sortTree(n.children);
    });
  }
  sortTree(root);
  
  // Expand root level by default
  root.forEach(n => {
    if (n.type === 'folder') n.expanded = true;
  });
  
  return root;
}

// ═══ Drag & Drop ═══
let dragCounter=0;
document.addEventListener('dragenter',(e)=>{e.preventDefault();dragCounter++;if(dragCounter===1)dragOverlay.style.display='flex'});
document.addEventListener('dragleave',(e)=>{e.preventDefault();dragCounter--;if(dragCounter===0)dragOverlay.style.display='none'});
document.addEventListener('dragover',(e)=>e.preventDefault());
document.addEventListener('drop',(e)=>{e.preventDefault();dragCounter=0;dragOverlay.style.display='none';if(!e.target.closest('.dropzone')&&e.dataTransfer.files.length>0)loadFileTree(SAMPLE_FILE_TREE)});

// ═══ File Tree ═══
function loadFileTree(tree){sidebarEmpty.style.display='none';fileTree.style.display='block';fileTree.innerHTML='';renderTree(tree,fileTree,0)}
function renderTree(items,container,depth){
  items.forEach(item=>{
    if(item.type==='folder'){
      const el=document.createElement('div');el.className='tree-item tree-item--folder';el.style.paddingLeft=`${depth*18+8}px`;
      el.innerHTML=`<span class="tree-item__icon"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="${item.expanded?'M2 5L7 10L12 5':'M5 2L10 7L5 12'}" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="tree-item__icon"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1.5 2.5C1.5 2.22 1.72 2 2 2H5.09C5.22 2 5.35 2.05 5.44 2.15L6.35 3.06C6.45 3.15 6.57 3.21 6.71 3.21H12C12.28 3.21 12.5 3.43 12.5 3.71V11.5C12.5 11.78 12.28 12 12 12H2C1.72 12 1.5 11.78 1.5 11.5V2.5Z" stroke="currentColor" stroke-width="1.1" fill="${item.expanded?'var(--warning)':'none'}" fill-opacity="${item.expanded?'0.15':'0'}"/></svg></span><span class="tree-item__name">${item.name}</span>`;
      container.appendChild(el);
      const children=document.createElement('div');children.className=`tree-folder-children${item.expanded?'':' collapsed'}`;
      container.appendChild(children);
      el.addEventListener('click',()=>{item.expanded=!item.expanded;children.classList.toggle('collapsed');el.querySelector('.tree-item__icon svg path').setAttribute('d',item.expanded?'M2 5L7 10L12 5':'M5 2L10 7L5 12')});
      if(item.children)renderTree(item.children,children,depth+1);
    } else {
      const el=document.createElement('div');el.className='tree-item tree-item--file';el.style.paddingLeft=`${depth*18+8}px`;
      const ext=item.name.split('.').pop();const c=getFileIconColor(ext);
      el.innerHTML=`<span class="tree-item__icon" style="color:${c}"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 1.5H8.5L11 4V12.5H3V1.5Z" stroke="currentColor" stroke-width="1.1"/><path d="M8.5 1.5V4H11" stroke="currentColor" stroke-width="1.1"/></svg></span><span class="tree-item__name">${item.name}</span>`;
      el.addEventListener('click',()=>{$$('.tree-item.active').forEach(e=>e.classList.remove('active'));el.classList.add('active');showFilePreview(item.name)});
      container.appendChild(el);
    }
  });
}
function getFileIconColor(ext){return{js:'#F0DB4F',ts:'#3178C6',json:'#5B9A4F',md:'#519ABA',env:'#ECD53F',test:'#C21325'}[ext]||'var(--accent)'}

// ═══ File Preview ═══
function showFilePreview(fileName) {
  const content = MOCK_FILE_CONTENTS[fileName];
  if (!content) return;

  contextEmpty.style.display='none';
  contextSnippets.style.display='none';
  filePreview.style.display='flex';
  contextPanel.classList.remove('collapsed');
  contextTitleText.textContent='File Preview';

  if(window.innerWidth<=1100) contextPanel.classList.add('open');

  previewPath.textContent=fileName;
  const lines=content.split('\n');
  previewSize.textContent=`${lines.length} lines`;
  previewCode.innerHTML=lines.map((line,i)=>
    `<div class="line-row"><span class="line-num">${i+1}</span><span class="line-content">${escapeHtml(line)}</span></div>`
  ).join('');
}

// ═══ Sidebar Toggle ═══
sidebarToggle.addEventListener('click',()=>sidebar.classList.toggle('collapsed'));

// ═══ Context Panel ═══
contextClose.addEventListener('click',()=>{contextPanel.classList.add('collapsed');contextPanel.classList.remove('open')});
function showContextSnippets(snippets){
  if(!snippets||!snippets.length){contextEmpty.style.display='flex';contextSnippets.style.display='none';filePreview.style.display='none';return}
  contextEmpty.style.display='none';contextSnippets.style.display='block';filePreview.style.display='none';
  contextPanel.classList.remove('collapsed');contextTitleText.textContent='Context';
  if(window.innerWidth<=1100)contextPanel.classList.add('open');
  contextSnippets.innerHTML=snippets.map(s=>`<div class="context-snippet"><div class="context-snippet__header"><span class="context-snippet__file">${s.file}</span><span class="context-snippet__lines">L${s.lines}</span></div><div class="context-snippet__code">${s.code}</div></div>`).join('');
}

// ═══ Chat ═══
chatInput.addEventListener('input',()=>{chatInput.style.height='auto';chatInput.style.height=Math.min(chatInput.scrollHeight,150)+'px';sendBtn.disabled=!chatInput.value.trim()});
chatInput.addEventListener('keydown',(e)=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();if(chatInput.value.trim())sendMessage(chatInput.value.trim())}});
sendBtn.addEventListener('click',()=>{if(chatInput.value.trim())sendMessage(chatInput.value.trim())});
attachBtn.addEventListener('click',openModal);
chatSuggestions.addEventListener('click',(e)=>{const btn=e.target.closest('.chat__suggestion');if(btn)sendMessage(btn.dataset.question)});

async function sendMessage(text){
  // Hide welcome + landing sections when chat starts
  if(chatWelcome)chatWelcome.style.display='none';
  const landing=document.getElementById('landingSections');
  if(landing)landing.style.display='none';

  appendMessage('user',text);
  chatInput.value='';chatInput.style.height='auto';sendBtn.disabled=true;
  const typing=showTyping();

  try {
    // Call the real backend API
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: text }),
    });

    removeTyping(typing);

    if (!res.ok) {
      const err = await res.json();
      appendMessage('ai', `<p>⚠️ ${err.error || 'Something went wrong. Upload a codebase first.'}</p>`);
      scrollToBottom();
      return;
    }

    const data = await res.json();
    appendMessage('ai', formatAIResponse(data.answer));

    // Show source code snippets in the context panel
    if (data.sources && data.sources.length) {
      showContextSnippets(data.sources.map(s => ({
        file: s.file,
        lines: `L${s.startLine}-${s.endLine}`,
        code: s.preview,
        relevance: `${(s.score * 100).toFixed(0)}%`,
      })));
    }
    scrollToBottom();
  } catch (err) {
    removeTyping(typing);
    appendMessage('ai', `<p>❌ Network error: ${err.message}. Is the backend running? (<code>npm run server</code>)</p>`);
    scrollToBottom();
  }
}

// Format AI markdown-like response to HTML
function formatAIResponse(text) {
  return text
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');
}

function appendMessage(role,content){
  const now=new Date();const t=now.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  const el=document.createElement('div');el.className=`message message--${role}`;
  const isUser=role==='user';
  el.innerHTML=`<div class="message__avatar">${isUser?'U':'AI'}</div><div class="message__content"><div class="message__header"><span class="message__name">${isUser?'You':'CodeAtlas AI'}</span><span class="message__time">${t}</span></div><div class="message__body">${isUser?`<p>${escapeHtml(content)}</p>`:content}</div></div>`;
  chatMessages.appendChild(el);scrollToBottom();
  el.querySelectorAll('.code-ref').forEach(ref=>{ref.addEventListener('click',()=>{const file=ref.dataset.file;contextSnippets.querySelectorAll('.context-snippet').forEach(s=>{const sf=s.querySelector('.context-snippet__file');if(sf&&sf.textContent===file){s.style.boxShadow='0 0 0 2px var(--accent)';s.scrollIntoView({behavior:'smooth',block:'nearest'});setTimeout(()=>{s.style.boxShadow=''},2000)}})})});
  chatHistory.push({role,content});
}

function showTyping(){const el=document.createElement('div');el.className='message message--ai';el.innerHTML=`<div class="message__avatar">AI</div><div class="message__content"><div class="message__header"><span class="message__name">CodeAtlas AI</span></div><div class="typing-indicator"><span></span><span></span><span></span></div></div>`;chatMessages.appendChild(el);scrollToBottom();return el}
function removeTyping(el){if(el&&el.parentNode)el.parentNode.removeChild(el)}
function scrollToBottom(){chatMessages.scrollTo({top:chatMessages.scrollHeight,behavior:'smooth'})}
function escapeHtml(t){const d=document.createElement('div');d.appendChild(document.createTextNode(t));return d.innerHTML}

// ═══ Keyboard Shortcuts ═══
document.addEventListener('keydown',(e)=>{
  if(e.key==='Escape'&&uploadModal.style.display==='flex')closeModal();
  if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();chatInput.focus()}
});

// ═══════════════════════════════════════════════════════════
//  LIVING ANIMATIONS
// ═══════════════════════════════════════════════════════════

// ── Floating Ambient Orbs ──
function createAmbientOrbs() {
  const container = document.getElementById('ambientOrbs');
  if (!container) return;
  const orbs = [
    { cls: 'ambient-orb--purple', size: 300, duration: 25, x: '10%', drift: '60px' },
    { cls: 'ambient-orb--blue', size: 250, duration: 30, x: '70%', drift: '-40px' },
    { cls: 'ambient-orb--pink', size: 200, duration: 35, x: '40%', drift: '80px' },
    { cls: 'ambient-orb--purple', size: 180, duration: 28, x: '85%', drift: '-60px' },
    { cls: 'ambient-orb--blue', size: 220, duration: 32, x: '25%', drift: '50px' },
  ];
  orbs.forEach((o, i) => {
    const el = document.createElement('div');
    el.className = `ambient-orb ${o.cls}`;
    el.style.cssText = `width:${o.size}px;height:${o.size}px;left:${o.x};animation-duration:${o.duration}s;animation-delay:${i * 5}s;--drift:${o.drift}`;
    container.appendChild(el);
  });
}
createAmbientOrbs();

// ── Animated Placeholder Typing ──
function animatePlaceholder() {
  const placeholders = [
    'Ask anything about your codebase...',
    'Where is authentication handled?',
    'Explain the project architecture...',
    'Find all API endpoints...',
    'How does the middleware work?',
    'What does this function do?',
  ];
  let currentIdx = 0;
  let charIdx = 0;
  let isDeleting = false;
  let pauseTimer = 0;

  function tick() {
    if (document.activeElement === chatInput || chatInput.value) {
      requestAnimationFrame(tick);
      return;
    }
    const current = placeholders[currentIdx];
    if (!isDeleting) {
      charIdx++;
      if (charIdx > current.length) {
        pauseTimer++;
        if (pauseTimer > 60) { isDeleting = true; pauseTimer = 0; }
        requestAnimationFrame(tick);
        return;
      }
    } else {
      charIdx--;
      if (charIdx < 0) {
        charIdx = 0;
        isDeleting = false;
        currentIdx = (currentIdx + 1) % placeholders.length;
        pauseTimer = 0;
      }
    }
    chatInput.setAttribute('placeholder', current.substring(0, charIdx) + (charIdx < current.length ? '|' : ''));
    setTimeout(() => requestAnimationFrame(tick), isDeleting ? 25 : 55);
  }
  setTimeout(() => requestAnimationFrame(tick), 1500);
}
animatePlaceholder();

// ── Scroll Reveal for How It Works ──
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.anim-reveal').forEach(el => observer.observe(el));
}

// Re-init scroll reveal when switching to How tab


// ── Parallax on scroll ──
const chatMsgs = document.getElementById('chatMessages');
if (chatMsgs) {
  chatMsgs.addEventListener('scroll', () => {
    chatMsgs.querySelectorAll('.how__step-image img').forEach((img) => {
      const rect = img.getBoundingClientRect();
      const offset = (rect.top - window.innerHeight / 2) * 0.04;
      img.style.transform = `translateY(${offset}px)`;
    });
    chatMsgs.querySelectorAll('.how__step-number').forEach(num => {
      const rect = num.getBoundingClientRect();
      const offset = (rect.top - window.innerHeight / 2) * 0.06;
      num.style.transform = `translateY(${offset}px)`;
    });
  });
}

// ── Init ──
chatInput.focus();
initScrollReveal();

