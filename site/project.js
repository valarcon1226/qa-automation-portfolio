(function () {
  "use strict";

  var shared = window.PortfolioShared || {};
  var projects = Array.isArray(window.PROJECTS) ? window.PROJECTS : [];
  var demos =
    window.DEMOS && typeof window.DEMOS === "object" ? window.DEMOS : {};

  var notFoundEl = document.getElementById("project-not-found");
  var detailEl = document.getElementById("project-detail");
  var heroEl = document.getElementById("project-hero");
  var categoryEl = document.getElementById("project-category");
  var titleEl = document.getElementById("project-title");
  var summaryEl = document.getElementById("project-summary");
  var tagsEl = document.getElementById("project-tags");
  var linksEl = document.getElementById("project-links");

  var overviewSection = document.getElementById("section-overview");
  var problemEl = document.getElementById("project-problem");
  var stepsEl = document.getElementById("project-steps");

  var exampleSection = document.getElementById("section-example");
  var exampleSourceEl = document.getElementById("example-source");
  var exampleInputEl = document.getElementById("example-input");
  var exampleOutputEl = document.getElementById("example-output");
  var copyInputBtn = document.getElementById("copy-input-btn");
  var copyOutputBtn = document.getElementById("copy-output-btn");

  var resultsSection = document.getElementById("section-results");
  var resultsGridEl = document.getElementById("results-grid");

  var gallerySection = document.getElementById("section-gallery");
  var galleryGridEl = document.getElementById("gallery-grid");

  var runSection = document.getElementById("section-run");
  var runCodeEl = document.getElementById("project-run");
  var copyRunBtn = document.getElementById("copy-run-btn");

  var lightboxEl = document.getElementById("lightbox");
  var lightboxImgEl = document.getElementById("lightbox-img");
  var lightboxCaptionEl = document.getElementById("lightbox-caption");
  var lightboxCloseBtn = document.getElementById("lightbox-close");
  var lastFocusedTrigger = null;

  function fallbackCopy(text) {
    var area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-9999px";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    var ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (e) {
      ok = false;
    }
    document.body.removeChild(area);
    return ok;
  }

  // Renders `inline code` from the demo text as <code> without using innerHTML.
  function setRichText(el, text) {
    el.textContent = "";
    String(text || "").split("`").forEach(function (part, i) {
      if (!part) return;
      if (i % 2) {
        var c = document.createElement("code");
        c.textContent = part;
        el.appendChild(c);
      } else {
        el.appendChild(document.createTextNode(part));
      }
    });
  }

  function showCopiedFeedback(button, succeeded) {
    if (!button) {
      return;
    }
    var original = button.dataset.originalLabel || button.textContent;
    button.dataset.originalLabel = original;
    button.textContent = succeeded ? "Copied" : "Copy failed";
    button.dataset.copied = succeeded ? "true" : "false";
    window.clearTimeout(Number(button.dataset.copyTimer || 0));
    var timer = window.setTimeout(function () {
      button.textContent = original;
      delete button.dataset.copied;
    }, 1800);
    button.dataset.copyTimer = String(timer);
  }

  function wireCopyButton(button, getText) {
    if (!button) {
      return;
    }
    button.addEventListener("click", function () {
      var text = getText();
      if (!text) {
        return;
      }
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        navigator.clipboard
          .writeText(text)
          .then(function () {
            showCopiedFeedback(button, true);
          })
          .catch(function () {
            showCopiedFeedback(button, fallbackCopy(text));
          });
      } else {
        showCopiedFeedback(button, fallbackCopy(text));
      }
    });
  }

  function createSourceLink(project, sourcePath) {
    var span = document.createElement("span");
    span.appendChild(document.createTextNode("Source: "));
    var href =
      typeof shared.buildSourceUrl === "function"
        ? shared.buildSourceUrl(project, sourcePath)
        : "";
    if (!href) {
      var code = document.createElement("code");
      code.textContent = sourcePath;
      span.appendChild(code);
      return span;
    }
    var link = document.createElement("a");
    link.href = href;
    if (!shared.isLocal && typeof shared.setExternalAnchor === "function") {
      shared.setExternalAnchor(link);
    }
    var linkCode = document.createElement("code");
    linkCode.textContent = sourcePath;
    link.appendChild(linkCode);
    span.appendChild(link);
    return span;
  }

  function getFileName(pathStr) {
    var parts = String(pathStr || "").split("/");
    return parts[parts.length - 1] || pathStr;
  }

  function formatImageAlt(projectName, imgPath) {
    var filename = getFileName(imgPath).replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
    return projectName + " screenshot: " + filename;
  }

  function openLightbox(src, altText, captionText, triggerEl) {
    if (!lightboxEl || !lightboxImgEl || !lightboxCaptionEl) {
      return;
    }
    lastFocusedTrigger = triggerEl || null;
    lightboxImgEl.src = src;
    lightboxImgEl.alt = altText;
    lightboxCaptionEl.textContent = captionText;
    lightboxEl.hidden = false;
    document.body.classList.add("lightbox-open");
    if (lightboxCloseBtn) {
      lightboxCloseBtn.focus();
    }
  }

  function closeLightbox() {
    if (!lightboxEl || lightboxEl.hidden) {
      return;
    }
    lightboxEl.hidden = true;
    lightboxImgEl.src = "";
    lightboxImgEl.alt = "";
    document.body.classList.remove("lightbox-open");
    if (lastFocusedTrigger && typeof lastFocusedTrigger.focus === "function") {
      lastFocusedTrigger.focus();
    }
    lastFocusedTrigger = null;
  }

  function initLightbox() {
    if (!lightboxEl) {
      return;
    }
    if (lightboxCloseBtn) {
      lightboxCloseBtn.addEventListener("click", closeLightbox);
    }
    lightboxEl.addEventListener("click", function (event) {
      if (event.target && event.target.getAttribute("data-close") === "true") {
        closeLightbox();
      }
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !lightboxEl.hidden) {
        closeLightbox();
      }
    });
  }

  function renderProjectLinks(project) {
    linksEl.textContent = "";
    if (
      !(project.folder || project.repoPath) ||
      typeof shared.buildLinks !== "function" ||
      typeof shared.createAccessibleLink !== "function"
    ) {
      return;
    }
    var links = shared.buildLinks(project);
    linksEl.appendChild(
      shared.createAccessibleLink(
        "Folder",
        "of " + project.name,
        links.folderUrl,
        links.externalDocs
      )
    );
    linksEl.appendChild(
      shared.createAccessibleLink(
        "README",
        "of " + project.name,
        links.readmeUrl,
        links.externalDocs
      )
    );
    linksEl.appendChild(
      shared.createAccessibleLink(
        "GitHub",
        "tree for " + project.name,
        links.githubUrl,
        true
      )
    );
    if (project.ci && typeof shared.createCiLink === "function") {
      linksEl.appendChild(shared.createCiLink(project));
    }
  }

  function renderProject(project, demo) {
    document.title = project.name + " — Demo | Valentina Alarcon";
    heroEl.dataset.category = project.category;
    categoryEl.textContent = project.category;
    titleEl.textContent = project.name;
    summaryEl.textContent = project.summary || "";

    tagsEl.textContent = "";
    (project.tags || []).forEach(function (tag) {
      var li = document.createElement("li");
      li.className = "card-tag";
      li.textContent = tag;
      tagsEl.appendChild(li);
    });

    renderProjectLinks(project);

    var hasProblem = Boolean(demo && demo.problem);
    var hasSteps = Boolean(demo && Array.isArray(demo.steps) && demo.steps.length > 0);
    if (hasProblem || hasSteps) {
      overviewSection.hidden = false;
      setRichText(problemEl, hasProblem ? demo.problem : "");
      problemEl.hidden = !hasProblem;
      stepsEl.textContent = "";
      if (hasSteps) {
        demo.steps.forEach(function (step) {
          var li = document.createElement("li");
          setRichText(li, step);
          stepsEl.appendChild(li);
        });
      }
      stepsEl.hidden = !hasSteps;
    } else {
      overviewSection.hidden = true;
    }

    if (demo && demo.example && (demo.example.input || demo.example.output)) {
      exampleSection.hidden = false;
      exampleInputEl.textContent = demo.example.input || "";
      exampleOutputEl.textContent = demo.example.output || "";
      exampleSourceEl.textContent = "";
      if (demo.example.source) {
        exampleSourceEl.appendChild(createSourceLink(project, demo.example.source));
      }
      wireCopyButton(copyInputBtn, function () {
        return demo.example.input || "";
      });
      wireCopyButton(copyOutputBtn, function () {
        return demo.example.output || "";
      });
    } else {
      exampleSection.hidden = true;
    }

    if (demo && Array.isArray(demo.results) && demo.results.length > 0) {
      resultsSection.hidden = false;
      resultsGridEl.textContent = "";
      demo.results.forEach(function (item) {
        var card = document.createElement("div");
        card.className = "metric-card";

        var label = document.createElement("p");
        label.className = "metric-label";
        label.textContent = item.label || "";
        card.appendChild(label);

        var val = document.createElement("p");
        val.className = "metric-value";
        val.textContent = item.value || "";
        card.appendChild(val);

        if (item.source) {
          var src = document.createElement("p");
          src.className = "metric-source";
          src.appendChild(createSourceLink(project, item.source));
          card.appendChild(src);
        }

        resultsGridEl.appendChild(card);
      });
    } else {
      resultsSection.hidden = true;
    }

    if (demo && Array.isArray(demo.images) && demo.images.length > 0) {
      gallerySection.hidden = false;
      galleryGridEl.textContent = "";
      demo.images.forEach(function (entry) {
        var src = typeof entry === "string" ? entry : entry.src;
        var alt =
          typeof entry === "object" && entry.alt
            ? entry.alt
            : formatImageAlt(project.name, src);
        var caption = getFileName(src);

        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "gallery-item";
        btn.setAttribute("aria-label", "Enlarge " + alt);

        var img = document.createElement("img");
        img.src = src;
        img.alt = alt;
        img.loading = "lazy";
        btn.appendChild(img);

        var cap = document.createElement("span");
        cap.className = "gallery-caption";
        cap.textContent = caption;
        btn.appendChild(cap);

        btn.addEventListener("click", function () {
          openLightbox(src, alt, project.name + " — " + caption, btn);
        });

        galleryGridEl.appendChild(btn);
      });
    } else {
      gallerySection.hidden = true;
    }

    if (demo && demo.run) {
      runSection.hidden = false;
      runCodeEl.textContent = demo.run;
      wireCopyButton(copyRunBtn, function () {
        return demo.run;
      });
    } else {
      runSection.hidden = true;
    }

    notFoundEl.hidden = true;
    detailEl.hidden = false;
  }

  function init() {
    initLightbox();
    var params = new URLSearchParams(window.location.search);
    var requestedId = params.get("id");
    var project = projects.find(function (item) {
      return String(item.id) === String(requestedId);
    });

    if (!project) {
      detailEl.hidden = true;
      notFoundEl.hidden = false;
      return;
    }

    var demo = demos[project.id] || null;
    renderProject(project, demo);
    loadShowcase(project);
  }

  // ---- "See it working": visual view of real output, data in showcase/<id>.js ----
  // A <script> tag (not fetch) so the page still works from file://.
  function loadShowcase(project) {
    if (!/^[a-z0-9-]+$/.test(String(project.id))) return;
    var s = document.createElement("script");
    s.src = "showcase/" + project.id + ".js";
    s.onload = function () {
      if (window.SHOWCASE) renderShowcase(project, window.SHOWCASE);
    };
    document.head.appendChild(s);
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }

  var BLOCKS = {
    stats: function (b) {
      var g = el("div", "sc-stats");
      (b.items || []).forEach(function (it) {
        var c = el("div", "sc-stat" + (it.tone ? " tone-" + it.tone : ""));
        c.appendChild(el("span", "sc-stat-value", it.value));
        c.appendChild(el("span", "sc-stat-label", it.label));
        if (it.note) c.appendChild(el("span", "sc-note", it.note));
        g.appendChild(c);
      });
      return g;
    },
    table: function (b) {
      var wrap = el("div", "sc-table-wrap");
      wrap.tabIndex = 0;
      var t = el("table", "sc-table");
      var tr = el("tr");
      (b.columns || []).forEach(function (c) { tr.appendChild(el("th", null, c)); });
      t.appendChild(el("thead")).appendChild(tr);
      var tb = t.appendChild(el("tbody"));
      var tones = b.tones || {};
      (b.rows || []).forEach(function (row) {
        var r = el("tr");
        row.forEach(function (cell) {
          var td = el("td");
          var tone = tones[String(cell)];
          td.appendChild(tone ? el("span", "sc-badge tone-" + tone, cell) : document.createTextNode(String(cell)));
          r.appendChild(td);
        });
        tb.appendChild(r);
      });
      wrap.appendChild(t);
      return wrap;
    },
    cards: function (b) {
      var g = el("div", "sc-cards");
      (b.items || []).forEach(function (it) {
        var c = el("article", "sc-card" + (it.tone ? " tone-" + it.tone : ""));
        if (it.badge) c.appendChild(el("span", "sc-badge tone-" + (it.tone || "info"), it.badge));
        c.appendChild(el("h4", "sc-card-title", it.title));
        if (it.subtitle) c.appendChild(el("p", "sc-note", it.subtitle));
        if (it.body) c.appendChild(el("p", "sc-card-body", it.body));
        g.appendChild(c);
      });
      return g;
    },
    messages: function (b) {
      var g = el("div", "sc-messages");
      (b.items || []).forEach(function (m) {
        var c = el("div", "sc-msg sc-msg-" + (m.side === "in" ? "in" : "out"));
        var head = [m.channel, m.from && "from " + m.from, m.to && "to " + m.to].filter(Boolean).join(" · ");
        if (head) c.appendChild(el("span", "sc-msg-head", head));
        if (m.subject) c.appendChild(el("strong", "sc-msg-subject", m.subject));
        c.appendChild(el("p", "sc-msg-body", m.body));
        g.appendChild(c);
      });
      return g;
    },
    before_after: function (b) {
      var g = el("div", "sc-ba");
      [["Before", b.before], ["After", b.after]].forEach(function (pair) {
        var col = el("div", "sc-ba-col");
        col.appendChild(el("h4", "sc-ba-title", pair[0]));
        var dl = el("dl", "sc-kv");
        Object.keys(pair[1] || {}).forEach(function (k) {
          dl.appendChild(el("dt", null, k));
          dl.appendChild(el("dd", null, pair[1][k] === "" || pair[1][k] === null ? "—" : pair[1][k]));
        });
        col.appendChild(dl);
        g.appendChild(col);
      });
      return g;
    },
    bars: function (b) {
      var g = el("div", "sc-bars");
      var max = Math.max.apply(null, (b.items || []).map(function (i) { return Number(i.value) || 0; }).concat([1]));
      (b.items || []).forEach(function (it) {
        var row = el("div", "sc-bar-row");
        row.appendChild(el("span", "sc-bar-label", it.label));
        var track = el("span", "sc-bar-track");
        var fill = el("span", "sc-bar-fill" + (it.tone ? " tone-" + it.tone : ""));
        fill.style.width = Math.max(2, (Number(it.value) / max) * 100) + "%";
        track.appendChild(fill);
        row.appendChild(track);
        row.appendChild(el("span", "sc-bar-value", it.value + (b.unit ? " " + b.unit : "")));
        g.appendChild(row);
      });
      return g;
    },
    checklist: function (b) {
      var ul = el("ul", "sc-check");
      var icon = { pass: "✓", fail: "✗", skip: "–" };
      (b.items || []).forEach(function (it) {
        var st = icon[it.status] ? it.status : "skip";
        var li = el("li", "sc-check-" + st);
        li.appendChild(el("span", "sc-check-icon", icon[st])).setAttribute("aria-label", st);
        var txt = el("span");
        txt.appendChild(el("span", null, it.text));
        if (it.detail) txt.appendChild(el("span", "sc-note", it.detail));
        li.appendChild(txt);
        ul.appendChild(li);
      });
      return ul;
    },
    flow: function (b) {
      var ol = el("ol", "sc-flow");
      (b.steps || []).forEach(function (s) {
        var li = el("li");
        li.appendChild(el("strong", null, s.label));
        if (s.detail) li.appendChild(el("span", "sc-note", s.detail));
        ol.appendChild(li);
      });
      return ol;
    }
  };

  function renderShowcase(project, sc) {
    var section = document.getElementById("section-showcase");
    var host = document.getElementById("showcase-blocks");
    host.textContent = "";
    (sc.blocks || []).forEach(function (b) {
      var fn = BLOCKS[b.type];
      if (!fn) return;
      var wrap = el("div", "sc-block");
      if (b.title) wrap.appendChild(el("h3", "sc-block-title", b.title));
      if (b.caption) wrap.appendChild(el("p", "sc-caption", b.caption));
      wrap.appendChild(fn(b));
      host.appendChild(wrap);
    });
    document.getElementById("showcase-headline").textContent = sc.headline || "";
    var src = document.getElementById("showcase-source");
    src.textContent = "";
    if (sc.source) src.appendChild(createSourceLink(project, sc.source));
    section.hidden = host.childNodes.length === 0;
  }

  init();
})();
