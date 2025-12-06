import { showStatus } from "./utils";
import { parseMarkup, ParseResult } from "./parser";
import { renderDiagram, redrawConnections } from "./renderer";
import { toSvg } from "html-to-image";
import { Entity } from "./types";
import download from "downloadjs";
import "./style.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

declare global {
  interface Window {
    zoomIn(): void;
    zoomOut(): void;
    resetZoom(): void;
    generateDiagram(): void;
    autoLayout(): void;
    loadExample(): void;
  }
}

let currentDiagram: ParseResult = null;

let scale = 1;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

window.zoomIn = function () {
  scale = Math.min(scale * 1.2, 3);
  updateZoom();
};

window.zoomOut = function () {
  scale = Math.max(scale / 1.2, 0.3);
  updateZoom();
};

window.resetZoom = function () {
  scale = 1;
  updateZoom();
};

function updateZoom() {
  const diagramArea = document.getElementById("diagram-objects");
  const connections = document.getElementById("connections");
  const zoomLevel = document.getElementById("zoom-level");

  diagramArea.style.transform = `scale(${scale})`;
  connections.style.transform = `scale(${scale})`;

  zoomLevel.textContent = `${Math.round(scale * 100)}%`;
}

window.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("generate-btn")
    .addEventListener("click", window.generateDiagram);
  document
    .getElementById("auto-layout-btn")
    .addEventListener("click", window.autoLayout);

  window.generateDiagram();

  const diagramContainer = document.getElementById("diagram-container");
  diagramContainer.addEventListener(
    "wheel",
    function (e) {
      if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          window.zoomIn();
        } else {
          window.zoomOut();
        }
      }
    },
    { passive: false },
  );
});

let currentEntity: Entity = null;
function makeDraggable(element: HTMLElement, entity: Entity) {
  element.addEventListener("mousedown", startDrag);

  function startDrag(e: MouseEvent) {
    if (e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();

    isDragging = true;
    currentEntity = entity;

    const rect = element.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;

    element.classList.add("dragging");

    document.addEventListener("mousemove", onDrag);
    document.addEventListener("mouseup", stopDrag);
  }

  function onDrag(e: MouseEvent) {
    if (!isDragging || !currentEntity) return;

    const diagramArea = document.getElementById("diagram-objects");
    const diagramRect = diagramArea.getBoundingClientRect();

    let newX = e.clientX - dragOffset.x - diagramRect.left;
    let newY = e.clientY - dragOffset.y - diagramRect.top;

    newX = Math.max(
      0,
      Math.min(newX, diagramArea.offsetWidth - element.offsetWidth),
    );
    newY = Math.max(
      0,
      Math.min(newY, diagramArea.offsetHeight - element.offsetHeight),
    );

    element.style.left = `${newX}px`;
    element.style.top = `${newY}px`;

    currentEntity.x = newX;
    currentEntity.y = newY;

    redrawConnections(currentDiagram);
  }

  function stopDrag() {
    if (!isDragging) return;

    element.classList.remove("dragging");
    isDragging = false;
    currentEntity = null;

    document.removeEventListener("mousemove", onDrag);
    document.removeEventListener("mouseup", stopDrag);
  }
}

window.generateDiagram = function () {
  try {
    const markup = (document.getElementById("markup") as HTMLTextAreaElement)
      .value;
    const { entities, relationships, generalizations } = parseMarkup(markup);
    renderDiagram({ entities, relationships, generalizations });
    currentDiagram = { entities, relationships, generalizations };
    entities.forEach((ent) => makeDraggable(ent.div, ent));
    window.autoLayout();
    showStatus("Диаграмма успешно создана!", "success");
  } catch (error) {
    showStatus(`Ошибка: ${error.message}`, "error");
    console.error(error);
  }
};

window.autoLayout = function () {
  const { entities, relationships, generalizations } = currentDiagram;
  const cols = Math.ceil(Math.sqrt(entities.length));
  const padding = 150;
  const entityWidth = 200;
  const entityHeight = 200;

  entities.forEach((entity, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);

    const x = padding + col * (entityWidth + padding);
    const y = padding + row * (entityHeight + padding);

    entity.x = x;
    entity.y = y;

    if (entity.div) {
      entity.div.style.left = `${x}px`;
      entity.div.style.top = `${y}px`;
    }
  });

  redrawConnections(currentDiagram);
  showStatus("Элементы автоматически размещены", "success");
};

// Функция загрузки примера
window.loadExample = function () {
  (document.getElementById("markup") as HTMLTextAreaElement).value = `
Entity Book {
  +ISBN: string
  title: string
  ?year: number
  category_id: number FK -> Category.id
}

Entity Category {
  +id: number
  name: string
}

Entity Person {
  +name: string
}

Entity Student {
  +name: string
}

Entity Employee {
  +name: string
} 

Generalization Person {
  Student
  Employee
} complete discriminator=Role
`;

  showStatus('Пример загружен. Нажмите "Сгенерировать диаграмму"', "success");
};

function svgFromDataUrl(dataUrl: string): SVGSVGElement & HTMLElement {
  const encoded = dataUrl.split(",")[1];

  const decoded = decodeURIComponent(encoded);

  const doc = new DOMParser().parseFromString(decoded, "image/svg+xml");

  return doc.documentElement as HTMLElement & SVGSVGElement;
}

function mergeSVGsVertical(
  svg1: SVGSVGElement,
  svg2: SVGSVGElement,
): SVGSVGElement {
  const clone1 = svg1.cloneNode(true) as SVGSVGElement;
  const clone2 = svg2.cloneNode(true) as SVGSVGElement;

  const w1 = parseFloat(clone1.getAttribute("width") || "0");
  const h1 = parseFloat(clone1.getAttribute("height") || "0");
  const w2 = parseFloat(clone2.getAttribute("width") || "0");
  const h2 = parseFloat(clone2.getAttribute("height") || "0");

  const width = Math.max(w1, w2);
  const height = h1 + h2;

  const merged = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  merged.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  merged.setAttribute("width", String(width));
  merged.setAttribute("height", String(height));
  merged.setAttribute("viewBox", `0 0 ${width} ${height}`);

  const g1 = document.createElementNS("http://www.w3.org/2000/svg", "g");
  Array.from(clone1.childNodes).forEach((node) => g1.appendChild(node));
  merged.appendChild(g1);

  const g2 = document.createElementNS("http://www.w3.org/2000/svg", "g");
  Array.from(clone2.childNodes).forEach((node) => g2.appendChild(node));
  merged.appendChild(g2);

  return merged;
}

function inlineComputedStyles(node: HTMLElement): HTMLElement {
  let clone = node.cloneNode(true) as HTMLElement;

  const tmp = document.createElement("div").withStyles({ width: 0, height: 0 });
  document.body.appendChild(tmp);
  tmp.appendChild(clone);

  const treeWalker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT);
  const cloneWalker = document.createTreeWalker(clone, NodeFilter.SHOW_ELEMENT);

  while (treeWalker.nextNode()) {
    cloneWalker.nextNode();

    const originalEl = treeWalker.currentNode as HTMLElement;
    const clonedEl = cloneWalker.currentNode as HTMLElement;

    const computed = window.getComputedStyle(originalEl);

    for (const prop of computed) {
      clonedEl.style.setProperty(prop, computed.getPropertyValue(prop));
    }
  }

  clone = clone.cloneNode(true) as HTMLElement;

  tmp.remove();

  return clone;
}

document.getElementById("exportSVG").addEventListener("click", (_) => {
  const connections = document.getElementById("connections") as SVGSVGElement &
    HTMLElement;
  const diagramArea = document.getElementById(
    "diagram-objects",
  ) as HTMLDivElement;

  async function generateOutput() {
    const svg1 = inlineComputedStyles(connections) as SVGSVGElement &
      HTMLElement;
    const svg2 = await toSvg(diagramArea).then(svgFromDataUrl);

    const svg = mergeSVGsVertical(svg1, svg2);

    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    download(source, "diagram.svg");
  }

  generateOutput();
});
