// DTOs for evaluation module (types only)

export type IssueType = 'strength' | 'missing' | 'unclear';

export type Issue = {
  type: IssueType;
  detail: string;
  evidence?: string;
  target?: string | null;
};

export type IssuesPayload = { issues: Issue[] };

export type Feedback = {
  accurate: string[];
  weakness: string[];
  suggestions: string[];
};

export type CombinedPayload = IssuesPayload & {
  feedback: Feedback;
};

export type RubricItem = { description: string; weight: number };
export type Rubric = { items: RubricItem[]; scale: '0-2' };
