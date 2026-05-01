export function ensureFontsLoaded() {
  if (document.getElementById("fy-fonts")) return;
  const link = document.createElement("link");
  link.id = "fy-fonts";
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=Plus+Jakarta+Sans:wght@200;400;700;800&display=swap";
  document.head.appendChild(link);
}
