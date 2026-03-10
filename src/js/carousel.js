export function initCarousels(root = document) {
  const carousels = root.querySelectorAll("[data-carousel-root]");

  carousels.forEach((carousel) => {
    if (carousel.dataset.jsReady === "true") return;

    const track = carousel.querySelector(".carousel-track");
    const prev = carousel.querySelector(".carousel-prev");
    const next = carousel.querySelector(".carousel-next");

    if (!track || !prev || !next) return;

    const getScrollStep = () => {
      const firstItem = track.querySelector("figure");
      return firstItem ? firstItem.clientWidth + 16 : 320;
    };

    prev.addEventListener("click", () => {
      track.scrollBy({ left: -getScrollStep(), behavior: "smooth" });
    });

    next.addEventListener("click", () => {
      track.scrollBy({ left: getScrollStep(), behavior: "smooth" });
    });

    carousel.dataset.jsReady = "true";
  });
}

