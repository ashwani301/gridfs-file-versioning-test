class ApiResponse {
  constructor(data, message = "Success!") {
    this.success = true;
    this.data = data;
    this.message = message;
  }
}

export default ApiResponse;
