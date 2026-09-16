// ai-usage-dashboard/media/main.js
(function () {
  const vscode = acquireVsCodeApi();
  let dailyChart;
  let modelChart;
  let workspaceChart;
  let currentRange = 'month';

  const FLUID_ANIMATION = { duration: 750, easing: 'easeOutQuart' };

  function fmt(n) {
    return new Intl.NumberFormat().format(Math.round(n));
  }

  function renderStatTiles(totals, allowance) {
    const el = document.getElementById('statTiles');
    const tiles = [
      { label: 'Input Tokens', value: fmt(totals.totalInputTokens) },
      { label: 'Output Tokens', value: fmt(totals.totalOutputTokens) },
      { label: 'Sessions', value: fmt(totals.sessionCount) },
    ];
    if (allowance) {
      const pct = allowance.total > 0 ? Math.round((allowance.used / allowance.total) * 100) : 0;
      tiles.push({ label: `Copilot Allowance (${allowance.source})`, value: `${pct}%` });
    }
    el.innerHTML = tiles
      .map((t) => `<div class="stat-tile"><div class="label">${t.label}</div><div class="value">${t.value}</div></div>`)
      .join('');
  }

  function renderDailyChart(dailySeries) {
    const ctx = document.getElementById('dailyChart').getContext('2d');
    const labels = dailySeries.map((p) => p.bucket);
    const inputData = dailySeries.map((p) => p.inputTokens);
    const outputData = dailySeries.map((p) => p.outputTokens);

    if (dailyChart) {
      dailyChart.data.labels = labels;
      dailyChart.data.datasets[0].data = inputData;
      dailyChart.data.datasets[1].data = outputData;
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
            backgroundColor: 'rgba(88, 166, 255, 0.15)',
            borderColor: 'rgba(88, 166, 255, 1)',
          },
          {
            label: 'Output Tokens',
            data: outputData,
            tension: 0.4,
            fill: true,
            backgroundColor: 'rgba(163, 113, 247, 0.15)',
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

  function renderModelChart(byModel) {
    const ctx = document.getElementById('modelChart').getContext('2d');
    const labels = byModel.map((g) => g.key);
    const data = byModel.map((g) => g.inputTokens + g.outputTokens);
    if (modelChart) {
      modelChart.data.labels = labels;
      modelChart.data.datasets[0].data = data;
      modelChart.update();
      return;
    }
    modelChart = new Chart(ctx, {
      type: 'doughnut',
      data: { labels, datasets: [{ data }] },
      options: { animation: FLUID_ANIMATION, plugins: { legend: { position: 'bottom' } } },
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
    renderStatTiles(data.totals, data.allowance);
    renderDailyChart(data.dailySeries);
    renderModelChart(data.byModel);
    renderWorkspaceChart(data.byWorkspace);
  }

  document.getElementById('rangeToggle').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-range]');
    if (!btn) return;
    currentRange = btn.getAttribute('data-range');
    document.querySelectorAll('.range-toggle button').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    vscode.postMessage({ type: 'rangeChange', range: currentRange });
  });

  window.addEventListener('message', (event) => {
    const message = event.data;
    if (message.type === 'dashboardData') {
      render(message.data);
    }
  });
})();
