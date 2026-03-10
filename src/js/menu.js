export function initMenus(root = document) {
  const menus = root.querySelectorAll("[data-menu-root]");

  menus.forEach((menuRoot) => {
    if (menuRoot.dataset.jsReady === "true") return;

    const button = menuRoot.querySelector("[data-menu-toggle]");
    const close = menuRoot.querySelector("[data-menu-close]");
    const panel = menuRoot.querySelector("[data-menu-panel]");
    const links = panel?.querySelectorAll("a");

    if (!button || !close || !panel) return;

    const closeMenu = () => {
      panel.classList.add("hidden");
      button.setAttribute("aria-expanded", "false");
      document.body.classList.remove("overflow-hidden");
    };

    const openMenu = () => {
      panel.classList.remove("hidden");
      button.setAttribute("aria-expanded", "true");
      document.body.classList.add("overflow-hidden");
    };

    button.addEventListener("click", () => {
      if (panel.classList.contains("hidden")) openMenu();
      else closeMenu();
    });

    close.addEventListener("click", closeMenu);
    links?.forEach((link) => link.addEventListener("click", closeMenu));
    window.addEventListener("resize", () => {
      if (window.innerWidth >= 768) closeMenu();
    });

    menuRoot.dataset.jsReady = "true";
  });
}

