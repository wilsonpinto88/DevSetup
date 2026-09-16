// ai-usage-dashboard/media/main.js
(function () {
  const vscode = acquireVsCodeApi();
  let dailyChart;
  let workspaceChart;
  let currentRange = 'month';
  let currentSource = 'all';

  const FLUID_ANIMATION = { duration: 750, easing: 'easeOutQuart' };

  function fmt(n) {
    return new Intl.NumberFormat().format(Math.round(n));
  }

  function fmtUsd(n) {
    return n === undefined || n === null ? '—' : `$${n.toFixed(2)}`;
  }

  function shortDateLabel(bucket) {
    // bucket is ISO 'YYYY-MM-DD' -> 'MM-DD'
    return bucket.length >= 10 ? bucket.slice(5, 10) : bucket;
  }

  function makeGradient(ctx, canvas, colorRgb) {
    const height = canvas.height || 300;
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, `rgba(${colorRgb}, 0.35)`);
    gradient.addColorStop(1, `rgba(${colorRgb}, 0.02)`);
    return gradient;
  }

  function renderStatTiles(totals, totalCostUsd, allowance) {
    const el = document.getElementById('statTiles');
    const cacheTotal = totals.totalCacheReadTokens + totals.totalCacheWriteTokens;
    const hitRate = cacheTotal > 0 ? Math.round((totals.totalCacheReadTokens / cacheTotal) * 100) : 0;
    const tiles = [
      { label: 'Cost', value: fmtUsd(totalCostUsd) },
      { label: 'Messages', value: fmt(totals.eventCount) },
      { label: 'Input Tokens', value: fmt(totals.totalInputTokens) },
      { label: 'Output Tokens', value: fmt(totals.totalOutputTokens) },
      { label: 'Input Cache (Miss)', value: fmt(totals.totalCacheWriteTokens) },
      { label: 'Input Cache (Hit)', value: fmt(totals.totalCacheReadTokens) },
      { label: 'Cache Hit Rate', value: `${hitRate}%` },
      { label: 'Sessions', value: fmt(totals.sessionCount) },
    ];
    if (totals.totalNanoAiu > 0) {
      tiles.push({ label: 'Copilot AI Units', value: fmt(totals.totalNanoAiu / 1e9) });
    }
    if (totals.totalPremiumRequests > 0) {
      tiles.push({ label: 'Copilot Premium Reqs', value: fmt(totals.totalPremiumRequests) });
    }
    if (allowance) {
      const pct = allowance.total > 0 ? Math.round((allowance.used / allowance.total) * 100) : 0;
      tiles.push({ label: `Copilot Allowance (${allowance.source})`, value: `${pct}%` });
    }
    el.innerHTML = tiles
      .map((t) => `<div class="stat-tile"><div class="label">${t.label}</div><div class="value">${t.value}</div></div>`)
      .join('');
  }

  function renderCostComposition(costBreakdown) {
    const barEl = document.getElementById('costBar');
    const legendEl = document.getElementById('costLegend');
    if (!costBreakdown) {
      barEl.innerHTML = '';
      legendEl.innerHTML = '<span>No priced models in the current selection.</span>';
      return;
    }
    const segments = [
      { label: 'Input Tokens', value: costBreakdown.inputUsd, color: '#58a6ff' },
      { label: 'Output Tokens', value: costBreakdown.outputUsd, color: '#e3b341' },
      { label: 'Input Cache (Miss)', value: costBreakdown.cacheWriteUsd, color: '#a371f7' },
      { label: 'Input Cache (Hit)', value: costBreakdown.cacheReadUsd, color: '#3fb950' },
    ];
    const total = segments.reduce((sum, s) => sum + s.value, 0);
    barEl.innerHTML = segments
      .map((s) => {
        const pct = total > 0 ? (s.value / total) * 100 : 0;
        return `<div class="segment" style="width:${pct}%;background:${s.color}"></div>`;
      })
      .join('');
    legendEl.innerHTML = segments
      .map((s) => {
        const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
        return `<span><span class="swatch" style="background:${s.color}"></span>${s.label} ${fmtUsd(s.value)} (${pct}%)</span>`;
      })
      .join('');
  }

  function renderModelUsageList(byModel) {
    const el = document.getElementById('modelUsageList');
    if (byModel.length === 0) {
      el.innerHTML = '<p>No usage in the current selection.</p>';
      return;
    }
    el.innerHTML = byModel
      .map((m) => {
        const cacheTotal = m.cacheReadTokens + m.cacheWriteTokens;
        const hitRate = cacheTotal > 0 ? Math.round((m.cacheReadTokens / cacheTotal) * 100) : 0;
        const pricingNote =
          m.costUsd === undefined
            ? '<div class="pricing-note">No confirmed pricing rate for this model — cost omitted from totals.</div>'
            : '';
        const stats = [
          { label: 'Messages', value: fmt(m.eventCount) },
          { label: 'Input Tokens', value: fmt(m.inputTokens) },
          { label: 'Output Tokens', value: fmt(m.outputTokens) },
          { label: 'Input Cache (Miss)', value: fmt(m.cacheWriteTokens) },
          { label: 'Input Cache (Hit)', value: fmt(m.cacheReadTokens) },
          { label: 'Cache Hit Rate', value: `${hitRate}%` },
        ];
        return `
          <div class="model-usage-row">
            <div class="model-header">
              <span class="model-name">${m.key}</span>
              <span class="model-cost">${fmtUsd(m.costUsd)}</span>
            </div>
            <div class="model-stats">
              ${stats
                .map((s) => `<div class="stat"><span class="stat-label">${s.label}</span><span class="stat-value">${s.value}</span></div>`)
                .join('')}
            </div>
            ${pricingNote}
          </div>`;
      })
      .join('');
  }

  function renderDailyChart(dailySeries) {
    const canvas = document.getElementById('dailyChart');
    const ctx = canvas.getContext('2d');
    const labels = dailySeries.map((p) => shortDateLabel(p.bucket));
    const inputData = dailySeries.map((p) => p.inputTokens);
    const outputData = dailySeries.map((p) => p.outputTokens);
    const inputGradient = makeGradient(ctx, canvas, '88, 166, 255');
    const outputGradient = makeGradient(ctx, canvas, '163, 113, 247');

    if (dailyChart) {
      dailyChart.data.labels = labels;
      dailyChart.data.datasets[0].data = inputData;
      dailyChart.data.datasets[0].backgroundColor = inputGradient;
      dailyChart.data.datasets[1].data = outputData;
      dailyChart.data.datasets[1].backgroundColor = outputGradient;
      dailyChart.update();
      return;
    }

    dailyChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Input Tokens',
            data: inputData,
            tension: 0.4,
            fill: true,
            backgroundColor: inputGradient,
            borderColor: 'rgba(88, 166, 255, 1)',
          },
          {
            label: 'Output Tokens',
            data: outputData,
            tension: 0.4,
            fill: true,
            backgroundColor: outputGradient,
            borderColor: 'rgba(163, 113, 247, 1)',
          },
        ],
      },
      options: {
        animation: FLUID_ANIMATION,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'bottom' } },
      },
    });
  }

  function renderWorkspaceChart(byWorkspace) {
    const ctx = document.getElementById('workspaceChart').getContext('2d');
    const labels = byWorkspace.map((g) => g.key);
    const data = byWorkspace.map((g) => g.inputTokens + g.outputTokens);
    if (workspaceChart) {
      workspaceChart.data.labels = labels;
      workspaceChart.data.datasets[0].data = data;
      workspaceChart.update();
      return;
    }
    workspaceChart = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Tokens', data }] },
      options: {
        animation: FLUID_ANIMATION,
        indexAxis: 'y',
        plugins: { legend: { display: false } },
      },
    });
  }

  function render(data) {
    renderStatTiles(data.totals, data.totalCostUsd, data.allowance);
    renderCostComposition(data.costBreakdown);
    renderDailyChart(data.dailySeries);
    renderModelUsageList(data.byModel);
    renderWorkspaceChart(data.byWorkspace);
  }

  document.getElementById('rangeToggle').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-range]');
    if (!btn) return;
    currentRange = btn.getAttribute('data-range');
    document.querySelectorAll('.range-toggle button').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    vscode.postMessage({ type: 'rangeChange', range: currentRange, source: currentSource });
  });

  document.getElementById('sourceToggle').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-source]');
    if (!btn) return;
    currentSource = btn.getAttribute('data-source');
    document.querySelectorAll('.source-toggle button').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    vscode.postMessage({ type: 'sourceChange', range: currentRange, source: currentSource });
  });

  document.getElementById('refreshBtn').addEventListener('click', () => {
    const btn = document.getElementById('refreshBtn');
    btn.classList.add('spinning');
    vscode.postMessage({ type: 'refresh', range: currentRange, source: currentSource });
  });

  window.addEventListener('message', (event) => {
    const message = event.data;
    if (message.type === 'dashboardData') {
      document.getElementById('refreshBtn').classList.remove('spinning');
      render(message.data);
    }
  });
})();
