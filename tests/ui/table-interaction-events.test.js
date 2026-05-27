import assert from "node:assert/strict";
import { test } from "node:test";
import { bindTableInteractionEvents } from "../../src/events/table-interaction-events.js";

function node(dataset = {}, value = "") {
  const listeners = new Map();
  return {
    dataset,
    value,
    checked: false,
    classList: { add() {}, remove() {} },
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    closest() {
      return null;
    },
    dispatch(type, extra = {}) {
      const handler = listeners.get(type);
      assert.equal(typeof handler, "function", `${type} listener should be registered`);
      return handler({
        currentTarget: this,
        target: this,
        stopPropagation() {},
        preventDefault() {},
        ...extra
      });
    }
  };
}

function fakeDocument(lists = {}) {
  return {
    querySelectorAll(selector) {
      return lists[selector] || [];
    }
  };
}

function deps(lists = {}) {
  const calls = [];
  const state = {
    table: { sortKey: "risk", visible: ["risk"], pinned: [] },
    tableProfiles: [{ id: "layout-1" }]
  };
  return {
    calls,
    state,
    deps: {
      document: fakeDocument(lists),
      state,
      TABLE_COLUMNS: [{ key: "risk" }, { key: "rtt" }],
      tableDefaults: () => ({ visible: ["risk", "rtt"] }),
      tableSettingsPlacement: () => ({ drawer: false, left: 10, top: 20, width: 30, height: 40 }),
      applyTableColumnSearchFilter: () => calls.push("applySearch"),
      resetTableSort: table => ({ ...table, sortKey: "risk-reset" }),
      resetTableColumns: table => ({ ...table, visible: ["risk", "rtt"] }),
      toggleTableColumnPin: (table, key) => ({ ...table, pinned: table.pinned.includes(key) ? [] : [key] }),
      setTableColumnVisibility: (table, key, visible) => ({ ...table, visible: visible ? [...table.visible, key] : table.visible.filter(item => item !== key) }),
      toggleTableColumnVisibility: (table, key) => ({ ...table, visible: table.visible.includes(key) ? table.visible.filter(item => item !== key) : [...table.visible, key] }),
      saveTableState: () => calls.push("saveTableState"),
      applyTableLayout: () => calls.push("applyTableLayout"),
      saveTableProfiles: () => calls.push("saveTableProfiles"),
      moveTableColumn: () => false,
      toast: title => calls.push(`toast:${title}`),
      renderKeepingWorkspacePosition: () => calls.push("renderStable"),
      renderKeepingModalPosition: () => calls.push("renderModalStable"),
      render: () => calls.push("render")
    }
  };
}

test("table interaction binder resets column layout from the settings menu", () => {
  const reset = node({ tableMenuAction: "resetColumns" });
  const ctx = deps({ "[data-table-menu-action]": [reset] });

  bindTableInteractionEvents(ctx.deps);
  reset.dispatch("click");

  assert.deepEqual(ctx.state.table.visible, ["risk", "rtt"]);
  assert.deepEqual(ctx.calls, ["saveTableState", "renderStable"]);
});

test("table interaction binder toggles visible columns from checkboxes", () => {
  const checkbox = node({ visibleCol: "rtt" });
  checkbox.checked = true;
  const ctx = deps({ "[data-visible-col]": [checkbox] });

  bindTableInteractionEvents(ctx.deps);
  checkbox.dispatch("change");

  assert.deepEqual(ctx.state.table.visible, ["risk", "rtt"]);
  assert.deepEqual(ctx.calls, ["saveTableState", "renderStable"]);
});
