import filesRouter from "./files.routes.mjs";

export default function (app, connection) {
  app.get("/", (req, res) => {
    return res.sendStatus(200);
  });

  app.use("/files", filesRouter(connection));
}
