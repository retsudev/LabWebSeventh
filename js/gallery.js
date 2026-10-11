document.addEventListener("DOMContentLoaded", () => {
  const gallery = document.querySelector(".gallery-section");

  if (!gallery) {
    return;
  }

  const stage = gallery.querySelector(".gallery-stage");
  const slides = [...gallery.querySelectorAll(".gallery-slide")];
  const previousButton = gallery.querySelector(".gallery-arrow-previous");
  const nextButton = gallery.querySelector(".gallery-arrow-next");
  const paginationButtons = [
    ...gallery.querySelectorAll(".gallery-pagination button")
  ];
  const status = gallery.querySelector(".gallery-status");
  const desktopQuery = window.matchMedia("(min-width: 992px)");

  if (!stage || slides.length === 0) {
    return;
  }

  let currentIndex = Math.max(
    slides.findIndex(slide => slide.classList.contains("is-active")),
    0
  );
  let pointerStart = null;
  let wheelDelta = 0;
  let wheelTimeout = 0;

  function updateGallery() {
    const visibleNeighbors = desktopQuery.matches ? 2 : 1;

    slides.forEach((slide, index) => {
      const offset = index - currentIndex;
      const isActive = offset === 0;

      slide.classList.toggle("is-active", isActive);
      slide.classList.toggle("is-previous", offset === -1);
      slide.classList.toggle("is-next", offset === 1);
      slide.classList.toggle("is-far-previous", offset === -2);
      slide.classList.toggle("is-far-next", offset === 2);
      slide.setAttribute(
        "aria-hidden",
        String(Math.abs(offset) > visibleNeighbors)
      );

      if (isActive) {
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
    const nextIndex = Math.max(0, Math.min(index, slides.length - 1));

    if (nextIndex === currentIndex) {
      return false;
    }

    currentIndex = nextIndex;
    updateGallery();
    return true;
  }

  if (previousButton) {
    previousButton.addEventListener("click", () => {
      goToSlide(currentIndex - 1);
    });
  }

  if (nextButton) {
    nextButton.addEventListener("click", () => {
      goToSlide(currentIndex + 1);
    });
  }

  paginationButtons.forEach((button, index) => {
    button.addEventListener("click", () => {
      goToSlide(index);
    });
  });

  stage.addEventListener(
    "wheel",
    event => {
      if (!desktopQuery.matches || event.ctrlKey) {
        return;
      }

      const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX)
        ? event.deltaY
        : event.deltaX;

      if (delta === 0) {
        return;
      }

      const direction = delta > 0 ? 1 : -1;
      const canMove = direction > 0
        ? currentIndex < slides.length - 1
        : currentIndex > 0;

      if (!canMove) {
        return;
      }

      event.preventDefault();
      wheelDelta += delta;
      window.clearTimeout(wheelTimeout);
      wheelTimeout = window.setTimeout(() => {
        if (Math.abs(wheelDelta) >= 18) {
          goToSlide(currentIndex + (wheelDelta > 0 ? 1 : -1));
        }

        wheelDelta = 0;
      }, 100);
    },
    { passive: false }
  );

  function finishPointerGesture(event) {
    if (!pointerStart || pointerStart.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - pointerStart.x;
    const deltaY = event.clientY - pointerStart.y;
    const wasHorizontalSwipe = Math.abs(deltaX) >= 48
      && Math.abs(deltaX) > Math.abs(deltaY) * 1.15;

    if (wasHorizontalSwipe) {
      goToSlide(currentIndex + (deltaX < 0 ? 1 : -1));
    }

    if (stage.hasPointerCapture(event.pointerId)) {
      stage.releasePointerCapture(event.pointerId);
    }

    pointerStart = null;
    stage.classList.remove("is-dragging");
  }

  stage.addEventListener("pointerdown", event => {
    if (
      event.button !== 0
      || event.target.closest("button")
    ) {
      return;
    }

    pointerStart = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY
    };

    stage.setPointerCapture(event.pointerId);
    stage.classList.add("is-dragging");
  });

  stage.addEventListener("pointerup", finishPointerGesture);
  stage.addEventListener("pointercancel", event => {
    if (pointerStart && pointerStart.pointerId === event.pointerId) {
      pointerStart = null;
      stage.classList.remove("is-dragging");
    }
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
