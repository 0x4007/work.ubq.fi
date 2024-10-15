import { checkCacheIntegrityAndSyncTasks } from "./cache-integrity";
import { GitHubIssue } from "../github-types";
import { taskManager } from "../home";
import { applyAvatarsToIssues, renderGitHubIssues } from "../rendering/render-github-issues";
import { Sorting } from "../sorting/generate-sorting-buttons";
import { sortIssuesController } from "../sorting/sort-issues-controller";

export type Options = {
  ordering: "normal" | "reverse";
};

type ViewState = "directory" | "proposals" | "notifications";

// start at Directory view
let currentViewState: ViewState = "directory";

const radioButtons = [
  document.getElementById("radio-directory") as HTMLInputElement,
  document.getElementById("radio-proposals") as HTMLInputElement,
  document.getElementById("radio-notifications") as HTMLInputElement
];

const viewToggleLabel = document.querySelector('label[for="view-toggle"]') as HTMLLabelElement;
const viewToggleText = document.getElementById("view-toggle-text") as HTMLSpanElement;

if (!radioButtons.every(Boolean) || !viewToggleLabel || !viewToggleText) {
  console.error("One or more view toggle elements not found");
}

function updateView() {
  const checkedRadio = radioButtons.find(radio => radio.checked);
  if (checkedRadio) {
    // Update the text display
    viewToggleText.textContent = checkedRadio.id.replace('radio-', '').charAt(0).toUpperCase() +
                                 checkedRadio.id.replace('radio-', '').slice(1);

    // Update currentViewState
    currentViewState = checkedRadio.id.replace('radio-', '') as ViewState;

    // Trigger re-rendering of issues
    void displayGitHubIssues();
  }
}

function cycleRadioButtons() {
  const currentIndex = radioButtons.findIndex(radio => radio.checked);
  const nextIndex = (currentIndex + 1) % radioButtons.length;
  radioButtons[nextIndex].checked = true;
  updateView();
}

viewToggleLabel.addEventListener('click', (event) => {
  event.preventDefault(); // Prevent default label behavior
  cycleRadioButtons();
});

// Initialize the view
updateView();

function getViewFilter(viewState: ViewState) {
  return (issue: GitHubIssue) => {
    if (!issue?.labels) return false;

    const hasPriceLabel = issue.labels.some((label) => {
      if (typeof label === "string") return false;
      return label.name?.startsWith("Price: ");
    });

    switch (viewState) {
      case "directory":
        return true;
      case "proposals":
        return !hasPriceLabel;
      case "notifications":
        // Implement notification filter logic here
        return issue.labels.some((label) => typeof label !== "string" && label.name === "Notification");
      default:
        return false;
    }
  };
}

// checks the cache's integrity, sorts issues, applies view filter, renders them and applies avatars
export async function displayGitHubIssues(sorting?: Sorting, options = { ordering: "normal" }) {
  await checkCacheIntegrityAndSyncTasks();
  const cachedTasks = taskManager.getTasks();
  const sortedIssues = sortIssuesController(cachedTasks, sorting, options);
  const filteredIssues = sortedIssues.filter(getViewFilter(currentViewState));
  renderGitHubIssues(filteredIssues);
  applyAvatarsToIssues();
}
