document.addEventListener("DOMContentLoaded", () => {
  const image = document.querySelector(".responsive-map-image");

  if (!image) {
    return;
  }

  const useMap = image.getAttribute("usemap");

  if (!useMap) {
    return;
  }

  const mapName = useMap.replace("#", "");
  const map = document.querySelector(`map[name="${mapName}"]`);

  if (!map) {
    return;
  }

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
    const resizeObserver = new ResizeObserver(updateMapCoordinates);
    resizeObserver.observe(image);
  }
});
