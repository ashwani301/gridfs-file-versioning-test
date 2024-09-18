import express from "express";
import mongoose from "mongoose";
import routes from "./routes/index.mjs";
import morgan from "morgan";

const app = express();

app.use(morgan("combined"));
app.use("/pages", express.static("public"));

async function connectDB() {
  return await mongoose.connect(
    "mongodb://127.0.0.1/gridfs-file-versions-server-db"
  );
}

connectDB()
  .then((conn) => {
    console.log(`🔆 Connected to the database host: ${conn.connection.host}`);

    routes(app, conn.connection);

    const PORT = 5003;
    app.listen(PORT, () => console.log(`🔆 Server up @ ${PORT}`));
  })
  .catch((err) => console.log(err));
