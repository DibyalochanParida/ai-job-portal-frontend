import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { EmptyState } from "../components/ui";

export function NotFoundPage() {
  return (
    <EmptyState icon={<Compass className="size-5" />} title="Page not found" action={<Link to="/" className="text-sm font-medium text-accent hover:underline">Go home</Link>}>
      The page you're looking for doesn't exist or has moved.
    </EmptyState>
  );
}
