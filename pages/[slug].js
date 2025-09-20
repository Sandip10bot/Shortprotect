import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function RedirectPage() {
  const router = useRouter();
  const { slug } = router.query;
  const [status, setStatus] = useState("Checking...");

  useEffect(() => {
    if (!slug) return;

    const ref = document.referrer;
    if (ref && !ref.includes(window.location.hostname)) {
      setStatus("🚫 Bypass Detected");
      return;
    }

    fetch(`/api/getUrl?slug=${slug}`)
      .then(res => res.json())
      .then(data => {
        if (data.url) {
          setStatus("Redirecting...");
          setTimeout(() => window.location.href = data.url, 1000);
        } else {
          setStatus("❌ Invalid or expired link");
        }
      })
      .catch(() => setStatus("❌ Error fetching URL"));
  }, [slug]);

  return (
    <div style={{ textAlign: "center", marginTop: "50px", fontSize: "20px" }}>
      {status}
    </div>
  );
}
