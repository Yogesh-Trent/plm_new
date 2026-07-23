"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Stack } from "@phosphor-icons/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  OperationalContent,
  OperationalHeader,
  OperationalPage,
  OperationalPanel,
  OperationalState,
  OperationalTableRegion,
} from "@/app/components/OperationalWorkspace";
import { FieldError } from "@/app/components/RecordWorkspace";

type Bom = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  status: string;
  created_by: string | null;
  line_count: number;
  combo_count: number;
};

const bomFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a BOM name.")
    .max(120, "Keep the BOM name under 120 characters."),
  description: z
    .string()
    .trim()
    .max(280, "Keep the description under 280 characters."),
});

type BomFormValues = z.infer<typeof bomFormSchema>;

export function BomsList({ initialBoms }: { initialBoms: Bom[] }) {
  const router = useRouter();
  const boms = initialBoms;
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BomFormValues>({
    resolver: zodResolver(bomFormSchema),
    mode: "onBlur",
    defaultValues: { name: "", description: "" },
  });

  const create = async (values: BomFormValues) => {
    setError("");
    try {
      const response = await fetch("/api/boms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name.trim(),
          description: values.description.trim(),
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Could not create BOM.");
      reset();
      toast.success("BOM created", {
        description: `${values.name.trim()} is ready for material lines.`,
      });
      router.push(`/boms/${data.bom.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create BOM.");
    }
  };

  return (
    <OperationalPage>
      <OperationalHeader
        eyebrow="Materials engineering"
        title="BOM library"
        description="Reuse controlled material structures across styles and colourways."
        actions={
          <button
            className="primary-button"
            onClick={() => setAdding((value) => !value)}
          >
            <Plus size={16} /> New BOM
          </button>
        }
      />

      <OperationalContent>
        {adding && (
          <section className="season-create">
            <h2>New BOM</h2>
            <form onSubmit={handleSubmit(create)} noValidate>
              <div className="season-fields">
                <label className="season-field">
                  <span>BOM name *</span>
                  <input
                    {...register("name")}
                    placeholder="e.g. Menswear Core BOM"
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={
                      errors.name ? "bom-name-error" : undefined
                    }
                  />
                  <FieldError
                    id="bom-name-error"
                    message={errors.name?.message}
                  />
                </label>
                <label className="season-field">
                  <span>Description</span>
                  <input
                    {...register("description")}
                    placeholder="Optional"
                    aria-invalid={Boolean(errors.description)}
                    aria-describedby={
                      errors.description ? "bom-description-error" : undefined
                    }
                  />
                  <FieldError
                    id="bom-description-error"
                    message={errors.description?.message}
                  />
                </label>
              </div>
              {error && (
                <p className="login-error" role="alert">
                  {error}
                </p>
              )}
              <div className="season-actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setAdding(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating…" : "Create & open"}
                </button>
              </div>
            </form>
          </section>
        )}

        <OperationalPanel title="Bills of materials" count={boms.length}>
          {boms.length === 0 ? (
            <OperationalState
              kind="empty"
              title="No BOMs yet"
              detail="Create the first controlled material structure for reuse across products."
            />
          ) : (
            <OperationalTableRegion>
              <table className="season-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Lines</th>
                    <th>Combos</th>
                    <th>Status</th>
                    <th>Created by</th>
                  </tr>
                </thead>
                <tbody>
                  {boms.map((bom) => (
                    <tr key={bom.id}>
                      <td>{bom.code || "—"}</td>
                      <td className="season-name-cell">
                        <Link
                          href={`/boms/${bom.id}`}
                          className="style-name-link"
                        >
                          {bom.name}
                        </Link>
                      </td>
                      <td>{bom.description || "—"}</td>
                      <td>
                        <span className="combo-count-pill">
                          {bom.line_count}
                        </span>
                      </td>
                      <td>
                        <span className="season-styles">
                          <Stack size={14} /> {bom.combo_count}
                        </span>
                      </td>
                      <td>
                        <span
                          className={
                            bom.status === "active"
                              ? "status-pill is-active"
                              : "status-pill is-inactive"
                          }
                        >
                          <span className="status-dot" />
                          {bom.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>{bom.created_by || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </OperationalTableRegion>
          )}
        </OperationalPanel>
      </OperationalContent>
    </OperationalPage>
  );
}
