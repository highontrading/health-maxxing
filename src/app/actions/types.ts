/** Result shape for forms driven by useActionState. */
export type FormState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
};

export const EMPTY: FormState = {};
