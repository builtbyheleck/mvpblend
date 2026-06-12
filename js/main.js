/* ============================================================
   MVP BLEND — interaction & animation
   GSAP 3.13 (ScrollTrigger + SplitText) + Lenis, all via CDN.
   Degrades gracefully: no JS / no CDN / reduced motion = static site.
   ============================================================ */
(() => {
  /* The preloader owns the entry — always start at the top so ScrollTrigger
     measures a settled layout. Deep links are honored after init. */
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const preloader = document.querySelector(".preloader");
  const videos = Array.from(document.querySelectorAll("video"));

  /* ---------- Adaptive video delivery ----------
     Small screens & data-saver connections get the 720p encodes. */
  const conn = navigator.connection;
  const slowNet = !!(conn && (conn.saveData || /(^|-)2g/.test(conn.effectiveType || "")));
  if (window.innerWidth < 768 || slowNet) {
    const lite = {
      "assets/reel-wide.mp4": "assets/reel-wide-720.mp4",
      "assets/reel-portrait.mp4": "assets/reel-portrait-720.mp4",
    };
    videos.forEach((v) => {
      const src = v.getAttribute("src");
      if (lite[src]) v.setAttribute("src", lite[src]);
    });
  }

  /* ---------- Video playback management ----------
     Only decode what's on screen — battery & CPU friendly. */
  if (prefersReduced) {
    videos.forEach((v) => {
      v.removeAttribute("autoplay");
      v.pause();
      v.controls = true;
    });
  } else if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach(({ target, isIntersecting }) =>
          isIntersecting ? target.play().catch(() => {}) : target.pause()
        ),
      { rootMargin: "10% 0px" }
    );
    videos.forEach((v) => io.observe(v));
  }

  /* ---------- Static fallback (reduced motion / CDN blocked) ---------- */
  const killPreloader = () => preloader && preloader.remove();
  if (prefersReduced || !window.gsap || !window.ScrollTrigger || !window.SplitText) {
    killPreloader();
    return;
  }

  gsap.registerPlugin(ScrollTrigger, SplitText);

  /* ---------- Smooth scroll ---------- */
  let lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ autoRaf: false, lerp: 0.11 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop(); // locked while the preloader runs
  }

  /* Anchor navigation through Lenis */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const target = document.querySelector(a.getAttribute("href"));
      if (!target || !lenis) return;
      e.preventDefault();
      lenis.scrollTo(target, { duration: 1.2 });
    });
  });

  /* ---------- Preloader ---------- */
  const seen = sessionStorage.getItem("mvp-seen");
  const counterEl = document.querySelector(".preloader__num");
  const counter = { v: 0 };

  const preloaderDone = new Promise((resolve) => {
    if (seen) {
      // Repeat visit this session: quick dissolve, no ceremony
      gsap.to(preloader, {
        autoAlpha: 0, duration: 0.45, ease: "power2.out", delay: 0.15,
        onComplete: () => { killPreloader(); resolve(); },
      });
      return;
    }
    sessionStorage.setItem("mvp-seen", "1");
    gsap.timeline({ onComplete: () => { killPreloader(); resolve(); } })
      .from(".preloader__word", { yPercent: 120, duration: 0.7, ease: "power3.out" })
      .to(counter, {
        v: 100, duration: 1.4, ease: "power2.inOut",
        onUpdate: () => (counterEl.textContent = String(Math.round(counter.v)).padStart(3, "0")),
      }, 0.1)
      .to(".preloader__inner", { autoAlpha: 0, duration: 0.35, ease: "power1.out" }, ">-0.05")
      .to(preloader, { yPercent: -100, duration: 0.9, ease: "power4.inOut" }, "<0.1");
  });

  /* ---------- Build everything once fonts + preloader are ready ---------- */
  Promise.all([document.fonts.ready, preloaderDone]).then(() => {
    /* The preloader hides this jump; guarantees triggers measure from the top
       even if the browser restored a stale scroll position mid-load. */
    if (!location.hash) {
      if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
      window.scrollTo(0, 0);
    }
    if (lenis) lenis.start();
    heroIntro();
    scrollAnimations();
    ScrollTrigger.refresh();
    if (location.hash) {
      const target = document.querySelector(location.hash);
      if (target && lenis) lenis.scrollTo(target, { duration: 1.2 });
    }
  });

  /* ---------- Hero entrance ---------- */
  function heroIntro() {
    const title = new SplitText(".hero__line", { type: "chars", mask: "chars" });
    gsap.timeline({ defaults: { ease: "power3.out" } })
      .from(title.chars, { yPercent: 115, duration: 1.05, stagger: 0.035, ease: "power4.out" })
      .from(".hero__kicker", { autoAlpha: 0, y: 18, duration: 0.7 }, 0.35)
      .from(".hero__sub", { autoAlpha: 0, y: 26, duration: 0.8 }, 0.5)
      .from(".hero__meta", { autoAlpha: 0, y: 14, duration: 0.7 }, 0.65)
      .from(".hero__rule", { scaleX: 0, duration: 1.1, ease: "power2.inOut" }, 0.55);
  }

  /* ---------- Scroll-driven animations ---------- */
  function scrollAnimations() {
    const outsideHero = (sel) =>
      gsap.utils.toArray(sel).filter((el) => !el.closest(".hero"));

    /* Masked line reveals on editorial text */
    outsideHero(".split-lines").forEach((el) => {
      new SplitText(el, {
        type: "lines", mask: "lines", autoSplit: true,
        onSplit: (self) =>
          gsap.from(self.lines, {
            yPercent: 110, duration: 0.9, stagger: 0.09, ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 82%", once: true },
          }),
      });
    });

    /* Generic soft fades */
    outsideHero("[data-fade]").forEach((el) => {
      gsap.from(el, {
        autoAlpha: 0, y: 26, duration: 1, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 86%", once: true },
      });
    });

    /* Gallery frames: rise in, footage settles from a slight zoom */
    outsideHero(".media-frame[data-reveal]").forEach((frame) => {
      const video = frame.querySelector("video");
      const st = { trigger: frame, start: "top 85%", once: true };
      gsap.from(frame, { autoAlpha: 0, y: 64, duration: 1.15, ease: "power3.out", scrollTrigger: st });
      gsap.fromTo(video,
        { clipPath: "inset(10% 6% 10% 6%)" },
        { clipPath: "inset(0% 0% 0% 0%)", duration: 1.3, ease: "power3.out", scrollTrigger: st }
      );
    });

    /* Capability rows cascade */
    gsap.from(".caps__row", {
      autoAlpha: 0, y: 42, duration: 0.9, ease: "power3.out", stagger: 0.09,
      scrollTrigger: { trigger: ".caps__list", start: "top 82%", once: true },
    });

    const mm = gsap.matchMedia();

    /* Desktop: pinned window-expand on the launch film + duet parallax */
    mm.add("(min-width: 769px)", () => {
      gsap.timeline({
        scrollTrigger: {
          trigger: ".expand__stage",
          start: "top top",
          end: "+=140%",
          scrub: 0.8,
          pin: true,
          anticipatePin: 1,
        },
        defaults: { ease: "none" },
      })
        .fromTo(".expand__frame",
          { clipPath: "inset(26% 30% 26% 30%)" },
          { clipPath: "inset(0% 0% 0% 0%)", duration: 1, immediateRender: true }, 0)
        .to(".expand__caption", { autoAlpha: 0, duration: 0.2 }, 0.15)
        .fromTo(".expand__overlay",
          { autoAlpha: 0, y: 28 },
          { autoAlpha: 1, y: 0, duration: 0.28, ease: "power1.out" }, 0.66);

      gsap.to(".duet__col--a", {
        yPercent: -7, ease: "none",
        scrollTrigger: { trigger: ".duet", start: "top bottom", end: "bottom top", scrub: true },
      });
      gsap.to(".duet__col--b", {
        yPercent: 9, ease: "none",
        scrollTrigger: { trigger: ".duet", start: "top bottom", end: "bottom top", scrub: true },
      });
    });

    /* Mobile: no pinning — a light settle on the launch film instead */
    mm.add("(max-width: 768px)", () => {
      gsap.from(".expand__frame", {
        autoAlpha: 0, y: 48, scale: 0.97, duration: 1.1, ease: "power3.out",
        scrollTrigger: { trigger: ".expand__stage", start: "top 78%", once: true },
      });
    });
  }
})();
