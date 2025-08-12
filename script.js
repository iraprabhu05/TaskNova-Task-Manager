document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const taskForm = document.getElementById("taskForm");
  const taskList = document.getElementById("taskList");
  const themeToggle = document.getElementById("themeToggle");

  const totalTasksSpan = document.getElementById("totalTasks");
  const completedTasksSpan = document.getElementById("completedTasks");
  const categoryStatsList = document.getElementById("categoryStats");
  const ctx = document.getElementById("categoryChart").getContext("2d");

  const timerDisplay = document.getElementById("timer");
  const startBtn = document.getElementById("startBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const resetBtn = document.getElementById("resetBtn");
  const customMinutesInput = document.getElementById("customMinutes");
  const setCustomTimerBtn = document.getElementById("setCustomTimerBtn");

  const timetableForm = document.getElementById("customTimetableForm");
  const timetableTable = document.getElementById("timetableTable");
  const timetableBody = document.getElementById("timetableBody");


  // === Tasks & Stats ===
  let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

  function renderTasks() {
    taskList.innerHTML = "";
    tasks.forEach((task, index) => {
      const li = document.createElement("li");

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = task.completed;
      checkbox.addEventListener("change", () => {
        tasks[index].completed = checkbox.checked;
        localStorage.setItem("tasks", JSON.stringify(tasks));
        renderTasks();
      });

      const span = document.createElement("span");
      span.textContent = `${task.title} - ${task.category} - ${task.date}`;
      if (task.completed) span.classList.add("completed");

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "✖";
      deleteBtn.addEventListener("click", () => {
        tasks.splice(index, 1);
        localStorage.setItem("tasks", JSON.stringify(tasks));
        renderTasks();
      });

      li.appendChild(checkbox);
      li.appendChild(span);
      li.appendChild(deleteBtn);

      taskList.appendChild(li);
    });
    updateStats();
  }

  function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;

    totalTasksSpan.textContent = total;
    completedTasksSpan.textContent = completed;

    const counts = {};
    tasks.forEach(task => {
      counts[task.category] = (counts[task.category] || 0) + 1;
    });

    categoryStatsList.innerHTML = "";
    for (const [cat, count] of Object.entries(counts)) {
      const li = document.createElement("li");
      li.innerHTML = `
        <span class="category-name">${cat}:</span>
        <div class="progress-bar" style="background:#eee; border-radius:8px; width:100%; height:18px; position:relative; margin-top:4px;">
          <div class="progress" style="width: ${(count / total) * 100}%; background:#6c5b7b; height:100%; border-radius:8px;"></div>
          <span class="count" style="position:absolute; right:8px; top:0; color:#fff; font-weight:bold;">${count}</span>
        </div>
      `;
      categoryStatsList.appendChild(li);
    }

    categoryChart.data.labels = Object.keys(counts);
    categoryChart.data.datasets[0].data = Object.values(counts);
    categoryChart.update();
  }

  taskForm.addEventListener("submit", e => {
    e.preventDefault();
    const title = document.getElementById("taskTitle").value.trim();
    const category = document.getElementById("taskCategory").value;
    const date = document.getElementById("taskDate").value;
    if (!title || !category || !date) return;
    tasks.push({ title, category, date, completed: false });
    localStorage.setItem("tasks", JSON.stringify(tasks));
    renderTasks();
    taskForm.reset();
  });

  // === Chart.js Bar Chart ===
  const categoryChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: [],
      datasets: [{
        label: "Tasks by Category",
        data: [],
        backgroundColor: "#6c5b7b",
        borderRadius: 8,
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });

  // === Pomodoro Timer ===
  let pomodoroTime = 25 * 60;
  let timeLeft = pomodoroTime;
  let timerInterval = null;
  let isRunning = false;

  function updateTimerDisplay(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    timerDisplay.textContent = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  function startTimer() {
    if (isRunning) return;
    isRunning = true;
    timerInterval = setInterval(() => {
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        isRunning = false;
        resetTimer();
        return;
      }
      timeLeft--;
      updateTimerDisplay(timeLeft);
    }, 1000);
  }

  function pauseTimer() {
    clearInterval(timerInterval);
    isRunning = false;
  }

  function resetTimer() {
    pauseTimer();
    timeLeft = pomodoroTime;
    updateTimerDisplay(timeLeft);
  }

  startBtn.addEventListener("click", startTimer);
  pauseBtn.addEventListener("click", pauseTimer);
  resetBtn.addEventListener("click", resetTimer);

  setCustomTimerBtn.addEventListener("click", () => {
    const minutes = parseInt(customMinutesInput.value);
    if (isNaN(minutes) || minutes < 1 || minutes > 120) return;
    pomodoroTime = minutes * 60;
    resetTimer();
  });

  // === Weekly Timetable ===
  let timetableData = JSON.parse(localStorage.getItem("timetableData_v2")) || {};
  let timeSlotOrder = JSON.parse(localStorage.getItem("timeSlotOrder_v2")) || [];

  function sortTimeSlots() {
    timeSlotOrder.sort((a, b) => {
      const getStart = (str) => {
        const match = str.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
        if (!match) return 0;
        let [, h, m = "00", ampm] = match;
        h = parseInt(h);
        m = parseInt(m);
        if (ampm) {
          if (ampm.toUpperCase() === "PM" && h !== 12) h += 12;
          if (ampm.toUpperCase() === "AM" && h === 12) h = 0;
        }
        return h * 60 + m;
      };
      return getStart(a) - getStart(b);
    });
  }

  function updateTimetableGrid() {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    // Header row
    const theadRow = timetableTable.querySelector("thead tr");
    theadRow.innerHTML = `<td class="day-label">Day</td>` + timeSlotOrder.map(slot => `<th>${slot}</th>`).join("");

    // Body rows
    timetableBody.innerHTML = "";
    days.forEach(day => {
      const row = document.createElement("tr");
      row.innerHTML = `<td class="day-label">${day}</td>` + timeSlotOrder.map(slot => {
        const activity = timetableData[slot]?.[day] || "";
        return `<td class="${activity ? 'entry' : ''}">
          ${activity ? `${activity} <button class="delete-entry" data-day="${day}" data-slot="${slot}">✖</button>` : ""}
        </td>`;
      }).join("");
      timetableBody.appendChild(row);
    });

    // Delete buttons listeners
    timetableBody.querySelectorAll(".delete-entry").forEach(btn => {
      btn.addEventListener("click", e => {
        const day = e.target.getAttribute("data-day");
        const slot = e.target.getAttribute("data-slot");
        if (timetableData[slot]) {
          delete timetableData[slot][day];
          if (Object.keys(timetableData[slot]).length === 0) {
            delete timetableData[slot];
            timeSlotOrder = timeSlotOrder.filter(s => s !== slot);
          }
          sortTimeSlots();
          updateTimetableGrid();
          saveTimetable();
        }
      });
    });
  }

  function saveTimetable() {
    localStorage.setItem("timetableData_v2", JSON.stringify(timetableData));
    localStorage.setItem("timeSlotOrder_v2", JSON.stringify(timeSlotOrder));
  }

  timetableForm.addEventListener("submit", e => {
    e.preventDefault();
    const rawSlot = document.getElementById("customTimeSlot").value.trim();
    const day = document.getElementById("customDay").value;
    const activity = document.getElementById("customActivity").value.trim();
    if (!rawSlot || !day || !activity) return;

    if (!timetableData[rawSlot]) {
      timetableData[rawSlot] = {};
      timeSlotOrder.push(rawSlot);
    }
    timetableData[rawSlot][day] = activity;

    sortTimeSlots();
    updateTimetableGrid();
    saveTimetable();

    timetableForm.reset();
  });

  // Initial calls
  renderTasks();
  updateStats();
  updateTimerDisplay(timeLeft);
  sortTimeSlots();
  updateTimetableGrid();
});
