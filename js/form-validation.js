document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");

  if (!form) {
    return;
  }

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
});
