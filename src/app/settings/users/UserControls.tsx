"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createUser, updateUser } from "../actions";
import { Field, EditToggle } from "../ui";
import {
  ASSIGNABLE_ROLES,
  ENTITY_ACCESS,
  REGION_SCOPES,
  type Role,
  type EntityAccess,
  type RegionScope,
} from "@/lib/enums";

export interface UserRow {
  id: string;
  name: string;
  loginId: string;
  role: string;
  entityAccess: string;
  regionScope: string;
}

interface UserValues {
  name: string;
  loginId: string;
  password: string;
  role: string;
  entityAccess: string;
  regionScope: string;
}

/** Shared field grid. In edit mode the password is optional (blank = keep). */
function UserFields({
  v,
  set,
  idPrefix,
  passwordHint,
}: {
  v: UserValues;
  set: (patch: Partial<UserValues>) => void;
  idPrefix: string;
  passwordHint: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Field label="Name">
        <input
          className="input"
          data-testid={`${idPrefix}-name`}
          value={v.name}
          onChange={(e) => set({ name: e.target.value })}
        />
      </Field>
      <Field label="Login ID">
        <input
          className="input"
          data-testid={`${idPrefix}-loginid`}
          value={v.loginId}
          onChange={(e) => set({ loginId: e.target.value })}
        />
      </Field>
      <Field label="Password" hint={passwordHint}>
        <input
          className="input"
          type="password"
          autoComplete="new-password"
          data-testid={`${idPrefix}-password`}
          value={v.password}
          onChange={(e) => set({ password: e.target.value })}
        />
      </Field>
      <Field label="Role">
        <select
          className="input"
          data-testid={`${idPrefix}-role`}
          value={v.role}
          onChange={(e) => set({ role: e.target.value })}
        >
          {ASSIGNABLE_ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Book access">
        <select
          className="input"
          data-testid={`${idPrefix}-access`}
          value={v.entityAccess}
          onChange={(e) => set({ entityAccess: e.target.value })}
        >
          {ENTITY_ACCESS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Region scope">
        <select
          className="input"
          data-testid={`${idPrefix}-region`}
          value={v.regionScope}
          onChange={(e) => set({ regionScope: e.target.value })}
        >
          {REGION_SCOPES.map((rs) => (
            <option key={rs} value={rs}>
              {rs}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}

const EMPTY: UserValues = {
  name: "",
  loginId: "",
  password: "",
  role: "north_employee",
  entityAccess: "cstar",
  regionScope: "all",
};

export function AddUserForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [v, setV] = useState<UserValues>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const set = (patch: Partial<UserValues>) => setV((prev) => ({ ...prev, ...patch }));
  const canSubmit =
    !!v.name.trim() &&
    !!v.loginId.trim() &&
    v.password.trim().length >= 4 &&
    !isPending;

  function submit() {
    setError(null);
    setOk(false);
    startTransition(async () => {
      try {
        await createUser({
          name: v.name.trim(),
          loginId: v.loginId.trim(),
          password: v.password,
          role: v.role as Role,
          entityAccess: v.entityAccess as EntityAccess,
          regionScope: v.regionScope as RegionScope,
        });
        setV(EMPTY);
        setOk(true);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <div className="space-y-3">
      <UserFields
        v={v}
        set={set}
        idPrefix="user-add"
        passwordHint="min 4 chars — hashed on save"
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          data-testid="user-add-submit"
          className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold text-on-accent transition-colors disabled:opacity-40"
          style={{ background: "var(--accent)" }}
        >
          {isPending ? "Adding…" : "+ Add user"}
        </button>
        {ok && <span className="text-xs font-medium text-pos">✓ Saved.</span>}
        {error && <span className="text-xs text-neg">{error}</span>}
      </div>
    </div>
  );
}

function EditUserForm({ user, onDone }: { user: UserRow; onDone: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [v, setV] = useState<UserValues>({
    name: user.name,
    loginId: user.loginId,
    password: "",
    role: user.role,
    entityAccess: user.entityAccess,
    regionScope: user.regionScope,
  });
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<UserValues>) => setV((prev) => ({ ...prev, ...patch }));
  const canSubmit = !!v.name.trim() && !!v.loginId.trim() && !isPending;

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await updateUser({
          id: user.id,
          name: v.name.trim(),
          loginId: v.loginId.trim(),
          // blank password → server keeps the existing hash
          password: v.password.trim() || undefined,
          role: v.role as Role,
          entityAccess: v.entityAccess as EntityAccess,
          regionScope: v.regionScope as RegionScope,
        });
        router.refresh();
        onDone();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <div className="space-y-3">
      <UserFields
        v={v}
        set={set}
        idPrefix={`user-edit-${user.id}`}
        passwordHint="leave blank to keep current"
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          data-testid={`user-edit-save-${user.id}`}
          className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold text-on-accent transition-colors disabled:opacity-40"
          style={{ background: "var(--accent)" }}
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        {error && <span className="text-xs text-neg">{error}</span>}
      </div>
    </div>
  );
}

export function UserList({ users }: { users: UserRow[] }) {
  if (users.length === 0) {
    return <p className="text-sm text-faint">No users yet — add one below.</p>;
  }
  return (
    <ul className="divide-y divide-row">
      {users.map((u) => (
        <li key={u.id} data-testid={`user-row-${u.id}`}>
          <EditToggle
            testId={`user-${u.id}`}
            summary={
              <div>
                <div className="font-medium text-ink">
                  {u.name}{" "}
                  <span className="font-normal text-faint">@{u.loginId}</span>
                </div>
                <div className="text-xs text-faint">
                  {[u.role, `access ${u.entityAccess}`, `region ${u.regionScope}`].join(
                    " · ",
                  )}
                </div>
              </div>
            }
          >
            {(close) => <EditUserForm user={u} onDone={close} />}
          </EditToggle>
        </li>
      ))}
    </ul>
  );
}
