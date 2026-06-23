// Player: renders the active tour step as a comment thread beside the code.
const vscode = require("vscode");

function renderStep(tour, stepIndex, controller) {
  const step = tour.steps[stepIndex];
  const uri = vscode.Uri.file(step.file);
  const range = new vscode.Range(step.line - 1, 0, step.line - 1, 0);

  const thread = controller.createCommentThread(uri, range, [
    { body: step.description, author: { name: "gCodeTour" } }
  ]);
  thread.canReply = false;
  return thread;
}

module.exports = { renderStep };
