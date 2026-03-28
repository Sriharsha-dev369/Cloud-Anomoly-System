// Extends Express's Request type globally so req.userId is available in all controllers.
// Note: no imports — this must be a pure ambient declaration file.
declare namespace Express {
  interface Request {
    userId?: string;
  }
}
