"use client";

import { useState, useTransition } from "react";
import { Card, Chip } from "@/components/ui";
import { createRole, saveRolePermissions, deleteRole } from "./actions";
import type { RoleDef, PermLevel } from "@/lib/roles";

const LEVELS: { key: PermLevel; label: string }[] = [
  { key: "none", label: "None" },
  { key: "view", label: "View" },
  { key: "edit", label: "Edit" },
];

/** Segmented none/view/edit control for one page row. */
function LevelPicker({
  value,
  onChange,
  testid,
}: {
  value: PermLevel;
  onChange: (v: PermLevel) => void;
  testid?: string;
}) {
  return (
    <div className="flex gap-1" data-testid={testid}>
      {LEVELS.map((l) => {
        const active = value === l.key;
        return (
          <button
            key={l.key}
            type="button"
            onClick={() => onChange(l.key)}
            className={`rounded-md px-2.5 py-1 text-[12px] font-semibold transition-colors ${
              active ? "text-on-accent" : "border border-hair bg-card text-muted hover:bg-card2"
            }`}
            style={active ? { background: "var(--accent)" } : undefined}
          >
            {l.label}
          </button>
        );
      })}
    </div>
  );
}

/** The per-page permission matrix, shared by the create panel + each role card. */
function PermMatrix({
  pages,
  pageLabels,
  perms,
  setPerms,
  idPrefix,
}: {
  pages: string[];
  pageLabels: Record<string, string>;
  perms: Record<string, PermLevel>;
  setPerms: (patch: Record<string, PermLevel>) => void;
  idPrefix: string;
}) {
  return (
    <div className="divide-y divide-row overflow-x-auto rounded-lg border border-hair2">
      {pages.map((page) => (
        <div key={page} className="flex min-w-[320px] items-center justify-between gap-3 px-3 py-2">
          <span className="text-[13px] text-text">{pageLabels[page] ?? page}</span>
          <LevelPicker
            testid={`${idPrefix}-${page}`}
            value={perms[page] ?? "none"}
            onChange={(v) => setPerms({ ...perms, [page]: v })}
          />
        </div>
      ))}
    </div>
  );
}

export default function RolesManager({
  roles,
  userCounts,
  pages,
  pageLabels,
}: {
  roles: RoleDef[];
  userCounts: Record<string, number>;
  pages: string[];
  pageLabels: Record<string, string>;
}) {
  const builtins = roles.filter((r) => r.isSystem);
  const custom = roles.filter((r) => !r.isSystem);

  return (
    <div className="space-y-5">
      <CreateRoleCard pages={pages} pageLabels={pageLabels} />

      <div className="space-y-3">
        <h2 className="font-serif text-[17px] font-semibold text-ink">Built-in roles</h2>
        {builtins.map((r) => (
          <RoleCard key={r.key} role={r} userCount={userCounts[r.key] ?? 0} pages={pages} pageLabels={pageLabels} />
        ))}
      </div>

      {custom.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-serif text-[17px] font-semibold text-ink">Custom roles</h2>
          {custom.map((r) => (
            <RoleCard key={r.key} role={r} userCount={userCounts[r.key] ?? 0} pages={pages} pageLabels={pageLabels} />
          ))}
        </div>
      )}
    </div>
  );
}

function CreateRoleCard({
  pages,
  pageLabels,
}: {
  pages: string[];
  pageLabels: Record<string, string>;
}) {
  const [name, setName] = useState("");
  const [perms, setPerms] = useState<Record<string, PermLevel>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    if (!name.trim()) return setError("Give the role a name.");
    startTransition(async () => {
      try {
        await createRole(name.trim(), perms);
        setName("");
        setPerms({});
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not create the role.");
      }
    });
  };

  return (
    <Card className="p-4">
      <h2 className="mb-3 font-serif text-[17px] font-semibold text-ink">Create a role</h2>
      <label className="mb-3 block">
        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-faint2">
          Role name
        </span>
        <input
          className="input w-full max-w-sm"
          data-testid="role-new-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Stock viewer"
        />
      </label>
      <PermMatrix pages={pages} pageLabels={pageLabels} perms={perms} setPerms={setPerms} idPrefix="role-new" />
      {error && <p className="mt-2 text-[12.5px] text-neg">{error}</p>}
      <button
        onClick={submit}
        disabled={pending}
        data-testid="role-new-create"
        className="mt-3 rounded-lg px-4 py-2 text-sm font-semibold text-on-accent disabled:opacity-50"
        style={{ background: "var(--accent)" }}
      >
        {pending ? "Creating…" : "Create role"}
      </button>
    </Card>
  );
}

function RoleCard({
  role,
  userCount,
  pages,
  pageLabels,
}: {
  role: RoleDef;
  userCount: number;
  pages: string[];
  pageLabels: Record<string, string>;
}) {
  const [name, setName] = useState(role.name);
  const [perms, setPerms] = useState<Record<string, PermLevel>>(role.permissions);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const save = () => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await saveRolePermissions(role.key, name.trim(), perms);
        setSaved(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save changes.");
      }
    });
  };

  const remove = () => {
    if (!confirm(`Delete the role "${role.name}"? This can't be undone.`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteRole(role.key);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not delete the role.");
      }
    });
  };

  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {role.isSystem ? (
            <span className="text-[15px] font-semibold text-ink">{role.name}</span>
          ) : (
            <input
              className="input !w-auto"
              data-testid={`role-${role.key}-name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
          {role.isSystem && <Chip tone="neutral">built-in</Chip>}
        </div>
        <span className="text-[12px] text-muted">
          {userCount} user{userCount === 1 ? "" : "s"}
        </span>
      </div>

      <PermMatrix
        pages={pages}
        pageLabels={pageLabels}
        perms={perms}
        setPerms={setPerms}
        idPrefix={`role-${role.key}`}
      />

      {error && <p className="mt-2 text-[12.5px] text-neg">{error}</p>}

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={save}
          disabled={pending}
          data-testid={`role-${role.key}-save`}
          className="rounded-lg px-3.5 py-2 text-sm font-semibold text-on-accent disabled:opacity-50"
          style={{ background: "var(--accent)" }}
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {saved && !pending && <span className="text-[12px] text-pos">Saved</span>}
        {!role.isSystem && (
          <button
            onClick={remove}
            disabled={pending}
            data-testid={`role-${role.key}-delete`}
            className="rounded-lg border border-hair bg-card px-3.5 py-2 text-sm font-semibold text-neg transition-colors hover:bg-card2 disabled:opacity-50"
          >
            Delete
          </button>
        )}
      </div>
    </Card>
  );
}
