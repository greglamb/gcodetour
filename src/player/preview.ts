// Copyright (c) Microsoft Corporation.
// Copyright (c) 2026 Greg Lamb (fork modifications).
// Licensed under the MIT License.

// Pure, VS Code-independent transforms used when rendering a step's
// description into the markdown that's shown in the comment thread.
//
// These helpers intentionally avoid importing anything from `vscode` (or the
// extension's `store`) so that they can be unit tested in a plain Node
// context. See `src/test/unit/preview.test.ts`. The transforms that *do*
// require VS Code (file/tour references) remain in `./index.ts`.

const ENV_VARIABLE_PATTERN = /\{\{([A-Z_][A-Z0-9_]*)\}\}/g;

const SHELL_SCRIPT_PATTERN = /^>>\s+(?<script>.*)$/gm;

const COMMAND_PATTERN =
  /(?<commandPrefix>\(command:[\w+.]+\?)(?<params>\[[^\])]+\])/gm;

const CODE_FENCE_PATTERN = /```[^\n]+\n(.+)\n```/gms;

/**
 * Replaces `{{ENV_VAR}}` placeholders with the value of the corresponding
 * environment variable. Only upper-case names are matched, and unknown
 * variables are left untouched (rendered as their literal placeholder).
 */
export function substituteEnvironmentVariables(content: string): string {
  return content.replace(
    ENV_VARIABLE_PATTERN,
    (_, name) => process.env[name] || `{{${name}}}`
  );
}

/**
 * Turns a `>> <script>` line into a clickable link that runs the script in
 * the integrated terminal.
 */
export function linkifyShellScripts(content: string): string {
  return content.replace(SHELL_SCRIPT_PATTERN, (_, script) => {
    const args = encodeURIComponent(JSON.stringify([script]));
    return `> [${script}](command:codetour.sendTextToTerminal?${args} "Run \\"${script.replace(
      /"/g,
      "'"
    )}\\" in a terminal")`;
  });
}

/**
 * Encodes the inline JSON arguments of a `command:` link so that VS Code can
 * parse them when the link is clicked.
 */
export function encodeCommandParameters(content: string): string {
  return content.replace(COMMAND_PATTERN, (_, commandPrefix, params) => {
    const args = encodeURIComponent(JSON.stringify(JSON.parse(params)));
    return `${commandPrefix}${args}`;
  });
}

/**
 * Appends an "Insert Code" link beneath any fenced code block, allowing the
 * snippet to be inserted into the active editor.
 */
export function linkifyCodeSnippets(content: string): string {
  return content.replace(CODE_FENCE_PATTERN, (match, codeBlock) => {
    const params = encodeURIComponent(JSON.stringify([codeBlock]));
    return `${match}
↪ [Insert Code](command:codetour.insertCodeSnippet?${params} "Insert Code")`;
  });
}
