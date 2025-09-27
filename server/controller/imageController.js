// controller/imageController.js
import dotenv from "dotenv";
dotenv.config();

import B2 from "backblaze-b2";
import File from "../models/file.js";
import axios from "axios"; 

const {
  B2_ACCOUNT_ID,
  B2_APPLICATION_KEY,
  B2_BUCKET_ID,
  B2_BUCKET_NAME 
} = process.env;

if (!B2_ACCOUNT_ID || !B2_APPLICATION_KEY || !B2_BUCKET_ID || !B2_BUCKET_NAME) {
  console.error("Missing one of the required B2 env vars: B2_ACCOUNT_ID, B2_APPLICATION_KEY, B2_BUCKET_ID, B2_BUCKET_NAME");
}

const b2 = new B2({
  accountId: B2_ACCOUNT_ID,
  applicationKey: B2_APPLICATION_KEY
});

async function authorizeB2() {
  const auth = await b2.authorize();
  if (!auth || !auth.data) throw new Error("B2 authorize() returned no data");
  // Basic validate
  if (!auth.data.apiUrl || !auth.data.downloadUrl) {
    console.error("authorize() returned incomplete data:", auth.data);
    throw new Error("B2 authorize() did not return apiUrl/downloadUrl");
  }
  return auth.data; // contains apiUrl, downloadUrl, s3ApiUrl, authorizationToken, etc.
}

export const uploadImage = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    // 1) Ensure B2 is authorized and extract useful hosts
    const authData = await authorizeB2();

    // 2) Build a safe fileName
    const safeName = req.file.originalname.replace(/\s+/g, "_");
    const fileName = `uploads/${Date.now()}_${safeName}`;

    // 3) Get a dedicated upload URL for the bucket (this returns uploadUrl + authToken)
    const uploadUrlRes = await b2.getUploadUrl({ bucketId: B2_BUCKET_ID });
    if (!uploadUrlRes || !uploadUrlRes.data || !uploadUrlRes.data.uploadUrl || !uploadUrlRes.data.authorizationToken) {
      console.error("getUploadUrl returned incomplete response:", uploadUrlRes && uploadUrlRes.data);
      throw new Error("Failed to get upload url from B2");
    }

    const uploadUrl = uploadUrlRes.data.uploadUrl;
    const uploadAuthToken = uploadUrlRes.data.authorizationToken;

    // Uploaded using axios directly to the uploadUrl
    // Backblaze expects:
    // - Authorization header with uploadAuthToken
    // - X-Bz-File-Name header (encoded)
    // - Content-Type header
    // - X-Bz-Content-Sha1 header
    const uploadHeaders = {
      Authorization: uploadAuthToken,
      "X-Bz-File-Name": encodeURIComponent(fileName),
      "Content-Type": req.file.mimetype || "application/octet-stream",
      "X-Bz-Content-Sha1": "do_not_verify"
    };

    // axios will accept Buffer as body
    const axiosResp = await axios({
      method: "post",
      url: uploadUrl,
      headers: uploadHeaders,
      data: req.file.buffer,
      maxBodyLength: Infinity, 
      maxContentLength: Infinity
    });

    // axiosResp.data should contain fileId and other metadata
    const b2UploadData = axiosResp.data;
    if (!b2UploadData || !b2UploadData.fileId) {
      console.error("Unexpected upload response:", b2UploadData);
      throw new Error("Upload failed: unexpected B2 response");
    }

    // Save metadata in MongoDB
    const fileDoc = await File.create({
      path: fileName,               
      name: req.file.originalname,
      fileId: b2UploadData.fileId,
      downloadCount: 0
    });

    // For private buckets generate temporary download authorization token
    const validSeconds = 60 * 60; // 1 hour
    const dlAuth = await b2.getDownloadAuthorization({
      bucketId: B2_BUCKET_ID,
      fileNamePrefix: fileName,
      validDurationInSeconds: validSeconds
    });

    // Built a working download URL using the authorize() downloadUrl 
    const fileUrl = `${authData.downloadUrl}/file/${B2_BUCKET_NAME}/${encodeURIComponent(fileName)}?Authorization=${dlAuth.data.authorizationToken}`;

    return res.status(200).json({ fileId: fileDoc._id, url: fileUrl });
  } catch (err) {
    console.error("Upload failed:", err);
    // give helpful diagnostics without leaking secrets
    const msg = err.response?.data || err.message || "Upload failed";
    return res.status(500).json({ error: String(msg) });
  }
};

export const downloadFile = async (req, res) => {
  try {
    const fileDoc = await File.findById(req.params.fileId);
    if (!fileDoc) return res.status(404).json({ error: "File not found" });

    fileDoc.downloadCount = (fileDoc.downloadCount || 0) + 1;
    await fileDoc.save();

    // authorize (to ensure SDK has valid token)
    await authorizeB2();

    // Download by fileId and stream
    const dlRes = await b2.downloadFileById({ fileId: fileDoc.fileId });
    res.setHeader("Content-Disposition", `attachment; filename="${fileDoc.name}"`);
    dlRes.data.pipe(res);
  } catch (err) {
    console.error("Download failed:", err);
    const msg = err.response?.data || err.message || "Download failed";
    return res.status(500).json({ error: String(msg) });
  }
};
