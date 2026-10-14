import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MAX_BODY_CHARS,
  buildSubject,
  createRateLimiter,
  isValidEmail,
  singleLine,
  sniffImage,
  validateInquiry,
} from "./inquiry.ts";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const valid = {
  name: "Jan Novák",
  phone: "+420 602 663 183",
  email: "jan@example.cz",
  body: "Poptávka\nPračka ×1",
  submissionId: "abcd1234-ef56",
  gross: "24863",
  from: "Rapšach",
  to: "Kienberg",
};

describe("validateInquiry", () => {
  it("projde úplná poptávka a ořízne mezery", () => {
    const result = validateInquiry(form({ ...valid, name: "  Jan Novák  " }));
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.data.name, "Jan Novák");
      assert.equal(result.data.gross, 24863);
    }
  });

  it("e-mail je nepovinný, ale špatný se odmítne", () => {
    assert.equal(validateInquiry(form({ ...valid, email: "" })).ok, true);
    assert.equal(validateInquiry(form({ ...valid, email: "tohle neni mail" })).ok, false);
  });

  it("odmítne chybějící jméno, krátký telefon, prázdné tělo a špatné id", () => {
    assert.equal(validateInquiry(form({ ...valid, name: " " })).ok, false);
    assert.equal(validateInquiry(form({ ...valid, phone: "12345" })).ok, false);
    assert.equal(validateInquiry(form({ ...valid, body: "" })).ok, false);
    assert.equal(validateInquiry(form({ ...valid, submissionId: "x" })).ok, false);
    assert.equal(validateInquiry(form({ ...valid, body: "a".repeat(MAX_BODY_CHARS + 5) })).ok, false);
  });

  it("jméno a adresy jsou jedna řádka, nejde podstrčit hlavičky", () => {
    const result = validateInquiry(form({ ...valid, name: "Jan\r\nBcc: evil@example.com", from: "A\nB" }));
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.ok(!/[\r\n]/.test(result.data.name));
      assert.ok(!/[\r\n]/.test(result.data.from));
    }
  });

  it("nesmyslná cena se bere jako 0", () => {
    const result = validateInquiry(form({ ...valid, gross: "abc" }));
    assert.equal(result.ok && result.data.gross, 0);
  });
});

describe("pomocné funkce", () => {
  it("předmět je jedna řádka a nese jméno, cenu i trasu", () => {
    const subject = buildSubject({ name: "Jan Novák", gross: 24863, from: "Rapšach", to: "Kienberg" });
    assert.ok(subject.includes("Jan Novák"));
    assert.ok(subject.includes("Rapšach → Kienberg"));
    assert.ok(!/[\r\n]/.test(subject));
    assert.ok(buildSubject({ name: "A", gross: 0, from: "", to: "" }).endsWith("A"));
  });

  it("singleLine a isValidEmail", () => {
    assert.equal(singleLine("a\r\nb\t c"), "a b c");
    assert.equal(isValidEmail("a@b.cz"), true);
    assert.equal(isValidEmail("a@b"), false);
    assert.equal(isValidEmail("a b@c.cz"), false);
  });

  it("poznává obrázky podle bajtů, ne podle jména", () => {
    assert.equal(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))?.ext, "jpg");
    assert.equal(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d]))?.ext, "png");
    const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    assert.equal(sniffImage(webp)?.ext, "webp");
    assert.equal(sniffImage(new TextEncoder().encode("<script>alert(1)</script>")), null);
  });
});

describe("createRateLimiter", () => {
  it("pustí limit požadavků v okně a pak odmítne, po okně zase pustí", () => {
    const allowed = createRateLimiter(2, 1000);
    assert.equal(allowed("ip", 0), true);
    assert.equal(allowed("ip", 100), true);
    assert.equal(allowed("ip", 200), false);
    assert.equal(allowed("jina", 200), true);
    assert.equal(allowed("ip", 1500), true);
  });
});
