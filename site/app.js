(function () {
  "use strict";

  var REPO_URL = "https://github.com/valarcon1226/qa-automation-portfolio";
  var STORAGE_KEY = "portfolio-theme";

  var categories = Array.isArray(window.CATEGORIES) ? window.CATEGORIES : [];
  var rawProjects = Array.isArray(window.PROJECTS) ? window.PROJECTS : [];

  var isLocal =
    window.location.protocol === "file:" ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "::1";

  var orderedProjects = rawProjects.slice().sort(function (a, b) {
    var catDiff =
      categories.indexOf(a.category) - categories.indexOf(b.category);
    if (catDiff !== 0) {
      return catDiff;
    }
    return a.name.localeCompare(b.name, "en");
  });

  var state = {
    query: "",
    category: "all",
    tags: new Set(),
  };

  var searchInput = document.getElementById("search-input");
  var categoryChipsEl = document.getElementById("category-chips");
  var techChipsEl = document.getElementById("tech-chips");
  var gridEl = document.getElementById("projects-grid");
  var emptyStateEl = document.getElementById("empty-state");
  var resultsCountEl = document.getElementById("results-count");
  var clearBtn = document.getElementById("clear-filters");
  var emptyClearBtn = document.getElementById("empty-clear-btn");
  var themeToggleBtn = document.getElementById("theme-toggle");
  var projectsMdLink = document.getElementById("projects-md-link");
  var workflowsLink = document.getElementById("workflows-link");

  function setExternalAnchor(anchor) {
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
  }

  function buildDemoUrl(project) {
    return "project.html?id=" + encodeURIComponent(project.id);
  }

  function buildLinks(project) {
    var githubUrl = REPO_URL + "/tree/main/" + project.slug;
    var githubReadmeUrl = REPO_URL + "/blob/main/" + project.slug + "/README.md";
    if (isLocal) {
      var base = project.repoPath
        ? "../../" + project.repoPath
        : "../" + project.folder;
      return {
        folderUrl: base + "/",
        readmeUrl: base + "/README.md",
        githubUrl: githubUrl,
        externalDocs: false,
      };
    }

    return {
      folderUrl: githubUrl,
      readmeUrl: githubReadmeUrl,
      githubUrl: githubUrl,
      externalDocs: true,
    };
  }

  function buildSourceUrl(project, sourcePath) {
    if (!sourcePath) {
      return "";
    }
    var clean = sourcePath;
    if (clean.indexOf("../") === 0) {
      if (isLocal) {
        return "../" + clean;
      }
      var repoPrefix = project.repoPath ? "../" + project.repoPath + "/" : "../";
      if (clean.indexOf(repoPrefix) === 0) {
        clean = clean.slice(repoPrefix.length);
      } else {
        return REPO_URL + "/blob/main/" + clean.replace(/^\.\.\//, "");
      }
    }
    if (isLocal) {
      var base = project.repoPath
        ? "../../" + project.repoPath
        : "../" + project.folder;
      return base + "/" + clean;
    }
    return REPO_URL + "/blob/main/" + project.slug + "/" + clean;
  }

  function getTopTags(projects) {
    var counts = new Map();
    projects.forEach(function (project) {
      project.tags.forEach(function (tag) {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      });
    });

    return Array.from(counts.entries())
      .sort(function (a, b) {
        if (b[1] !== a[1]) {
          return b[1] - a[1];
        }
        return a[0].localeCompare(b[0], "en", { sensitivity: "base" });
      })
      .filter(function (entry) {
        return entry[1] >= 3;
      })
      .map(function (entry) {
        return entry[0];
      });
  }

  function createChip(label, isPressed, extraClass, onClick) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = extraClass ? "chip " + extraClass : "chip";
    btn.setAttribute("aria-pressed", isPressed ? "true" : "false");
    btn.textContent = label;
    btn.addEventListener("click", onClick);
    return btn;
  }

  function renderCategoryChips() {
    var counts = new Map();
    categories.forEach(function (cat) {
      counts.set(cat, 0);
    });
    orderedProjects.forEach(function (p) {
      counts.set(p.category, (counts.get(p.category) || 0) + 1);
    });

    categoryChipsEl.textContent = "";

    var allChip = createChip(
      "All (" + orderedProjects.length + ")",
      state.category === "all",
      "",
      function () {
        state.category = "all";
        update();
      }
    );
    allChip.dataset.categoryValue = "all";
    categoryChipsEl.appendChild(allChip);

    categories.forEach(function (cat) {
      var count = counts.get(cat) || 0;
      var chip = createChip(
        cat + " (" + count + ")",
        state.category === cat,
        "",
        function () {
          state.category = cat;
          update();
        }
      );
      chip.dataset.categoryValue = cat;
      categoryChipsEl.appendChild(chip);
    });
  }

  function renderTechChips(topTags) {
    techChipsEl.textContent = "";
    topTags.forEach(function (tag) {
      var chip = createChip(
        tag,
        state.tags.has(tag),
        "chip--tech",
        function () {
          if (state.tags.has(tag)) {
            state.tags.delete(tag);
          } else {
            state.tags.add(tag);
          }
          update();
        }
      );
      chip.dataset.techValue = tag;
      techChipsEl.appendChild(chip);
    });
  }

  function syncChipStates() {
    var catButtons = categoryChipsEl.querySelectorAll("button");
    catButtons.forEach(function (btn) {
      var isSelected = btn.dataset.categoryValue === state.category;
      btn.setAttribute("aria-pressed", isSelected ? "true" : "false");
    });

    var techButtons = techChipsEl.querySelectorAll("button");
    techButtons.forEach(function (btn) {
      var isSelected = state.tags.has(btn.dataset.techValue);
      btn.setAttribute("aria-pressed", isSelected ? "true" : "false");
    });
  }

  function matchesFilters(project) {
    if (state.category !== "all" && project.category !== state.category) {
      return false;
    }

    if (state.tags.size > 0) {
      var hasAllTags = true;
      state.tags.forEach(function (tag) {
        if (project.tags.indexOf(tag) === -1) {
          hasAllTags = false;
        }
      });
      if (!hasAllTags) {
        return false;
      }
    }

    if (state.query !== "") {
      var haystack = (
        project.name +
        " " +
        project.summary +
        " " +
        project.tags.join(" ")
      ).toLowerCase();
      if (haystack.indexOf(state.query) === -1) {
        return false;
      }
    }

    return true;
  }

  function createAccessibleLink(visibleText, hiddenSuffix, href, isExternal, extraClass) {
    var link = document.createElement("a");
    link.className = extraClass ? "card-link " + extraClass : "card-link";
    link.href = href;
    if (isExternal) {
      setExternalAnchor(link);
    }

    link.appendChild(document.createTextNode(visibleText));
    var srSpan = document.createElement("span");
    srSpan.className = "sr-only";
    srSpan.textContent = " " + hiddenSuffix;
    link.appendChild(srSpan);

    return link;
  }

  function createCiLink(project) {
    var link = document.createElement("a");
    link.className = "card-link card-link--ci";
    link.href = REPO_URL + "/actions/workflows/" + project.ci + ".yml";
    setExternalAnchor(link);

    var img = document.createElement("img");
    img.className = "ci-badge";
    img.src =
      REPO_URL +
      "/actions/workflows/" +
      project.ci +
      ".yml/badge.svg?branch=main";
    img.alt = "CI status for " + project.name;
    img.height = 20;

    var fallback = document.createElement("span");
    fallback.className = "ci-fallback";
    fallback.hidden = true;
    fallback.appendChild(document.createTextNode("CI"));
    var srSpan = document.createElement("span");
    srSpan.className = "sr-only";
    srSpan.textContent = " workflow for " + project.name;
    fallback.appendChild(srSpan);

    img.addEventListener("error", function () {
      img.hidden = true;
      fallback.hidden = false;
    });

    link.appendChild(img);
    link.appendChild(fallback);
    return link;
  }

  function buildCard(project) {
    var card = document.createElement("article");
    card.className = "project-card";
    card.dataset.category = project.category;

    var header = document.createElement("div");
    header.className = "card-header";

    var categoryEl = document.createElement("span");
    categoryEl.className = "card-category";
    categoryEl.textContent = project.category;

    var titleEl = document.createElement("h3");
    titleEl.className = "card-title";
    var titleLink = document.createElement("a");
    titleLink.className = "card-title-link";
    titleLink.href = buildDemoUrl(project);
    titleLink.textContent = project.name;
    titleEl.appendChild(titleLink);

    header.appendChild(categoryEl);
    header.appendChild(titleEl);
    card.appendChild(header);

    var summaryEl = document.createElement("p");
    summaryEl.className = "card-summary";
    summaryEl.textContent = project.summary;
    card.appendChild(summaryEl);

    var tagsList = document.createElement("ul");
    tagsList.className = "card-tags";
    var visibleTags = project.tags.slice(0, 5);
    visibleTags.forEach(function (tag) {
      var li = document.createElement("li");
      li.className = "card-tag";
      li.textContent = tag;
      tagsList.appendChild(li);
    });
    if (project.tags.length > 5) {
      var moreLi = document.createElement("li");
      moreLi.className = "card-tag card-tag--more";
      moreLi.textContent = "+" + (project.tags.length - 5);
      tagsList.appendChild(moreLi);
    }
    card.appendChild(tagsList);

    var footer = document.createElement("div");
    footer.className = "card-footer";

    if (project.evidence) {
      var evidenceEl = document.createElement("p");
      evidenceEl.className = "card-evidence";
      evidenceEl.textContent = project.evidence;
      footer.appendChild(evidenceEl);
    }

    var links = buildLinks(project);
    var linksRow = document.createElement("div");
    linksRow.className = "card-links";

    linksRow.appendChild(
      createAccessibleLink(
        "View demo",
        "of " + project.name,
        buildDemoUrl(project),
        false,
        "card-link--primary"
      )
    );
    // Client/private projects have no code in this repo: demo link only.
    if (project.folder || project.repoPath) {
      linksRow.appendChild(
        createAccessibleLink(
          "Folder",
          "of " + project.name,
          links.folderUrl,
          links.externalDocs
        )
      );
      linksRow.appendChild(
        createAccessibleLink(
          "README",
          "of " + project.name,
          links.readmeUrl,
          links.externalDocs
        )
      );
    }

    if (project.ci) {
      linksRow.appendChild(createCiLink(project));
    }

    footer.appendChild(linksRow);
    card.appendChild(footer);
    return card;
  }

  function renderGrid(filtered) {
    gridEl.textContent = "";
    var fragment = document.createDocumentFragment();
    filtered.forEach(function (project) {
      fragment.appendChild(buildCard(project));
    });
    gridEl.appendChild(fragment);

    var hasResults = filtered.length > 0;
    gridEl.hidden = !hasResults;
    emptyStateEl.hidden = hasResults;
  }

  function update() {
    var filtered = orderedProjects.filter(matchesFilters);
    renderGrid(filtered);
    syncChipStates();

    resultsCountEl.textContent =
      "Showing " +
      filtered.length +
      " of " +
      orderedProjects.length +
      " projects";

    var hasActiveFilters =
      state.query !== "" || state.category !== "all" || state.tags.size > 0;
    clearBtn.disabled = !hasActiveFilters;
  }

  function clearFilters(focusSearch) {
    state.query = "";
    state.category = "all";
    state.tags.clear();
    searchInput.value = "";
    update();
    if (focusSearch) {
      searchInput.focus();
    }
  }

  function getEffectiveTheme() {
    var explicit = document.documentElement.getAttribute("data-theme");
    if (explicit === "dark" || explicit === "light") {
      return explicit;
    }
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      return "dark";
    }
    return "light";
  }

  function syncThemeButton() {
    if (!themeToggleBtn) {
      return;
    }
    var isDark = getEffectiveTheme() === "dark";
    themeToggleBtn.setAttribute("aria-pressed", isDark ? "true" : "false");
  }

  function initTheme() {
    if (!themeToggleBtn) {
      return;
    }
    syncThemeButton();

    themeToggleBtn.addEventListener("click", function () {
      var next = getEffectiveTheme() === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch (e) {}
      syncThemeButton();
    });

    if (window.matchMedia) {
      var mq = window.matchMedia("(prefers-color-scheme: dark)");
      if (typeof mq.addEventListener === "function") {
        mq.addEventListener("change", syncThemeButton);
      }
    }
  }

  function initFooterLinks() {
    if (!isLocal) {
      if (projectsMdLink) {
        projectsMdLink.href = REPO_URL + "/blob/main/PROJECTS.md";
        setExternalAnchor(projectsMdLink);
      }
      if (workflowsLink) {
        workflowsLink.href = REPO_URL + "/tree/main/.github/workflows";
        setExternalAnchor(workflowsLink);
      }
    }
  }

  window.PortfolioShared = {
    REPO_URL: REPO_URL,
    isLocal: isLocal,
    setExternalAnchor: setExternalAnchor,
    buildDemoUrl: buildDemoUrl,
    buildLinks: buildLinks,
    buildSourceUrl: buildSourceUrl,
    createAccessibleLink: createAccessibleLink,
    createCiLink: createCiLink,
    initTheme: initTheme,
    initFooterLinks: initFooterLinks,
  };

  function init() {
    initTheme();
    initFooterLinks();

    if (
      !gridEl ||
      !categoryChipsEl ||
      !techChipsEl ||
      !searchInput ||
      !clearBtn ||
      !emptyClearBtn ||
      !resultsCountEl ||
      !emptyStateEl
    ) {
      return;
    }

    renderCategoryChips();
    renderTechChips(getTopTags(orderedProjects));

    searchInput.addEventListener("input", function () {
      state.query = searchInput.value.trim().toLowerCase();
      update();
    });

    clearBtn.addEventListener("click", function () {
      clearFilters(true);
    });

    emptyClearBtn.addEventListener("click", function () {
      clearFilters(true);
    });

    update();
  }

  init();
})();
