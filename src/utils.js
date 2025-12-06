export function showStatus(message, type) {
  const statusDiv = document.getElementById("status");
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = "block";

  setTimeout(() => {
    statusDiv.style.display = "none";
  }, 3000);
}

export function toPx(value) {
  return `${value}px`;
}

export function div() {
  return document.createElement("div");
}

export function span() {
  return document.createElement("span");
}
