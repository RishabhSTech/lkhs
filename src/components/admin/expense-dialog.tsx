"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ExpenseForm } from "@/components/admin/expense-form";

type Category = {
  id: string;
  name: string;
  group: string;
  isRefundableDeposit: boolean;
};

export function ExpenseDialog({
  property,
  categories,
}: {
  property: { id: string; name: string };
  categories: Category[];
}) {
  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus />
        Add expense
      </DialogTrigger>
      <DialogContent className="max-h-[92svh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add an expense</DialogTitle>
          <DialogDescription>
            Record a cost against {property.name} and reflect it in the property
            finance immediately.
          </DialogDescription>
        </DialogHeader>
        <ExpenseForm
          properties={[property]}
          categories={categories}
          defaultPropertyId={property.id}
          redirectTo={`/admin/finance/property/${property.id}`}
        />
      </DialogContent>
    </Dialog>
  );
}