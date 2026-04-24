const fileInput1 = document.getElementById("csvFile1");
const fileInput2 = document.getElementById("csvFile2");
const preview = document.getElementById("preview");
const scoreBox = document.getElementById("scoreBox");

const modeCsv = document.getElementById("modeCsv");
const modeManual = document.getElementById("modeManual");
const csvSection = document.getElementById("csvSection");
const manualBox = document.getElementById("manualBox");

const preRTInput = document.getElementById("preRT");
const postRTInput = document.getElementById("postRT");

const preGripInput = document.getElementById("preGrip");
const postGripInput = document.getElementById("postGrip");

let mean1 = null; // pre RT
let mean2 = null; // post RT
let fileInfo1 = null;
let fileInfo2 = null;

let preGrip = null;
let postGrip = null;

function currentMode() {
  return modeManual && modeManual.checked ? "manual" : "csv";
}

function cleanNumber(value) {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;

  const cleaned = text
    .replace(/"/g, "")
    .replace(/ms/gi, "")
    .replace(/,/g, "")
    .trim();

  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function fmtMs(x) {
  return `${x.toFixed(2)} ms`;
}

function fmtNum(x) {
  return x.toFixed(2);
}

function normalizeText(str) {
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(line => line.trim() !== "");
  if (lines.length < 2) return null;

  const headers = parseCSVLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);

    while (cols.length < headers.length) cols.push("");

    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = cols[j] ?? "";
    }
    rows.push(row);
  }

  return { headers, rows, lineCount: lines.length };
}

function findMeanRTHeader(headers) {
  for (const h of headers) {
    const nh = normalizeText(h);
    const hasMean = nh.includes("mean") || nh.includes("avg") || nh.includes("average");
    const hasRT =
      nh === "rt" ||
      nh.includes(" rt") ||
      nh.includes("reaction time") ||
      nh.includes("reaction") ||
      nh.includes("response time");

    if (hasMean && hasRT) return h;
  }

  for (const h of headers) {
    const nh = normalizeText(h);
    if (
      nh.includes("mean rt") ||
      nh.includes("mean reaction time") ||
      nh.includes("avg rt") ||
      nh.includes("average rt")
    ) {
      return h;
    }
  }

  return null;
}

function extractMeanRT(parsed) {
  const { headers, rows } = parsed;

  const meanHeader = findMeanRTHeader(headers);

  if (meanHeader) {
    for (let i = rows.length - 1; i >= 0; i--) {
      const n = cleanNumber(rows[i][meanHeader]);
      if (n != null) return n;
    }
  }

  const start = Math.max(0, rows.length - 40);

  for (let i = rows.length - 1; i >= start; i--) {
    const row = rows[i];
    const rowValues = headers.map(h => String(row[h] ?? ""));
    const rowText = rowValues.join(" ").toLowerCase();

    const looksLikeMeanRT =
      rowText.includes("mean") &&
      (
        rowText.includes(" rt") ||
        rowText.includes("reaction time") ||
        rowText.includes("reaction")
      );

    if (!looksLikeMeanRT) continue;

    for (const h of headers) {
      const n = cleanNumber(row[h]);
      if (n != null) return n;
    }
  }

  return null;
}

function setModeUI() {
  const manual = currentMode() === "manual";

  if (csvSection) csvSection.style.display = manual ? "none" : "block";
  if (manualBox) manualBox.style.display = manual ? "block" : "none";

  if (manual) {
    mean1 = cleanNumber(preRTInput?.value);
    mean2 = cleanNumber(postRTInput?.value);
  }

  updateUI();
}

async function handleFile(inputEl, which) {
  const file = inputEl.files?.[0];
  if (!file) return;

  if (!file.name.toLowerCase().endsWith(".csv")) {
    preview.textContent = "Please upload a .csv file.";
    scoreBox.textContent = "—";
    return;
  }

  const text = await file.text();
  const parsed = parseCSV(text);

  if (!parsed) {
    preview.textContent = "CSV needs a header row and at least one data row.";
    scoreBox.textContent = "—";
    return;
  }

  const extractedMean = extractMeanRT(parsed);

  const info = {
    name: file.name,
    headers: parsed.headers,
    rows: parsed.rows.length
  };

  if (which === 1) {
    fileInfo1 = info;
    mean1 = extractedMean;
  } else {
    fileInfo2 = info;
    mean2 = extractedMean;
  }

  updateUI();
}

function updateUI() {
  const mode = currentMode();
  const previewParts = [];

  if (mode === "csv") {
    if (fileInfo1) {
      previewParts.push(
        `Pre RT file: ${fileInfo1.name}\n` +
        `Rows: ${fileInfo1.rows}\n` +
        `Mean RT found: ${mean1 == null ? "No" : "Yes"}\n` +
        `Extracted pre mean RT: ${mean1 == null ? "—" : fmtMs(mean1)}`
      );
    }

    if (fileInfo2) {
      previewParts.push(
        `Post RT file: ${fileInfo2.name}\n` +
        `Rows: ${fileInfo2.rows}\n` +
        `Mean RT found: ${mean2 == null ? "No" : "Yes"}\n` +
        `Extracted post mean RT: ${mean2 == null ? "—" : fmtMs(mean2)}`
      );
    }

    if (!fileInfo1 && !fileInfo2) {
      previewParts.push("No reaction-time CSV files loaded.");
    }
  } else {
    previewParts.push(
      `Manual reaction-time input\n` +
      `Pre mean RT: ${mean1 == null ? "—" : fmtMs(mean1)}\n` +
      `Post mean RT: ${mean2 == null ? "—" : fmtMs(mean2)}`
    );
  }

  previewParts.push(
    `Grip strength input\n` +
    `Pre grip: ${preGrip == null ? "—" : fmtNum(preGrip)}\n` +
    `Post grip: ${postGrip == null ? "—" : fmtNum(postGrip)}`
  );

  preview.textContent = previewParts.join("\n\n");

  const hasRT = mean1 != null && mean2 != null && mean1 !== 0;
  const hasGrip = preGrip != null && postGrip != null && preGrip !== 0;

  if (!hasRT && !hasGrip) {
    scoreBox.innerHTML = `
      <div class="result-section">
        <div class="result-title">Results</div>
        <div class="result-text">
          ${mode === "csv"
            ? "Upload both pre/post reaction-time CSVs and enter grip strength values."
            : "Enter pre/post reaction time and grip strength values."}
        </div>
      </div>
    `;
    return;
  }

  let rtImprovementPct = null;
  let gripPct = null;

  let rtHtml = `
    <div class="result-section">
      <div class="result-title">Reaction Time</div>
      <div class="result-text">Missing reaction-time data</div>
    </div>
  `;

  let gripHtml = `
    <div class="result-section">
      <div class="result-title">Grip Strength</div>
      <div class="result-text">Missing grip-strength data</div>
    </div>
  `;

  let combinedHtml = `
    <div class="result-section">
      <div class="result-title">Combined % Change (CRI)</div>
      <div class="result-text">Need both reaction-time and grip-strength data</div>
    </div>
  `;

  if (hasRT) {
    const rtDiff = mean2 - mean1;
    const rtSignedPct = (rtDiff / mean1) * 100;
    rtImprovementPct = ((mean1 - mean2) / mean1) * 100;

    let rtSummary = "";
    let rtClass = "neutral";

    if (rtDiff < 0) {
      rtSummary = `Reaction time improved by ${Math.abs(rtSignedPct).toFixed(2)}%`;
      rtClass = "good";
    } else if (rtDiff > 0) {
      rtSummary = `Reaction time worsened by ${Math.abs(rtSignedPct).toFixed(2)}%`;
      rtClass = "bad";
    } else {
      rtSummary = "Reaction time stayed the same";
    }

    rtHtml = `
      <div class="result-section">
        <div class="result-title">Reaction Time</div>
        <div class="status ${rtClass}">${rtSummary}</div>
        <div class="metric-grid">
          <div><strong>Pre:</strong> ${fmtMs(mean1)}</div>
          <div><strong>Post:</strong> ${fmtMs(mean2)}</div>
          <div><strong>Change:</strong> ${rtDiff >= 0 ? "+" : "−"}${Math.abs(rtDiff).toFixed(2)} ms</div>
          <div><strong>% Change:</strong> ${rtSignedPct >= 0 ? "+" : "−"}${Math.abs(rtSignedPct).toFixed(2)}%</div>
          <div><strong>RT Improvement Score:</strong> ${rtImprovementPct >= 0 ? "+" : ""}${rtImprovementPct.toFixed(2)}%</div>
        </div>
      </div>
    `;
  }

  if (hasGrip) {
    const gripDiff = postGrip - preGrip;
    gripPct = (gripDiff / preGrip) * 100;

    let gripSummary = "";
    let gripClass = "neutral";

    if (gripDiff > 0) {
      gripSummary = `Grip strength increased by ${Math.abs(gripPct).toFixed(2)}%`;
      gripClass = "good";
    } else if (gripDiff < 0) {
      gripSummary = `Grip strength decreased by ${Math.abs(gripPct).toFixed(2)}%`;
      gripClass = "bad";
    } else {
      gripSummary = "Grip strength stayed the same";
    }

    gripHtml = `
      <div class="result-section">
        <div class="result-title">Grip Strength</div>
        <div class="status ${gripClass}">${gripSummary}</div>
        <div class="metric-grid">
          <div><strong>Pre:</strong> ${fmtNum(preGrip)}</div>
          <div><strong>Post:</strong> ${fmtNum(postGrip)}</div>
          <div><strong>Change:</strong> ${gripDiff >= 0 ? "+" : "−"}${Math.abs(gripDiff).toFixed(2)}</div>
          <div><strong>% Change:</strong> ${gripPct >= 0 ? "+" : "−"}${Math.abs(gripPct).toFixed(2)}%</div>
        </div>
      </div>
    `;
  }

  if (hasRT && hasGrip) {
    const combinedPct = (gripPct + rtImprovementPct) / 2;

    let combinedSummary = "";
    let combinedClass = "neutral";

    if (combinedPct > 0) {
      combinedSummary = `Cold affected performance increased by ${combinedPct.toFixed(2)}%`;
      combinedClass = "good";
    } else if (combinedPct < 0) {
      combinedSummary = `Cold affected performance decreased by ${Math.abs(combinedPct).toFixed(2)}%`;
      combinedClass = "bad";
    } else {
      combinedSummary = "No changes to performance";
    }

    combinedHtml = `
      <div class="result-section">
        <div class="result-title">Combined % Change (CRI)</div>
        <div class="status ${combinedClass}">${combinedSummary}</div>
        <div class="formula">
          Combined % Change = (Grip % Change + RT % Improvement) / 2
        </div>
        <div class="metric-grid">
          <div><strong>Grip % Change:</strong> ${gripPct >= 0 ? "+" : "−"}${Math.abs(gripPct).toFixed(2)}%</div>
          <div><strong>RT % Improvement:</strong> ${rtImprovementPct >= 0 ? "+" : "−"}${Math.abs(rtImprovementPct).toFixed(2)}%</div>
          <div><strong>Combined CRI:</strong> ${combinedPct >= 0 ? "+" : "−"}${Math.abs(combinedPct).toFixed(2)}%</div>
        </div>
      </div>
    `;
  }

  scoreBox.innerHTML = rtHtml + gripHtml + combinedHtml;
}

if (fileInput1) {
  fileInput1.addEventListener("change", () => handleFile(fileInput1, 1));
}

if (fileInput2) {
  fileInput2.addEventListener("change", () => handleFile(fileInput2, 2));
}

if (modeCsv) modeCsv.addEventListener("change", setModeUI);
if (modeManual) modeManual.addEventListener("change", setModeUI);

if (preRTInput) {
  preRTInput.addEventListener("input", () => {
    if (currentMode() === "manual") {
      mean1 = cleanNumber(preRTInput.value);
      updateUI();
    }
  });
}

if (postRTInput) {
  postRTInput.addEventListener("input", () => {
    if (currentMode() === "manual") {
      mean2 = cleanNumber(postRTInput.value);
      updateUI();
    }
  });
}

if (preGripInput) {
  preGripInput.addEventListener("input", () => {
    preGrip = cleanNumber(preGripInput.value);
    updateUI();
  });
}

if (postGripInput) {
  postGripInput.addEventListener("input", () => {
    postGrip = cleanNumber(postGripInput.value);
    updateUI();
  });
}

setModeUI();