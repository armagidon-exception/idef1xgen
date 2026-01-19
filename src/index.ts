import { showStatus } from "./utils";
import { parseMarkup, ParseResult } from "./parser";
import { renderDiagram, redrawConnections } from "./renderer";

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
  const diagramArea = document.getElementById("diagram-container");
  const zoomLevel = document.getElementById("zoom-level");
  diagramArea.style.transform = `scale(${scale})`;

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
function makeDraggable(element: Element, entity: Entity) {
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
    // Highlight the entity rectangle for dragging feedback
    const svgRect = element.querySelector("rect");
    if (svgRect) {
      svgRect.setAttribute(
        "original-stroke",
        svgRect.getAttribute("stroke") || "black",
      );
      svgRect.setAttribute(
        "original-stroke-width",
        svgRect.getAttribute("stroke-width") || "2",
      );
      svgRect.setAttribute("stroke", "#667eea");
      svgRect.setAttribute("stroke-width", "3");
    }

    document.addEventListener("mousemove", onDrag);
    document.addEventListener("mouseup", stopDrag);
  }

  function onDrag(e: MouseEvent) {
    if (!isDragging || !currentEntity) return;

    const diagramArea = document.getElementById("diagram-objects");
    const diagramRect = diagramArea.getBoundingClientRect();

    let newX = e.clientX - dragOffset.x - diagramRect.left;
    let newY = e.clientY - dragOffset.y - diagramRect.top;

    const rect = element.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const diagramWidth = diagramArea.clientWidth;
    const diagramHeight = diagramArea.clientHeight;

    newX = Math.max(0, Math.min(newX, diagramWidth - width));
    newY = Math.max(0, Math.min(newY, diagramHeight - height));

    // Update SVG transform
    element.setAttribute("transform", `translate(${newX}, ${newY})`);

    currentEntity.x = newX;
    currentEntity.y = newY;

    redrawConnections(currentDiagram);
  }

  function stopDrag() {
    if (!isDragging) return;

    element.classList.remove("dragging");
    // Restore original rectangle appearance
    const svgRect = element.querySelector("rect");
    if (svgRect) {
      const originalStroke = svgRect.getAttribute("original-stroke");
      const originalStrokeWidth = svgRect.getAttribute("original-stroke-width");
      if (originalStroke) {
        svgRect.setAttribute("stroke", originalStroke);
        svgRect.removeAttribute("original-stroke");
      }
      if (originalStrokeWidth) {
        svgRect.setAttribute("stroke-width", originalStrokeWidth);
        svgRect.removeAttribute("original-stroke-width");
      }
    }

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
      entity.div.setAttribute("transform", `translate(${x}, ${y})`);
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

document.getElementById("exportSVG").addEventListener("click", (_) => {
  const connections = document.getElementById(
    "connections",
  ) as unknown as SVGSVGElement;
  const diagramArea = document.getElementById(
    "diagram-objects",
  ) as unknown as SVGSVGElement;

  function combineSVGs(
    svg1: SVGSVGElement,
    svg2: SVGSVGElement,
  ): SVGSVGElement {
    const combined = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    );

    // Calculate bounding box based on entities if available
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    const padding = 50;

    if (
      currentDiagram &&
      currentDiagram.entities &&
      currentDiagram.entities.length > 0
    ) {
      currentDiagram.entities.forEach((entity) => {
        const x = entity.x || 0;
        const y = entity.y || 0;
        const width = entity.width || 120;
        const height = entity.height || 60;

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + width);
        maxY = Math.max(maxY, y + height);
      });

      // Add padding
      minX -= padding;
      minY -= padding;
      maxX += padding;
      maxY += padding;

      // Ensure positive dimensions
      const width = Math.max(100, maxX - minX);
      const height = Math.max(100, maxY - minY);

      combined.setAttribute("width", String(width));
      combined.setAttribute("height", String(height));
      combined.setAttribute("viewBox", `${minX} ${minY} ${width} ${height}`);
    } else {
      // Fallback to original dimensions
      const width = parseFloat(svg1.getAttribute("width") || "3000");
      const height = parseFloat(svg1.getAttribute("height") || "3000");
      combined.setAttribute("width", String(width));
      combined.setAttribute("height", String(height));
      combined.setAttribute("viewBox", `0 0 ${width} ${height}`);
    }

    combined.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    // Copy all children from both SVGs
    Array.from(svg1.childNodes).forEach((child) =>
      combined.appendChild(child.cloneNode(true)),
    );
    Array.from(svg2.childNodes).forEach((child) =>
      combined.appendChild(child.cloneNode(true)),
    );

    return combined;
  }

  const svg = combineSVGs(connections, diagramArea);
  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(svg);
  download(source, "diagram.svg");
});
