import { redirect } from "next/navigation";

/** Old entry point - the form now opens as a sheet over the expenses list. */
export default async function NewExpensePage({
  searchParams,
}: PageProps<"/admin/finance/expenses/new">) {
  const params = await searchParams;
  const property = typeof params.property === "string" ? `&property=${encodeURIComponent(params.property)}` : "";
  redirect(`/admin/finance/expenses?add=1${property}`);
}
