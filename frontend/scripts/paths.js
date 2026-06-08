/* paths.js - Learning Paths page */

onHZDReady(() => {

  const pathFilters = document.getElementById("pathFilters");
  const pathsGrid = document.getElementById("pathsGrid");

  if (pathFilters && pathsGrid) {
    const filterBtns = pathFilters.querySelectorAll(".filter-btn");
    const pathCards = pathsGrid.querySelectorAll(".path-card-lg");

    filterBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        filterBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const filter = btn.dataset.filter;
        pathCards.forEach((card) => {
          card.classList.toggle("hidden", filter !== "all" && card.dataset.level !== filter);
        });
      });
    });
  }

  document.querySelectorAll(".path-enroll-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      HZD.showToast("Path enrollment coming soon! Start with the Pre Security path.");
    });
  });

  const progressBars = document.querySelectorAll(".progress-fill");
  if (progressBars.length && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && observer.unobserve(e.target)),
      { threshold: 0.3 }
    );
    progressBars.forEach((bar) => observer.observe(bar));
  }
});
