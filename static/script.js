function toggleMenu() {
  document.getElementById('navLinks').classList.toggle('active');
}

async function fetchWithRetry(url, options, retries = 3, delayMs = 8000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      if (i < retries - 1) {
        const msg = document.getElementById('wake-msg');
        if (msg) {
          msg.textContent = `Server is waking up... retrying (${i + 1}/${retries - 1})`;
        }
        await new Promise((r) => setTimeout(r, delayMs));
      } else {
        throw err;
      }
    }
  }
}

async function runPrediction() {
  const btn = document.getElementById('predictBtn');
  const resultDiv = document.getElementById('result');

  btn.disabled = true;
  btn.textContent = 'Computing...';

  resultDiv.innerHTML = `
    <div class="loading">
      <span class="loading-dot"></span>
      <span class="loading-dot"></span>
      <span class="loading-dot"></span>
      <div style="margin-top:12px;">Running prediction and computing explanation...</div>
      <div id="wake-msg" style="font-size:11px;color:#484f58;margin-top:6px;">
        This may take 15–30 seconds if the server just woke up.
      </div>
    </div>`;

  const payload = {
    age      : document.getElementById('age').value,
    sex      : document.getElementById('sex').value,
    dataset  : document.getElementById('dataset').value,
    cp       : document.getElementById('cp').value,
    trestbps : document.getElementById('trestbps').value,
    chol     : document.getElementById('chol').value,
    fbs      : document.getElementById('fbs').value,
    restecg  : document.getElementById('restecg').value,
    thalch   : document.getElementById('thalch').value,
    exang    : document.getElementById('exang').value,
    oldpeak  : document.getElementById('oldpeak').value,
    slope    : document.getElementById('slope').value,
    ca       : document.getElementById('ca').value,
    thal     : document.getElementById('thal').value,
  };

  try {
    const res = await fetchWithRetry('/predict', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify(payload),
    });

    let data;
    try {
      data = await res.json();
    } catch (parseErr) {
      throw new Error('The server returned an invalid response. Please try again in a moment.');
    }

    if (!res.ok || data.error) {
      throw new Error(data.error || `Server error (${res.status}). Please try again.`);
    }

    resultDiv.innerHTML = `
      <div class="result-card result-${data.risk_class}">
        <div class="result-title">${data.result_text}</div>
        <div class="result-meta">
          Confidence Score &nbsp;: ${data.confidence}%<br/>
          Risk Probability &nbsp;: ${data.probability}
        </div>
      </div>

      <div class="section-label">🔍 Explainable AI — Feature Contributions</div>
      <img class="shap-img" src="data:image/png;base64,${data.shap_chart}" alt="Feature Importance Chart" />

      <div class="explain-card">
        <b>🧠 AI Explanation</b><br/><br/>
        <span class="risk-tag">▲ Top Risk Contributor</span><br/>
        <span style="color:#e6edf3">• ${data.top_risk}</span>
        <br/><br/>
        <span class="protect-tag">▼ Top Protective Factor</span><br/>
        <span style="color:#e6edf3">• ${data.top_protect}</span>
        <br/><br/>
        <span style="color:#8a9bb0">The AI identified these as the most influential factors for this patient.</span>
      </div>

      <div class="rec-card">
        <b>💊 Personalized Recommendation</b>
        <p>${data.recommendation}</p>
      </div>

      <div class="disclaimer">
        ⚕ This tool is for educational purposes only and does not constitute medical advice.
        Consult a qualified physician for clinical decisions.
      </div>`;
  } catch (err) {
    resultDiv.innerHTML = `
      <div class="error-card">
        ⚠ ${err.message}
        <span class="hint">The server may still be waking up. Please wait 30 seconds and try again.</span>
      </div>`;
  }

  btn.disabled = false;
  btn.textContent = '⚡ Run Prediction';
}
