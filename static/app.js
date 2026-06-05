/* ==========================================================================
   REVA Smart Campus - Flask AJAX Connected Core Scripts
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    initSlideDeck();
    initDashboardTabs();
    
    // Initial fetch of logs and settings
    fetchSystemLogs();
    
    // Initialize specific modules
    initParkingLot();
    initLibrarySeating();
    initCanteenAnalytics();
    initSmartLighting();
    initNotificationEngine();
    initAutoAttendance();
    
    // Setup minor stats updater
    setInterval(updateQuickStatsTelemetry, 5000);
    updateQuickStatsTelemetry();

    // Initial system notice
    setTimeout(() => {
        showToast("System Online", "Synced with Python Flask Backend REST APIs.", "success");
    }, 1000);
});

/* ==========================================================================
   1. Toast Notifications Utility
   ========================================================================== */
function showToast(title, message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
        iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'alert') {
        iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></svg>`;
    } else {
        iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></svg>`;
    }

    toast.innerHTML = `
        <div style="color: inherit; display:flex; align-items:center; justify-content:center; flex-shrink: 0;">
            ${iconSvg}
        </div>
        <div class="toast-content">
            <span class="toast-title">${title}</span>
            <span class="toast-message">${message}</span>
        </div>
        <button class="toast-close">&times;</button>
    `;

    container.appendChild(toast);

    toast.querySelector(".toast-close").addEventListener("click", () => {
        toast.remove();
    });

    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = "fadeIn 0.3s ease-out reverse forwards";
            setTimeout(() => toast.remove(), 300);
        }
    }, 4500);
}

/* ==========================================================================
   2. Backend Log Fetching & System log updates
   ========================================================================== */
function fetchSystemLogs() {
    fetch('/api/logs')
        .then(res => res.json())
        .then(logs => {
            renderSystemLogs(logs);
        })
        .catch(err => console.error("Error fetching logs:", err));
}

function renderSystemLogs(logs) {
    const feed = document.getElementById("logs-feed-list");
    if (!feed) return;

    if (logs.length === 0) {
        feed.innerHTML = `
            <div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 2rem 0;">
                No system logs available.
            </div>
        `;
        return;
    }

    feed.innerHTML = "";
    logs.forEach(log => {
        const item = document.createElement("div");
        item.className = "log-item";
        item.innerHTML = `
            <div class="log-meta">
                <span class="log-type ${log.type}">${log.source}</span>
                <span class="log-time">${log.time}</span>
            </div>
            <div class="log-msg">${log.message}</div>
        `;
        feed.appendChild(item);
    });

    // Update mini dashboard alert in hero
    const miniAlert = document.getElementById("mini-alert");
    if (miniAlert && logs.length > 0) {
        miniAlert.textContent = `${logs[0].source}: ${logs[0].message}`;
    }
}

/* ==========================================================================
   3. Quick Stats Telemetry sync (updates the Hero and monitor widgets)
   ========================================================================== */
function updateQuickStatsTelemetry() {
    // 1. Fetch Parking stats
    fetch('/api/parking')
        .then(res => res.json())
        .then(data => {
            const miniParking = document.getElementById("mini-parking");
            if (miniParking) {
                miniParking.textContent = `${data.vacant}/${data.total}`;
            }
        })
        .catch(e => console.warn("Quick stats: parking fetch failed"));

    // 2. Fetch Library stats
    fetch('/api/library')
        .then(res => res.json())
        .then(data => {
            const miniLibrary = document.getElementById("mini-library");
            if (miniLibrary) {
                miniLibrary.textContent = `${data.vacant} Vacant`;
            }
        })
        .catch(e => console.warn("Quick stats: library fetch failed"));
}

/* ==========================================================================
   4. Slides Tab Mechanism
   ========================================================================== */
function initSlideDeck() {
    const tabs = document.querySelectorAll(".slide-tab");
    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");

            const slideId = tab.getAttribute("data-slide");
            const slides = document.querySelectorAll(".slide-content");
            slides.forEach(s => s.classList.remove("active"));
            
            const targetSlide = document.getElementById(slideId);
            if (targetSlide) targetSlide.classList.add("active");
        });
    });
}

/* ==========================================================================
   5. Dashboard Tab Navigation
   ========================================================================== */
function initDashboardTabs() {
    const tabs = document.querySelectorAll(".db-tab");
    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");

            const panelId = tab.getAttribute("data-panel");
            const panels = document.querySelectorAll(".db-viewport .db-panel");
            panels.forEach(p => p.classList.remove("active"));

            const targetPanel = document.getElementById(panelId);
            if (targetPanel) targetPanel.classList.add("active");

            // Custom actions depending on panel selection
            if (panelId === 'panel-parking') {
                refreshParkingView();
            } else if (panelId === 'panel-library') {
                refreshLibraryView();
            } else if (panelId === 'panel-lighting') {
                refreshLightingView();
            } else if (panelId === 'panel-notifications') {
                fetchSystemLogs();
            }
        });
    });
}

/* ==========================================================================
   6. Smart Parking Lot Module
   ========================================================================== */
function initParkingLot() {
    refreshParkingView();

    const filters = document.querySelectorAll(".filter-btn");
    filters.forEach(btn => {
        btn.addEventListener("click", () => {
            filters.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            refreshParkingView(btn.getAttribute("data-filter"));
        });
    });
}

function refreshParkingView(filter = "all") {
    fetch('/api/parking')
        .then(res => res.json())
        .then(data => {
            // Update stats values
            const vacantEl = document.getElementById("parking-vacant-count");
            const occupiedEl = document.getElementById("parking-occupied-count");
            if (vacantEl) vacantEl.textContent = data.vacant;
            if (occupiedEl) occupiedEl.textContent = data.occupied;

            // Render spots
            const grid = document.getElementById("parking-grid");
            if (!grid) return;
            grid.innerHTML = "";

            data.spots.forEach(spot => {
                if (filter === "vacant" && spot.occupied) return;
                if (filter === "occupied" && !spot.occupied) return;

                const el = document.createElement("div");
                el.className = `parking-spot ${spot.occupied ? 'occupied' : 'vacant'}`;
                el.innerHTML = `
                    <span class="spot-id">${spot.id}</span>
                    <span class="spot-status">${spot.occupied ? 'Occupied' : 'Vacant'}</span>
                    <span class="parking-spot-sensor"></span>
                `;

                el.addEventListener("click", () => {
                    toggleParkingSpot(spot.id, filter);
                });

                grid.appendChild(el);
            });
        })
        .catch(err => console.error("Error fetching parking:", err));
}

function toggleParkingSpot(spotId, currentFilter) {
    fetch('/api/parking/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: spotId })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            const state = data.spot.occupied ? "OCCUPIED" : "VACANT";
            showToast("Parking Slot Updated", `Slot ${spotId} is now ${state}.`, data.spot.occupied ? "alert" : "success");
            
            // Sync with backend logs
            fetchSystemLogs();
            // Re-render
            refreshParkingView(currentFilter);
            updateQuickStatsTelemetry();
        }
    })
    .catch(err => console.error("Error toggling parking:", err));
}

/* ==========================================================================
   7. Library Seating Map & UX Simulator
   ========================================================================== */
let localSelectedPod = null;
let localJourneyInProgress = false;

function initLibrarySeating() {
    refreshLibraryView();

    const reserveBtn = document.getElementById("btn-reserve");
    if (reserveBtn) {
        reserveBtn.addEventListener("click", () => {
            if (!localSelectedPod || localJourneyInProgress) return;
            startLibraryReservationJourney();
        });
    }
}

function refreshLibraryView() {
    fetch('/api/library')
        .then(res => res.json())
        .then(data => {
            const grid = document.getElementById("library-grid");
            if (!grid) return;
            grid.innerHTML = "";

            data.pods.forEach(pod => {
                const el = document.createElement("div");
                el.className = `library-pod ${pod.occupied ? 'occupied' : 'vacant'}`;
                if (localSelectedPod && localSelectedPod.number === pod.number) {
                    el.classList.add("selected");
                }

                el.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <path d="M9 21V9h6v12"></path>
                    </svg>
                    <span class="pod-number">Pod 0${pod.number}</span>
                `;

                el.addEventListener("click", () => {
                    if (localJourneyInProgress) return;
                    if (pod.occupied) {
                        showToast("Pod Unavailable", `Pod 0${pod.number} is occupied by another student.`, "alert");
                        return;
                    }

                    // Select pod
                    localSelectedPod = pod;
                    refreshLibraryView();
                    
                    const reserveBtn = document.getElementById("btn-reserve");
                    reserveBtn.removeAttribute("disabled");
                    reserveBtn.textContent = `Reserve Pod 0${pod.number}`;
                    
                    resetLibraryFlowSteps();
                    const step1 = document.getElementById("flow-step-1");
                    if (step1) step1.classList.add("active");
                });

                grid.appendChild(el);
            });
        })
        .catch(err => console.error("Error loading library seating:", err));
}

function resetLibraryFlowSteps() {
    const steps = document.querySelectorAll(".flow-step");
    steps.forEach(s => s.classList.remove("active"));
    
    const outletText = document.getElementById("outlet-status-text");
    const outletGlow = document.getElementById("outlet-status-glow");
    if (outletText) {
        outletText.textContent = "Outlet Deactivated";
        outletText.classList.remove("active");
    }
    if (outletGlow) {
        outletGlow.style.backgroundColor = "var(--text-muted)";
    }
}

function startLibraryReservationJourney() {
    localJourneyInProgress = true;
    const reserveBtn = document.getElementById("btn-reserve");
    reserveBtn.setAttribute("disabled", true);
    reserveBtn.textContent = "Journey Simulating...";

    // Step 1: Discovery complete
    showToast("Discovery Confirmed", `Contacting backend database to lock Pod 0${localSelectedPod.number}...`, "info");

    // Hit Backend Reserve Endpoint
    fetch('/api/library/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: localSelectedPod.number })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            // Stage 2: Navigation (after 1.5s)
            setTimeout(() => {
                resetLibraryFlowSteps();
                document.getElementById("flow-step-1").classList.add("active");
                const step2 = document.getElementById("flow-step-2");
                if (step2) step2.classList.add("active");

                showToast("Navigation Active", `Pathfinding calculated to Pod 0${localSelectedPod.number}. Follow the UI layout guidance.`, "info");

                // Stage 3: Interaction (after another 2s)
                setTimeout(() => {
                    resetLibraryFlowSteps();
                    document.getElementById("flow-step-1").classList.add("active");
                    document.getElementById("flow-step-2").classList.add("active");
                    const step3 = document.getElementById("flow-step-3");
                    if (step3) step3.classList.add("active");

                    // Activate Power Outlet Glow on UI
                    const outletText = document.getElementById("outlet-status-text");
                    const outletGlow = document.getElementById("outlet-status-glow");
                    if (outletText) {
                        outletText.textContent = "Outlet Energized (AC)";
                        outletText.classList.add("active");
                    }
                    if (outletGlow) {
                        outletGlow.style.backgroundColor = "var(--success)";
                    }

                    playBeepSound(650, 0.1);

                    showToast("IoT Triggered", `Welcome! Physical presence detected at Pod 0${localSelectedPod.number}. Desk AC outlet is active.`, "success");
                    
                    fetchSystemLogs();
                    updateQuickStatsTelemetry();

                    // Complete Journey Simulation after 3s
                    setTimeout(() => {
                        localJourneyInProgress = false;
                        localSelectedPod = null;
                        reserveBtn.textContent = "Select a Study Pod";
                        refreshLibraryView();
                    }, 3000);

                }, 2000);

            }, 1500);
        } else {
            showToast("Reservation Failed", data.error || "Could not book pod.", "alert");
            localJourneyInProgress = false;
            localSelectedPod = null;
            reserveBtn.textContent = "Select a Study Pod";
            refreshLibraryView();
        }
    })
    .catch(err => {
        console.error("Error making reservation:", err);
        localJourneyInProgress = false;
        localSelectedPod = null;
        reserveBtn.textContent = "Select a Study Pod";
        refreshLibraryView();
    });
}

/* ==========================================================================
   8. Canteen Analytics Chart
   ========================================================================== */
function initCanteenAnalytics() {
    fetch('/api/canteen')
        .then(res => res.json())
        .then(data => {
            const adviceEl = document.getElementById("ai-rec-text");
            const badgeEl = document.getElementById("ai-rec-badge-time");

            if (adviceEl) adviceEl.textContent = data.recommendation;
            if (badgeEl) badgeEl.textContent = data.best_time;

            drawCanteenChart(data.traffic);
        })
        .catch(err => console.error("Error fetching canteen analytics:", err));
}

function drawCanteenChart(points) {
    const svg = document.getElementById("analytics-svg");
    if (!svg) return;

    const width = 540;
    const height = 160;
    const paddingLeft = 40;
    const paddingTop = 20;

    let svgContent = '';
    
    // Draw Y axis lines
    for (let i = 0; i <= 4; i++) {
        const yVal = paddingTop + (height / 4) * i;
        const indexVal = 100 - i * 25;
        svgContent += `
            <line x1="${paddingLeft}" y1="${yVal}" x2="${paddingLeft + width}" y2="${yVal}" stroke="rgba(255,255,255,0.04)" stroke-width="1" />
            <text x="${paddingLeft - 10}" y="${yVal + 4}" fill="var(--text-muted)" font-size="10" text-anchor="end">${indexVal}%</text>
        `;
    }

    // Coordinates mapping
    const coords = points.map((p, idx) => {
        const x = paddingLeft + (width / (points.length - 1)) * idx;
        const y = paddingTop + height - (height * (p.val / 100));
        return { x, y, hour: p.hour, val: p.val };
    });

    // SVG path string building
    let pathD = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
        const prev = coords[i-1];
        const curr = coords[i];
        const cpX1 = prev.x + (curr.x - prev.x) / 2;
        const cpY1 = prev.y;
        const cpX2 = prev.x + (curr.x - prev.x) / 2;
        const cpY2 = curr.y;
        pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${curr.x} ${curr.y}`;
    }

    let areaD = `${pathD} L ${coords[coords.length-1].x} ${paddingTop + height} L ${coords[0].x} ${paddingTop + height} Z`;
    
    svgContent += `
        <path d="${areaD}" fill="url(#chart-gradient)" opacity="0.15" />
        <path d="${pathD}" fill="none" stroke="url(#chart-line-gradient)" stroke-width="3" />
    `;

    coords.forEach(pt => {
        svgContent += `
            <circle class="chart-pt" cx="${pt.x}" cy="${pt.y}" r="5" fill="var(--brand-secondary)" stroke="var(--bg-dark)" stroke-width="2" 
                    data-hour="${pt.hour}" data-val="${pt.val}" style="cursor:pointer; transition: 0.2s;" />
        `;
    });

    coords.forEach(pt => {
        svgContent += `
            <text x="${pt.x}" y="${paddingTop + height + 22}" fill="var(--text-muted)" font-size="10" text-anchor="middle">${pt.hour}</text>
        `;
    });

    const defs = `
        <defs>
            <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--brand-secondary)" />
                <stop offset="100%" stop-color="var(--brand-secondary)" stop-opacity="0" />
            </linearGradient>
            <linearGradient id="chart-line-gradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="var(--brand-primary)" />
                <stop offset="100%" stop-color="var(--brand-secondary)" />
            </linearGradient>
        </defs>
    `;

    svg.innerHTML = defs + svgContent;

    // Hover tooltips binding
    const dots = svg.querySelectorAll(".chart-pt");
    const tooltip = document.getElementById("chart-tooltip");
    
    dots.forEach(dot => {
        dot.addEventListener("mouseover", (e) => {
            dot.setAttribute("r", "7");
            const hr = dot.getAttribute("data-hour");
            const val = dot.getAttribute("data-val");
            
            tooltip.style.display = "block";
            tooltip.textContent = `${hr}: ${val}% Congestion`;
            
            const rect = dot.getBoundingClientRect();
            const wrapRect = document.getElementById("chart-wrapper").getBoundingClientRect();
            tooltip.style.left = `${rect.left - wrapRect.left + 5}px`;
            tooltip.style.top = `${rect.top - wrapRect.top - 12}px`;
        });

        dot.addEventListener("mouseout", () => {
            dot.setAttribute("r", "5");
            tooltip.style.display = "none";
        });
    });
}

/* ==========================================================================
   9. Smart Lighting Room Simulator
   ========================================================================== */
let lightingLocalIntervals = {};
let lightingRates = { "room-301": 0.04, "room-102": 0.06 };

function initSmartLighting() {
    refreshLightingView();

    const checkboxes = document.querySelectorAll(".room-checkbox");
    checkboxes.forEach(chk => {
        chk.addEventListener("change", () => {
            const roomId = chk.getAttribute("data-room");
            toggleRoomOccupancy(roomId);
        });
    });
}

function refreshLightingView() {
    fetch('/api/lighting')
        .then(res => res.json())
        .then(rooms => {
            for (const rId in rooms) {
                const room = rooms[rId];
                const chk = document.getElementById(`${rId}-chk`);
                const card = document.getElementById(rId);
                const badge = document.getElementById(`${rId}-hvac`);
                const savedEl = document.getElementById(`${rId}-saved`);

                // Set checkbox occupied state
                if (chk) chk.checked = room.occupied;

                // Stop local simulation intervals if running
                if (lightingLocalIntervals[rId]) {
                    clearInterval(lightingLocalIntervals[rId]);
                    delete lightingLocalIntervals[rId];
                }

                // Update visual themes and counters
                if (room.occupied) {
                    card.className = "room-card lights-on";
                    badge.textContent = "HVAC: Active";
                    savedEl.textContent = `${room.saved.toFixed(2)} kWh`;
                } else {
                    card.className = "room-card lights-off";
                    badge.textContent = "HVAC: Eco-Save";
                    
                    // Run a fast local tick to display increments in real-time
                    let currentSaved = room.saved;
                    const tickRate = lightingRates[rId];
                    
                    savedEl.textContent = `${currentSaved.toFixed(2)} kWh`;

                    lightingLocalIntervals[rId] = setInterval(() => {
                        currentSaved += tickRate;
                        savedEl.textContent = `${currentSaved.toFixed(2)} kWh`;
                        incrementCarbonSavingMetric(tickRate * 0.05);
                    }, 1000);
                }
            }
        })
        .catch(err => console.error("Error refreshing lighting rooms:", err));
}

function toggleRoomOccupancy(roomId) {
    fetch('/api/lighting/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room: roomId })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            const stateText = data.occupied ? "Occupied: utilities powered ON." : "Vacant: utilities powered OFF.";
            showToast(`${roomId === "room-301" ? "Classroom 301" : "ECE Lab 102"} Alert`, stateText, data.occupied ? "info" : "success");
            
            fetchSystemLogs();
            refreshLightingView();
        }
    })
    .catch(err => console.error("Error toggling room lighting:", err));
}

function incrementCarbonSavingMetric(amount) {
    const carbonValEl = document.querySelector("#stat-carbon");
    if (!carbonValEl) return;
    
    let current = parseFloat(carbonValEl.textContent);
    current += amount;
    if (current > 42.00) current = 42.00;

    carbonValEl.innerHTML = `${current.toFixed(2)}<span>%</span>`;
}

/* ==========================================================================
   10. Notice Alert Broadcast Engine
   ========================================================================== */
function initNotificationEngine() {
    const btn = document.getElementById("btn-broadcast");
    const clearBtn = document.getElementById("btn-clear-logs");

    if (btn) {
        btn.addEventListener("click", () => {
            const typeSelect = document.getElementById("notice-type");
            const titleInput = document.getElementById("notice-title");
            const descInput = document.getElementById("notice-desc");

            const category = typeSelect.value;
            const title = titleInput.value.trim();
            const desc = descInput.value.trim();

            if (!title || !desc) {
                showToast("Required Fields Empty", "Please provide a notice title and description.", "alert");
                return;
            }

            // POST notice to backend API
            fetch('/api/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: category, title: title, desc: desc })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showToast(title, desc, category);
                    titleInput.value = "";
                    descInput.value = "";
                    fetchSystemLogs(); // Re-fetch logs
                }
            })
            .catch(err => console.error("Error broadcasting notice:", err));
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            fetch('/api/logs/clear', { method: 'POST' })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        fetchSystemLogs();
                    }
                })
                .catch(err => console.error("Error clearing logs:", err));
        });
    }
}

/* ==========================================================================
   11. Auto-Attendance Tap Simulator
   ========================================================================== */
function initAutoAttendance() {
    const beacon = document.getElementById("lectern-beacon");
    const phoneCard = document.getElementById("phone-nfc-card");
    const phoneStatus = document.getElementById("phone-status-lbl");
    const beaconLog = document.getElementById("beacon-log-text");

    if (!beacon) return;

    beacon.addEventListener("click", () => {
        if (beacon.classList.contains("active") || beacon.classList.contains("success")) return;

        // Step 1: Scan Shake Hand handshake simulation on Client
        beacon.className = "beacon-device active pinging";
        phoneCard.className = "phone-card-nfc scanning";
        phoneStatus.textContent = "Connecting to beacon...";
        beaconLog.textContent = "BLE Handshake initiated...";
        
        playBeepSound(400, 0.1);

        // Step 2: POST call after connection established (1.5s delay)
        setTimeout(() => {
            fetch('/api/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ srn: "R20EL412", name: "Aarav Mehta", room: "Classroom 301" })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    beacon.className = "beacon-device success";
                    phoneCard.className = "phone-card-nfc success";
                    phoneStatus.innerHTML = `Check-In Confirmed!<br>${data.srn}`;
                    beaconLog.textContent = `Attendance Logged: ${data.student}`;

                    // Double Beep
                    playBeepSound(880, 0.15);
                    setTimeout(() => playBeepSound(1100, 0.2), 150);

                    showToast("Attendance Confirmed", data.message, "success");
                    
                    fetchSystemLogs();

                    // Reset to idle (4s)
                    setTimeout(() => {
                        beacon.className = "beacon-device";
                        phoneCard.className = "phone-card-nfc";
                        phoneStatus.textContent = "Hold near beacon device to check-in";
                        beaconLog.textContent = "Beacon Idle";
                    }, 4000);
                }
            })
            .catch(err => {
                console.error("Attendance registry failed:", err);
                beacon.className = "beacon-device";
                phoneCard.className = "phone-card-nfc";
                phoneStatus.textContent = "Failed. Try again.";
                beaconLog.textContent = "Beacon Error";
            });

        }, 1500);
    });
}

/* ==========================================================================
   12. Web Audio Api Sound Effects
   ========================================================================== */
let audioCtx = null;

function playBeepSound(frequency, duration) {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }

        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + duration);
    } catch (e) {
        console.log("Audio feedback error bypassed: " + e.message);
    }
}
