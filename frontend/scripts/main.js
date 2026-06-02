const glow = document.querySelector(".cursor-glow");
const tickerTrack = document.querySelector(".ticker-track");

if (glow) {
  window.addEventListener("pointermove", (event) => {
    glow.style.left = `${event.clientX}px`;
    glow.style.top = `${event.clientY}px`;
  });
}

if (tickerTrack) {
  tickerTrack.innerHTML += tickerTrack.innerHTML;
}
