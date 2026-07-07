import type { CopyFragment } from "./types";

/**
 * Copy for the shipments area. Each entry: a stable namespaced key, the English
 * default (source of truth), the editor group + a human label. Migration adds
 * entries here; render sites call t("<key>"). Keys MUST be globally unique.
 */
export const shipmentsCopy: CopyFragment = [
  /* ---------- Shipments list page ---------- */
  { key: "shipments.eyebrow", default: "Operations", group: "Shipments", label: "List page eyebrow" },
  { key: "shipments.title", default: "Shipments", group: "Shipments", label: "List page title" },
  { key: "shipments.newButton", default: "+ New shipment", group: "Shipments", label: "‘New shipment’ button" },
  { key: "shipments.emptyLead", default: "No shipments yet.", group: "Shipments", label: "Empty-state lead text" },
  { key: "shipments.emptyCreateLink", default: "Create one →", group: "Shipments", label: "Empty-state create link" },

  /* ---------- New shipment page ---------- */
  { key: "shipments.new.eyebrow", default: "Operations", group: "Shipments — New", label: "New page eyebrow" },
  { key: "shipments.new.title", default: "New shipment", group: "Shipments — New", label: "New page title" },
  {
    key: "shipments.new.subtitle",
    default:
      "Track a parcel from an origin to a destination city. Cities feed the dashboard map; departure and ETA drive the “in 2 days / overdue” hints.",
    group: "Shipments — New",
    label: "New page subtitle",
    multiline: true,
  },
  { key: "shipments.new.backLink", default: "← Shipments", group: "Shipments — New", label: "Back link" },

  /* ---------- New shipment form ---------- */
  { key: "shipments.form.originHeading", default: "Origin", group: "Shipments — Form", label: "Origin section heading" },
  { key: "shipments.form.fromStore", default: "From store", group: "Shipments — Form", label: "‘From store’ field label" },
  { key: "shipments.form.fromStoreHint", default: "auto-fills name & city", group: "Shipments — Form", label: "‘From store’ field hint" },
  { key: "shipments.form.optionNone", default: "— none —", group: "Shipments — Form", label: "Select ‘none’ option" },
  { key: "shipments.form.originName", default: "Origin name", group: "Shipments — Form", label: "‘Origin name’ field label" },
  { key: "shipments.form.originNamePlaceholder", default: "e.g. Karachi — Own Store", group: "Shipments — Form", label: "‘Origin name’ placeholder" },
  { key: "shipments.form.originCity", default: "Origin city", group: "Shipments — Form", label: "‘Origin city’ field label" },
  { key: "shipments.form.destHeading", default: "Destination", group: "Shipments — Form", label: "Destination section heading" },
  { key: "shipments.form.destName", default: "Destination name", group: "Shipments — Form", label: "‘Destination name’ field label" },
  { key: "shipments.form.destNameHint", default: "optional", group: "Shipments — Form", label: "‘Destination name’ field hint" },
  { key: "shipments.form.destNamePlaceholder", default: "e.g. Lahore — PC Lahore warehouse", group: "Shipments — Form", label: "‘Destination name’ placeholder" },
  { key: "shipments.form.destCity", default: "Destination city", group: "Shipments — Form", label: "‘Destination city’ field label" },

  // Inter-store transfer section (shipmentType = inter_store)
  { key: "shipments.form.transferHeading", default: "Inter-store transfer", group: "Shipments — Form", label: "Transfer section heading" },
  { key: "shipments.form.destStore", default: "Destination store", group: "Shipments — Form", label: "Destination store field label" },
  { key: "shipments.form.destStoreHint", default: "auto-fills name & city", group: "Shipments — Form", label: "Destination store hint" },
  { key: "shipments.form.transferItem", default: "Item to transfer", group: "Shipments — Form", label: "Transfer item label" },
  { key: "shipments.form.transferKg", default: "Weight", group: "Shipments — Form", label: "Transfer weight label" },
  { key: "shipments.form.natureRaw", default: "Raw", group: "Shipments — Form", label: "Item optgroup — raw" },
  { key: "shipments.form.natureProcessed", default: "Processed", group: "Shipments — Form", label: "Item optgroup — processed" },
  { key: "shipments.form.applyProcess", default: "Process on arrival", group: "Shipments — Form", label: "Apply-process checkbox" },
  { key: "shipments.form.transferTypes", default: "Processes applied", group: "Shipments — Form", label: "Transfer process types label" },
  { key: "shipments.form.transferOutItem", default: "Processed item (out)", group: "Shipments — Form", label: "Transfer output item label" },
  { key: "shipments.form.transferOutKg", default: "Output weight", group: "Shipments — Form", label: "Transfer output weight label" },
  { key: "shipments.form.transferLoss", default: "Loss", group: "Shipments — Form", label: "Transfer loss label" },
  { key: "shipments.form.transferOnDelivery", default: "Stock moves when this shipment is marked delivered.", group: "Shipments — Form", label: "Transfer on-delivery note", multiline: true },

  { key: "shipments.form.scheduleHeading", default: "Schedule", group: "Shipments — Form", label: "Schedule section heading" },
  { key: "shipments.form.departure", default: "Departure", group: "Shipments — Form", label: "‘Departure’ field label" },
  { key: "shipments.form.departureNow", default: "Now", group: "Shipments — Form", label: "Departure ‘Now’ button" },
  { key: "shipments.form.eta", default: "Estimated arrival (ETA)", group: "Shipments — Form", label: "‘Estimated arrival’ field label" },
  { key: "shipments.form.detailsHeading", default: "Details", group: "Shipments — Form", label: "Details section heading" },
  { key: "shipments.form.reference", default: "Reference", group: "Shipments — Form", label: "‘Reference’ field label" },
  { key: "shipments.form.referenceHint", default: "optional label", group: "Shipments — Form", label: "‘Reference’ field hint" },
  { key: "shipments.form.referencePlaceholder", default: "e.g. TRK-Lahore-01", group: "Shipments — Form", label: "‘Reference’ placeholder" },
  { key: "shipments.form.carrier", default: "Carrier", group: "Shipments — Form", label: "‘Carrier’ field label" },
  { key: "shipments.form.carrierHint", default: "transport company / truck", group: "Shipments — Form", label: "‘Carrier’ field hint" },
  { key: "shipments.form.driverName", default: "Driver name", group: "Shipments — Form", label: "‘Driver name’ field label" },
  { key: "shipments.form.driverPhone", default: "Driver phone", group: "Shipments — Form", label: "‘Driver phone’ field label" },
  { key: "shipments.form.linkInvoice", default: "Link invoice", group: "Shipments — Form", label: "‘Link invoice’ field label" },
  { key: "shipments.form.linkInvoiceHint", default: "auto-sets consignee", group: "Shipments — Form", label: "‘Link invoice’ field hint" },
  { key: "shipments.form.consignee", default: "Consignee party", group: "Shipments — Form", label: "‘Consignee party’ field label" },
  { key: "shipments.form.notes", default: "Notes", group: "Shipments — Form", label: "‘Notes’ field label" },
  { key: "shipments.form.creating", default: "Creating…", group: "Shipments — Form", label: "Submit button (pending)" },
  { key: "shipments.form.createSubmit", default: "Create shipment", group: "Shipments — Form", label: "Submit button" },

  /* ---------- Shipment detail page ---------- */
  { key: "shipments.detail.backLink", default: "← Shipments", group: "Shipments — Detail", label: "Back link" },
  { key: "shipments.detail.progressHeading", default: "Progress", group: "Shipments — Detail", label: "Progress card heading" },
  { key: "shipments.detail.delayedNotice", default: "Marked delayed — in transit but behind schedule.", group: "Shipments — Detail", label: "Delayed notice" },
  { key: "shipments.detail.cancelledNotice", default: "This shipment was cancelled.", group: "Shipments — Detail", label: "Cancelled notice" },
  { key: "shipments.detail.detailsHeading", default: "Details", group: "Shipments — Detail", label: "Details card heading" },
  { key: "shipments.detail.factDeparture", default: "Departure", group: "Shipments — Detail", label: "‘Departure’ fact label" },
  { key: "shipments.detail.factEta", default: "ETA", group: "Shipments — Detail", label: "‘ETA’ fact label" },
  { key: "shipments.detail.factDeliveredAt", default: "Delivered at", group: "Shipments — Detail", label: "‘Delivered at’ fact label" },
  { key: "shipments.detail.factCarrier", default: "Carrier", group: "Shipments — Detail", label: "‘Carrier’ fact label" },
  { key: "shipments.detail.factDriver", default: "Driver", group: "Shipments — Detail", label: "‘Driver’ fact label" },
  { key: "shipments.detail.factOriginStore", default: "Origin store", group: "Shipments — Detail", label: "‘Origin store’ fact label" },
  { key: "shipments.detail.factConsignee", default: "Consignee", group: "Shipments — Detail", label: "‘Consignee’ fact label" },
  { key: "shipments.detail.factLinkedInvoice", default: "Linked invoice", group: "Shipments — Detail", label: "‘Linked invoice’ fact label" },
  { key: "shipments.detail.notesLabel", default: "Notes", group: "Shipments — Detail", label: "Notes label" },

  /* ---------- Shipment detail — controls ---------- */
  { key: "shipments.controls.heading", default: "Actions", group: "Shipments — Controls", label: "Actions card heading" },
  { key: "shipments.controls.setStatus", default: "Set status", group: "Shipments — Controls", label: "‘Set status’ label" },
  { key: "shipments.controls.updateEta", default: "Update ETA", group: "Shipments — Controls", label: "‘Update ETA’ label" },
  { key: "shipments.controls.saving", default: "Saving…", group: "Shipments — Controls", label: "Save ETA button (pending)" },
  { key: "shipments.controls.saveEta", default: "Save ETA", group: "Shipments — Controls", label: "Save ETA button" },
  { key: "shipments.controls.etaUpdated", default: "ETA updated", group: "Shipments — Controls", label: "ETA-updated toast" },

  /* ---------- Shipment tracker (map + rail) ---------- */
  { key: "shipments.tracker.mapAriaLabel", default: "Shipment tracker map of Pakistan", group: "Shipments — Tracker", label: "Map aria-label" },
  { key: "shipments.tracker.viewDetails", default: "View details →", group: "Shipments — Tracker", label: "Detail card ‘View details’ link" },
  { key: "shipments.tracker.delivered", default: "Delivered", group: "Shipments — Tracker", label: "Detail card ‘Delivered’ label" },
  { key: "shipments.tracker.eta", default: "ETA", group: "Shipments — Tracker", label: "Detail card ‘ETA’ label" },
  { key: "shipments.tracker.legendHint", default: "click a route or row to inspect", group: "Shipments — Tracker", label: "Legend hint text" },
  { key: "shipments.tracker.filterActive", default: "Active", group: "Shipments — Tracker", label: "‘Active’ filter" },
  { key: "shipments.tracker.filterDelivered", default: "Delivered", group: "Shipments — Tracker", label: "‘Delivered’ filter" },
  { key: "shipments.tracker.filterAll", default: "All", group: "Shipments — Tracker", label: "‘All’ filter" },
  { key: "shipments.tracker.railEmpty", default: "Nothing to show in this filter.", group: "Shipments — Tracker", label: "Rail empty-state text" },

  /* ---------- Map legend labels (shared across tracker + static map) ---------- */
  { key: "shipments.legend.inTransit", default: "In transit", group: "Shipments — Map legend", label: "Legend ‘In transit’" },
  { key: "shipments.legend.preparing", default: "Preparing", group: "Shipments — Map legend", label: "Legend ‘Preparing’" },
  { key: "shipments.legend.delayed", default: "Delayed", group: "Shipments — Map legend", label: "Legend ‘Delayed’" },
  { key: "shipments.legend.delivered", default: "Delivered", group: "Shipments — Map legend", label: "Legend ‘Delivered’" },
  { key: "shipments.map.emptyState", default: "No active shipments", group: "Shipments — Map legend", label: "Static map empty state" },
];
