
document.addEventListener("DOMContentLoaded", () => {
  const image = document.querySelector(".responsive-map-image");
  const form = document.querySelector("form");

  if (image) {
    const useMap = image.getAttribute("usemap");

    if (useMap) {
      const mapName = useMap.replace("#", "");
      const map = document.querySelector(`map[name="${mapName}"]`);

      if (map) {
        const originalWidth = Number(image.getAttribute("width"));
        const originalHeight = Number(image.getAttribute("height"));

        const areas = [...map.querySelectorAll("area")].map(area => ({
          element: area,
          shape: area.shape.toLowerCase(),
          coords: area.coords.split(",").map(Number)
        }));

        function updateMapCoordinates() {
          const scaleX = image.clientWidth / originalWidth;
          const scaleY = image.clientHeight / originalHeight;

          areas.forEach(area => {
            let scaledCoords;

            if (area.shape === "circle") {
              scaledCoords = [
                area.coords[0] * scaleX,
                area.coords[1] * scaleY,
                area.coords[2] * Math.min(scaleX, scaleY)
              ];
            } else {
              scaledCoords = area.coords.map((value, index) =>
                value * (index % 2 === 0 ? scaleX : scaleY)
              );
            }

            area.element.coords = scaledCoords
              .map(value => Math.round(value))
              .join(",");
          });
        }

        image.addEventListener("load", updateMapCoordinates);

        if (image.complete) {
          updateMapCoordinates();
        }

        if (typeof ResizeObserver !== "undefined") {
          const resizeObserver = new ResizeObserver(
            updateMapCoordinates
          );

          resizeObserver.observe(image);
        }
      }
    }
  }

  if (form) {
    const birthdate = form.querySelector("#birthdate");

    if (birthdate) {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");

      birthdate.max = `${year}-${month}-${day}`;
    }

    const controls = form.querySelectorAll(
      'input:not([type="submit"]), select, textarea'
    );

    controls.forEach(control => {
      const markAsTouched = () => {
        const field = control.closest(".form-field");

        if (field) {
          field.classList.add("touched");
        }
      };

      control.addEventListener("blur", markAsTouched);
      control.addEventListener("input", markAsTouched);
      control.addEventListener("change", markAsTouched);
      control.addEventListener("invalid", markAsTouched);
    });

    form.addEventListener(
      "invalid",
      event => {
        const field = event.target.closest(".form-field");

        if (field) {
          field.classList.add("touched");
        }
      },
      true
    );
  }

  const calculator = document.querySelector(".calculator-section");

  if (!calculator) {
    return;
  }

  const products = [
    ...calculator.querySelectorAll(".calculator-product")
  ];

  const result = calculator.querySelector("#calculator-result");
  const error = calculator.querySelector("#calculator-error");
  const quantityPattern = /^\d+$/;

  function formatPrice(price) {
    return `${price.toLocaleString("ru-RU")} ₽`;
  }

  function getUnitPrice(product) {
    const productType = product.dataset.product;

    if (productType === "claude") {
      const plan = product.querySelector("#claude-plan");
      const option = plan.selectedOptions[0];

      return Number(option.dataset.price);
    }

    if (productType === "gemini") {
      const ultra = product.querySelector("#gemini-ultra");

      if (ultra.checked) {
        return Number(ultra.dataset.price);
      }
    }

    return Number(product.dataset.basePrice);
  }

  function updatePriceLabel(product) {
    const label = product.querySelector("[data-price-label]");
    const price = getUnitPrice(product);

    label.textContent = `${formatPrice(price)} / месяц`;
  }

  function getQuantityState(product) {
    const input = product.querySelector(
      ".calculator-product-quantity"
    );

    const value = input.value.trim();

    if (value === "") {
      return {
        valid: false,
        empty: true,
        quantity: 0
      };
    }

    if (!quantityPattern.test(value)) {
      return {
        valid: false,
        empty: false,
        quantity: 0
      };
    }

    const quantity = Number(value);

    if (!Number.isSafeInteger(quantity)) {
      return {
        valid: false,
        empty: false,
        quantity: 0
      };
    }

    return {
      valid: true,
      empty: false,
      quantity
    };
  }

  function updateQuantityControls(product) {
    const input = product.querySelector(
      ".calculator-product-quantity"
    );
    const minusButton = product.querySelector(
      '[data-action="decrease"]'
    );
    const plusButton = product.querySelector(
      '[data-action="increase"]'
    );

    const state = getQuantityState(product);

    minusButton.disabled =
      !state.valid || state.quantity <= 0;

    plusButton.disabled =
      state.valid &&
      state.quantity >= Number.MAX_SAFE_INTEGER;

    input.classList.toggle(
      "has-value",
      state.valid && state.quantity > 0
    );

    input.setAttribute(
      "aria-invalid",
      String(!state.valid && !state.empty)
    );

    return state;
  }

  function updateProductToggle(product) {
    const button = product.querySelector(
      '[data-action="toggle-product"]'
    );

    const included = product.dataset.included === "true";

    product.classList.toggle("is-included", included);

    button.setAttribute("aria-pressed", String(included));
    button.textContent = included
      ? "В расчёте"
      : "Добавить в расчёт";
  }

  function calculateTotal() {
    let total = 0;
    let hasInvalidValue = false;
    let hasEmptyValue = false;

    products.forEach(product => {
      const state = getQuantityState(product);

      if (!state.valid) {
        hasInvalidValue = true;

        if (state.empty) {
          hasEmptyValue = true;
        }

        return;
      }

      if (product.dataset.included === "true") {
        total += getUnitPrice(product) * state.quantity;
      }
    });

    const hasOverflow = !Number.isSafeInteger(total);

    if (hasInvalidValue || hasOverflow) {
      result.textContent = "— ₽";

      if (hasOverflow) {
        error.textContent =
          "Слишком большая итоговая сумма.";
      } else if (!hasEmptyValue) {
        error.textContent =
          "Количество должно быть целым неотрицательным числом.";
      } else if (
        products.some(product => {
          const state = getQuantityState(product);
          return !state.valid && !state.empty;
        })
      ) {
        error.textContent =
          "Количество должно быть целым неотрицательным числом.";
      } else {
        error.textContent = "";
      }

      return;
    }

    error.textContent = "";
    result.textContent = formatPrice(total);
  }

  function updateCalculator() {
    products.forEach(product => {
      updateQuantityControls(product);
      updatePriceLabel(product);
      updateProductToggle(product);
    });

    calculateTotal();
  }

  products.forEach(product => {
    const input = product.querySelector(
      ".calculator-product-quantity"
    );
    const plusButton = product.querySelector(
      '[data-action="increase"]'
    );
    const minusButton = product.querySelector(
      '[data-action="decrease"]'
    );
    const toggleButton = product.querySelector(
      '[data-action="toggle-product"]'
    );
    const plan = product.querySelector("#claude-plan");
    const ultra = product.querySelector("#gemini-ultra");

    plusButton.addEventListener("click", () => {
      const state = getQuantityState(product);
      const current = state.valid ? state.quantity : 0;

      if (current >= Number.MAX_SAFE_INTEGER) {
        return;
      }

      input.value = String(current + 1);
      updateCalculator();
    });

    minusButton.addEventListener("click", () => {
      const state = getQuantityState(product);

      const current = state.valid ? state.quantity : 0;
      input.value = String(Math.max(0, current - 1));

      updateCalculator();
    });

    input.addEventListener("input", updateCalculator);

    input.addEventListener("blur", () => {
      if (input.value.trim() === "") {
        input.value = "0";
      }

      updateCalculator();
    });

    toggleButton.addEventListener("click", () => {
      const included = product.dataset.included === "true";

      product.dataset.included = String(!included);

      updateCalculator();
    });

    if (plan) {
      plan.addEventListener("change", updateCalculator);
    }

    if (ultra) {
      ultra.addEventListener("change", updateCalculator);
    }
  });

  updateCalculator();
  const productDetails = [
    ...document.querySelectorAll(".calculator-product-details")
  ];

  if (productDetails.length > 0) {
    const mobileLayout = window.matchMedia(
      "(max-width: 991.98px)"
    );

    function updateProductDetails() {
      productDetails.forEach(detail => {
        detail.open = !mobileLayout.matches;
      });
    }

    updateProductDetails();
    mobileLayout.addEventListener("change", updateProductDetails);
  }
});
