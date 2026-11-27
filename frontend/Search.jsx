import PersonIdentity, { realNames, postName } from "./PersonIdentity";
import React, { useState, useEffect, useRef } from "react";
const noLocalItems = [];

export default function Search({
  en = false,
  desktopSearch = false,
  localItems = noLocalItems,
  onSelectNotice,
}) {
  const [query, setQuery] = useState(""),
    [items, setItems] = useState([]),
    [status, setStatus] = useState("idle"),
    [open, setOpen] = useState(false),
    [active, setActive] = useState(-1);
  const box = useRef(),
    input = useRef();
  const t = (a, b) => (en ? b : a);
  useEffect(() => {
    const controller = new AbortController();
    setActive(-1);
    if (!query.trim()) {
      setItems([]);
      setStatus("idle");
      return;
    }
    setItems([]);
    setStatus("loading");
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ keyword: query.trim(), lang: en ? "en" : "zh" });
        const options = { signal: controller.signal };
        const [clubResult, postsResult, peopleResult] = await Promise.allSettled([
          fetch("/api/club/search?" + params, options).then(async (r) => {
            const d = await r.json();
            if (!r.ok || d.code !== 200) throw Error();
            return d;
          }),
          fetch("/api/campus-social/posts?" + params, options).then((r) =>
            r.ok ? r.json() : { items: [] },
          ),
          fetch("/api/campus-social/users?" + params, options).then((r) => (r.ok ? r.json() : [])),
        ]);
        if (controller.signal.aborted) return;
        const term = query.trim().toLocaleLowerCase();
        const matches = localItems
          .filter((item) =>
            [item.name, item.brief, item.keywords].some((value) =>
              value?.toLocaleLowerCase().includes(term),
            ),
          )
          .slice(0, 4);
        if (clubResult.status !== "fulfilled" && !matches.length) throw Error();
        const data = clubResult.value,
          posts = postsResult.status === "fulfilled" ? postsResult.value.items || [] : [],
          people = peopleResult.status === "fulfilled" ? peopleResult.value : [];
        setItems([
          ...matches,
          ...(data?.data || []).slice(0, 3),
          ...people.slice(0, 3).map((p) => ({
            id: "person-" + p.id,
            name: realNames(p),
            person: p,
            path: "/page/user/home?account=" + p.id,
          })),
          ...(posts || []).slice(0, 3).map((p) => ({
            id: "post-" + p.id,
            name: p.text.slice(0, 50),
            brief: t("校园帖子", "Campus post"),
            path: "/page/wall?keyword=" + encodeURIComponent(query.trim()) + "#post-" + p.id,
          })),
        ]);
        setStatus("ready");
      } catch (e) {
        if (e.name !== "AbortError") {
          setItems([]);
          setStatus("error");
        }
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, en, localItems]);
  useEffect(() => {
    const close = (e) => {
      if (!box.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  useEffect(() => {
    if (!desktopSearch) return;
    const shortcut = (event) => {
      if (
        !(event.ctrlKey || event.metaKey) ||
        event.key.toLowerCase() !== "k" ||
        document.querySelector("dialog[open], [role='dialog'][aria-modal='true']")
      )
        return;
      event.preventDefault();
      input.current?.focus();
      setOpen(true);
    };
    document.addEventListener("keydown", shortcut);
    return () => document.removeEventListener("keydown", shortcut);
  }, [desktopSearch]);
  const path = (item) => item.path || "/page/clubs/" + item.id;
  const selectNotice = (item) => {
    setOpen(false);
    onSelectNotice?.(item.notice);
  };
  const submit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    const item = items[active];
    if (item?.notice) {
      selectNotice(item);
      return;
    }
    location.assign(
      active >= 0 && items[active]
        ? path(items[active])
        : "/page/search?" + new URLSearchParams({ keyword: query.trim(), lang: en ? "en" : "zh" }),
    );
  };
  return (
    <form
      ref={box}
      className={desktopSearch ? "club-search desk-search" : "club-search"}
      role="search"
      onSubmit={submit}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <svg className="club-search-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4.5 4.5" />
      </svg>
      <input
        ref={input}
        id={desktopSearch ? "desk-global-search" : "search-input"}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && !!query.trim()}
        aria-controls="club-search-results"
        aria-activedescendant={active >= 0 ? "club-search-option-" + active : undefined}
        aria-label={desktopSearch ? t("全局搜索", "Global search") : t("搜索社团", "Search clubs")}
        aria-keyshortcuts={
          desktopSearch
            ? window.clubDesktop?.platform === "darwin"
              ? "Meta+K"
              : "Control+K"
            : undefined
        }
        value={query}
        maxLength={desktopSearch ? 80 : undefined}
        placeholder={
          desktopSearch
            ? t("搜索社团、活动、成员或公告", "Search clubs, events, members or announcements")
            : t("搜索社团、姓名、昵称或帖子", "Search clubs, people or posts")
        }
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            setActive(-1);
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((v) => Math.min(v + 1, items.length - 1));
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((v) => Math.max(-1, v - 1));
          }
        }}
        autoComplete="off"
      />
      {query && (
        <button
          className="club-search-clear"
          type="button"
          aria-label={t("清空搜索", "Clear search")}
          onClick={() => {
            setQuery("");
            setActive(-1);
            input.current.focus();
          }}
        >
          ×
        </button>
      )}
      {desktopSearch ? (
        <kbd>{window.clubDesktop?.platform === "darwin" ? "⌘ + K" : "Ctrl + K"}</kbd>
      ) : (
        <button className="club-search-submit" type="submit" aria-label={t("搜索", "Search")}>
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6 18 18 6M6 6h12v12" />
          </svg>
        </button>
      )}
      {open && query.trim() && (
        <div className="club-search-dropdown">
          <div className="club-search-meta" role="status">
            {status === "loading"
              ? t("搜索中…", "Searching…")
              : status === "error"
                ? t(
                    "搜索暂不可用，请修改关键词重试",
                    "Search unavailable. Edit your query to retry.",
                  )
                : items.length
                  ? t("搜索结果", "Results")
                  : desktopSearch
                    ? t("没有匹配结果", "No matching results")
                    : t(
                        "暂时没有匹配的社团，试试其他关键词",
                        "No clubs found. Try another keyword.",
                      )}
          </div>
          <div
            id="club-search-results"
            role="listbox"
            aria-label={t("匹配的社团", "Matching clubs")}
          >
            {status === "ready" &&
              items.slice(0, 13).map((item, i) => {
                const Tag = item.notice ? "button" : "a";
                return (
                  <Tag
                    id={"club-search-option-" + i}
                    key={item.id || i}
                    role="option"
                    aria-selected={active === i}
                    className="club-search-result"
                    href={item.notice ? undefined : path(item)}
                    type={item.notice ? "button" : undefined}
                    onClick={item.notice ? () => selectNotice(item) : undefined}
                    tabIndex={-1}
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <span className="club-search-monogram">{(item.name || "C").slice(0, 1)}</span>
                    <span>
                      {item.person ? (
                        <PersonIdentity person={item.person} english={en} query={query} />
                      ) : (
                        <>
                          <strong>{en ? item.nameEn || item.name : item.name}</strong>
                          <small>
                            {item.brief ||
                              item.description ||
                              t("查看社团详情", "View club details")}
                          </small>
                        </>
                      )}
                    </span>
                    <span>↗</span>
                  </Tag>
                );
              })}
          </div>
          {items.length > 0 && status === "ready" && (
            <a
              className="club-search-all"
              href={"/page/search?" + new URLSearchParams({ keyword: query.trim() })}
            >
              {t("查看全部结果", "View all results")} →
            </a>
          )}
        </div>
      )}
    </form>
  );
}
