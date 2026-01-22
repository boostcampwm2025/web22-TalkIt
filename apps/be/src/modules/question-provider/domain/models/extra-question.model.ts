export interface ExtraQuestionModel {
  id: number;
  sessionId: number;
  parentAnswerId: number;
  content: string;
  mustInclude: string[];
  createdAt: Date;
}
