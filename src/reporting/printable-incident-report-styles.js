export const printableIncidentReportStyles = `
    :root { color-scheme: light; --ink:#142033; --muted:#536273; --line:#d7e0ea; --panel:#f6f9fc; --accent:#0d6d9f; --danger:#b42338; --warn:#b26a00; --good:#147a52; }
    * { box-sizing:border-box; }
    body { margin:0; font-family:Segoe UI, Arial, sans-serif; color:var(--ink); background:#eef3f8; }
    .report-shell { max-width:1180px; margin:0 auto; padding:24px; }
    .report-actions { display:flex; gap:10px; justify-content:flex-end; margin-bottom:18px; }
    .report-actions button { border:1px solid #b8c7d8; background:white; color:var(--ink); border-radius:8px; min-height:38px; padding:0 14px; cursor:pointer; font-weight:700; }
    .report-card, .report-table-wrap { background:white; border:1px solid var(--line); border-radius:12px; box-shadow:0 10px 24px rgba(9, 30, 66, .06); }
    .report-header { padding:22px; display:grid; gap:14px; }
    .report-kicker { color:var(--accent); font-size:12px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
    .report-header h1 { margin:0; font-size:30px; }
    .report-header p { margin:0; color:var(--muted); line-height:1.5; }
    .report-meta { display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:12px; }
    .report-meta article { padding:12px 14px; border:1px solid var(--line); border-radius:10px; background:var(--panel); display:grid; gap:6px; }
    .report-meta span { color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:.06em; }
    .report-meta strong { font-size:20px; }
    .report-grid { display:grid; gap:16px; margin-top:16px; }
    .report-section { padding:18px 20px; display:grid; gap:14px; }
    .report-section h2 { margin:0; font-size:21px; }
    .report-section h3 { margin:0; font-size:16px; }
    .report-summary-grid { display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:12px; }
    .report-summary-grid article { padding:12px 14px; border:1px solid var(--line); border-radius:10px; background:var(--panel); display:grid; gap:5px; }
    .report-summary-grid span { color:var(--muted); font-size:11px; text-transform:uppercase; letter-spacing:.06em; }
    .report-summary-grid strong { font-size:20px; }
    .report-code { margin:0; padding:10px 12px; border:1px solid var(--line); border-radius:10px; background:#fff; color:var(--ink); font-family:Consolas, monospace; font-size:12px; white-space:pre-wrap; overflow-wrap:anywhere; }
    .token-row { display:flex; flex-wrap:wrap; gap:8px; }
    .token { display:inline-flex; align-items:center; min-height:28px; padding:4px 10px; border:1px solid var(--line); border-radius:999px; background:var(--panel); color:var(--ink); font-size:12px; }
    .report-columns { display:grid; grid-template-columns:1.1fr .9fr; gap:14px; }
    .report-list { display:grid; gap:10px; }
    .report-list article { padding:12px 14px; border:1px solid var(--line); border-left:4px solid var(--accent); border-radius:10px; background:var(--panel); }
    .report-list article.critical { border-left-color:var(--danger); }
    .report-list article.high { border-left-color:#d97706; }
    .report-list article.medium { border-left-color:var(--warn); }
    .report-list article.low { border-left-color:var(--good); }
    .report-list header { display:flex; justify-content:space-between; gap:10px; align-items:flex-start; }
    .report-list p { margin:6px 0 0; color:var(--muted); line-height:1.45; }
    .report-chart-grid { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:14px; }
    .report-chart-card { padding:14px; border:1px solid var(--line); border-radius:12px; background:var(--panel); display:grid; gap:10px; break-inside:avoid; }
    .report-chart-card.hero { grid-column:1 / -1; }
    .report-chart-card header { display:flex; justify-content:space-between; gap:10px; align-items:baseline; }
    .report-chart-card figure { margin:0; display:grid; gap:8px; }
    .report-chart-card img { width:100%; border:1px solid var(--line); border-radius:10px; background:#050910; }
    .report-chart-card figcaption { color:var(--muted); font-size:12px; line-height:1.45; }
    table { width:100%; border-collapse:collapse; }
    th, td { padding:10px 8px; border-bottom:1px solid var(--line); text-align:left; vertical-align:top; font-size:13px; }
    th { color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:.05em; }
    tr:last-child td, tr:last-child th { border-bottom:0; }
    .severity { font-weight:800; text-transform:uppercase; }
    .severity.critical { color:var(--danger); }
    .severity.high { color:#d97706; }
    .severity.medium { color:var(--warn); }
    .severity.low { color:var(--good); }
    .flow { font-family:Consolas, monospace; font-size:12px; }
    .small { color:var(--muted); font-size:12px; }
    .report-footer { padding:18px 20px; color:var(--muted); font-size:12px; line-height:1.5; }
    @media print {
      body { background:white; }
      .report-shell { max-width:none; padding:0; }
      .report-actions { display:none; }
      .report-card, .report-table-wrap { box-shadow:none; break-inside:avoid; }
      .report-grid { gap:12px; }
      @page { size:A4 portrait; margin:12mm; }
    }
    @media (max-width: 980px) {
      .report-meta,
      .report-summary-grid,
      .report-columns,
      .report-chart-grid { grid-template-columns:1fr; }
      .report-chart-card.hero { grid-column:auto; }
    }
  `;
