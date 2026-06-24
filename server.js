const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'analytics-data.json');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
};

function readData() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')); }
  catch { return []; }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function serveStatic(res, urlPath) {
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(__dirname, urlPath);
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function renderDashboard(sessions) {
  // Aggregate per student
  const students = {};
  for (const s of sessions) {
    const name = s.studentName || 'Unknown';
    if (!students[name]) students[name] = { sessions: 0, totalXp: 0, totalTime: 0, totalLessons: 0, lastSeen: 0 };
    students[name].sessions++;
    students[name].totalXp += s.totalXpGained || 0;
    students[name].totalTime += s.timeSpent || 0;
    students[name].totalLessons += (s.events || []).length;
    students[name].lastSeen = Math.max(students[name].lastSeen, s.startTime || 0);
  }

  const studentRows = Object.entries(students)
    .sort((a, b) => b[1].lastSeen - a[1].lastSeen)
    .map(([name, data]) => `
      <tr>
        <td>${esc(name)}</td>
        <td>${data.sessions}</td>
        <td>${data.totalLessons}</td>
        <td>${data.totalXp}</td>
        <td>${fmtTime(data.totalTime)}</td>
        <td>${data.lastSeen ? new Date(data.lastSeen).toLocaleString() : '—'}</td>
      </tr>`).join('');

  const recentSessions = sessions.slice(-20).reverse().map(s => `
    <tr>
      <td>${esc(s.studentName || 'Unknown')}</td>
      <td>${s.totalXpGained || 0}</td>
      <td>${(s.events || []).length}</td>
      <td>${fmtTime(s.timeSpent || 0)}</td>
      <td>${new Date(s.startTime || Date.now()).toLocaleString()}</td>
      <td>${esc(s.instrumentId || '—')}</td>
    </tr>`).join('');

  function esc(s) { return String(s).replace(/[<>&]/g, c => ({ '<':'&lt;','>':'&gt;','&':'&amp;' })[c]); }
  function fmtTime(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  const totalStudents = Object.keys(students).length;
  const totalXpSum = sessions.reduce((sum, s) => sum + (s.totalXpGained || 0), 0);
  const totalLessonsSum = sessions.reduce((sum, s) => sum + (s.events || []).length, 0);

  const xpChartData = Object.entries(students)
    .map(([name, d]) => ({ name, xp: d.totalXp }))
    .sort((a, b) => b.xp - a.xp);

  const sortedSessions = [...sessions]
    .filter(s => s.startTime)
    .sort((a, b) => a.startTime - b.startTime);
  let cumLessons = 0;
  const lessonsChartData = sortedSessions.map(s => {
    cumLessons += (s.events || []).length;
    return { date: new Date(s.startTime).toLocaleDateString(), lessons: cumLessons };
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prelude Analytics</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body { font-family: system-ui, sans-serif; background: #0E0D1C; color: #F0EBE8; margin: 0; padding: 24px; }
    h1 { color: #FF8C42; font-size: 24px; margin-bottom: 24px; }
    h2 { color: #8B7BFF; font-size: 18px; margin: 32px 0 12px; }
    table { border-collapse: collapse; width: 100%; max-width: 900px; font-size: 14px; }
    th, td { text-align: left; padding: 10px 14px; border-bottom: 1px solid #2C2B62; }
    th { color: #8986A8; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.08em; }
    td { color: #F0EBE8; }
    tr:hover td { background: #1C1B3E; }
    .highlight { color: #FFD166; font-weight: 700; }
    .muted { color: #524F70; }
    .card { background: #161530; border: 1px solid #2C2B62; border-radius: 12px; padding: 20px; max-width: 900px; }
    .cards-row { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
    .stat-card { background: #161530; border: 1px solid #2C2B62; border-radius: 12px; padding: 20px 24px; min-width: 140px; flex: 1; text-align: center; }
    .stat-label { display: block; color: #8986A8; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
    .stat-value { display: block; color: #FF8C42; font-size: 28px; font-weight: 700; }
    .charts-row { display: flex; gap: 24px; flex-wrap: wrap; margin-bottom: 24px; }
    .chart-card { max-width: 440px; flex: 1; min-width: 300px; }
    .chart-card h2 { margin: 0 0 16px; }
    .chart-card canvas { max-height: 240px; max-width: 100%; }
  </style>
</head>
<body>
  <h1>Prelude for Recorder — Analytics</h1>

  <div class="cards-row">
    <div class="stat-card"><span class="stat-label">Total Students</span><span class="stat-value">${totalStudents}</span></div>
    <div class="stat-card"><span class="stat-label">Total XP</span><span class="stat-value">${totalXpSum}</span></div>
    <div class="stat-card"><span class="stat-label">Total Sessions</span><span class="stat-value">${sessions.length}</span></div>
    <div class="stat-card"><span class="stat-label">Total Lessons</span><span class="stat-value">${totalLessonsSum}</span></div>
  </div>

  <div class="charts-row">
    <div class="card chart-card">
      <h2>XP per Student</h2>
      <canvas id="xpChart"></canvas>
    </div>
    <div class="card chart-card">
      <h2>Lessons Over Time</h2>
      <canvas id="lessonsChart"></canvas>
    </div>
  </div>

  <div class="card">
    <h2>Students</h2>
    <table>
      <thead><tr><th>Name</th><th>Sessions</th><th>Lessons</th><th>XP</th><th>Time</th><th>Last Seen</th></tr></thead>
      <tbody>${studentRows || '<tr><td colspan="6" class="muted">No data yet</td></tr>'}</tbody>
    </table>
  </div>

  <div class="card" style="margin-top:24px">
    <h2>Recent Sessions</h2>
    <table>
      <thead><tr><th>Student</th><th>XP</th><th>Lessons</th><th>Time</th><th>Started</th><th>Instrument</th></tr></thead>
      <tbody>${recentSessions || '<tr><td colspan="6" class="muted">No data yet</td></tr>'}</tbody>
    </table>
    <p style="color:#524F70; font-size:12px; margin-top:12px">Total: ${sessions.length} session${sessions.length !== 1 ? 's' : ''} recorded</p>
  </div>

  <script>
    (function() {
      Chart.defaults.color = '#F0EBE8';
      Chart.defaults.borderColor = '#2C2B62';

      const xpData = ${JSON.stringify(xpChartData)};
      new Chart(document.getElementById('xpChart'), {
        type: 'bar',
        data: {
          labels: xpData.map(d => d.name),
          datasets: [{
            label: 'XP',
            data: xpData.map(d => d.xp),
            backgroundColor: xpData.map((_, i) => i % 2 === 0 ? '#FF8C42' : '#8B7BFF'),
            borderColor: xpData.map((_, i) => i % 2 === 0 ? '#FF8C42' : '#8B7BFF'),
            borderWidth: 1,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { color: '#8986A8' }, grid: { color: '#2C2B62' } },
            x: { ticks: { color: '#8986A8' }, grid: { display: false } }
          }
        }
      });

      const lessonsData = ${JSON.stringify(lessonsChartData)};
      new Chart(document.getElementById('lessonsChart'), {
        type: 'line',
        data: {
          labels: lessonsData.map(d => d.date),
          datasets: [{
            label: 'Lessons',
            data: lessonsData.map(d => d.lessons),
            borderColor: '#FF8C42',
            backgroundColor: 'rgba(255, 140, 66, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 3,
            pointBackgroundColor: '#FF8C42'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { color: '#8986A8' }, grid: { color: '#2C2B62' } },
            x: { ticks: { color: '#8986A8', maxRotation: 45 }, grid: { display: false } }
          }
        }
      });
    })();
  </script>
</body>
</html>`;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // ── POST analytics ──
  if (pathname === '/api/analytics' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const all = readData();
        const existing = all.find(s => s.sessionId === data.sessionId);
        if (existing) Object.assign(existing, data);
        else all.push(data);
        writeData(all);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400);
        res.end('Bad request');
      }
    });
    return;
  }

  // ── GET analytics JSON ──
  if (pathname === '/api/analytics' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(readData(), null, 2));
    return;
  }

  // ── Dashboard ──
  if (pathname === '/dashboard') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderDashboard(readData()));
    return;
  }

  // ── App HTML ──
  if (pathname === '/') {
    serveStatic(res, '/index.html');
    return;
  }

  // ── Static files ──
  serveStatic(res, pathname);
});

server.listen(PORT, () => {
  console.log(`Prelude for Recorder v1.0.0 — http://localhost:${PORT}`);
  console.log(`Analytics dashboard — http://localhost:${PORT}/dashboard`);
  console.log(`API — http://localhost:${PORT}/api/analytics`);
});
