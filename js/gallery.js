document.addEventListener("DOMContentLoaded", () => {
  const gallery = document.querySelector(".gallery-section");

  if (!gallery) {
    return;
  }

  const stage = gallery.querySelector(".gallery-stage");
  const viewport = gallery.querySelector(".gallery-viewport");
  let slides = [...gallery.querySelectorAll(".gallery-slide")];
  const previousButton = gallery.querySelector(".gallery-arrow-previous");
  const nextButton = gallery.querySelector(".gallery-arrow-next");
  const paginationButtons = [
    ...gallery.querySelectorAll(".gallery-pagination button")
  ];
  const status = gallery.querySelector(".gallery-status");
  const desktopQuery = window.matchMedia("(min-width: 992px)");
  const tabletQuery = window.matchMedia("(min-width: 768px)");
  const mobileQuery = window.matchMedia("(max-width: 767.98px)");

  if (!stage || !viewport || slides.length === 0) {
    return;
  }

  function shuffle(items) {
    const shuffled = [...items];

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [
        shuffled[randomIndex],
        shuffled[index]
      ];
    }

    return shuffled;
  }

  const girls = shuffle(
    slides.filter(slide => slide.dataset.category === "girl")
  );
  const otherImages = shuffle(
    slides.filter(slide => slide.dataset.category !== "girl")
  );
  const orderedSlides = [];
  let girlIndex = 0;
  let otherIndex = 0;
  let nextCategory = otherImages.length >= girls.length ? "other" : "girl";

  while (girlIndex < girls.length || otherIndex < otherImages.length) {
    if (nextCategory === "other" && otherIndex < otherImages.length) {
      orderedSlides.push(otherImages[otherIndex]);
      otherIndex += 1;
      nextCategory = "girl";
    } else if (nextCategory === "girl" && girlIndex < girls.length) {
      orderedSlides.push(girls[girlIndex]);
      girlIndex += 1;
      nextCategory = "other";
    } else if (otherIndex < otherImages.length) {
      orderedSlides.push(otherImages[otherIndex]);
      otherIndex += 1;
    } else {
      orderedSlides.push(girls[girlIndex]);
      girlIndex += 1;
    }
  }

  slides = orderedSlides;
  viewport.append(...slides);

  let currentIndex = Math.floor(slides.length / 2);
  slides.forEach(slide => {
    slide.classList.remove(
      "is-active",
      "is-previous",
      "is-next",
      "is-far-previous",
      "is-far-next"
    );
    slide.removeAttribute("aria-current");
  });
  slides[currentIndex].classList.add("is-active");
  let motionProgress = 0;
  let pointerStart = null;
  let wheelTimeout = 0;
  let wheelAccumulator = 0;

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(value, maximum));
  }

  function getLayout() {
    const width = stage.clientWidth;

    if (desktopQuery.matches) {
      return {
        visibleNeighbors: 2,
        nearSpacing: Math.min(width * 0.28, 350),
        farSpacing: Math.min(width * 0.52, 620),
        firstScale: 0.84,
        secondScale: 0.72,
        rotation: 28
      };
    }

    if (tabletQuery.matches) {
      return {
        visibleNeighbors: 1,
        nearSpacing: width * 0.21,
        farSpacing: width * 0.42,
        firstScale: 0.86,
        secondScale: 0.72,
        rotation: 28
      };
    }

    return {
      visibleNeighbors: 1,
      nearSpacing: width * 0.42,
      farSpacing: width * 0.84,
      firstScale: 0.86,
      secondScale: 0.72,
      rotation: 30
    };
  }

  function getPosition(distance, layout) {
    if (distance <= 1) {
      return distance * layout.nearSpacing;
    }

    return layout.nearSpacing
      + (distance - 1) * (layout.farSpacing - layout.nearSpacing);
  }

  function getScale(distance, layout) {
    if (distance <= 1) {
      return 1 - distance * (1 - layout.firstScale);
    }

    if (distance <= 2) {
      return layout.firstScale
        - (distance - 1) * (layout.firstScale - layout.secondScale);
    }

    return Math.max(0.48, layout.secondScale - (distance - 2) * 0.1);
  }

  function getOpacity(distance, layout) {
    if (distance <= 1) {
      return 1 - distance * 0.28;
    }

    if (layout.visibleNeighbors === 2 && distance <= 2) {
      return 0.72 - (distance - 1) * 0.34;
    }

    if (layout.visibleNeighbors === 2) {
      return distance >= 2.65
        ? 0
        : 0.38 * (2.65 - distance) / 0.65;
    }

    if (distance >= 1.65) {
      return 0;
    }

    return 0.72 * (1.65 - distance) / 0.65;
  }

  function constrainProgress(progress) {
    const minimum = currentIndex - (slides.length - 1) - 0.18;
    const maximum = currentIndex + 0.18;

    return clamp(progress, minimum, maximum);
  }

  function updateGallery() {
    const layout = getLayout();
    const visibleLimit = layout.visibleNeighbors === 2 ? 2.65 : 1.65;

    slides.forEach((slide, index) => {
      const offset = index - currentIndex + motionProgress;
      const distance = Math.abs(offset);
      const roundedOffset = Math.round(offset);
      const horizontalPosition = Math.sign(offset)
        * getPosition(distance, layout);
      const rotation = clamp(
        -offset * layout.rotation,
        -38,
        38
      );

      slide.style.setProperty("--slide-x", `${horizontalPosition}px`);
      slide.style.setProperty("--slide-scale", String(getScale(distance, layout)));
      slide.style.setProperty(
        "--slide-depth",
        `${Math.max(0, 1.5 - distance) * 48}px`
      );
      slide.style.setProperty("--slide-rotation", `${rotation}deg`);
      slide.style.setProperty("--slide-opacity", String(getOpacity(distance, layout)));
      slide.style.setProperty(
        "--slide-saturation",
        String(Math.max(0.48, 1 - distance * 0.24))
      );
      slide.style.setProperty(
        "--slide-brightness",
        String(Math.max(0.58, 1 - distance * 0.18))
      );
      const direction = Math.sign(motionProgress);
      const distanceFraction = distance - Math.floor(distance);
      const depthOrder = Math.abs(distanceFraction - 0.5) < 0.08
        ? -Math.sign(offset) * direction
        : 0;
      slide.style.zIndex = String(100 - Math.round(distance * 100) + depthOrder);

      slide.classList.toggle("is-active", roundedOffset === 0);
      slide.classList.toggle("is-previous", roundedOffset === -1);
      slide.classList.toggle("is-next", roundedOffset === 1);
      slide.classList.toggle(
        "is-far-previous",
        layout.visibleNeighbors === 2 && roundedOffset === -2
      );
      slide.classList.toggle(
        "is-far-next",
        layout.visibleNeighbors === 2 && roundedOffset === 2
      );

      slide.setAttribute(
        "aria-label",
        `Изображение ${index + 1} из ${slides.length}`
      );
      slide.setAttribute("aria-hidden", String(distance > visibleLimit));

      if (index === currentIndex) {
        slide.setAttribute("aria-current", "true");
      } else {
        slide.removeAttribute("aria-current");
      }
    });

    paginationButtons.forEach((button, index) => {
      if (index === currentIndex) {
        button.setAttribute("aria-current", "page");
      } else {
        button.removeAttribute("aria-current");
      }
    });

    if (status) {
      status.textContent = `Изображение ${currentIndex + 1} из ${slides.length}`;
    }

    if (previousButton) {
      previousButton.disabled = currentIndex === 0;
    }

    if (nextButton) {
      nextButton.disabled = currentIndex === slides.length - 1;
    }
  }

  function goToSlide(index) {
    const nextIndex = clamp(index, 0, slides.length - 1);

    window.clearTimeout(wheelTimeout);
    wheelTimeout = 0;
    wheelAccumulator = 0;
    motionProgress = 0;
    stage.classList.remove("is-wheel-moving");

    if (nextIndex === currentIndex) {
      updateGallery();
      return;
    }

    currentIndex = nextIndex;
    updateGallery();
  }

  function settleMotion(momentum = 0) {
    const targetIndex = Math.round(currentIndex - motionProgress + momentum);

    motionProgress = 0;
    currentIndex = clamp(targetIndex, 0, slides.length - 1);
    stage.classList.remove("is-dragging", "is-wheel-moving");
    updateGallery();
  }

  function bindArrow(button, direction) {
    if (!button) {
      return;
    }

    let touchClickSuppressedUntil = 0;

    button.addEventListener("pointerup", event => {
      if (event.pointerType !== "touch") {
        return;
      }

      touchClickSuppressedUntil = Date.now() + 800;
      goToSlide(currentIndex + direction);
    });

    button.addEventListener("click", event => {
      if (
        event.detail !== 0
        && Date.now() < touchClickSuppressedUntil
      ) {
        return;
      }

      goToSlide(currentIndex + direction);
    });
  }

  bindArrow(previousButton, -1);
  bindArrow(nextButton, 1);

  paginationButtons.forEach((button, index) => {
    button.addEventListener("click", () => {
      goToSlide(index);
    });
  });

  stage.addEventListener(
    "wheel",
    event => {
      if (!desktopQuery.matches) {
        return;
      }

      event.preventDefault();

      if (event.ctrlKey) {
        return;
      }

      const rawDelta = Math.abs(event.deltaY) >= Math.abs(event.deltaX)
        ? event.deltaY
        : event.deltaX;

      if (rawDelta === 0 || pointerStart) {
        return;
      }

      const deltaScale = event.deltaMode === 1
        ? 16
        : event.deltaMode === 2
          ? stage.clientHeight
          : 1;
      const isDiscreteWheel = event.deltaMode === 1
        || (event.deltaMode === 0 && Math.abs(rawDelta) >= 60);

      if (isDiscreteWheel) {
        window.clearTimeout(wheelTimeout);
        wheelTimeout = 0;

        if (motionProgress !== 0) {
          settleMotion();
        }

        const atBoundary = rawDelta > 0
          ? currentIndex === slides.length - 1
          : currentIndex === 0;

        if (atBoundary) {
          wheelAccumulator = 0;
          return;
        }

        wheelAccumulator = clamp(
          wheelAccumulator - rawDelta * deltaScale / (120 * 2.25),
          -2.5,
          2.5
        );

        if (Math.abs(wheelAccumulator) >= 0.5) {
          const direction = wheelAccumulator < 0 ? 1 : -1;
          const steps = Math.max(
            1,
            Math.floor(Math.abs(wheelAccumulator) + 0.5)
          );

          wheelAccumulator = 0;
          goToSlide(currentIndex + direction * steps);
        }

        return;
      }

      wheelAccumulator = 0;

      const movingForward = rawDelta > 0;
      const atBoundary = movingForward
        ? currentIndex === slides.length - 1 && motionProgress <= 0
        : currentIndex === 0 && motionProgress >= 0;

      if (atBoundary) {
        return;
      }

      motionProgress = constrainProgress(
        motionProgress - rawDelta * deltaScale / (120 * 2.25)
      );
      stage.classList.add("is-wheel-moving");
      updateGallery();

      window.clearTimeout(wheelTimeout);
      wheelTimeout = window.setTimeout(() => {
        settleMotion();
      }, 200);
    },
    { passive: false }
  );

  stage.addEventListener("pointerdown", event => {
    if (event.button !== 0 || event.target.closest("button")) {
      return;
    }

    window.clearTimeout(wheelTimeout);
    wheelTimeout = 0;
    wheelAccumulator = 0;
    stage.classList.remove("is-wheel-moving");

    if (motionProgress !== 0) {
      settleMotion();
    }

    const now = Date.now();

    pointerStart = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      lastX: event.clientX,
      lastTime: now,
      velocity: 0
    };

    stage.setPointerCapture(event.pointerId);
    stage.classList.add("is-dragging");
  });

  stage.addEventListener("dragstart", event => {
    event.preventDefault();
  });

  stage.addEventListener("pointermove", event => {
    if (!pointerStart || pointerStart.pointerId !== event.pointerId) {
      return;
    }

    const layout = getLayout();
    const now = Date.now();
    const elapsed = now - pointerStart.lastTime;

    motionProgress = constrainProgress(
      (event.clientX - pointerStart.x) / layout.nearSpacing
    );

    if (elapsed > 0) {
      pointerStart.velocity = -(
        (event.clientX - pointerStart.lastX) / layout.nearSpacing
      ) / (elapsed / 1000);
    }

    pointerStart.lastX = event.clientX;
    pointerStart.lastTime = now;
    updateGallery();
  });

  stage.addEventListener("pointerup", event => {
    if (!pointerStart || pointerStart.pointerId !== event.pointerId) {
      return;
    }

    if (mobileQuery.matches) {
      const deltaX = event.clientX - pointerStart.x;
      const deltaY = event.clientY - pointerStart.y;
      const isHorizontalSwipe = Math.abs(deltaX) >= 32
        && Math.abs(deltaX) > Math.abs(deltaY) * 1.1;

      if (stage.hasPointerCapture(event.pointerId)) {
        stage.releasePointerCapture(event.pointerId);
      }

      pointerStart = null;
      motionProgress = 0;
      stage.classList.remove("is-dragging");

      if (isHorizontalSwipe) {
        currentIndex = clamp(
          currentIndex + (deltaX < 0 ? 1 : -1),
          0,
          slides.length - 1
        );
      }

      updateGallery();
      return;
    }

    const recentVelocity = Date.now() - pointerStart.lastTime < 140
      ? pointerStart.velocity
      : 0;
    const momentum = desktopQuery.matches
      ? clamp(recentVelocity * 0.3, -0.65, 0.65)
      : clamp(recentVelocity * 0.11, -0.32, 0.32);

    if (stage.hasPointerCapture(event.pointerId)) {
      stage.releasePointerCapture(event.pointerId);
    }

    pointerStart = null;
    settleMotion(momentum);
  });

  stage.addEventListener("pointercancel", event => {
    if (!pointerStart || pointerStart.pointerId !== event.pointerId) {
      return;
    }

    pointerStart = null;
    motionProgress = 0;
    stage.classList.remove("is-dragging");
    updateGallery();
  });

  stage.addEventListener("keydown", event => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goToSlide(currentIndex - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goToSlide(currentIndex + 1);
    }
  });

  window.addEventListener("resize", updateGallery);
  updateGallery();
});
