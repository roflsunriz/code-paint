/// <reference lib="dom" />
import type { PaintDocument } from "./paint-document.ts";
import type { DocumentPayload } from "./preview-payload.ts";
import type {
  detailRenderUrl,
  fitReferenceCrop,
  normalizePreviewSettings,
  previewCanvasLayout,
  validateReferenceCrop,
} from "./preview-view.ts";

/** Self-contained browser entry point; serialized into the preview HTML after TypeScript compilation. */
export function initializePreview(
  pollMs: number,
  maxListItems: number,
  normalize: typeof normalizePreviewSettings,
  validateCrop: typeof validateReferenceCrop,
  fitCrop: typeof fitReferenceCrop,
  layoutCanvas: typeof previewCanvasLayout,
  detailUrl: typeof detailRenderUrl,
): void {
  // The static HTML provides the element type at this DOM boundary.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
  const el = <T extends HTMLElement = HTMLElement>(id: string): T => {
    const found = document.querySelector<T>('[data-testid="' + id + '"]');
    if (!found) throw new Error("表示要素がありません: " + id);
    return found;
  };
  const input = (id: string): HTMLInputElement => el<HTMLInputElement>(id);
  const button = (id: string): HTMLButtonElement => el<HTMLButtonElement>(id);
  const canvas = el<HTMLCanvasElement>("paint-canvas");
  const refCanvas = el<HTMLCanvasElement>("reference-canvas");
  const refImage = el<HTMLImageElement>("reference-image");
  const mode = el<HTMLSelectElement>("compare-mode");
  const phaseSelect = el<HTMLSelectElement>("phase-select");
  const groupSelect = el<HTMLSelectElement>("group-select");
  const inspectorTabs = ["reference", "layers", "export"] as const;
  const selectInspectorTab = (name: (typeof inspectorTabs)[number]): void => {
    for (const tab of inspectorTabs) {
      const selected = tab === name;
      const tabButton = button("inspector-tab-" + tab);
      tabButton.setAttribute("aria-selected", String(selected));
      tabButton.tabIndex = selected ? 0 : -1;
      el("inspector-panel-" + tab).hidden = !selected;
    }
  };
  inspectorTabs.forEach((name, index) => {
    const tab = button("inspector-tab-" + name);
    tab.addEventListener("click", () => {
      selectInspectorTab(name);
    });
    tab.addEventListener("keydown", (event) => {
      let next: number;
      if (event.key === "ArrowRight") next = (index + 1) % inspectorTabs.length;
      else if (event.key === "ArrowLeft")
        next = (index + inspectorTabs.length - 1) % inspectorTabs.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = inspectorTabs.length - 1;
      else return;
      event.preventDefault();
      const selected = inspectorTabs[next];
      if (selected) {
        selectInspectorTab(selected);
        button("inspector-tab-" + selected).focus();
      }
    });
  });
  const storageKey = "code-paint-view:" + location.pathname;
  let settings = normalize(null);
  let currentDoc: PaintDocument | null = null;
  let art: HTMLImageElement | null = null;
  let lastHash = "";
  let selectedId = "";
  let referenceReady = false;
  let polling = false;
  let editing = false;
  let renderGeneration = 0;
  let detailGeneration = 0;
  let detailObjectUrl = "";

  const report = (id: string, error: unknown): void => {
    const node = el(id);
    node.textContent = error instanceof Error ? error.message : String(error);
    node.hidden = !node.textContent;
  };
  try {
    settings = normalize(JSON.parse(localStorage.getItem(storageKey) ?? "null") as unknown);
  } catch {
    report("view-error", "表示設定を読み込めませんでした。初期設定で表示します。");
  }
  const persist = (): void => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(settings));
    } catch {
      report("view-error", "表示設定を保存できません。現在の表示はそのまま使えます。");
    }
  };
  const cropFields = (): void => {
    const crop = settings.crop ?? {
      x: 0,
      y: 0,
      width: refImage.naturalWidth || 1,
      height: refImage.naturalHeight || 1,
    };
    for (const key of ["x", "y", "width", "height"] as const)
      input("crop-" + key).value = String(crop[key]);
  };
  const syncControls = (): void => {
    mode.value = settings.mode;
    input("canvas-zoom").value = String(settings.zoom);
    input("reference-opacity").value = String(settings.opacity);
    cropFields();
  };
  const draw = (): void => {
    if (!currentDoc || !art) return;
    const { width, height } = currentDoc.canvas;
    const showReference = settings.mode === "side";
    el("reference-panel").hidden = !showReference;
    el("comparison-views").classList.toggle("single", !showReference);
    const viewports = showReference
      ? [el("canvas-viewport"), el("reference-viewport")]
      : [el("canvas-viewport")];
    const availableWidth = Math.min(...viewports.map((viewport) => viewport.clientWidth));
    const availableHeight = Math.min(
      ...viewports.map((viewport) => {
        const style = getComputedStyle(viewport);
        return (
          (Number.parseFloat(style.maxHeight) || innerHeight) -
          Number.parseFloat(style.borderTopWidth) -
          Number.parseFloat(style.borderBottomWidth)
        );
      }),
    );
    const layout = layoutCanvas(
      width,
      height,
      settings.zoom,
      settings.fit,
      availableWidth,
      availableHeight,
      devicePixelRatio,
    );
    button("view-fit").setAttribute("aria-pressed", String(settings.fit));
    input("canvas-zoom").min = settings.fit ? "0.1" : "25";
    if (settings.fit && document.activeElement !== input("canvas-zoom")) {
      input("canvas-zoom").value = String(Math.round(layout.zoom * 10) / 10);
    }
    el("view-scale").textContent = settings.fit ? "自動" : "手動";
    input("reference-opacity").disabled = settings.mode !== "overlay";
    input("reference-opacity")
      .closest("label")
      ?.classList.toggle("inactive", settings.mode !== "overlay");
    for (const target of [canvas, refCanvas]) {
      target.width = layout.rasterWidth;
      target.height = layout.rasterHeight;
      target.style.width = String(layout.cssWidth) + "px";
      target.style.height = String(layout.cssHeight) + "px";
    }
    const ctx = canvas.getContext("2d");
    const referenceContext = refCanvas.getContext("2d");
    if (!ctx || !referenceContext) throw new Error("Canvas 2Dを利用できません。");
    ctx.setTransform(layout.rasterWidth / width, 0, 0, layout.rasterHeight / height, 0, 0);
    referenceContext.setTransform(
      layout.rasterWidth / width,
      0,
      0,
      layout.rasterHeight / height,
      0,
      0,
    );
    ctx.drawImage(art, 0, 0, width, height);
    referenceContext.fillStyle = "#ffffff";
    referenceContext.fillRect(0, 0, width, height);
    if (referenceReady) {
      const crop = settings.crop ?? {
        x: 0,
        y: 0,
        width: refImage.naturalWidth,
        height: refImage.naturalHeight,
      };
      const fitted = fitCrop(crop, width, height);
      referenceContext.drawImage(
        refImage,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        fitted.x,
        fitted.y,
        fitted.width,
        fitted.height,
      );
      if (settings.mode === "overlay" || settings.mode === "difference") {
        ctx.save();
        ctx.globalAlpha = settings.mode === "difference" ? 1 : settings.opacity;
        ctx.globalCompositeOperation =
          settings.mode === "difference" ? "difference" : "source-over";
        ctx.drawImage(refCanvas, 0, 0, width, height);
        ctx.restore();
      }
    }
  };
  const updateSelection = (): void => {
    const selected = currentDoc?.shapes.find((shape) => shape.id === selectedId);
    if (!selected) selectedId = "";
    el("selected-shape").textContent = selected
      ? "ID: " + selectedId + " / " + selected.phase
      : "未選択";
    el("selected-json").textContent = selected ? JSON.stringify(selected, null, 2) : "未選択";
    for (const id of ["shape-save", "shape-delete"]) button(id).disabled = !selected || editing;
  };
  const updateList = (scroll = false): void => {
    if (!currentDoc) return;
    const term = input("shape-search").value.trim().toLocaleLowerCase();
    const rows = currentDoc.shapes
      .map((shape, index) => ({ shape, index }))
      .filter(({ shape }) =>
        [shape.id ?? "", shape.group ?? "", shape.kind, shape.phase]
          .join(" ")
          .toLocaleLowerCase()
          .includes(term),
      );
    const list = el<HTMLOListElement>("shape-list");
    list.replaceChildren();
    for (const { shape, index } of rows.slice(-maxListItems)) {
      const li = document.createElement("li");
      const row = document.createElement("button");
      row.type = "button";
      row.dataset.shapeId = shape.id;
      row.textContent =
        "#" +
        String(index) +
        " " +
        (shape.id ?? "IDなし") +
        " · " +
        shape.kind +
        " [" +
        shape.phase +
        "]" +
        (shape.group ? " / " + shape.group : "") +
        " / 層 " +
        String(shape.layer ?? "既定") +
        (shape.hidden ? " / 非表示" : "");
      row.disabled = !shape.id;
      row.setAttribute("aria-pressed", String(shape.id === selectedId));
      row.addEventListener("click", () => {
        selectedId = shape.id ?? "";
        el<HTMLDetailsElement>("shape-editor").open = true;
        updateSelection();
        updateList();
      });
      li.append(row);
      list.append(li);
    }
    el("shape-count").textContent =
      "図形 " + String(currentDoc.shapes.length) + " 件 / 検索 " + String(rows.length) + " 件";
    if (scroll && !term && !selectedId)
      el("shape-scroll").scrollTop = el("shape-scroll").scrollHeight;
    const previousGroup = groupSelect.value;
    groupSelect.replaceChildren(new Option("選択してください", ""));
    for (const group of [
      ...new Set(
        currentDoc.shapes
          .map((shape) => shape.group)
          .filter((group): group is string => Boolean(group)),
      ),
    ].sort())
      groupSelect.add(new Option(group, group));
    groupSelect.value = previousGroup;
    for (const id of ["group-save", "group-delete"])
      button(id).disabled = !groupSelect.value || editing;
    updateSelection();
  };
  const readJson = async <T>(path: string, options?: RequestInit): Promise<T> => {
    const response = await fetch(path, { cache: "no-store", ...options });
    const value = (await response.json()) as T & { error?: string };
    if (!response.ok)
      throw new Error(value.error ?? "取得に失敗しました: " + String(response.status));
    return value;
  };
  const refreshHistory = async (): Promise<void> => {
    const history = await readJson<{ canUndo: boolean; canRedo: boolean }>("/history");
    button("undo").disabled = editing || !history.canUndo;
    button("redo").disabled = editing || !history.canRedo;
  };
  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        resolve(image);
      };
      image.onerror = () => {
        reject(new Error("描画画像を読み込めません。入力とサーバーを確認してください。"));
      };
      image.src = src;
    });
  const poll = async (): Promise<void> => {
    if (polling) return;
    polling = true;
    try {
      const payload = await readJson<DocumentPayload>("/document");
      if (payload.hash !== lastHash) {
        el("command-json").textContent = payload.raw;
        if (!payload.ok) {
          ++renderGeneration;
          report("preview-error", payload.error);
          el("preview-status").textContent = "入力を修正すると自動で再表示します。";
          el("preview-ok").hidden = true;
        } else {
          const generation = ++renderGeneration;
          const response = await fetch("/svg", { cache: "no-store" });
          if (!response.ok) throw new Error("SVGを取得できません。入力を確認してください。");
          const url = URL.createObjectURL(await response.blob());
          try {
            const loaded = await loadImage(url);
            // An external writer may replace the document while SVG is rendering.
            const latest = await readJson<DocumentPayload>("/document");
            if (latest.hash !== payload.hash || generation !== renderGeneration) return;
            currentDoc = payload.document;
            art = loaded;
            draw();
            lastHash = payload.hash;
          } finally {
            URL.revokeObjectURL(url);
          }
          report("preview-error", "");
          el("preview-ok").hidden = false;
          el("preview-ok").textContent =
            "更新: " +
            new Date().toLocaleTimeString("ja-JP") +
            " / " +
            String(currentDoc.canvas.width) +
            "×" +
            String(currentDoc.canvas.height);
          el("preview-status").textContent = "すべての変更を反映 · 自動更新中";
          el("phase-badge").textContent = "フェーズ: " + currentDoc.phase;
          if (document.activeElement !== phaseSelect) phaseSelect.value = currentDoc.phase;
          updateList(true);
          el("command-json").scrollTop = el("command-json").scrollHeight;
        }
      }
      await refreshHistory();
    } catch (error) {
      report("preview-error", error);
      el("preview-status").textContent = "取得に失敗しました。自動で再試行します。";
    } finally {
      polling = false;
    }
  };
  const mutate = async (path: string, method: string, body?: unknown): Promise<void> => {
    if (editing) return;
    editing = true;
    phaseSelect.disabled = true;
    for (const id of ["undo", "redo", "shape-save", "shape-delete", "group-save", "group-delete"])
      button(id).disabled = true;
    ++renderGeneration;
    report("edit-error", "");
    el("edit-status").textContent = "保存中…";
    try {
      await readJson<unknown>(path, {
        method,
        headers: { "content-type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      lastHash = "";
      el("edit-status").textContent = "保存しました。描画へ反映します。";
    } catch (error) {
      report("edit-error", error);
      el("edit-status").textContent = "保存できませんでした。入力を確認して再実行してください。";
    } finally {
      editing = false;
      phaseSelect.disabled = false;
      if (currentDoc) phaseSelect.value = currentDoc.phase;
      updateList();
      await poll();
    }
  };
  const patch = (id: string): Record<string, unknown> => {
    const value = JSON.parse(el<HTMLTextAreaElement>(id).value) as unknown;
    if (typeof value !== "object" || value === null || Array.isArray(value))
      throw new Error("変更内容はJSONオブジェクトで入力してください。");
    return value as Record<string, unknown>;
  };
  const applyPatch = (target: "shape" | "group"): void => {
    const id = target === "shape" ? selectedId : groupSelect.value;
    if (!id) return;
    try {
      void mutate("/" + target + "s/" + encodeURIComponent(id), "PATCH", patch(target + "-patch"));
    } catch (error) {
      report("edit-error", error);
    }
  };
  input("shape-search").addEventListener("input", () => {
    updateList();
  });
  groupSelect.addEventListener("change", () => {
    for (const id of ["group-save", "group-delete"])
      button(id).disabled = !groupSelect.value || editing;
  });
  button("shape-save").addEventListener("click", () => {
    applyPatch("shape");
  });
  button("group-save").addEventListener("click", () => {
    applyPatch("group");
  });
  button("shape-delete").addEventListener("click", () => {
    if (selectedId) void mutate("/shapes/" + encodeURIComponent(selectedId), "DELETE");
  });
  button("group-delete").addEventListener("click", () => {
    if (groupSelect.value)
      void mutate("/groups/" + encodeURIComponent(groupSelect.value), "DELETE");
  });
  phaseSelect.addEventListener("change", () => {
    void mutate("/phase", "POST", { phase: phaseSelect.value });
  });
  for (const name of ["undo", "redo"])
    button(name).addEventListener("click", () => {
      void mutate("/" + name, "POST");
    });
  mode.addEventListener("change", () => {
    settings.mode = mode.value;
    persist();
    draw();
  });
  const applyZoom = (commit: boolean): void => {
    const zoom = input("canvas-zoom").valueAsNumber;
    // Do not replace an incomplete number while the user is still typing it.
    if (!commit && (!Number.isFinite(zoom) || zoom < 25 || zoom > 400)) return;
    settings = normalize({ ...settings, fit: false, zoom });
    if (commit) syncControls();
    persist();
    draw();
  };
  input("canvas-zoom").addEventListener("input", () => {
    applyZoom(false);
  });
  input("canvas-zoom").addEventListener("change", () => {
    applyZoom(true);
  });
  input("canvas-zoom").addEventListener("blur", () => {
    if (settings.fit) draw();
  });
  button("view-fit").addEventListener("click", () => {
    settings.fit = true;
    persist();
    for (const id of ["canvas-viewport", "reference-viewport"]) {
      el(id).scrollTop = 0;
      el(id).scrollLeft = 0;
    }
    draw();
  });
  input("reference-opacity").addEventListener("input", () => {
    settings.opacity = input("reference-opacity").valueAsNumber;
    persist();
    draw();
  });
  button("view-reset").addEventListener("click", () => {
    settings = normalize(null);
    syncControls();
    persist();
    draw();
    report("view-error", "");
    for (const id of ["canvas-viewport", "reference-viewport"]) {
      el(id).scrollTop = 0;
      el(id).scrollLeft = 0;
    }
  });
  el<HTMLFormElement>("crop-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!referenceReady) return;
    try {
      settings.crop = validateCrop(
        {
          x: input("crop-x").valueAsNumber,
          y: input("crop-y").valueAsNumber,
          width: input("crop-width").valueAsNumber,
          height: input("crop-height").valueAsNumber,
        },
        refImage.naturalWidth,
        refImage.naturalHeight,
      );
      report("view-error", "");
      persist();
      draw();
    } catch (error) {
      report("view-error", error);
    }
  });
  button("crop-reset").addEventListener("click", () => {
    settings.crop = null;
    cropFields();
    persist();
    draw();
    report("view-error", "");
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!currentDoc) return;
    const rect = canvas.getBoundingClientRect();
    el("canvas-position").textContent =
      "座標: " +
      String(Math.floor(((event.clientX - rect.left) * currentDoc.canvas.width) / rect.width)) +
      ", " +
      String(Math.floor(((event.clientY - rect.top) * currentDoc.canvas.height) / rect.height));
  });
  el<HTMLFormElement>("detail-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const x = input("detail-x").valueAsNumber;
    const y = input("detail-y").valueAsNumber;
    const width = input("detail-width").valueAsNumber;
    const height = input("detail-height").valueAsNumber;
    const scale = input("detail-scale").valueAsNumber;
    if (
      !currentDoc ||
      ![x, y, width, height, scale].every(Number.isFinite) ||
      x < 0 ||
      y < 0 ||
      width <= 0 ||
      height <= 0 ||
      scale <= 0 ||
      scale > 8 ||
      x + width > currentDoc.canvas.width ||
      y + height > currentDoc.canvas.height
    ) {
      report("view-error", "局所PNGの範囲を作品の内側に、倍率を0より大きく8以下にしてください。");
      return;
    }
    const generation = ++detailGeneration;
    const url = detailUrl(x, y, width, height, scale);
    void fetch(url, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          const error = (await response.json()) as { error?: string };
          throw new Error(error.error ?? "局所PNGを取得できません。");
        }
        const blobUrl = URL.createObjectURL(await response.blob());
        try {
          await loadImage(blobUrl);
          if (generation !== detailGeneration) return;
          const image = el<HTMLImageElement>("detail-image");
          if (detailObjectUrl) URL.revokeObjectURL(detailObjectUrl);
          detailObjectUrl = blobUrl;
          image.src = blobUrl;
          image.hidden = false;
          const link = el<HTMLAnchorElement>("detail-link");
          link.href = url;
          link.hidden = false;
          report("view-error", "");
        } finally {
          if (detailObjectUrl !== blobUrl) URL.revokeObjectURL(blobUrl);
        }
      })
      .catch((error: unknown) => {
        if (generation === detailGeneration) report("view-error", error);
      });
  });
  refImage.addEventListener("load", () => {
    referenceReady = true;
    if (settings.crop) {
      try {
        validateCrop(settings.crop, refImage.naturalWidth, refImage.naturalHeight);
      } catch {
        settings.crop = null;
        persist();
        report(
          "view-error",
          "保存された切り抜き範囲が元画像を超えていたため、参照全体に戻しました。",
        );
      }
    }
    cropFields();
    button("crop-apply").disabled = false;
    button("crop-reset").disabled = false;
    el("reference-status").textContent =
      "元画像: " + String(refImage.naturalWidth) + "×" + String(refImage.naturalHeight) + " px";
    draw();
  });
  refImage.addEventListener("error", () => {
    referenceReady = false;
    button("crop-apply").disabled = true;
    button("crop-reset").disabled = true;
    el("reference-status").textContent =
      "リファレンス未設定、または読み込み失敗。--reference <画像パス> で起動してください。";
    draw();
  });
  syncControls();
  const observer = new ResizeObserver(() => {
    if (settings.fit) draw();
  });
  observer.observe(el("canvas-viewport"));
  observer.observe(el("reference-viewport"));
  refImage.src = "/reference";
  void poll();
  setInterval(() => {
    void poll();
  }, pollMs);
}
