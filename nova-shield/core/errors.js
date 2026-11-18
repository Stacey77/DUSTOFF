export function httpError(status, code) {
  const err = new Error(code);
  err.status = status;
  err.expose = true;
  return err;
}
