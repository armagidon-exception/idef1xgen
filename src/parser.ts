import { Entity, Relationship, Generalization, Attribute } from "./types";
export interface ParseResult {
  entities: Entity[];
  relationships: Relationship[];
  generalizations: Generalization[];
}

export function parseMarkup(markup: string): ParseResult {
  const entities: Entity[] = [];
  const relationships: Relationship[] = [];
  const generalizations: Generalization[] = [];

  const lines = markup
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("//"));

  function parseEntityHeader(line: string): string | null {
    const m = line.match(/^Entity\s+("?[\wА-Яа-я0-9_]+"?)\s*\{\s*$/);
    return m ? m[1].replace(/^"|"$/g, "") : null;
  }

  function parseGeneralizationHeader(line: string): string | null {
    const m = line.match(/^Generalization\s+("?[\wА-Яа-я0-9_]+"?)\s*\{\s*$/);
    return m ? m[1].replace(/^"|"$/g, "") : null;
  }

  function parseAttribute(line: string): Attribute | null {
    const attrRE =
      /^([*]?)([+?]?)([\wА-Яа-я0-9_]+)\s*:\s*([\wА-Яа-я0-9_]+)(?:\s*FK\s*->\s*([\wА-Яа-я0-9_]+)\.([\wА-Яа-я0-9_]+)\s*(?::\s*"(.*)")?)?$/;

    const m = line.match(attrRE);
    if (!m) return null;

    let [, many, mod, name, type, fkEntity, fkAttr, relName] = m;

    return {
      many: many !== "*",
      name,
      type,
      optional: mod === "?",
      isPK: mod === "+",
      fkTarget: fkEntity && {
        entity: fkEntity,
        attributeName: fkAttr,
        relName: relName || null,
      },
    };
  }

  type State =
    | (Entity & { type: "entity" })
    | (Relationship & { type: "relationship" })
    | (Generalization & { type: "generalization" });

  let state: State = null;

  for (const line of lines) {
    if (!state) {
      if (line.trim().startsWith("Entity")) {
        const name = parseEntityHeader(line);
        if (name == null) {
          throw new Error("Unknown syntax: " + line);
        }
        state = {
          type: "entity",
          name: name,
          primaryKey: [],
          attributes: [],
          weak: false,
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          div: null,
        };
      } else if (line.trim().startsWith("Relationship")) {
        let relMatch = line.match(
          /^Relationship\s+([\wА-Яа-я0-9_]+)\.([\wА-Яа-я0-9_]+)\s*->\s*([\wА-Яа-я0-9_]+)\.([\wА-Яа-я0-9_]+)\s*(?::\s*"(.*)")?$/,
        );

        if (relMatch == null) {
          throw new Error("Unknown syntax: " + line);
        }
        const [, sEnt, sAttr, tEnt, tAttr, relName] = relMatch;
        relationships.push({
          source: { entity: sEnt, attributeName: sAttr, relName: relName },
          target: { entity: tEnt, attributeName: tAttr, relName: relName },
        });
      } else if (line.trim().startsWith("Generalization")) {
        let name = parseGeneralizationHeader(line);
        if (name == null) {
          throw new Error("Unknown syntax: " + line);
        }
        state = {
          type: "generalization",
          generic: name,
          categories: [],
          complete: false,
        };
      } else {
        throw new Error("Unknown syntax: " + line);
      }
    } else if (state.type == "entity") {
      if (line.startsWith("}")) {
        entities.push(state);
        state = null;
      } else {
        const attr = parseAttribute(line);
        if (!attr) throw new Error("Invalid attribute: " + line);

        if (attr.isPK) state.primaryKey.push(attr);
        else state.attributes.push(attr);
      }
    } else if (state.type == "generalization") {
      if (!line.startsWith("}")) {
        state.categories.push(line);
      } else {
        const m = line.match(
          /^}\s*(complete|partial)(?:\s+discriminator\s*=\s*([\wА-Яа-я0-9_]+))?$/,
        );
        if (m == null) throw new Error("Unknown syntax: " + line);

        const [, completeness, discr] = m;

        state.complete = completeness === "complete";
        state.discriminator = discr;
        generalizations.push(state);
        state = null;
      }
    }
  }

  for (const e of entities) {
    for (const a of [...e.primaryKey, ...e.attributes]) {
      if (a.fkTarget) {
        relationships.push({
          source: {
            entity: e.name,
            attributeName: a.name,
            relName: a.fkTarget.relName,
          },
          target: {
            entity: a.fkTarget.entity,
            attributeName: a.fkTarget.attributeName,
            relName: a.fkTarget.relName,
          },
        });
      }
    }
  }

  return { entities, generalizations, relationships };
}
