class ApiError extends Error {
  constructor(errors = [], message = "Something went wrong!", stack = "") {
    super(message);
    this.success = false;
    this.errors = errors;
    this.data = null;

    if (stack) this.stack = stack;
    else Error.captureStackTrace(this, this.constructor);
  }
}

export default ApiError;
