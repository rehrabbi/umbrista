// Umbrista brand board: option switches for the hero frame, favicon trial, 16 px loupes.

const cities = {
  1: { name: "Calvessa", lat: 38.81, lon: -9.47, zone: "Europe/Lisbon" },
  2: { name: "Port Ellery", lat: 47.95, lon: -124.6, zone: "America/Los_Angeles" },
  3: { name: "Santa Velada", lat: -34.72, lon: -58.05, zone: "America/Argentina/Buenos_Aires" },
};

// Sunset for a calendar day at a place, from the standard sunrise equation
// (solar altitude -0.833 degrees: the sun's upper edge on the horizon, with refraction).
function sunset(date, lat, lon) {
  const rad = Math.PI / 180;
  const julian = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000 + 2440587.5;
  const n = Math.round(julian - 2451545 + 0.0008);
  const meanSolarNoon = n - lon / 360;
  const anomaly = (357.5291 + 0.98560028 * meanSolarNoon) % 360;
  const centre = 1.9148 * Math.sin(anomaly * rad) + 0.02 * Math.sin(2 * anomaly * rad) + 0.0003 * Math.sin(3 * anomaly * rad);
  const longitude = (anomaly + centre + 180 + 102.9372) % 360;
  const transit = 2451545 + meanSolarNoon + 0.0053 * Math.sin(anomaly * rad) - 0.0069 * Math.sin(2 * longitude * rad);
  const declination = Math.asin(Math.sin(longitude * rad) * Math.sin(23.44 * rad));
  const hourAngle = Math.acos(
    (Math.sin(-0.833 * rad) - Math.sin(lat * rad) * Math.sin(declination)) / (Math.cos(lat * rad) * Math.cos(declination)),
  ) / rad;
  return new Date((transit + hourAngle / 360 - 2440587.5) * 86400000);
}

function cafeTime(when, zone) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(when);
}

const frame = document.getElementById("hero-frame");
const controls = document.getElementById("controls");

function showCity(id) {
  const city = cities[id];
  for (const el of document.querySelectorAll("[data-city-name]")) el.textContent = city.name;
  const at = sunset(new Date(), city.lat, city.lon);
  for (const el of document.querySelectorAll("[data-city-sunset]")) el.textContent = cafeTime(at, city.zone);
}

if (frame && controls) {
  controls.addEventListener("change", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    if (input.name === "city") showCity(input.value);
    else frame.dataset[input.name] = input.value;
  });
  showCity("1");
}

// Put a candidate mark on this page's own browser tab.
const icon = document.getElementById("page-icon");
const favButtons = document.querySelectorAll("[data-favicon]");
for (const button of favButtons) {
  button.setAttribute("aria-pressed", button.dataset.favicon === "a" ? "true" : "false");
  button.addEventListener("click", () => {
    if (icon) icon.setAttribute("href", `board/logo-${button.dataset.favicon}-16-on-dark.svg`);
    for (const other of favButtons) other.setAttribute("aria-pressed", other === button ? "true" : "false");
  });
}

// Rasterise each 16 px mark onto a 16 x 16 canvas, then let CSS enlarge it with
// pixelated scaling, so the board shows the pixels a browser tab really draws.
for (const canvas of document.querySelectorAll("canvas[data-loupe]")) {
  const context = canvas.getContext("2d");
  const image = new Image();
  image.addEventListener("load", () => {
    if (context) context.drawImage(image, 0, 0, 16, 16);
  });
  image.src = canvas.dataset.loupe;
}
