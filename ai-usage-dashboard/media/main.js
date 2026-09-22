// ai-usage-dashboard/media/main.js
(function () {
  const vscode = acquireVsCodeApi();
  let dailyChart;
  let currentRange = 'month';
  let currentSource = 'all';

  const FLUID_ANIMATION = { duration: 750, easing: 'easeOutQuart' };

  function fmt(n) {
    return new Intl.NumberFormat().format(Math.round(n));
  }

  function fmtUsd(n) {
    return n === undefined || n === null ? '—' : `$${n.toFixed(2)}`;
  }

  // total_nano_aiu is stored as nano (1e9 = 1 credit) — divide down for display.
  function fmtCredits(nanoAiu) {
    return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(nanoAiu / 1e9)} credits`;
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

  function renderStatTiles(totals, totalCostUsd, allowance, source) {
    const el = document.getElementById('statTiles');
    const cacheTotal = totals.totalCacheReadTokens + totals.totalCacheWriteTokens;
    const hitRate = cacheTotal > 0 ? Math.round((totals.totalCacheReadTokens / cacheTotal) * 100) : 0;
    const isCopilotOnly = source === 'copilot';
    // Copilot's real billing unit is credits (nanoAiu), not $ — the
    // Anthropic-pricing "API-Equivalent Cost" tile is misleading here (it's
    // always ~$0 since Copilot models aren't in that pricing table).
    const leadTile = isCopilotOnly
      ? { label: 'Copilot Credits', value: fmtCredits(totals.totalNanoAiu) }
      : { label: 'API-Equivalent Cost', value: fmtUsd(totalCostUsd) };
    const tiles = [
      leadTile,
      { label: 'Messages', value: fmt(totals.eventCount) },
      { label: 'Input Tokens', value: fmt(totals.totalInputTokens) },
      { label: 'Output Tokens', value: fmt(totals.totalOutputTokens) },
    ];
    tiles.push(
      { label: 'Input Cache (Miss)', value: fmt(totals.totalCacheWriteTokens) },
      { label: 'Input Cache (Hit)', value: fmt(totals.totalCacheReadTokens) },
      { label: 'Cache Hit Rate', value: `${hitRate}%` },
      { label: 'Sessions', value: fmt(totals.sessionCount) }
    );
    if (isCopilotOnly) {
      tiles.push({ label: 'Copilot Premium Reqs', value: fmt(totals.totalPremiumRequests) });
    } else if (totals.totalNanoAiu > 0 || totals.totalPremiumRequests > 0) {
      if (totals.totalNanoAiu > 0) {
        tiles.push({ label: 'Copilot Credits', value: fmtCredits(totals.totalNanoAiu) });
      }
      if (totals.totalPremiumRequests > 0) {
        tiles.push({ label: 'Copilot Premium Reqs', value: fmt(totals.totalPremiumRequests) });
      }
    }
    if (allowance) {
      const pct = allowance.total > 0 ? Math.round((allowance.used / allowance.total) * 100) : 0;
      tiles.push({ label: `Copilot Allowance (${allowance.source})`, value: `${pct}%` });
    }
    el.innerHTML = tiles
      .map((t) => `<div class="stat-tile"><div class="label">${t.label}</div><div class="value">${t.value}</div></div>`)
      .join('');
  }

  function renderCostComposition(costBreakdown, source, totals) {
    const barEl = document.getElementById('costBar');
    const legendEl = document.getElementById('costLegend');
    const titleEl = document.getElementById('costCompositionTitle');
    const noteEl = document.getElementById('costCompositionNote');

    // GitHub reports one total_nano_aiu figure per call, with no per-component
    // (input/output/cache) credit split — so a $/credit composition isn't
    // possible for Copilot. Fall back to the same breakdown in token terms,
    // which the CLI does report per-call, instead of showing nothing.
    if (source === 'copilot') {
      titleEl.textContent = 'Token Composition';
      noteEl.textContent =
        'Credit composition not available — GitHub reports one total credit figure per call, not a per-component breakdown. Showing token share instead.';
      const segments = [
        { label: 'Input Tokens', value: totals.totalInputTokens, color: '#58a6ff' },
        { label: 'Output Tokens', value: totals.totalOutputTokens, color: '#e3b341' },
        { label: 'Input Cache (Miss)', value: totals.totalCacheWriteTokens, color: '#a371f7' },
        { label: 'Input Cache (Hit)', value: totals.totalCacheReadTokens, color: '#3fb950' },
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
          return `<span><span class="swatch" style="background:${s.color}"></span>${s.label} ${fmt(s.value)} (${pct}%)</span>`;
        })
        .join('');
      return;
    }
    titleEl.textContent = 'API-Equivalent Cost Composition';
    noteEl.textContent = '';
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

  function renderModelUsageList(byModel, source) {
    const el = document.getElementById('modelUsageList');
    if (byModel.length === 0) {
      el.innerHTML = '<p>No usage in the current selection.</p>';
      return;
    }
    el.innerHTML = byModel
      .map((m) => {
        const cacheTotal = m.cacheReadTokens + m.cacheWriteTokens;
        const hitRate = cacheTotal > 0 ? Math.round((m.cacheReadTokens / cacheTotal) * 100) : 0;
        // For the Copilot tab, real GitHub-billed credits (nanoAiu, from
        // session-store.db) are a more accurate figure than the Anthropic
        // per-token $ estimate — and unlike that estimate, credits are known
        // for every model, not just the ones with a confirmed public rate.
        const headerValue = source === 'copilot' ? fmtCredits(m.nanoAiu) : fmtUsd(m.costUsd);
        const pricingNote =
          source !== 'copilot' && m.costUsd === undefined
            ? '<div class="pricing-note">No confirmed pricing rate for this model — cost omitted from totals.</div>'
            : '';
        // "All" mixes Claude Code (priced in $) and Copilot (priced in credits)
        // usage of the same model name — surface both instead of only $.
        const mixedCreditsNote =
          source === 'all' && m.nanoAiu > 0
            ? `<div class="pricing-note">Copilot portion: ${fmtCredits(m.nanoAiu)}</div>`
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
              <span class="model-cost">${headerValue}</span>
            </div>
            <div class="model-stats">
              ${stats
                .map((s) => `<div class="stat"><span class="stat-label">${s.label}</span><span class="stat-value">${s.value}</span></div>`)
                .join('')}
            </div>
            ${pricingNote}
            ${mixedCreditsNote}
          </div>`;
      })
      .join('');
  }

  function renderDailyChart(dailySeries, source) {
    const canvas = document.getElementById('dailyChart');
    const ctx = canvas.getContext('2d');
    const labels = dailySeries.map((p) => shortDateLabel(p.bucket));

    // Copilot's real unit is credits, not tokens — a dedicated single-line
    // series instead of trying to force it into the two-line token chart.
    const isCopilot = source === 'copilot';
    const datasets = isCopilot
      ? [
          {
            label: 'Credits',
            data: dailySeries.map((p) => p.nanoAiu / 1e9),
            tension: 0.4,
            fill: true,
            backgroundColor: makeGradient(ctx, canvas, '88, 166, 255'),
            borderColor: 'rgba(88, 166, 255, 1)',
          },
        ]
      : [
          {
            label: 'Input Tokens',
            data: dailySeries.map((p) => p.inputTokens),
            tension: 0.4,
            fill: true,
            backgroundColor: makeGradient(ctx, canvas, '88, 166, 255'),
            borderColor: 'rgba(88, 166, 255, 1)',
          },
          {
            label: 'Output Tokens',
            data: dailySeries.map((p) => p.outputTokens),
            tension: 0.4,
            fill: true,
            backgroundColor: makeGradient(ctx, canvas, '163, 113, 247'),
            borderColor: 'rgba(163, 113, 247, 1)',
          },
        ];

    // Dataset count/shape differs between credits mode and tokens mode, so
    // an in-place update (mutating an existing chart's datasets) can't
    // safely handle a source toggle — rebuild the chart each render instead.
    if (dailyChart) {
      dailyChart.destroy();
    }
    dailyChart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        animation: FLUID_ANIMATION,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'bottom' } },
      },
    });
  }

  function fmtSigned(n, digits) {
    const sign = n > 0 ? '+' : '';
    return `${sign}${n.toFixed(digits)}%`;
  }

  function renderSkillUsageList(skillUsage, source) {
    const el = document.getElementById('skillUsageList');
    if (!skillUsage || skillUsage.length === 0) {
      el.innerHTML = '<p>No skill invocations in the current selection.</p>';
      return;
    }
    const isCopilotOnly = source === 'copilot';
    el.innerHTML = skillUsage
      .map((s) => {
        const deltaLabel =
          s.avgTurnTokensVsBaselinePct === undefined
            ? '<span class="skill-baseline-na">no baseline turns to compare</span>'
            : `<span class="${s.avgTurnTokensVsBaselinePct <= 0 ? 'skill-delta-good' : 'skill-delta-bad'}">${fmtSigned(s.avgTurnTokensVsBaselinePct, 0)} tokens/turn vs. no-skill baseline</span>`;
        const headerValue = isCopilotOnly ? fmtCredits(s.nanoAiu) : fmtUsd(s.costUsd);
        const pctLabel = isCopilotOnly ? '% of Credits' : '% of API-Equiv. Cost';
        const pctValue = isCopilotOnly ? s.pctOfTotalCredits : s.pctOfTotalCost;
        // "All" mixes Claude Code ($) and Copilot (credits) turns under the
        // same skill name — surface the credits portion instead of dropping it.
        const mixedCreditsNote =
          source === 'all' && s.nanoAiu > 0 ? `<div class="pricing-note">Copilot portion: ${fmtCredits(s.nanoAiu)}</div>` : '';
        return `
          <div class="skill-usage-row">
            <div class="skill-header">
              <span class="skill-name">${s.skill}</span>
              <span class="skill-cost">${headerValue}</span>
            </div>
            <div class="skill-stats">
              <div class="stat"><span class="stat-label">Invocations</span><span class="stat-value">${fmt(s.invocations)}</span></div>
              <div class="stat"><span class="stat-label">Input Tokens</span><span class="stat-value">${fmt(s.inputTokens)}</span></div>
              <div class="stat"><span class="stat-label">Output Tokens</span><span class="stat-value">${fmt(s.outputTokens)}</span></div>
              <div class="stat"><span class="stat-label">${pctLabel}</span><span class="stat-value">${pctValue === undefined ? '—' : pctValue.toFixed(1) + '%'}</span></div>
            </div>
            <div class="skill-delta">${deltaLabel}</div>
            ${mixedCreditsNote}
          </div>`;
      })
      .join('');
  }

  function renderWorkspaceList(byWorkspace, source) {
    const el = document.getElementById('workspaceList');
    if (byWorkspace.length === 0) {
      el.innerHTML = '<p>No usage in the current selection.</p>';
      return;
    }
    const isCopilotOnly = source === 'copilot';
    const sorted = [...byWorkspace].sort(
      (a, b) => b.inputTokens + b.outputTokens - (a.inputTokens + a.outputTokens)
    );
    const grandTotal = sorted.reduce((sum, g) => sum + g.inputTokens + g.outputTokens, 0) || 1;
    el.innerHTML = sorted
      .map((g) => {
        const total = g.inputTokens + g.outputTokens;
        const pct = Math.round((total / grandTotal) * 100);
        const headerRight = isCopilotOnly ? fmtCredits(g.nanoAiu) : `${fmt(total)} tokens (${pct}%)`;
        // "All" mixes Claude Code and Copilot usage under one workspace name
        // — surface the credits portion instead of silently dropping it.
        const mixedCreditsNote =
          source === 'all' && g.nanoAiu > 0 ? `<span>Copilot: ${fmtCredits(g.nanoAiu)}</span>` : '';
        return `
          <div class="workspace-row">
            <div class="workspace-header">
              <span class="workspace-name">${g.key}</span>
              <span class="workspace-total">${headerRight}</span>
            </div>
            <div class="workspace-bar-track"><div class="workspace-bar-fill" style="width:${pct}%"></div></div>
            <div class="workspace-stats">
              <span>Input ${fmt(g.inputTokens)}</span>
              <span>Output ${fmt(g.outputTokens)}</span>
              <span>Messages ${fmt(g.eventCount)}</span>
              ${mixedCreditsNote}
            </div>
          </div>`;
      })
      .join('');
  }

  function render(data) {
    renderStatTiles(data.totals, data.totalCostUsd, data.allowance, data.source);
    renderCostComposition(data.costBreakdown, data.source, data.totals);
    renderDailyChart(data.dailySeries, data.source);
    renderModelUsageList(data.byModel, data.source);
    renderWorkspaceList(data.byWorkspace, data.source);
    renderSkillUsageList(data.skillUsage, data.source);
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
