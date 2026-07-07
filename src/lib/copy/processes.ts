import type { CopyFragment } from "./types";

/**
 * Copy for the processes area. Each entry: a stable namespaced key, the English
 * default (source of truth), the editor group + a human label. Migration adds
 * entries here; render sites call t("<key>"). Keys MUST be globally unique.
 */
export const processesCopy: CopyFragment = [
  // ---- Page header ----
  { key: "processes.eyebrow", default: "Operations", group: "Processes", label: "Page eyebrow" },
  { key: "processes.title", default: "Processes", group: "Processes", label: "Page title" },
  {
    key: "processes.subtitle",
    default:
      "Turn raw material into finished product in-house — records the yield and moves stock (raw out, processed in). Optional cost posting to Expenses.",
    group: "Processes",
    label: "Page subtitle",
    multiline: true,
  },

  // ---- KPIs ----
  { key: "processes.kpi.active", default: "Active", group: "Processes", label: "KPI: Active label" },
  { key: "processes.kpi.activeSub", default: "planned + in progress", group: "Processes", label: "KPI: Active sub" },
  { key: "processes.kpi.overdue", default: "Overdue", group: "Processes", label: "KPI: Overdue label" },
  { key: "processes.kpi.overdueSub", default: "past expected ready date", group: "Processes", label: "KPI: Overdue sub" },
  { key: "processes.kpi.pipeline", default: "Est. cost in pipeline", group: "Processes", label: "KPI: Pipeline label" },
  { key: "processes.kpi.pipelineSub", default: "active processes", group: "Processes", label: "KPI: Pipeline sub" },
  { key: "processes.kpi.spent", default: "Spent this month", group: "Processes", label: "KPI: Spent label" },
  { key: "processes.kpi.spentSub", default: "completed, actual cost", group: "Processes", label: "KPI: Spent sub" },

  // ---- Empty state ----
  {
    key: "processes.empty.line1",
    default: "Nothing yet — record a transformation when raw material is worked into finished product.",
    group: "Processes",
    label: "Empty state, line 1",
    multiline: true,
  },
  {
    key: "processes.empty.line2",
    default: "Recording one moves stock: raw out, processed in.",
    group: "Processes",
    label: "Empty state, line 2",
    multiline: true,
  },

  // ---- Table column headers ----
  { key: "processes.col.process", default: "Process", group: "Processes", label: "Table column: Process" },
  { key: "processes.col.where", default: "Where", group: "Processes", label: "Table column: Where" },
  { key: "processes.col.material", default: "Material", group: "Processes", label: "Table column: Material" },
  { key: "processes.col.expectedReady", default: "Expected ready", group: "Processes", label: "Table column: Expected ready" },
  { key: "processes.col.status", default: "Status", group: "Processes", label: "Table column: Status" },
  { key: "processes.col.cost", default: "Cost", group: "Processes", label: "Table column: Cost" },

  // ---- Table cell labels ----
  { key: "processes.cell.from", default: "from", group: "Processes", label: "Row: “from <store>” prefix" },
  { key: "processes.cell.late", default: " · late", group: "Processes", label: "Row: late suffix on expected date" },
  { key: "processes.cell.done", default: "done", group: "Processes", label: "Row: “done <date>” prefix" },
  { key: "processes.cell.postedToExpenses", default: "posted to expenses ✓", group: "Processes", label: "Row: posted to expenses note" },

  // ---- New process form ----
  { key: "processes.form.addProcess", default: "Record transformation", group: "Processes", label: "“Record transformation” button" },
  { key: "processes.form.title", default: "Record transformation", group: "Processes", label: "Transformation form title" },

  { key: "processes.form.name.label", default: "What's being done", group: "Processes", label: "Field: name label" },
  { key: "processes.form.name.hint", default: "e.g. Fillet cutting — Batch 12", group: "Processes", label: "Field: name hint" },
  { key: "processes.form.destination.label", default: "Where / by whom", group: "Processes", label: "Field: destination label" },
  { key: "processes.form.destination.hint", default: "vendor or facility", group: "Processes", label: "Field: destination hint" },
  { key: "processes.form.material.label", default: "Material sent", group: "Processes", label: "Field: material label" },
  { key: "processes.form.material.hint", default: "optional free text", group: "Processes", label: "Field: material hint" },
  { key: "processes.form.item.label", default: "Item", group: "Processes", label: "Field: item label" },
  { key: "processes.form.item.hint", default: "optional", group: "Processes", label: "Field: item hint" },
  { key: "processes.form.fromStore.label", default: "From store", group: "Processes", label: "Field: from store label" },
  { key: "processes.form.fromStore.hint", default: "optional", group: "Processes", label: "Field: from store hint" },
  { key: "processes.form.quantity.label", default: "Quantity", group: "Processes", label: "Field: quantity label (unit appended)" },
  { key: "processes.form.quantity.hint", default: "optional", group: "Processes", label: "Field: quantity hint" },
  { key: "processes.form.turnaround.label", default: "Expected turnaround (days)", group: "Processes", label: "Field: turnaround label" },
  { key: "processes.form.turnaround.hint", default: "sets the ETA", group: "Processes", label: "Field: turnaround hint" },
  { key: "processes.form.estimatedCost.label", default: "Estimated cost", group: "Processes", label: "Field: estimated cost label" },
  { key: "processes.form.estimatedCost.hint", default: "optional", group: "Processes", label: "Field: estimated cost hint" },
  { key: "processes.form.notes.label", default: "Notes", group: "Processes", label: "Field: notes label" },
  { key: "processes.form.notes.hint", default: "optional", group: "Processes", label: "Field: notes hint" },

  { key: "processes.form.startNow", default: "Material already sent — start as “in progress”", group: "Processes", label: "Start-now checkbox label" },
  { key: "processes.form.cancel", default: "Cancel", group: "Processes", label: "New form: Cancel button" },
  { key: "processes.form.saving", default: "Saving…", group: "Processes", label: "New form: saving state" },
  { key: "processes.form.save", default: "Save process", group: "Processes", label: "New form: Save button" },

  // ---- Row actions ----
  { key: "processes.actions.actualCostPlaceholder", default: "actual cost", group: "Processes", label: "Actual cost input placeholder" },
  {
    key: "processes.actions.postToExpensesTitle",
    default: "Creates an expense entry under the Processing category",
    group: "Processes",
    label: "Post-to-expenses tooltip",
  },
  { key: "processes.actions.postToExpenses", default: "post to expenses", group: "Processes", label: "Post-to-expenses checkbox label" },
  { key: "processes.actions.done", default: "✓ Done", group: "Processes", label: "Complete: Done button" },
  { key: "processes.actions.back", default: "back", group: "Processes", label: "Complete: back button" },
  { key: "processes.actions.start", default: "▸ Start", group: "Processes", label: "Row: Start button" },
  { key: "processes.actions.complete", default: "✓ Complete", group: "Processes", label: "Row: Complete button" },

  // ---- Cost chip ----
  { key: "processes.cost.actual", default: "actual", group: "Processes", label: "Cost chip: actual prefix" },
  { key: "processes.cost.est", default: "est.", group: "Processes", label: "Cost chip: estimate prefix" },

  // ---- Transformation KPIs (redesigned page) ----
  { key: "processes.kpi.processedMonth", default: "Processed this month", group: "Processes", label: "KPI: processed kg" },
  { key: "processes.kpi.processedMonthSub", default: "output, completed", group: "Processes", label: "KPI: processed sub" },
  { key: "processes.kpi.yield", default: "Avg yield", group: "Processes", label: "KPI: yield" },
  { key: "processes.kpi.yieldSub", default: "output ÷ input", group: "Processes", label: "KPI: yield sub" },
  { key: "processes.kpi.loss", default: "Loss this month", group: "Processes", label: "KPI: loss" },
  { key: "processes.kpi.lossSub", default: "input − output", group: "Processes", label: "KPI: loss sub" },
  { key: "processes.kpi.legacyActive", default: "Sent-out active", group: "Processes", label: "KPI: legacy active" },
  { key: "processes.kpi.legacyActiveSub", default: "vendor jobs open", group: "Processes", label: "KPI: legacy active sub" },

  // ---- Transformation table columns ----
  { key: "processes.col.when", default: "When", group: "Processes", label: "Table column: When" },
  { key: "processes.col.store", default: "Store", group: "Processes", label: "Table column: Store" },
  { key: "processes.col.transformation", default: "Transformation", group: "Processes", label: "Table column: Transformation" },
  { key: "processes.col.inOut", default: "In / Out", group: "Processes", label: "Table column: In/Out" },
  { key: "processes.col.lossYield", default: "Loss / Yield", group: "Processes", label: "Table column: Loss/Yield" },
  { key: "processes.col.applied", default: "Applied", group: "Processes", label: "Table column: Applied types" },
  { key: "processes.chip.legacy", default: "sent out", group: "Processes", label: "Legacy record chip" },

  // ---- Transformation form ----
  { key: "processes.form.record", default: "Record transformation", group: "Processes", label: "Transformation form: submit" },
  { key: "processes.form.store.label", default: "Store", group: "Processes", label: "Transformation: store label" },
  { key: "processes.form.store.hint", default: "where the work happens", group: "Processes", label: "Transformation: store hint" },
  { key: "processes.form.selectStore", default: "— select store —", group: "Processes", label: "Transformation: store placeholder" },
  { key: "processes.form.inputItem.label", default: "Raw item (in)", group: "Processes", label: "Transformation: input item label" },
  { key: "processes.form.inputItem.hint", default: "raw material", group: "Processes", label: "Transformation: input item hint" },
  { key: "processes.form.selectRaw", default: "— select raw —", group: "Processes", label: "Transformation: raw placeholder" },
  { key: "processes.form.inputKg.label", default: "Input", group: "Processes", label: "Transformation: input kg label" },
  { key: "processes.form.outputItem.label", default: "Processed item (out)", group: "Processes", label: "Transformation: output item label" },
  { key: "processes.form.outputItem.hint", default: "finished product", group: "Processes", label: "Transformation: output item hint" },
  { key: "processes.form.selectProcessed", default: "— select processed —", group: "Processes", label: "Transformation: processed placeholder" },
  { key: "processes.form.outputKg.label", default: "Output", group: "Processes", label: "Transformation: output kg label" },
  { key: "processes.form.types.label", default: "Processes applied", group: "Processes", label: "Transformation: types label" },
  { key: "processes.form.types.hint", default: "only what this store can do", group: "Processes", label: "Transformation: types hint" },
  { key: "processes.form.types.pickStoreFirst", default: "pick a store first", group: "Processes", label: "Transformation: types disabled reason" },
  { key: "processes.form.onHand", default: "on hand:", group: "Processes", label: "Transformation: on-hand prefix" },
  { key: "processes.form.loss", default: "Loss", group: "Processes", label: "Transformation: loss label" },
  { key: "processes.form.yield", default: "Yield", group: "Processes", label: "Transformation: yield label" },
  { key: "processes.form.effect.rawOut", default: "Raw out", group: "Processes", label: "Transformation: raw out" },
  { key: "processes.form.effect.processedIn", default: "Processed in", group: "Processes", label: "Transformation: processed in" },
  { key: "processes.form.postCost", default: "Post cost to expenses", group: "Processes", label: "Transformation: post cost checkbox" },
  { key: "processes.form.costPlaceholder", default: "cost", group: "Processes", label: "Transformation: cost placeholder" },
];
