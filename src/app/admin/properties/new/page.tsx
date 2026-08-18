import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminPage, PageHeader } from "@/components/admin/page-header";
import { PropertyForm } from "@/components/admin/property-form";

export default function NewPropertyPage() {
  return (
    <AdminPage>
      <Link
        href="/admin/properties"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-brand-blue"
      >
        <ArrowLeft className="size-4" />
        Back to properties
      </Link>

      <div className="mt-4">
        <PageHeader
          title="Add a property"
          description="Core details first — photos, amenities and pricing rules come after, from the listing editor."
        />
      </div>

      <div className="mt-6 max-w-3xl">
        <PropertyForm />
      </div>
    </AdminPage>
  );
}
