const http = require("http");

const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
const paths = ["/", "/api/accounts", "/api/inbox/summary", "/api/tasks", "/api/schedule"];

Promise.all(paths.map(checkPath))
  .then(() => {
    console.log("Smoke test passed.");
  })
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });

function checkPath(path) {
  return new Promise((resolve, reject) => {
    const request = http.get(`${baseUrl}${path}`, (response) => {
      response.resume();
      if (response.statusCode >= 200 && response.statusCode < 300) {
        resolve();
      } else {
        reject(new Error(`${path} returned ${response.statusCode}`));
      }
    });

    request.on("error", reject);
    request.setTimeout(5000, () => {
      request.destroy(new Error(`${path} timed out`));
    });
  });
}
