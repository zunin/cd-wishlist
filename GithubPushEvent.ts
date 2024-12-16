import { GitHubRepository } from "./GitHubRepository.ts";

export type GithubPushEvent = {
    after: string;
    base_ref: string | null;
    before: string;
    commits: Array<any>;
    compare: string;
    created: boolean;
    deleted: boolean;
    enterprise?: any;
    forced: boolean;
    head_commit: any | null;
    installation?: any;
    organization?: any;
    pusher: any;
    ref: string;
    repository: GitHubRepository;
    sender: any;
};
