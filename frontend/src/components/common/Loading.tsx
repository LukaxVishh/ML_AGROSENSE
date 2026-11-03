import { LoaderCircle } from "lucide-react";
export function Loading({
  message = "Preparando sua área de análise…",
}: {
  message?: string;
}) {
  return (
    <div className="empty" role="status">
      <LoaderCircle className="spin" />
      <p>{message}</p>
    </div>
  );
}
