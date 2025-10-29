export const toBoolean =  (v: string | null): boolean => {
  return v !== null && v !== "false" && v !== "0" && v !== "";
};
