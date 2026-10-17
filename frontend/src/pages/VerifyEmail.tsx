import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { verifyEmail } from "@/lib/api";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setMessage("No verification token provided.");
      return;
    }

    verifyEmail(token)
      .then((res) => {
        setStatus("success");
        setMessage(res.data.message);
        setTimeout(() => navigate("/login"), 3000);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err.response?.data?.detail || "Verification failed.");
      });
  }, [searchParams, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="mb-4 text-2xl font-bold text-primary">DocNest</h1>
        {status === "loading" && <p className="text-gray-500">Verifying your email...</p>}
        {status === "success" && (
          <>
            <p className="text-green-600">{message}</p>
            <p className="mt-2 text-sm text-gray-400">Redirecting to login...</p>
          </>
        )}
        {status === "error" && (
          <>
            <p className="text-red-600">{message}</p>
            <a href="/login" className="mt-4 inline-block text-sm text-primary hover:underline">
              Go to login
            </a>
          </>
        )}
      </div>
    </div>
  );
}
