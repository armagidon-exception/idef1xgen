interface HTMLElement {
  withAttribute(qualifiedName: string, value: any): HTMLElement;
  withAttributes(props: Object): HTMLElement;
  withChild(...children: HTMLElement[]): HTMLElement;
  withStyle(style: string, value: any): HTMLElement;
  withStyles(...styles: Object[]): HTMLElement;
  clear(): HTMLElement;
  withClass(clazz: string): HTMLElement;
  withClasses(...clazz: string[]): HTMLElement;
  withText(text: string): HTMLElement;
}
 
HTMLElement.prototype.withAttribute = function (qualifiedName, value) {
  if (typeof value === "string") {
    this.setAttribute(qualifiedName, value);
  } else {
    this[qualifiedName] = value;
  }
  return this;
};

HTMLElement.prototype.withAttributes = function (props) {
  for (const [key, value] of Object.entries(props)) {
    this.withAttribute(key, value);
  }
  return this;
};

HTMLElement.prototype.withChild = function () {
  for (const child of arguments) {
    if (Array.isArray(child)) {
      for (const item of child) {
        this.append(item);
      }
    } else {
      this.append(child);
    }
  }
  return this;
};

HTMLElement.prototype.withStyle = function (style, value) {
  this.style[style] = value;
  return this;
};

HTMLElement.prototype.withStyles = function (styles) {
  for (const [key, value] of Object.entries(styles)) {
    this.withStyle(key, value);
  }
  return this;
};

HTMLElement.prototype.clear = function () {
  while (this.firstChild) {
    this.removeChild(this.lastChild);
  }
  return this;
};

HTMLElement.prototype.withClass = function (clazz) {
  this.classList.add(clazz);
  return this;
};

HTMLElement.prototype.withClasses = function (...classes) {
  for (const clazz of classes) {
    if (clazz == "") {
      continue;
    }
    this.withClass(clazz);
  }
  return this;
};

HTMLElement.prototype.withText = function (text) {
  this.textContent = text;
  return this;
};
