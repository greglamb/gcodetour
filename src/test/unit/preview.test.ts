// Copyright (c) 2026 Greg Lamb.
// Licensed under the MIT License.

import { strict as assert } from "node:assert";
import {
  encodeCommandParameters,
  linkifyCodeSnippets,
  linkifyShellScripts,
  substituteEnvironmentVariables
} from "../../player/preview";

describe("substituteEnvironmentVariables", () => {
  it("replaces a defined environment variable", () => {
    process.env.CODETOUR_TEST_VAR = "hello";
    try {
      assert.equal(
        substituteEnvironmentVariables("value: {{CODETOUR_TEST_VAR}}"),
        "value: hello"
      );
    } finally {
      delete process.env.CODETOUR_TEST_VAR;
    }
  });

  it("leaves an undefined variable as its literal placeholder", () => {
    delete process.env.CODETOUR_UNDEFINED_VAR;
    assert.equal(
      substituteEnvironmentVariables("{{CODETOUR_UNDEFINED_VAR}}"),
      "{{CODETOUR_UNDEFINED_VAR}}"
    );
  });

  it("only matches upper-case names", () => {
    process.env.lowercase_var = "x";
    try {
      assert.equal(
        substituteEnvironmentVariables("{{lowercase_var}}"),
        "{{lowercase_var}}"
      );
    } finally {
      delete process.env.lowercase_var;
    }
  });

  it("substitutes multiple variables in one string", () => {
    process.env.CODETOUR_A = "1";
    process.env.CODETOUR_B = "2";
    try {
      assert.equal(
        substituteEnvironmentVariables("{{CODETOUR_A}}-{{CODETOUR_B}}"),
        "1-2"
      );
    } finally {
      delete process.env.CODETOUR_A;
      delete process.env.CODETOUR_B;
    }
  });

  it("leaves content without placeholders unchanged", () => {
    assert.equal(
      substituteEnvironmentVariables("no variables here"),
      "no variables here"
    );
  });
});

describe("linkifyShellScripts", () => {
  it("turns a >> line into a terminal command link", () => {
    const out = linkifyShellScripts(">> npm install");
    const encoded = encodeURIComponent(JSON.stringify(["npm install"]));
    assert.ok(
      out.startsWith(
        `> [npm install](command:codetour.sendTextToTerminal?${encoded}`
      ),
      out
    );
  });

  it("escapes double quotes in the tooltip", () => {
    const out = linkifyShellScripts('>> echo "hi"');
    assert.ok(out.includes(`Run \\"echo 'hi'\\"`), out);
  });

  it("ignores text that is not a shell directive", () => {
    assert.equal(linkifyShellScripts("just some text"), "just some text");
  });
});

describe("encodeCommandParameters", () => {
  it("url-encodes the inline JSON args of a command link", () => {
    const out = encodeCommandParameters("(command:foo?[1,2])");
    const encoded = encodeURIComponent(JSON.stringify([1, 2]));
    assert.equal(out, `(command:foo?${encoded})`);
  });

  it("leaves non-command content unchanged", () => {
    assert.equal(encodeCommandParameters("plain text"), "plain text");
  });
});

describe("linkifyCodeSnippets", () => {
  it("appends an Insert Code link beneath a fenced code block", () => {
    const md = "```js\nconst a = 1;\n```";
    const out = linkifyCodeSnippets(md);
    const encoded = encodeURIComponent(JSON.stringify(["const a = 1;"]));
    assert.ok(out.startsWith(md), out);
    assert.ok(
      out.includes(
        `↪ [Insert Code](command:codetour.insertCodeSnippet?${encoded}`
      ),
      out
    );
  });

  it("leaves prose without code fences unchanged", () => {
    assert.equal(linkifyCodeSnippets("no code here"), "no code here");
  });
});
