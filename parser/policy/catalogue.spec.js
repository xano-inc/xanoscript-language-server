import { expect } from "chai";
import { readdirSync, readFileSync, statSync } from "fs";
import { afterEach, describe, it } from "mocha";
import { join } from "path";
import { documentCache } from "../../cache/documentCache.js";
import { renderSnapshot } from "../../scripts/gen-policy-catalogue.mjs";
import {
  clearPolicyCatalogue,
  getPolicyCatalogue,
  getPolicyCheck,
  hasPolicyCatalogue,
  policyCatalogueVersion,
  setPolicyCatalogue,
} from "./catalogue.js";
import snapshot from "./catalogueSnapshot.js";

const CHECK = { id: "a.check", label: "A check", params: {}, scope_fields: [{ name: "tags" }] };

/** Every .js file of the package, outside node_modules and tests. */
function sources(dir = ".") {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (["node_modules", ".git", "coverage"].includes(name)) return [];
    if (statSync(path).isDirectory()) return sources(path);
    return /\.m?js$/.test(name) && !name.endsWith(".spec.js") ? [path] : [];
  });
}

describe("policy check catalogue", () => {
  afterEach(() => clearPolicyCatalogue());

  it("starts empty", () => {
    expect(hasPolicyCatalogue()).to.equal(false);
    expect(getPolicyCatalogue().source).to.equal(null);
  });

  it("takes the platform's answer, the editor's checks or a bare list", () => {
    for (const catalogue of [{ items: [CHECK], templates: [] }, { checks: [CHECK] }, [CHECK]]) {
      setPolicyCatalogue(catalogue);
      expect(getPolicyCheck("a.check")).to.equal(CHECK);
      expect(getPolicyCatalogue().source).to.equal("live");
      expect([...getPolicyCatalogue().scopeFields]).to.deep.equal(["tags"]);
    }
  });

  it("keeps where a catalogue came from, and a snapshot's date", () => {
    setPolicyCatalogue({ generated_at: "2026-01-02", items: [CHECK] }, { source: "snapshot" });
    expect(getPolicyCatalogue()).to.include({ source: "snapshot", generatedAt: "2026-01-02" });
  });

  it("changes version on every load, so no cached parse outlives it", () => {
    const text = `policy K {\n  rule {\n    check = "a.check"\n  }\n}`;
    const uri = "inmemory://catalogue.spec";
    const before = policyCatalogueVersion();
    expect(documentCache.getOrParse(uri, 1, text).parser.errors).to.have.length(0);
    setPolicyCatalogue({ items: [{ id: "b.check", params: {} }] });
    expect(policyCatalogueVersion()).to.be.greaterThan(before);
    // Same uri, version and text: parsed again, against the new catalogue.
    expect(documentCache.getOrParse(uri, 1, text).parser.errors).to.have.length(1);
    documentCache.invalidate(uri);
  });

  it("empties on null", () => {
    setPolicyCatalogue([CHECK]);
    setPolicyCatalogue(null);
    expect(hasPolicyCatalogue()).to.equal(false);
  });

  describe("the bundled snapshot", () => {
    it("is the platform's checks, sorted by id, with the day it was taken", () => {
      expect(snapshot.generated_at).to.match(/^\d{4}-\d{2}-\d{2}$/);
      const ids = snapshot.items.map((item) => item.id);
      expect(ids).to.deep.equal([...ids].sort());
      expect(ids).to.include("object.auth_required");
      expect(snapshot).to.not.have.property("templates");
      expect(snapshot).to.not.have.property("recipes");
      // Each check carries its uses, which hover and completion show with it.
      expect(snapshot.items.every((item) => Array.isArray(item.uses) && item.uses.length > 0)).to.equal(true);
      // The policy file's own fields ride along, so the snapshot describes a whole policy.
      expect(snapshot.document.fields).to.include.keys("title", "severity", "tags");
      expect(snapshot.document.rule).to.include.keys("check", "params");
    });

    it("is written exactly as the generator writes it", () => {
      const file = readFileSync("parser/policy/catalogueSnapshot.js", "utf8");
      expect(renderSnapshot(snapshot, snapshot.generated_at)).to.equal(file);
    });

    it("is loaded only by the Node and browser language servers, never by a module the Xano editor bundles", () => {
      const importers = sources()
        .filter((path) => /from ["'][^"']*catalogueSnapshot\.js["']/.test(readFileSync(path, "utf8")))
        .sort();
      expect(importers).to.deep.equal(["language-server-worker.js", "server.js"]);
    });
  });
});
