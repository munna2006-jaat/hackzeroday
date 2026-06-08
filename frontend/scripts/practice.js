/* practice.js - Practice challenges page */

const PRACTICE_CATEGORIES = [
  {
    id: "web",
    title: "Web Exploitation",
    icon: "🌐",
    description: "Practice finding and exploiting web vulnerabilities in safe, guided environments.",
    challenges: 24,
    completed: 0,
  },
  {
    id: "crypto",
    title: "Cryptography",
    icon: "🔐",
    description: "Crack ciphers, decode messages, and solve hash challenges at your own pace.",
    challenges: 18,
    completed: 0,
  },
  {
    id: "forensics",
    title: "Digital Forensics",
    icon: "🔍",
    description: "Analyze files, memory dumps, and disk images to uncover hidden evidence.",
    challenges: 15,
    completed: 0,
  },
  {
    id: "reverse",
    title: "Reverse Engineering",
    icon: "⚙️",
    description: "Disassemble binaries, understand assembly, and patch programs to solve puzzles.",
    challenges: 12,
    completed: 0,
  },
  {
    id: "pwn",
    title: "Binary Exploitation",
    icon: "💥",
    description: "Learn buffer overflows, format string bugs, and shellcode in controlled labs.",
    challenges: 10,
    completed: 0,
  },
  {
    id: "osint",
    title: "OSINT",
    icon: "🕵️",
    description: "Gather intelligence from public sources — social media, DNS, and open databases.",
    challenges: 14,
    completed: 0,
  },
];

const DAILY_CHALLENGES = [
  { title: "Decode the Caesar Shift", category: "Crypto", points: 50, difficulty: "easy" },
  { title: "Find the Hidden Directory", category: "Web", points: 75, difficulty: "easy" },
  { title: "Analyze the PCAP", category: "Forensics", points: 100, difficulty: "medium" },
];

onHZDReady(() => {

  const grid = document.getElementById("practiceGrid");
  const dailyList = document.getElementById("dailyChallenges");

  if (grid) {
    grid.innerHTML = PRACTICE_CATEGORIES.map(
      (cat) => `
      <article class="practice-card">
        <div class="practice-card-icon">${cat.icon}</div>
        <h3>${HZD.escapeHtml(cat.title)}</h3>
        <p>${HZD.escapeHtml(cat.description)}</p>
        <div class="practice-progress">
          <div class="progress-track"><div class="progress-fill" style="width: 0%"></div></div>
          <span class="progress-text">${cat.completed} / ${cat.challenges} solved</span>
        </div>
        <button class="path-enroll-btn practice-start-btn" data-category="${cat.id}">Start Practicing</button>
      </article>`
    ).join("");

    grid.querySelectorAll(".practice-start-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        HZD.showToast("Practice mode launching soon! Check back for interactive challenges.");
      });
    });
  }

  if (dailyList) {
    dailyList.innerHTML = DAILY_CHALLENGES.map(
      (ch) => `
      <div class="daily-challenge-row">
        <div class="daily-challenge-info">
          <span class="daily-badge">Daily</span>
          <strong>${HZD.escapeHtml(ch.title)}</strong>
          <span class="daily-meta">${ch.category} · ${ch.points} pts</span>
        </div>
        <span class="path-difficulty ${ch.difficulty === "easy" ? "beginner" : "intermediate"}">${ch.difficulty}</span>
        <button class="cyber-btn daily-solve-btn">Solve</button>
      </div>`
    ).join("");

    dailyList.querySelectorAll(".daily-solve-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        HZD.showToast("Daily challenges unlock when practice mode goes live!");
      });
    });
  }
});
