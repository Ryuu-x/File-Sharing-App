import axios from "axios";
import { toast } from "react-hot-toast";

export const uploadFile = async (data) => {
  try {
    const response = await axios.post(
      `${process.env.REACT_APP_API_URL}/upload`,
      data
    );
    return response.data;
  } catch (err) {
    // Handle rate limit errors (429)
    if (err.response?.status === 429) {
      const retryAfter = err.response.headers["retry-after"];
      const retrySec = retryAfter
        ? Number(retryAfter)
        : err.response.data?.retryAfterSeconds || 3600; // fallback to 1 hour

      const minutes = Math.ceil(retrySec / 60);
      const message =
        err.response.data?.error ||
        "You’ve hit the upload limit. Please try again later.";

      toast.error(
        `${message} Try again in about ${minutes} minute${
          minutes > 1 ? "s" : ""
        }.`
      );
      return null; // optional: prevent further logic
    }

    // Handle other errors
    toast.error("Something went wrong while uploading. Please try again.");
    console.error("Upload error:", err);
  }
};
