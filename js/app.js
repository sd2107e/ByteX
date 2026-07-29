// Data Models & State
const floorsData = {
    "Floor 1": { capacity: 50, prefix: "A", nearLift: ["A1", "A2", "A3", "A4"] },
    "Floor 2": { capacity: 40, prefix: "B", nearLift: ["B1", "B2"] },
    "Floor 3": { capacity: 40, prefix: "C", nearLift: ["C1", "C2"] },
    "Basement": { capacity: 30, prefix: "P", nearLift: ["P1", "P2", "P3"] }
};

let parkingSlots = [];
let currentFloor = "Floor 1";
let pieChart, barChart;

// 1. Initialize Mock Data
function initData() {
    const types = ["CAR", "BIKE", "EV", "ACCESSIBLE"];
    const statuses = ["available", "occupied", "reserved"];

    Object.keys(floorsData).forEach(floor => {
        const conf = floorsData[floor];
        for (let i = 1; i <= conf.capacity; i++) {
            const id = `${conf.prefix}${i}`;
            const isEV = i % 7 === 0;
            const isAccessible = i % 11 === 0;
            const type = isEV ? "EV" : isAccessible ? "ACCESSIBLE" : (i % 5 === 0 ? "BIKE" : "CAR");
            const status = Math.random() > 0.4 ? "occupied" : "available";

            parkingSlots.push({
                id,
                floor,
                type,
                status,
                nearLift: conf.nearLift.includes(id),
                hasCharger: isEV
            });
        }
    });
}

// 2. Render Floor Tabs & Parking Grid
function renderTabs() {
    const container = document.getElementById("floor-tabs-container");
    container.innerHTML = Object.keys(floorsData).map(floor => `
        <button class="tab-btn ${floor === currentFloor ? 'active' : ''}" onclick="switchFloor('${floor}')">
            ${floor}
        </button>
    `).join("");
}

function switchFloor(floorName) {
    currentFloor = floorName;
    renderTabs();
    renderGrid();
}

function renderGrid() {
    const container = document.getElementById("parking-grid-container");
    const typeFilter = document.getElementById("type-filter").value;
    const availableOnly = document.getElementById("available-only").checked;
    const searchQuery = document.getElementById("slot-search").value.toUpperCase();

    // AI Feature: Identify "Best Available Slot" (Near lift & available)
    const bestSlot = parkingSlots.find(s => s.floor === currentFloor && s.status === 'available' && s.nearLift);

    const filtered = parkingSlots.filter(s => {
        const matchesFloor = s.floor === currentFloor;
        const matchesType = typeFilter === "ALL" || s.type === typeFilter;
        const matchesAvail = !availableOnly || s.status === "available";
        const matchesSearch = s.id.includes(searchQuery);
        return matchesFloor && matchesType && matchesAvail && matchesSearch;
    });

    container.innerHTML = filtered.map(slot => {
        const isBest = bestSlot && bestSlot.id === slot.id;
        let icon = "car";
        if (slot.type === "EV") icon = "zap";
        if (slot.type === "BIKE") icon = "bike";
        if (slot.type === "ACCESSIBLE") icon = "accessibility";

        return `
            <div class="slot-card ${slot.status} ${isBest ? 'recommended' : ''}" onclick="openModal('${slot.id}')">
                ${isBest ? '<span class="best-badge">BEST SLOT</span>' : ''}
                <i data-lucide="${icon}"></i>
                <div>${slot.id}</div>
                <small style="font-size:0.7rem; text-transform:capitalize;">${slot.type}</small>
            </div>
        `;
    }).join("");

    lucide.createIcons();
    updateStats();
}

// 3. Dynamic Stats & Charts Updates
function updateStats() {
    const total = parkingSlots.length;
    const available = parkingSlots.filter(s => s.status === "available").length;
    const occupied = parkingSlots.filter(s => s.status === "occupied").length;
    const rate = Math.round((occupied / total) * 100);

    document.getElementById("stat-total").innerText = total;
    document.getElementById("stat-available").innerText = available;
    document.getElementById("stat-occupied").innerText = occupied;
    document.getElementById("stat-rate").innerText = `${rate}%`;

    updateCharts(available, occupied);
}

function initCharts() {
    const pieCtx = document.getElementById('pieChart').getContext('2d');
    pieChart = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
            labels: ['Available', 'Occupied'],
            datasets: [{
                data: [0, 0],
                backgroundColor: ['#22C55E', '#EF4444'],
                borderWidth: 0
            }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });

    const barCtx = document.getElementById('barChart').getContext('2d');
    barChart = new Chart(barCtx, {
        type: 'bar',
        data: {
            labels: Object.keys(floorsData),
            datasets: [{
                label: 'Occupied Spaces',
                data: [0, 0, 0, 0],
                backgroundColor: '#2563EB'
            }]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });
}

function updateCharts(avail, occ) {
    if (!pieChart || !barChart) return;

    pieChart.data.datasets[0].data = [avail, occ];
    pieChart.update();

    const floorCounts = Object.keys(floorsData).map(f => 
        parkingSlots.filter(s => s.floor === f && s.status === 'occupied').length
    );
    barChart.data.datasets[0].data = floorCounts;
    barChart.update();
}

// 4. Live Updates Simulator
function startLiveSimulation() {
    setInterval(() => {
        // Randomly pick a slot
        const randomIndex = Math.floor(Math.random() * parkingSlots.length);
        const slot = parkingSlots[randomIndex];

        // Flip state
        const oldStatus = slot.status;
        slot.status = oldStatus === "available" ? "occupied" : "available";

        // Create notification toast
        showToast(`Slot <strong>${slot.id}</strong> (${slot.floor}) is now <span style="color:${slot.status === 'available' ? 'var(--success)' : 'var(--danger)'}">${slot.status}</span>`);

        // Refresh UI
        renderGrid();
    }, 4000); // Trigger state change every 4 seconds
}

function showToast(message) {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `<i data-lucide="bell" style="color: var(--primary);"></i> <div>${message}</div>`;
    container.appendChild(toast);
    lucide.createIcons();

    setTimeout(() => toast.remove(), 3500);
}

// 5. Modal Engine
function openModal(slotId) {
    const slot = parkingSlots.find(s => s.id === slotId);
    if (!slot) return;

    document.getElementById("modal-slot-id").innerText = `Slot Configuration: ${slot.id}`;
    document.getElementById("modal-body").innerHTML = `
        <div><strong>Floor:</strong> ${slot.floor}</div>
        <div><strong>Status:</strong> <span style="text-transform:capitalize;">${slot.status}</span></div>
        <div><strong>Vehicle Type:</strong> ${slot.type}</div>
        <div><strong>Near Lift/Elevator:</strong> ${slot.nearLift ? "Yes 🛗" : "No"}</div>
        <div><strong>EV Charging Station:</strong> ${slot.hasCharger ? "Yes ⚡" : "No"}</div>
    `;

    const btn = document.getElementById("modal-reserve-btn");
    btn.onclick = () => {
        slot.status = "reserved";
        closeModal();
        renderGrid();
        showToast(`Successfully reserved slot ${slot.id}!`);
    };

    document.getElementById("slot-modal-overlay").style.display = "flex";
}

function closeModal() {
    document.getElementById("slot-modal-overlay").style.display = "none";
}

// 6. Global Theme Toggle & Listeners
document.getElementById("theme-toggle").addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nextTheme);
});

document.getElementById("type-filter").addEventListener("change", renderGrid);
document.getElementById("available-only").addEventListener("change", renderGrid);
document.getElementById("slot-search").addEventListener("input", renderGrid);

// Startup sequence
window.onload = () => {
    initData();
    renderTabs();
    initCharts();
    renderGrid();
    startLiveSimulation();
};