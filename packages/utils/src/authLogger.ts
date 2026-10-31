// Auth.js logs the whole error by default, and the error of an expired session
// carries the token, with the name and the email of the person. Name and message only.
export const authLogger = {
  error(error: Error): void {
    // console.error on purpose: this only runs on the server, so this goes to the server log
    console.error(`[auth] ${error.name}: ${error.message}`)
  },
}
