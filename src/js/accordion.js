export function initAccordions(root = document) {
  const accordions = root.querySelectorAll("[data-accordion]");

  accordions.forEach((accordion) => {
    if (accordion.dataset.jsReady === "true") return;

    const details = accordion.querySelectorAll("details");

    details.forEach((detail) => {
      detail.addEventListener("toggle", () => {
        if (!detail.open) return;

        details.forEach((other) => {
          if (other !== detail) other.open = false;
        });
      });
    });

    accordion.dataset.jsReady = "true";
  });
}

