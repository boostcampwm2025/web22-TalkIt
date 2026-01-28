export type BackendErrorResponse = {
  code: string;
  message: string;
  errors?: Record<string, string[]>;
};
