import express from "express";
import { default as mongoose } from "mongoose";
import { dirname, extname, join } from "node:path";
import { createReadStream, rm } from "node:fs";
import { fileURLToPath } from "node:url";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import multer from "multer";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default function filesRouter(connection) {
  const gridFSBucket = new mongoose.mongo.GridFSBucket(connection.db, {
    bucketName: "uploads",
    chunkSizeBytes: 524288, // 512kb
  });

  //#region multer configuration ##################################################
  const uploadedFilesPath = join(__dirname, "../../uploadedFiles");

  const storage = multer.diskStorage({
    destination: uploadedFilesPath,
    filename: function (req, file, cb) {
      // console.log("🚀 ~ filesRouter ~ file:", file);
      // const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      // const extension = extname(file.originalname);
      // cb(null, uniqueSuffix + extension);
      cb(null, file.originalname);
    },
  });

  function fileFilter(req, file, cb) {
    // const allowedFileTypes = ["image/vnd.dwg"];
    const allowedFileTypes = ["application/pdf"];

    if (!allowedFileTypes.includes(file.mimetype))
      return cb(new Error("Upload only pdf file."));

    return cb(null, true);
  }

  const fileUpload = multer({
    storage,
    fileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5 MB (maximum file size)
      // files: 5, // Maximum number of files
    },
  });
  //#endregion multer configuration ##################################################

  router.post(
    "/upload",
    // This middleware is to just show the errors thrown by the multer in our format
    (req, res, next) => {
      fileUpload.single("file")(req, res, (err) => {
        if (err) {
          console.error(err);
          logger.error(err);
          return res.status(400).json(new ApiError([err.message]));
        }

        // console.log("🚀 ~ fileUpload.single ~ req.file:", req.file);
        // Check if req.file exists
        if (!req.file)
          return res.status(404).json(new ApiError(["File not found."]));

        next();
      });
    },
    async (req, res) => {
      try {
        const files = await gridFSBucket
          .find({ filename: req.file.filename })
          .toArray();
        console.log("🚀 ~ files:", files);
        // return res.sendStatus(200);

        let version = 0;
        if (files.length) version = files.length;

        // Example to upload a file
        const uploadStream = gridFSBucket.openUploadStream(req.file.filename, {
          metadata: {
            version,
          },
        });

        const filePath = join(uploadedFilesPath, req.file.filename);
        createReadStream(filePath)
          .on("error", (err) => {
            throw new Error(err);
          })
          .on("end", () => {
            rm(filePath, () => {
              console.log(`File ${req.file.filename} deleted successfully.`);
            });
          })
          .pipe(uploadStream);

        return res.sendStatus(200);
      } catch (error) {
        console.log(error);
        return res.sendStatus(500);
      }
    }
  );

  router.get("/", async (req, res) => {
    try {
      const files = await gridFSBucket
        .find()
        .project({ length: 1, filename: 1, uploadDate: 1, metadata: 1 })
        .toArray();

      return res
        .status(200)
        .json(new ApiResponse(files, "All the files fetched successfully."));
    } catch (error) {
      console.log(error);
      return res.sendStatus(500);
    }
  });

  router.get("/download/:fileName/:version", async (req, res) => {
    try {
      if (!req.params?.fileName || !req.params?.version)
        return res.sendStatus(400);
      // Example to download a file
      const files = await gridFSBucket
        .find({
          filename: req.params.fileName,
          "metadata.version": parseInt(req.params.version, 10),
        })
        .toArray();
      //   for await (const doc of cursor) {
      //     console.log("🚀 ~ forawait ~ doc:", doc);
      //   }

      if (!files.length) return res.sendStatus(404);
      // if (files.length > 1) return res.sendStatus(400);
      //   return res.sendStatus(200);

      const downloadStream = gridFSBucket.openDownloadStream(files[0]._id);
      // Set the headers
      res.setHeader("Content-Length", files[0].length);
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=" + files[0].filename
      );
      res.setHeader("Content-Type", "application/octet-stream");

      downloadStream
        .pipe(res)
        .on("error", (err) => {
          throw new Error(err);
        })
        .on("end", () => {
          console.log(
            `File ${files[0].filename} (version ${files[0].metadata.version}) downloaded successfully`
          );
        });

      // return res.sendStatus(200);
    } catch (error) {
      console.log(error);
    }
  });

  return router;
}
