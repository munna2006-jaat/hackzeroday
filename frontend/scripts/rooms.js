/* rooms.js - Rooms browse page */

const ROOMS = [
  { id: "intro-to-cyber", title: "Intro to Cyber Security", difficulty: "easy", category: "general", duration: "1h", tasks: 8, users: "124k", description: "Your first room! Learn what cybersecurity is and why it matters.", free: true },
  { id: "linux-fundamentals", title: "Linux Fundamentals Part 1", difficulty: "easy", category: "linux", duration: "2h", tasks: 12, users: "98k", description: "Get comfortable with the Linux command line — essential for every hacker.", free: true },
  { id: "networking-nmap", title: "Intro to Networking", difficulty: "easy", category: "network", duration: "1.5h", tasks: 10, users: "76k", description: "Understand how devices communicate and how attackers scan networks.", free: true },
  { id: "web-fundamentals", title: "Web Fundamentals", difficulty: "easy", category: "web", duration: "2h", tasks: 14, users: "65k", description: "Learn how websites work — HTTP, DNS, and the building blocks of the web.", free: true },
  { id: "owasp-top10", title: "OWASP Top 10", difficulty: "medium", category: "web", duration: "3h", tasks: 18, users: "42k", description: "Explore the most critical web application security risks.", free: false },
  { id: "burp-suite", title: "Burp Suite Basics", difficulty: "medium", category: "web", duration: "2.5h", tasks: 15, users: "38k", description: "Master the industry-standard web proxy for finding vulnerabilities.", free: false },
  { id: "sql-injection", title: "SQL Injection", difficulty: "medium", category: "web", duration: "2h", tasks: 12, users: "55k", description: "Learn to find and exploit SQL injection flaws in web applications.", free: false },
  { id: "metasploit", title: "Metasploit Intro", difficulty: "medium", category: "offensive", duration: "3h", tasks: 16, users: "31k", description: "Get started with the world's most popular exploitation framework.", free: false },
  { id: "active-directory", title: "Active Directory Basics", difficulty: "hard", category: "offensive", duration: "4h", tasks: 20, users: "22k", description: "Understand AD structure and common attack paths in enterprise networks.", free: false },
  { id: "wireshark", title: "Wireshark: The Basics", difficulty: "easy", category: "network", duration: "1.5h", tasks: 9, users: "48k", description: "Capture and analyze network traffic like a SOC analyst.", free: true },
  { id: "cryptography", title: "Cryptography for Hackers", difficulty: "medium", category: "general", duration: "2h", tasks: 11, users: "29k", description: "Decode ciphers, crack hashes, and understand encryption fundamentals.", free: false },
  { id: "priv-esc-linux", title: "Linux Privilege Escalation", difficulty: "hard", category: "linux", duration: "3.5h", tasks: 17, users: "18k", description: "Escalate from a low-privilege shell to root on Linux systems.", free: false },
];

onHZDReady(() => {

  const grid = document.getElementById("roomsGrid");
  const searchInput = document.getElementById("roomsSearch");
  const filterBtns = document.querySelectorAll("#roomFilters .filter-btn");
  let activeFilter = "all";
  let searchQuery = "";

  function difficultyClass(d) {
    if (d === "easy") return "beginner";
    if (d === "hard") return "advanced";
    return "intermediate";
  }

  function renderRooms() {
    if (!grid) return;
    const filtered = ROOMS.filter((room) => {
      const matchFilter = activeFilter === "all" || room.category === activeFilter;
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || room.title.toLowerCase().includes(q) || room.description.toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });

    if (!filtered.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></svg>
          <h3>No rooms found</h3>
          <p>Try a different search term or filter to discover more rooms.</p>
        </div>`;
      return;
    }

    grid.innerHTML = filtered
      .map(
        (room) => `
      <article class="room-card" data-room-id="${room.id}">
        <div class="room-card-top">
          <span class="path-difficulty ${difficultyClass(room.difficulty)}">${room.difficulty}</span>
          ${room.free ? '<span class="room-free-badge">Free</span>' : '<span class="room-premium-badge">Premium</span>'}
        </div>
        <h3>${HZD.escapeHtml(room.title)}</h3>
        <p>${HZD.escapeHtml(room.description)}</p>
        <div class="room-meta-row">
          <span class="meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${room.duration}
          </span>
          <span class="meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            ${room.tasks} Tasks
          </span>
          <span class="meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            ${room.users}
          </span>
        </div>
        <button class="path-enroll-btn room-start-btn" data-room="${room.id}">Start Room</button>
      </article>`
      )
      .join("");

    grid.querySelectorAll(".room-start-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        HZD.showToast("Room labs launching soon! We're building interactive environments.");
      });
    });
  }

  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeFilter = btn.dataset.filter;
      renderRooms();
    });
  });

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      searchQuery = searchInput.value.trim();
      renderRooms();
    });
  }

  renderRooms();
});
