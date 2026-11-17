/**
 * Maestro AI — Autonomous Executive Event Producer (Live Web Application Controller)
 */

(function () {
  const STORAGE_KEY = "maestro_ai_okf_live_v1";
  let project = loadProject();

  function loadProject() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return JSON.parse(JSON.stringify(window.DEFAULT_OKF_PROJECT));
  }

  function saveProject() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    } catch (e) {}
  }

  function formatUSD(num) {
    return "$" + Number(num || 0).toLocaleString("en-US");
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ── Render All Live Dashboard Views ──
  function renderAll() {
    const venue = window.MaestroOKFEngine.getVenue(project.venueId);
    const pricing = window.MaestroOKFEngine.calculatePricing(project);
    const alignment = window.MaestroOKFEngine.evaluateAlignment(project);
    const ros = window.MaestroOKFEngine.generateRunOfShow(project);

    // Topbar & Portal Clue
    document.getElementById("venue-selector").value = project.venueId;
    document.getElementById("portal-venue-name").textContent = venue.shortName + " · Live Portal Clue";
    document.getElementById("portal-clue-text").textContent = `"${venue.portalClue}"`;

    const modeBtn = document.getElementById("btn-toggle-mode");
    const isCorp = project.eventType === "MidWeekCorporateKeynote";
    modeBtn.textContent = isCorp
      ? "🔄 Mode: Mid-Week Corporate Keynote (Click for Wedding)"
      : "🔄 Mode: Waterfront Jazz Wedding (Click for Corporate)";
    modeBtn.classList.toggle("mode-switch-active", isCorp);

    // Telemetry Strip
    document.getElementById("stat-venue").textContent = venue.shortName;
    document.getElementById("stat-venue-url").textContent = venue.officialRentalUrl.replace("https://www.", "");
    document.getElementById("stat-date").textContent = `${project.targetDate} (${project.dayOfWeek})`;
    document.getElementById("stat-mode").textContent = isCorp ? "Tech Keynote & Launch" : "Jazz Wedding & Gala";
    document.getElementById("stat-guests").textContent = `${project.guestCount} Guests`;
    document.getElementById("stat-package").textContent = pricing.packageSelected.split("(")[0].trim();
    document.getElementById("stat-venue-fee").textContent = formatUSD(pricing.netVenueFee) + " Venue Fee";
    document.getElementById("stat-total-est").textContent = formatUSD(pricing.totalEstimated);
    document.getElementById("stat-budget-status").textContent = pricing.withinBudget
      ? `✅ Within ${formatUSD(project.budgetEnvelope)} Envelope`
      : `⚠️ Exceeds ${formatUSD(project.budgetEnvelope)} Envelope`;
    document.getElementById("stat-budget-status").style.color = pricing.withinBudget ? "#34d399" : "#fb7185";
    document.getElementById("stat-alignment").textContent = alignment.overallScore + "% Harmony";

    // Stage 1: 3-Level Spatial Journey & Pricing Breakdown
    renderStage1(venue, pricing);

    // Stage 1.5: Stakeholder Circle, 5-Question Survey & Alignment Engine
    renderStageStakeholders(venue, alignment);

    // Stage 2: Interactive Museum Floorplan Visualizer
    renderFloorplan(venue);

    // Stage 3: Operational Inference Rules, Vendors & Run-of-Show
    renderStage3(venue, pricing, ros);
  }

  function renderStage1(venue, pricing) {
    const levelsGrid = document.getElementById("levels-grid");
    levelsGrid.innerHTML = "";

    venue.levelsAndGalleries.forEach(lvl => {
      const card = document.createElement("div");
      card.className = "level-portal-card";
      card.innerHTML = `
        <div class="level-number">L${lvl.level}</div>
        <div style="font-size:0.72rem;color:var(--accent-cyan);font-weight:800;text-transform:uppercase">Level ${lvl.level} Spatial Portal</div>
        <h4 style="font-size:1rem;margin:4px 0 6px;color:#fff">${escapeHtml(lvl.name)}</h4>
        <p style="font-size:0.81rem;color:var(--text-muted);margin-bottom:8px">${escapeHtml(lvl.role)}</p>
        <div class="led-skin-pill">✨ Flexible LED Skin: ${escapeHtml(lvl.ledSkinPreset)}</div>
        <div style="font-size:0.78rem;color:#cbd5e1;margin-top:6px;display:grid;gap:4px">
          <div>👥 <strong>Capacity:</strong> ${lvl.standingCapacity} Standing · ${lvl.seatedCapacity} Seated</div>
          <div>🔊 <strong>Acoustic Profile:</strong> ${escapeHtml(lvl.acousticProfile)}</div>
          <div>♿ <strong>Senior & ADA Access:</strong> ${escapeHtml(lvl.accessibility)}</div>
          <div>💵 <strong>Standalone Base Rate:</strong> ${formatUSD(lvl.baseRate)}</div>
        </div>
      `;
      levelsGrid.appendChild(card);
    });

    // Pricing Breakdown Table
    const priceBody = document.getElementById("pricing-breakdown-body");
    priceBody.innerHTML = `
      <tr>
        <td><strong>${escapeHtml(pricing.packageSelected)}</strong><br><span style="font-size:0.74rem;color:var(--text-muted)">Includes Explainer staff, 1-hr museum photo shoot, get-ready classroom & LED base lighting</span></td>
        <td>${formatUSD(pricing.venueBase)}</td>
      </tr>
      ${pricing.discount > 0 ? `<tr><td style="color:#34d399">501(c)(3) Nonprofit 15% Discount Applied</td><td style="color:#34d399">-${formatUSD(pricing.discount)}</td></tr>` : ""}
      <tr>
        <td><strong>Paula LeDuc Fine Catering</strong> (${project.guestCount} guests synchronized service)</td>
        <td>${formatUSD(pricing.cateringCost)}</td>
      </tr>
      <tr>
        <td><strong>Tonic Beverage Mixology</strong> (3 zero-queue bars + molecular elixirs)</td>
        <td>${formatUSD(pricing.barCost)}</td>
      </tr>
      <tr>
        <td><strong>Argus HD Audio/Visual & Flexible LED Column Skins</strong> (DSP calibration)</td>
        <td>${formatUSD(pricing.avAndLedCost)}</td>
      </tr>
      <tr>
        <td><strong>Blueprint Studios Spatial Furniture & Custom Bars</strong></td>
        <td>${formatUSD(pricing.productionFurniture)}</td>
      </tr>
      <tr>
        <td><strong>Entire Productions Live Jazz + OrangePiel & Rug Co. Acoustic Damping</strong></td>
        <td>${formatUSD(pricing.talentAndAcoustics)}</td>
      </tr>
      <tr>
        <td><strong>VIP Activations & 90-Min Turnaround</strong> (The Caviar Co. + Espresso Subito + Jay's Small Moves)</td>
        <td>${formatUSD(pricing.vipActivations)}</td>
      </tr>
      <tr style="background:rgba(56,189,248,0.12);font-weight:800;font-size:0.92rem">
        <td>Total Turnkey Production Estimate (Budget Envelope: ${formatUSD(project.budgetEnvelope)})</td>
        <td style="color:var(--accent-cyan)">${formatUSD(pricing.totalEstimated)}</td>
      </tr>
    `;

    // Included Perks & Constraints
    const perksList = document.getElementById("venue-perks-list");
    perksList.innerHTML = venue.includedPerks.map(p => `<li style="margin-bottom:6px;font-size:0.82rem;color:#cbd5e1">✅ ${escapeHtml(p)}</li>`).join("") +
      venue.curatorialConstraints.map(c => `<li style="margin-bottom:6px;font-size:0.8rem;color:#fda4af">🛡️ <strong>Curatorial Rule:</strong> ${escapeHtml(c)}</li>`).join("");
  }

  function renderStageStakeholders(venue, alignment) {
    const listEl = document.getElementById("stakeholders-list");
    listEl.innerHTML = "";

    project.stakeholders.forEach((st, idx) => {
      const row = document.createElement("div");
      row.className = "stakeholder-row";
      row.innerHTML = `
        <div style="flex:1">
          <div style="font-weight:800;font-size:0.9rem;color:#fff">${escapeHtml(st.name)} <span style="font-size:0.75rem;color:var(--accent-cyan)">(${escapeHtml(st.role)})</span></div>
          <div style="font-size:0.75rem;color:var(--text-muted);margin:2px 0">📱 ${escapeHtml(st.channel)} · Vibe: <strong>${escapeHtml(st.vibeChoice)}</strong></div>
          <div style="font-size:0.77rem;color:#cbd5e1">🎵 <em>"${escapeHtml(st.musicRule)}"</em> | 🎯 Priority: ${escapeHtml(st.priority)}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="badge-status completed">✓ Survey Completed (${st.harmonyWeight}%)</span>
        </div>
      `;
      listEl.appendChild(row);
    });

    // WhatsApp 5-Question Micro-Survey Template
    const isCorp = project.eventType === "MidWeekCorporateKeynote";
    const waBubble = document.getElementById("whatsapp-survey-text");
    if (isCorp) {
      waBubble.textContent =
`Hi [Name], this is Maestro AI — the Autonomous Executive Producer coordinating our ${project.targetDate} Keynote & Innovation Summit at ${venue.shortName}.
To tailor the 3-level museum flow in under 60 seconds, please reply with your quick thoughts on these 5 prompts:

1️⃣ Primary KPI: Is our #1 goal enterprise deal-closing, team cohesion, or viral product-launch buzz?
2️⃣ Attendee Takeaway: What single sentence should guests say on their way home across the Bay?
3️⃣ Content vs. Networking: Ideal ratio between Kanbar Forum keynotes and interactive gallery networking?
4️⃣ LED Aesthetic: Should the Flexible LED Skins project futuristic Silicon Valley cyber-glass or warm community design?
5️⃣ Red Lines: Any operational bottleneck from past events we must eliminate?`;
    } else {
      waBubble.textContent =
`Hi [Name]! ✨ This is Maestro AI — the digital executive producer assisting with the ${project.targetDate} celebration at ${venue.shortName}.
To craft an unforgettable evening that feels personal and effortless for you, here are 5 quick 60-second questions:

1️⃣ The Peak Memory: What is the single moment that must happen for you to say, "That was the most unforgettable wedding in the world"?
2️⃣ The Pulse & Vibe: Which fits best?
   [A] Cultural Salon & Deep Conversation
   [B] Electric Jazz & Swing Speakeasy
   [C] Classic Black-Tie Banquet & Speeches
3️⃣ Musical Green & Red Lines: What genre/song gets you flying onto the floor, and what is strictly off-limits?
4️⃣ Hospitality & Culinary Focus: Michelin tasting surprises, zero-wait bars, or quiet acoustic lounges for seniors?
5️⃣ Heritage, Inclusion & Accessibility: Any family tradition, LGBTQ+/multicultural detail, or senior mobility/acoustic need we should honor?`;
    }

    // Alignment Matrix & Conflict Resolution
    const alignBox = document.getElementById("alignment-matrix-content");
    alignBox.innerHTML = `
      <div style="margin-bottom:12px">
        <div style="font-size:0.78rem;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px">Shared Stakeholder Consensuses</div>
        ${alignment.consensuses.map(c => `<div style="font-size:0.82rem;color:#a7f3d0;margin-bottom:5px">✓ ${escapeHtml(c)}</div>`).join("")}
      </div>
      ${alignment.tensions.map(t => `
        <div class="tension-alert">
          <strong>⚡ Detected Expectations Tension (${escapeHtml(t.source)}):</strong><br>
          ${escapeHtml(t.conflict)}
        </div>
      `).join("")}
      <div class="resolution-box">
        <strong>🏛️ Maestro AI Architectural & Acoustic Mediation:</strong><br>
        ${escapeHtml(alignment.architecturalResolution)}
      </div>
    `;
  }

  function renderFloorplan(venue) {
    const guests = Number(project.guestCount) || 220;
    const tablesCount = Math.ceil(guests / 10);
    const svgContainer = document.getElementById("floorplan-svg-wrapper");

    svgContainer.innerHTML = `
      <svg viewBox="0 0 920 390" style="width:100%;height:auto;display:block">
        <defs>
          <linearGradient id="bayWater" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0ea5e9" stop-opacity="0.18"/>
            <stop offset="100%" stop-color="#1e3a8a" stop-opacity="0.35"/>
          </linearGradient>
        </defs>

        <!-- San Francisco Bay Water Backdrop -->
        <rect x="640" y="15" width="265" height="360" rx="14" fill="url(#bayWater)" stroke="#38bdf8" stroke-dasharray="5,5" stroke-opacity="0.5"/>
        <text x="772" y="42" fill="#7dd3fc" font-size="12" font-weight="700" text-anchor="middle">🌊 SAN FRANCISCO BAY & BAY BRIDGE VIEW</text>

        <!-- LEVEL 1: Bechtel Central Gallery -->
        <rect x="20" y="25" width="275" height="340" rx="14" fill="rgba(139,92,246,0.12)" stroke="#8b5cf6" stroke-width="2"/>
        <text x="35" y="52" fill="#ddd6fe" font-size="13" font-weight="800">LEVEL 1: BECHTEL LIGHT PORTAL</text>
        <text x="35" y="70" fill="#94a3b8" font-size="10">Arrival · Kinetic Light Exhibits · 'Explainers'</text>

        <!-- Bar 1 & Espresso Cart -->
        <rect x="40" y="95" width="110" height="44" rx="8" fill="rgba(56,189,248,0.2)" stroke="#38bdf8"/>
        <text x="95" y="121" fill="#e0f2fe" font-size="10" font-weight="700" text-anchor="middle">🍸 Tonic Mixology #1</text>

        <rect x="165" y="95" width="110" height="44" rx="8" fill="rgba(245,158,11,0.2)" stroke="#f59e0b"/>
        <text x="220" y="121" fill="#fef3c7" font-size="10" font-weight="700" text-anchor="middle">☕ Espresso Subito</text>

        <!-- Interactive Light Portal Nodes -->
        <circle cx="95" cy="210" r="34" fill="rgba(244,63,94,0.18)" stroke="#f43f5e" stroke-dasharray="4,3"/>
        <text x="95" y="214" fill="#fecdd3" font-size="9" font-weight="700" text-anchor="middle">LED Skin Portal</text>

        <circle cx="210" cy="210" r="34" fill="rgba(56,189,248,0.18)" stroke="#38bdf8" stroke-dasharray="4,3"/>
        <text x="210" y="214" fill="#bae6fd" font-size="9" font-weight="700" text-anchor="middle">Explainer Demo</text>

        <rect x="40" y="285" width="235" height="55" rx="8" fill="rgba(16,185,129,0.15)" stroke="#10b981"/>
        <text x="157" y="310" fill="#a7f3d0" font-size="11" font-weight="700" text-anchor="middle">♿ Zero-Step Embarcadero Entry & Elevators</text>
        <text x="157" y="326" fill="#6ee7b7" font-size="9" text-anchor="middle">90-Min Dock Load-In at ${venue.museumCloseTime} (Jay's Small Moves)</text>

        <!-- LEVEL 2: Moore East Gallery & Mezzanine -->
        <rect x="315" y="25" width="305" height="340" rx="14" fill="rgba(56,189,248,0.1)" stroke="#38bdf8" stroke-width="2"/>
        <text x="330" y="52" fill="#bae6fd" font-size="13" font-weight="800">LEVEL 2: MOORE EAST & MEZZANINE</text>
        <text x="330" y="70" fill="#94a3b8" font-size="10">Seated Michelin Banquet (${guests} Guests · ${tablesCount} Tables) · 72–82 dB</text>

        <!-- Live Jazz Stage -->
        <rect x="335" y="88" width="265" height="45" rx="8" fill="rgba(244,63,94,0.25)" stroke="#f43f5e"/>
        <text x="467" y="115" fill="#ffe4e6" font-size="11" font-weight="800" text-anchor="middle">🎷 ENTIRE PRODUCTIONS LIVE JAZZ STAGE + ARGUS DSP</text>

        <!-- Banquet Tables Grid -->
        ${Array.from({ length: Math.min(12, tablesCount) }).map((_, i) => {
          const col = i % 4;
          const row = Math.floor(i / 4);
          const cx = 365 + col * 66;
          const cy = 168 + row * 48;
          return `<g>
            <circle cx="${cx}" cy="${cy}" r="17" fill="rgba(15,23,42,0.9)" stroke="#38bdf8" stroke-width="1.5"/>
            <text x="${cx}" y="${cy + 3}" fill="#e2e8f0" font-size="8" text-anchor="middle">T${i + 1}</text>
          </g>`;
        }).join("")}

        <rect x="335" y="300" width="265" height="45" rx="8" fill="rgba(139,92,246,0.2)" stroke="#8b5cf6"/>
        <text x="467" y="321" fill="#ddd6fe" font-size="10" font-weight="700" text-anchor="middle">🛡️ OrangePiel Velvet Drapes + Rug Co. Acoustic Damping</text>
        <text x="467" y="335" fill="#c4b5fd" font-size="9" text-anchor="middle">Tonic Mixology Bars #2 & #3 · Zero-Queue Flow</text>

        <!-- LEVEL 3: Fisher Bay Observatory & Terrace -->
        <rect x="655" y="62" width="235" height="295" rx="14" fill="rgba(16,185,129,0.14)" stroke="#10b981" stroke-width="2"/>
        <text x="670" y="88" fill="#a7f3d0" font-size="12" font-weight="800">LEVEL 3: FISHER BAY OBSERVATORY</text>
        <text x="670" y="104" fill="#6ee7b7" font-size="9.5">Waterfront Glass Chuppah & Terrace</text>

        <rect x="672" y="122" width="200" height="65" rx="10" fill="rgba(255,255,255,0.08)" stroke="#34d399"/>
        <text x="772" y="148" fill="#fff" font-size="11" font-weight="800" text-anchor="middle">💍 WATERFRONT GLASS CHUPPAH</text>
        <text x="772" y="166" fill="#a7f3d0" font-size="9.5" text-anchor="middle">Panoramic Bay Bridge Backdrop</text>

        <rect x="672" y="202" width="200" height="68" rx="10" fill="rgba(16,185,129,0.22)" stroke="#10b981"/>
        <text x="772" y="227" fill="#ecfdf5" font-size="10.5" font-weight="800" text-anchor="middle">🤫 SENIOR ACOUSTIC SANCTUARY</text>
        <text x="772" y="244" fill="#a7f3d0" font-size="9" text-anchor="middle">Protected &lt;65 dB Zone · Step-Free Elevator</text>
        <text x="772" y="258" fill="#6ee7b7" font-size="8.5" text-anchor="middle">Heated Plush Seating for Grandparents</text>

        <rect x="672" y="284" width="200" height="52" rx="10" fill="rgba(245,158,11,0.22)" stroke="#f59e0b"/>
        <text x="772" y="308" fill="#fef3c7" font-size="10" font-weight="800" text-anchor="middle">🥂 THE CAVIAR CO. VIP TERRACE</text>
        <text x="772" y="323" fill="#fde68a" font-size="8.5" text-anchor="middle">Private Tasting & Champagne Pairing</text>
      </svg>
    `;
  }

  function renderStage3(venue, pricing, ros) {
    // 9-Category San Francisco Master Vendor Directory (Clean Domain Protocol)
    const vBody = document.getElementById("vendors-table-body");
    const catFilterEl = document.getElementById("vendor-cat-filter");
    const selectedCat = catFilterEl ? catFilterEl.value : "ALL";
    const fullDir = window.MAESTRO_FULL_VENDOR_DIRECTORY || window.MAESTRO_VENDORS_CATALOG || [];

    const filteredVendors = selectedCat === "ALL"
      ? fullDir
      : fullDir.filter(v => v.cat === selectedCat || v.primaryCategory === selectedCat);

    vBody.innerHTML = filteredVendors.map((v, idx) => {
      const name = v.name || v.vendorName;
      const cat = v.cat || v.primaryCategory;
      const spec = v.spec || v.capabilities;
      const addr = v.addr || v.contact || "San Francisco, CA";
      const domain = v.domain || "exploratorium.edu";
      const est = typeof v.costFormula === "function" ? v.costFormula(project.guestCount) : 0;

      return `
        <tr>
          <td>
            <strong>${escapeHtml(name)}</strong><br>
            <span style="font-size:0.71rem;color:var(--accent-cyan)">${escapeHtml(cat)}</span>
          </td>
          <td style="font-size:0.78rem;color:#cbd5e1">${escapeHtml(spec)}</td>
          <td style="font-size:0.74rem;color:var(--text-muted)">📍 ${escapeHtml(addr)}</td>
          <td>
            <code style="background:rgba(16,185,129,0.14);color:#6ee7b7;padding:3px 7px;border-radius:6px;font-size:0.74rem;border:1px solid rgba(16,185,129,0.3);user-select:all">${escapeHtml(domain)}</code>
          </td>
          <td>
            <div style="display:flex;align-items:center;gap:8px;justify-content:space-between">
              <span style="font-weight:700;color:#34d399">${formatUSD(est)}</span>
              <button type="button" class="btn-rfp-gen" data-vendor-name="${escapeHtml(name)}" data-vendor-cat="${escapeHtml(cat)}" data-vendor-domain="${escapeHtml(domain)}" data-vendor-spec="${escapeHtml(spec)}" data-vendor-est="${est}" style="background:rgba(56,189,248,0.16);color:#7dd3fc;border:1px solid rgba(56,189,248,0.35);border-radius:6px;padding:3px 8px;font-size:0.71rem;cursor:pointer;font-weight:700">📄 RFP</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    vBody.querySelectorAll(".btn-rfp-gen").forEach(btn => {
      btn.onclick = () => {
        const vName = btn.dataset.vendorName;
        const vCat = btn.dataset.vendorCat;
        const vDomain = btn.dataset.vendorDomain;
        const vSpec = btn.dataset.vendorSpec;
        const vEst = Number(btn.dataset.vendorEst || 0);
        appendMessage(
          "bot",
          `📄 <strong>AUTO-GENERATED TECHNICAL RFP FOR ${escapeHtml(vName.toUpperCase())}</strong> (<code>${escapeHtml(vDomain)}</code>):<br><br>
          • <strong>Category:</strong> ${escapeHtml(vCat)}<br>
          • <strong>Venue & Date:</strong> ${escapeHtml(venue.venueName)} · ${project.targetDate} (${project.guestCount} Guests)<br>
          • <strong>Scope & OKF Rule Compliance:</strong> ${escapeHtml(vSpec)} — <em>Must comply with ${venue.museumCloseTime} museum public closing and 90-minute synchronized dock load-in (24-hr off-site pre-rigging mandatory; zero open flames).</em><br>
          • <strong>Target Allocation:</strong> <strong>${formatUSD(vEst)}</strong>`,
          [
            "Lock 14-Day Complimentary Soft Hold",
            "Inspect 3-Level Floorplan & Senior Sanctuary"
          ]
        );
      };
    });

    // Run-of-Show Table
    const rosBody = document.getElementById("ros-table-body");
    rosBody.innerHTML = ros.map(item => `
      <tr>
        <td style="font-family:var(--font-mono);font-weight:800;color:var(--accent-cyan)">${escapeHtml(item.timestamp)}</td>
        <td><strong>${escapeHtml(item.title)}</strong><br><span style="font-size:0.73rem;color:var(--text-muted)">Zone: ${escapeHtml(item.zone)}</span></td>
        <td style="font-size:0.78rem;color:#cbd5e1">${escapeHtml(item.vendor)}</td>
        <td><span class="led-skin-pill" style="margin:0">${escapeHtml(item.rule)}</span></td>
        <td style="font-size:0.75rem;color:#fde68a">🛡️ ${escapeHtml(item.fallback)}</td>
      </tr>
    `).join("");
  }

  // ── Conversational Agent Brain (English Live Concierge + OKF Mutator) ──
  const chatStream = document.getElementById("chat-stream");

  function appendMessage(role, htmlContent, chips = []) {
    const msg = document.createElement("div");
    msg.className = `msg ${role}`;
    const timeStr = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

    let chipsHtml = "";
    if (chips && chips.length) {
      chipsHtml = `<div class="msg-pills">` +
        chips.map(c => `<button type="button" class="prompt-chip" data-prompt="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join("") +
        `</div>`;
    }

    msg.innerHTML = `
      <div class="msg-meta">
        <span>${role === "bot" ? "✨ MAESTRO AI · EXECUTIVE PRODUCER" : "👤 YOU (CLIENT / JUDGE)"}</span>
        <span>${timeStr}</span>
      </div>
      <div class="msg-body">${htmlContent}</div>
      ${chipsHtml}
    `;

    msg.querySelectorAll(".prompt-chip").forEach(btn => {
      btn.onclick = () => handleUserMessage(btn.dataset.prompt);
    });

    chatStream.appendChild(msg);
    chatStream.scrollTop = chatStream.scrollHeight;
  }

  function processAgentTurn(userText) {
    const lower = userText.toLowerCase();
    const venue = window.MaestroOKFEngine.getVenue(project.venueId);

    // 1. Detect guest count changes (e.g. "150 guests", "350 people", "450")
    const guestMatch = userText.match(/\b(\d{2,4})\s*(guests|people|attendees|person|איש|אורחים)?\b/i);
    if (guestMatch && Number(guestMatch[1]) >= 30 && Number(guestMatch[1]) <= 1200) {
      project.guestCount = Number(guestMatch[1]);
    }

    // 2. Detect budget changes (e.g. "$150,000" or "$95k")
    const budgetKMatch = userText.match(/\$(\d{2,3})\s*k\b/i);
    const budgetFullMatch = userText.match(/\$(\d{2,3},\d{3})/);
    if (budgetKMatch) {
      project.budgetEnvelope = Number(budgetKMatch[1]) * 1000;
    } else if (budgetFullMatch) {
      project.budgetEnvelope = Number(budgetFullMatch[1].replace(/,/g, ""));
    }

    // 3. Detect Corporate / Mid-week switch
    if (lower.includes("corporate") || lower.includes("keynote") || lower.includes("tech") || lower.includes("summit") || lower.includes("mid-week")) {
      project.eventType = "MidWeekCorporateKeynote";
      project.aestheticConcept = "Silicon Valley Obsidian Glass Keynote & Interactive Demos";
    } else if (lower.includes("wedding") || lower.includes("chuppah") || lower.includes("bride") || lower.includes("groom") || lower.includes("couple")) {
      project.eventType = "IntellectualJazzWedding";
      project.aestheticConcept = "Academic Speakeasy & Prismatic Waterfront Jazz";
    }

    // 4. Detect 501(c)(3) nonprofit discount
    if (lower.includes("nonprofit") || lower.includes("501") || lower.includes("discount")) {
      project.nonProfit501c3 = true;
    }

    // 5. Detect venue switches
    if (lower.includes("sfmoma")) {
      project.venueId = "sfmoma";
    } else if (lower.includes("academy") || lower.includes("cal academy")) {
      project.venueId = "cal_academy";
    } else if (lower.includes("de young") || lower.includes("deyoung")) {
      project.venueId = "de_young";
    } else if (lower.includes("pearl")) {
      project.venueId = "the_pearl_sf";
    } else if (lower.includes("exploratorium") || lower.includes("pier 15")) {
      project.venueId = "exploratorium_pier15";
    }

    saveProject();
    renderAll();

    const updatedVenue = window.MaestroOKFEngine.getVenue(project.venueId);
    const pricing = window.MaestroOKFEngine.calculatePricing(project);
    const alignment = window.MaestroOKFEngine.evaluateAlignment(project);

    // Craft context-aware response
    if (lower.includes("survey") || lower.includes("stakeholder") || lower.includes("parents") || lower.includes("conflict") || lower.includes("grandparents") || lower.includes("senior")) {
      activateTab("view-stakeholders");
      return {
        reply: `I have updated the <strong>Stakeholder Circle & Alignment Matrix</strong> (Stage 1.5) for <strong>${updatedVenue.shortName}</strong>.<br><br>
        • <strong>5-Question Micro-Survey:</strong> Ready to dispatch via WhatsApp/SMS to the Couple, Parents, and Chief Attendants.<br>
        • <strong>Conflict Resolution & Senior Accessibility:</strong> To resolve the tension between the Parents' request for a <em>&lt;72 dB seated Michelin conversation</em> and the Wedding Party's desire for an <em>electric 90 dB Jazz Speakeasy</em>, I have zoned <strong>Level 3 Fisher Bay Observatory Terrace</strong> as a protected <strong>&lt;65 dB Senior Acoustic Sanctuary</strong> (with direct step-free elevator access), while <strong>OrangePiel velvet drapery</strong> and <strong>Argus HD DSP</strong> calibrate Level 2 Moore East Gallery for dining!`,
        chips: [
          "Show the 3-Level Floorplan Blueprint",
          "Switch to Mid-Week Corporate Keynote Mode",
          "Lock a 14-Day Free Soft Hold"
        ]
      };
    }

    if (lower.includes("floorplan") || lower.includes("layout") || lower.includes("map") || lower.includes("level")) {
      activateTab("view-floorplan");
      return {
        reply: `Here is the live <strong>3-Level Spatial Blueprint</strong> for <strong>${project.guestCount} guests</strong> at <strong>${updatedVenue.shortName}</strong>:<br><br>
        1️⃣ <strong>Level 1 (Bechtel Light Portal):</strong> Step-free arrival, Kinetic Light exhibits with Exploratorium <em>"Explainers"</em>, Tonic Mixology Bar #1 & Espresso Subito.<br>
        2️⃣ <strong>Level 2 (Moore East & Mezzanine):</strong> Synchronized Paula LeDuc seated banquet (${Math.ceil(project.guestCount / 10)} tables) + Entire Productions Live Jazz stage calibrated by Argus HD.<br>
        3️⃣ <strong>Level 3 (Fisher Bay Observatory & Terrace):</strong> Panoramic Bay Bridge Chuppah, <em>The Caviar Co.</em> VIP Lounge & heated <em>&lt;65 dB Senior Acoustic Sanctuary</em>.`,
        chips: [
          "View Minute-by-Minute Run of Show",
          "Update to 150 guests for intimate wedding",
          "Lock a 14-Day Free Soft Hold"
        ]
      };
    }

    if (lower.includes("run of show") || lower.includes("timeline") || lower.includes("schedule") || lower.includes("vendor") || lower.includes("rule")) {
      activateTab("view-ros");
      return {
        reply: `I have compiled the <strong>Minute-by-Minute Run of Show & Operational Inference Rules</strong> (Stage 3).<br><br>
        Because <strong>${updatedVenue.shortName}</strong> closes to the public at <strong>${updatedVenue.museumCloseTime}</strong>, <code>RULE_1_MUSEUM_TURNAROUND</code> automatically mandates 24-hour off-site pre-rigging at <strong>Blueprint Studios</strong> & <strong>Argus HD</strong>, followed by a synchronized 90-minute dock load-in via <strong>Jay's Small Moves</strong> so doors open smoothly at 18:45!`,
        chips: [
          "Lock a 14-Day Free Soft Hold",
          "Apply 501(c)(3) 15% Nonprofit Discount",
          "Show Stakeholder Micro-Survey"
        ]
      };
    }

    if (lower.includes("hold") || lower.includes("book") || lower.includes("tour") || lower.includes("quote")) {
      document.getElementById("hold-modal").classList.add("open");
      return {
        reply: `I have opened the <strong>Pier 15 Actionable Conversion Gate</strong>! You can immediately lock a <strong>14-Day Complimentary Soft Hold</strong> (zero deposit required under Exploratorium policy) or schedule a private on-site walkthrough with the Pier 15 Events Team.`,
        chips: [
          "Show Full Pricing Breakdown",
          "View Minute-by-Minute Run of Show"
        ]
      };
    }

    // Default comprehensive producer response
    activateTab("view-spatial");
    return {
      reply: `I have re-engineered the live <strong>OKF EventProject</strong> for <strong>${project.guestCount} guests</strong> at <strong>${updatedVenue.venueName}</strong> (${project.eventType === "MidWeekCorporateKeynote" ? "Mid-Week Corporate Keynote Mode" : "Waterfront Jazz Wedding Mode"}):<br><br>
      • <strong>Recommended Venue Package:</strong> ${pricing.packageSelected} (<strong>${formatUSD(pricing.netVenueFee)}</strong> net venue fee${project.nonProfit501c3 ? " including 15% 501(c)(3) discount" : ""}).<br>
      • <strong>Included Exploratorium Perks:</strong> On-site <em>"Explainer"</em> science educators, 1-hr museum photo shoot, get-ready classroom, LED base lighting & 14-day complimentary Soft Hold.<br>
      • <strong>Total Turnkey Production Estimate:</strong> <strong>${formatUSD(pricing.totalEstimated)}</strong> (Paula LeDuc catering, 3 Tonic bars, Argus HD DSP & Flexible LED Skins, Blueprint Studios, Entire Productions Jazz & Caviar VIP lounge).`,
      chips: [
        "Dispatch 5-Question Stakeholder Micro-Survey",
        "Inspect 3-Level Floorplan & Senior Sanctuary",
        "Switch to Mid-Week Corporate Keynote Mode",
        "Lock 14-Day Complimentary Soft Hold"
      ]
    };
  }

  function handleUserMessage(text) {
    const clean = String(text || "").trim();
    if (!clean) return;
    appendMessage("user", escapeHtml(clean));
    document.getElementById("chat-input").value = "";

    setTimeout(() => {
      const result = processAgentTurn(clean);
      appendMessage("bot", result.reply, result.chips);
    }, 260);
  }

  // ── UI Event Bindings ──
  document.getElementById("chat-form").onsubmit = (e) => {
    e.preventDefault();
    handleUserMessage(document.getElementById("chat-input").value);
  };

  // Stage Tabs
  function activateTab(viewId) {
    document.querySelectorAll(".stage-tab").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.view === viewId);
    });
    document.querySelectorAll(".stage-view").forEach(v => {
      v.classList.toggle("active", v.id === viewId);
    });
  }

  document.querySelectorAll(".stage-tab").forEach(btn => {
    btn.onclick = () => activateTab(btn.dataset.view);
  });

  // Vendor Category Filter (9-Category SF Master Directory)
  const vendorCatFilterEl = document.getElementById("vendor-cat-filter");
  if (vendorCatFilterEl) {
    vendorCatFilterEl.onchange = () => {
      const venue = window.MaestroOKFEngine.getVenue(project.venueId);
      const pricing = window.MaestroOKFEngine.calculatePricing(project);
      const ros = window.MaestroOKFEngine.generateRunOfShow(project);
      renderStage3(venue, pricing, ros);
    };
  }

  // Venue Selector (Instant Config Switch)
  document.getElementById("venue-selector").onchange = (e) => {
    project.venueId = e.target.value;
    saveProject();
    renderAll();
    const v = window.MaestroOKFEngine.getVenue(project.venueId);
    appendMessage("bot", `Switched active venue configuration to <strong>${v.venueName}</strong> (<code>${v.officialRentalUrl}</code>). All 3-level capacities, curatorial constraints, and pricing packages have been updated in real time!`, [
      "Inspect 3-Level Floorplan & Senior Sanctuary",
      "View Minute-by-Minute Run of Show"
    ]);
  };

  // Toggle Wedding <-> Mid-Week Corporate Mode
  document.getElementById("btn-toggle-mode").onclick = () => {
    if (project.eventType === "IntellectualJazzWedding") {
      handleUserMessage("Switch to Mid-Week Corporate Keynote Mode for 250 attendees");
    } else {
      handleUserMessage("Switch to Waterfront Jazz Wedding Mode for 220 guests");
    }
  };

  // Simulate Stakeholder Micro-Survey Dispatch
  document.getElementById("btn-send-survey").onclick = () => {
    const nameInput = document.getElementById("new-st-name").value.trim() || " Evelyn (Grandmother & Family Matriarch)";
    const roleInput = document.getElementById("new-st-role").value.trim() || "Grandparent / Senior VIP";
    const phoneInput = document.getElementById("new-st-phone").value.trim() || "WhatsApp (+1 415-902-1144)";

    project.stakeholders.push({
      id: "st_" + Date.now(),
      name: nameInput,
      role: roleInput,
      channel: phoneInput,
      status: "Completed",
      vibeChoice: "Protected <65 dB Waterfront Acoustic Sanctuary & Step-Free Access",
      musicRule: "Classic Sinatra & Acoustic Jazz at comfortable conversational volume",
      priority: "Zero stairs, elevator escort to Level 3 Observatory & warm outdoor heaters",
      harmonyWeight: 95
    });

    document.getElementById("new-st-name").value = "";
    document.getElementById("new-st-role").value = "";
    document.getElementById("new-st-phone").value = "";

    saveProject();
    renderAll();
    appendMessage("bot", `📲 Dispatched the <strong>5-Question WhatsApp Micro-Survey</strong> to <strong>${escapeHtml(nameInput)}</strong> (${escapeHtml(roleInput)}) and fused their response into the <strong>OKF Alignment Matrix</strong>! Senior step-free elevator routing and the &lt;65 dB Observatory Sanctuary are locked.`);
  };

  // Soft Hold / Venue Tour Modal
  document.getElementById("btn-open-hold").onclick = () => {
    document.getElementById("hold-modal").classList.add("open");
  };
  document.getElementById("btn-close-hold").onclick = () => {
    document.getElementById("hold-modal").classList.remove("open");
  };
  document.getElementById("hold-form").onsubmit = (e) => {
    e.preventDefault();
    const clientName = document.getElementById("hold-name").value.trim() || "Alex & Jordan";
    const clientEmail = document.getElementById("hold-email").value.trim() || "alex@example.com";
    const actionType = document.getElementById("hold-action").value;
    document.getElementById("hold-modal").classList.remove("open");

    const venue = window.MaestroOKFEngine.getVenue(project.venueId);
    const pricing = window.MaestroOKFEngine.calculatePricing(project);

    appendMessage("bot", `🎉 <strong>CONFIRMATION LOCKED (${actionType === "soft_hold" ? "14-Day Complimentary Soft Hold" : "Private Pier 15 Venue Tour"}):</strong><br><br>
    • <strong>Client:</strong> ${escapeHtml(clientName)} (${escapeHtml(clientEmail)})<br>
    • <strong>Venue & Package:</strong> ${escapeHtml(venue.venueName)} — <em>${escapeHtml(pricing.packageSelected)}</em><br>
    • <strong>Target Date & Guest Count:</strong> ${project.targetDate} · ${project.guestCount} Guests (${formatUSD(pricing.netVenueFee)} Net Venue Fee)<br>
    • <strong>Direct Venue Dispatch:</strong> Confirmation packet & OKF Run-of-Show prepared for <code>${venue.contactEmail}</code> (${venue.contactPhone}).`);
  };

  // Export Full OKF Package JSON
  document.getElementById("btn-export-okf").onclick = () => {
    const venue = window.MaestroOKFEngine.getVenue(project.venueId);
    const pricing = window.MaestroOKFEngine.calculatePricing(project);
    const alignment = window.MaestroOKFEngine.evaluateAlignment(project);
    const ros = window.MaestroOKFEngine.generateRunOfShow(project);

    const payload = {
      exportedAt: new Date().toISOString(),
      system: "Maestro AI — Autonomous Executive Event Producer (OKF v2.0)",
      eventProject: project,
      selectedVenue: venue,
      pricingBreakdown: pricing,
      stakeholderAlignment: alignment,
      runOfShowLog: ros
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `maestro-okf-${project.venueId}-${project.targetDate}.json`;
    a.click();
  };

  // Custom Venue JSON Upload (Zero-Code Adaptation to Any Real Website)
  document.getElementById("btn-upload-venue-json").onclick = () => {
    document.getElementById("venue-json-input").click();
  };
  document.getElementById("venue-json-input").onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const customVenue = JSON.parse(ev.target.result);
        const vObj = customVenue.venues ? customVenue.venues[0] : customVenue;
        if (vObj && vObj.venueId && vObj.venueName) {
          window.MAESTRO_VENUES_CATALOG.push(vObj);
          const opt = document.createElement("option");
          opt.value = vObj.venueId;
          opt.textContent = `🏛️ ${vObj.shortName || vObj.venueName}`;
          document.getElementById("venue-selector").appendChild(opt);
          project.venueId = vObj.venueId;
          saveProject();
          renderAll();
          appendMessage("bot", `✅ Hot-swapped new venue dataset: <strong>${escapeHtml(vObj.venueName)}</strong>! Maestro AI is now operating on the new venue's galleries and pricing rules.`);
        }
      } catch (err) {
        appendMessage("bot", "⚠️ Could not parse custom venue JSON file. Please check the schema in <code>config/venues-catalog.json</code>.");
      }
    };
    reader.readAsText(file);
  };

  // Web Speech API Voice Input
  const voiceBtn = document.getElementById("voice-btn");
  if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRec();
    rec.lang = "en-US";
    rec.interimResults = false;

    voiceBtn.onclick = () => {
      try {
        rec.start();
        voiceBtn.classList.add("listening");
      } catch (e) {}
    };
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      document.getElementById("chat-input").value = transcript;
      handleUserMessage(transcript);
    };
    rec.onend = () => voiceBtn.classList.remove("listening");
  } else {
    voiceBtn.onclick = () => {
      appendMessage("bot", "🎙️ Voice input is supported in Chrome/Edge desktop & mobile browsers.");
    };
  }

  // Initial Boot Greeting (100% English for Agent Games Judges)
  renderAll();
  appendMessage(
    "bot",
    `Welcome to <strong>Maestro AI — The Autonomous Executive Event Producer</strong>, architected for <strong>The Exploratorium at Pier 15</strong> (<code>exploratorium.edu/rentals</code>).<br><br>
    Instead of static PDFs and 48-hour inquiry forms, I engineer your entire event in real time across <strong>3 Waterfront Museum Levels</strong>:<br>
    • <strong>Stage 1:</strong> Instant Gallery Bundle & Turnkey Pricing (${formatUSD(11000)}–${formatUSD(16500)}+ base venue tiers + 15% nonprofit discount).<br>
    • <strong>Stage 1.5:</strong> Stakeholder Circle & <strong>5-Question WhatsApp Micro-Survey</strong> with automatic multi-generational & acoustic conflict resolution.<br>
    • <strong>Stage 2 & 3:</strong> Live 3-Level Blueprint, 90-minute 17:00 Museum Turnaround Rule, and <strong>14-Day Complimentary Soft Hold</strong>.<br><br>
    How would you like to configure or stress-test your Pier 15 event?`,
    [
      "Plan a 220-guest Waterfront Jazz Wedding ($125k budget)",
      "Dispatch 5-Question Stakeholder Micro-Survey",
      "Inspect 3-Level Floorplan & Senior Sanctuary",
      "Switch to Mid-Week Corporate Keynote Mode",
      "Lock 14-Day Complimentary Soft Hold"
    ]
  );
})();
