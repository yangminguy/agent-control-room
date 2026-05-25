export type GitHubConfig = {
  token: string;
  owner: string;
  repo: string;
};

export type PRCreationRequest = {
  title: string;
  body: string;
  head: string; // source branch
  base: string; // target branch (e.g. "main")
  draft?: boolean;
};

export type PRCreationResult =
  | { success: true; prNumber: number; url: string }
  | { success: false; error: string; skipped?: boolean };

export type PRTemplate = {
  titlePrefix: string;
  bodyHeader: string;
};
