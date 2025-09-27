import { useRef, useState } from "react";
import "./App.css";
import { uploadFile } from "./services/api"; // your existing API helper

export default function App() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(null); // null = idle, 0-100 = progress, -1 = indeterminate
  const fileInputRef = useRef();

  const MAX_SIZE = 200 * 1024 * 1024; // 200MB example limit

  // handle file selected (from input or drop)
  const handleFile = (f) => {
    setError("");
    if (!f) return;

    // Prevent folder selections disguised as files
    if (f.webkitRelativePath && f.webkitRelativePath.includes("/")) {
      setError("Folders are not allowed. Please select a single file.");
      setFile(null);
      return;
    }

    if (typeof f.size !== "number") {
      setError(
        "Could not determine file size. Try a different file or browser."
      );
      return;
    }

    if (f.size > MAX_SIZE) {
      setError(
        `File too large. Max allowed ${Math.round(
          MAX_SIZE / (1024 * 1024)
        )} MB.`
      );
      setFile(null);
      return;
    }

    setFile(f);
    upload(f);
  };

  // manual click
  const onUploadClick = () => fileInputRef.current?.click();

  // drag & drop handlers
  function onDrop(e) {
    e.preventDefault();
    setError(""); // clear previous errors if you use setError in scope

    let selectedFile = null;

    const items = e.dataTransfer?.items;
    // Preferred path: check items (gives access to entries and directory detection)
    if (items && items.length > 0) {
      // If more than one item was dropped, reject immediately
      if (items.length > 1) {
        setError(
          "Please drop a single file — folders or multiple files are not allowed."
        );
        e.dataTransfer.clearData();
        return;
      }

      const item = items[0];

      // Ensure it's a file kind
      if (item.kind === "file") {
        // If browser supports webkitGetAsEntry, detect directory
        const entry = item.webkitGetAsEntry?.();
        if (entry && entry.isDirectory) {
          setError("Folders are not allowed. Please drop a single file.");
          e.dataTransfer.clearData();
          return;
        }

        // Get the File object
        selectedFile = item.getAsFile
          ? item.getAsFile()
          : e.dataTransfer.files && e.dataTransfer.files[0];

        // Extra check: if the File has a webkitRelativePath it likely came from a folder
        if (
          selectedFile?.webkitRelativePath &&
          selectedFile.webkitRelativePath.includes("/")
        ) {
          setError("Folders are not allowed. Please drop a single file.");
          e.dataTransfer.clearData();
          return;
        }
      } else {
        setError("Dropped item is not a file.");
        e.dataTransfer.clearData();
        return;
      }
    } else {
      // Fallback: check e.dataTransfer.files
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) {
        setError("No file detected.");
        return;
      }
      if (files.length > 1) {
        setError(
          "Please drop a single file — multiple files or folders are not allowed."
        );
        return;
      }
      selectedFile = files[0];
      // also check webkitRelativePath here
      if (
        selectedFile?.webkitRelativePath &&
        selectedFile.webkitRelativePath.includes("/")
      ) {
        setError("Folders are not allowed. Please drop a single file.");
        return;
      }
    }

    if (selectedFile) {
      handleFile(selectedFile); // your existing function that performs size check + upload
    }

    e.dataTransfer.clearData();
  }
  
  function onDragOver(e) {
    e.preventDefault();
  }

  // If your uploadFile accepts progress callbacks, update this accordingly.
  const upload = async (selectedFile) => {
    try {
      setUploading(true);
      setProgress(-1); // indeterminate while waiting
      const data = new FormData();
      data.append("name", selectedFile.name);
      data.append("file", selectedFile);

      // call your API helper. Expecting it to return { path } or similar.
      const response = await uploadFile(data);
      // normalize response.path or response.url
      const path = response?.path ?? response?.url ?? response;
      setResult(path);
      setProgress(100);
    } catch (err) {
      console.error(err);
      setError("Upload failed. Try again.");
      setResult("");
    } finally {
      // small delay so users see completion state
      setTimeout(() => {
        setUploading(false);
        setProgress(null);
      }, 600);
    }
  };

  const clear = () => {
    setFile(null);
    setResult("");
    setError("");
    setProgress(null);
  };

  const copyLink = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      // brief feedback
      alert("Link copied to clipboard!");
    } catch {
      alert("Could not copy — please copy manually.");
    }
  };

  return (
    <div className="app-root">
      <main className="card">
        <div className="card-left">
          <h1 className="title">File Sharing</h1>
          <p className="subtitle">
            Upload a file and get a download link — quick, private, and
            shareable.
          </p>

          <div
            className={`dropzone ${uploading ? "disabled" : ""}`}
            onDrop={onDrop}
            onDragOver={onDragOver}
            role="button"
            tabIndex={0}
            onKeyDown={(e) =>
              (e.key === "Enter" || e.key === " ") && onUploadClick()
            }
            aria-disabled={uploading}
            aria-label="Drop a file here or click to select"
            onClick={() => !uploading && onUploadClick()}
          >
            <svg
              className="upload-ico"
              viewBox="0 0 24 24"
              width="36"
              height="36"
              aria-hidden
            >
              <path
                fill="currentColor"
                d="M5 20h14v-2H5v2zm7-18L5.33 9h3.34v6h4.66V9h3.34L12 2z"
              />
            </svg>
            <div className="drop-text">
              <strong>
                {uploading ? "Uploading..." : "Drag & drop a file here"}
              </strong>
              <span className="muted">or click to browse — max 200 MB</span>
            </div>
          </div>

          <div className="actions-row">
            <button
              className="btn primary"
              onClick={onUploadClick}
              disabled={uploading}
            >
              Choose file
            </button>
            <button
              className="btn ghost"
              onClick={clear}
              disabled={uploading && !file}
            >
              Clear
            </button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>

          {error && <div className="error">{error}</div>}

          {file && (
            <div className="file-info">
              <div className="file-name">{file.name}</div>
              <div className="file-meta">
                <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                <span>•</span>
                <span>{file.type || "unknown"}</span>
              </div>

              <div className="progress-row">
                {uploading ? (
                  <>
                    <div
                      className={`spinner ${
                        progress === -1 ? "indeterminate" : ""
                      }`}
                      aria-hidden
                    />
                    <div className="progress-text">
                      {progress === -1 ? "Starting upload..." : `${progress}%`}
                    </div>
                  </>
                ) : (
                  <div className="idle-text">Ready to upload</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="card-right" aria-live="polite">
          <h2 className="right-title">Download link</h2>

          {!result ? (
            <div className="empty">
              <svg width="80" height="80" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="currentColor"
                  d="M5 20h14v-2H5v2zm7-18L5.33 9h3.34v6h4.66V9h3.34L12 2z"
                />
              </svg>
              <p className="muted">
                No file uploaded yet. The download link will appear here.
              </p>
            </div>
          ) : (
            <div className="result">
              <a
                className="download-link"
                href={result}
                target="_blank"
                rel="noreferrer"
              >
                {file.name}
              </a>
              <div className="result-actions">
                <button
                  className="btn small"
                  onClick={() => window.open(result, "_blank")}
                >
                  Open
                </button>
                <button className="btn small" onClick={copyLink}>
                  Copy link
                </button>
                <button
                  className="btn small danger"
                  onClick={() => {
                    setResult("");
                    setFile(null);
                  }}
                >
                  Remove
                </button>
              </div>

              <div className="share-note">
                Tip: create a short URL or set an expiry on the backend for
                better privacy.
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="footer">Built with ❤️ · By Akarsh</footer>
    </div>
  );
}
