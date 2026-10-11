import Link from "next/link";
import { Lock } from "lucide-react";
import { EmptyState } from "@/components/page-header";
import { buttonClasses } from "@/components/ui/button";

/** Shown to Tech when they open a project that Product hasn't handed to them. */
export function NotWithTech() {
  return (
    <div className="py-10">
      <EmptyState icon={Lock} title="This project isn't with Tech">
        Tech sees a project once Product hands development over, until it goes live.
        <div className="mt-4">
          <Link href="/projects" className={buttonClasses("secondary")}>
            See your projects
          </Link>
        </div>
      </EmptyState>
    </div>
  );
}
