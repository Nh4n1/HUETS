import { Alert } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import {
  getCategoriesApi,
  getTagsByCategoryApi,
  getWardsApi,
} from "../../../shared/api/referenceApi";
import {
  executeLocationSearchApi,
  searchLocationsApi,
} from "../api/locationSearchApi";
import { searchPublicLocationsApi } from "../api/locationApi";
import { LocationFilters } from "../components/LocationFilters";
import { LocationResults } from "../components/LocationResults";
import { LocationSearchHero } from "../components/LocationSearchHero";
import { SearchInterpretation } from "../components/SearchInterpretation";
import styles from "./LocationsPage.module.css";

const PAGE_SIZE = 8;
const EMPTY_META = { page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 0 };
const getErrorMessage = (error, fallback) =>
  error.response?.data?.message ?? fallback;

export function LocationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const urlCategory = searchParams.get("categoryCode") ?? "";
  const urlWard = searchParams.get("wardCode") ?? "";
  const urlTags = searchParams.get("tagCodes") ?? "";
  const urlPreferredTags = searchParams.get("preferredTagCodes") ?? "";
  const urlSortBy = searchParams.get("sortBy") === "rating_desc"
    ? "rating_desc"
    : "relevance";
  const structuredUrl = searchParams.get("mode") === "filters";
  const urlOpenMode = searchParams.get("openMode");
  const urlOpenDay = Number(searchParams.get("openDay"));
  const urlOpenTime = searchParams.get("openTime");
  const urlOpenCondition = useMemo(() => urlOpenMode === "now"
    ? { mode: "now" }
    : urlOpenMode === "at" && urlOpenDay >= 1 && urlOpenDay <= 7 && urlOpenTime
      ? { mode: "at", dayOfWeek: urlOpenDay, time: urlOpenTime }
      : null, [urlOpenDay, urlOpenMode, urlOpenTime]);
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);
  const browseTags = useMemo(
    () => urlTags.split(",").filter(Boolean),
    [urlTags],
  );
  const browsePreferredTags = useMemo(
    () => urlPreferredTags.split(",").filter(Boolean),
    [urlPreferredTags],
  );

  const [locations, setLocations] = useState([]);
  const [meta, setMeta] = useState(EMPTY_META);
  const [criteria, setCriteria] = useState(null);
  const [interpretation, setInterpretation] = useState(null);
  const [notice, setNotice] = useState("");
  const [searchMode, setSearchMode] = useState(false);
  const [criteriaAdjusted, setCriteriaAdjusted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [categories, setCategories] = useState([]);
  const [wards, setWards] = useState([]);
  const [tagGroups, setTagGroups] = useState([]);
  const [referencesLoading, setReferencesLoading] = useState(true);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [referenceError, setReferenceError] = useState("");
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const searchRequestInFlight = useRef(false);

  const categoryCode = searchMode
    ? (criteria?.categoryCode ?? "")
    : urlCategory;
  const wardCode = searchMode ? (criteria?.wardCode ?? "") : urlWard;
  const requiredTagCodes = searchMode
    ? (criteria?.requiredTagCodes ?? [])
    : browseTags;
  const preferredTagCodes = searchMode
    ? (criteria?.preferredTagCodes ?? [])
    : browsePreferredTags;
  const sortBy = searchMode ? (criteria?.sortBy ?? "relevance") : urlSortBy;

  useEffect(() => {
    let active = true;
    Promise.all([getCategoriesApi(), getWardsApi()])
      .then(([categoryData, wardData]) => {
        if (!active) return;
        setCategories(categoryData);
        setWards(wardData);
        setReferenceError("");
      })
      .catch(
        (error) =>
          active &&
          setReferenceError(
            getErrorMessage(error, "Không thể tải danh mục và phường/xã."),
          ),
      )
      .finally(() => active && setReferencesLoading(false));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!categoryCode)
      return () => {
        active = false;
      };
    Promise.resolve().then(() => active && setTagsLoading(true));
    getTagsByCategoryApi(categoryCode)
      .then((result) => active && setTagGroups(result.groups ?? []))
      .catch(
        (error) =>
          active &&
          setReferenceError(
            getErrorMessage(error, "Không thể tải bộ lọc đặc điểm."),
          ),
      )
      .finally(() => active && setTagsLoading(false));
    return () => {
      active = false;
    };
  }, [categoryCode]);

  useEffect(() => {
    if (searchMode || structuredUrl) return undefined;
    let active = true;
    Promise.resolve().then(() => active && setLoading(true));
    searchPublicLocationsApi({
      page,
      pageSize: PAGE_SIZE,
      ...(query ? { q: query } : {}),
      ...(urlCategory ? { categoryCode: urlCategory } : {}),
      ...(urlWard ? { wardCode: urlWard } : {}),
      ...(urlTags ? { tagCodes: urlTags } : {}),
    })
      .then((payload) => {
        if (!active) return;
        setLocations(payload.data ?? []);
        setMeta(payload.meta ?? EMPTY_META);
        setErrorMessage("");
      })
      .catch((error) => {
        if (!active) return;
        setLocations([]);
        setErrorMessage(
          getErrorMessage(error, "Không thể tải danh sách địa điểm."),
        );
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [page, query, reloadKey, searchMode, structuredUrl, urlCategory, urlTags, urlWard]);

  const tagOptions = useMemo(
    () =>
      tagGroups.flatMap((group) =>
        group.tags.map((tag) => ({
          value: tag.code,
          label: tag.name,
        })),
      ),
    [tagGroups],
  );

  function updateSearchParams(updates) {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (
        value == null ||
        value === "" ||
        (Array.isArray(value) && !value.length)
      )
        next.delete(key);
      else
        next.set(key, Array.isArray(value) ? value.join(",") : String(value));
    });
    setSearchParams(next);
  }

  function applyPayload(payload) {
    const result = payload.data ?? {};
    setLocations(result.locations ?? []);
    setMeta(payload.meta ?? EMPTY_META);
    setCriteria(result.criteria ?? null);
    setInterpretation(result.interpretation ?? null);
    setNotice(result.notice ?? "");
    setSearchMode(Boolean(result.criteria));
    setErrorMessage("");
  }

  useEffect(() => {
    if (searchMode || !structuredUrl) return undefined;
    let active = true;
    Promise.resolve().then(() => active && setLoading(true));
    executeLocationSearchApi({
      criteria: {
        categoryCode: urlCategory || null,
        wardCode: urlWard || null,
        requiredTagCodes: browseTags,
        preferredTagCodes: browsePreferredTags,
        keywords: [],
        openCondition: urlOpenCondition,
        sortBy: urlSortBy,
      },
      page,
      pageSize: PAGE_SIZE,
    }).then((payload) => {
      if (!active) return;
      applyPayload(payload);
      setCriteriaAdjusted(true);
    }).catch((error) => {
      if (!active) return;
      setLocations([]);
      setErrorMessage(getErrorMessage(error, "KhÃ´ng thá»ƒ Ã¡p dá»¥ng tiÃªu chÃ­ tÃ¬m kiáº¿m."));
    }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [browsePreferredTags, browseTags, page, searchMode, structuredUrl, urlCategory, urlOpenCondition, urlSortBy, urlWard]);

  async function runCriteria(
    nextCriteria,
    nextPage = 1,
    { markAdjusted = false } = {},
  ) {
    if (markAdjusted) setCriteriaAdjusted(true);
    const executableCriteria = markAdjusted
      ? { ...nextCriteria, keywords: [] }
      : nextCriteria;
    const useStructuredUrl = markAdjusted || criteriaAdjusted;
    setLoading(true);
    setErrorMessage("");
    try {
      const payload = await executeLocationSearchApi({
        criteria: executableCriteria,
        page: nextPage,
        pageSize: PAGE_SIZE,
      });
      applyPayload(payload);
      updateSearchParams({
        q: useStructuredUrl ? undefined : query,
        mode: useStructuredUrl ? "filters" : undefined,
        categoryCode: executableCriteria.categoryCode,
        wardCode: executableCriteria.wardCode,
        tagCodes: executableCriteria.requiredTagCodes,
        preferredTagCodes: useStructuredUrl
          ? executableCriteria.preferredTagCodes
          : undefined,
        openMode: useStructuredUrl ? executableCriteria.openCondition?.mode : undefined,
        openDay: useStructuredUrl && executableCriteria.openCondition?.mode === "at"
          ? executableCriteria.openCondition.dayOfWeek
          : undefined,
        openTime: useStructuredUrl && executableCriteria.openCondition?.mode === "at"
          ? executableCriteria.openCondition.time
          : undefined,
        sortBy: useStructuredUrl && executableCriteria.sortBy !== "relevance"
          ? executableCriteria.sortBy
          : undefined,
        page: nextPage === 1 ? undefined : nextPage,
      });
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "Không thể áp dụng tiêu chí tìm kiếm."),
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(value) {
    if (searchRequestInFlight.current) return;
    const nextQuery = value.trim();
    if (!nextQuery) {
      setCriteria(null);
      setInterpretation(null);
      setNotice("");
      setSearchMode(false);
      setCriteriaAdjusted(false);
      setSearchParams({});
      return;
    }
    searchRequestInFlight.current = true;
    setCriteriaAdjusted(false);
    setLoading(true);
    setErrorMessage("");
    setSearchParams({ q: nextQuery });
    try {
      applyPayload(
        await searchLocationsApi({
          query: nextQuery,
          page: 1,
          pageSize: PAGE_SIZE,
        }),
      );
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Không thể tìm kiếm địa điểm."));
    } finally {
      searchRequestInFlight.current = false;
      setLoading(false);
    }
  }

  function changeCriteria(patch) {
    const currentCriteria = criteria ?? {
      categoryCode: urlCategory || null,
      wardCode: urlWard || null,
      requiredTagCodes: browseTags,
      preferredTagCodes: browsePreferredTags,
      keywords: query ? [query.slice(0, 50)] : [],
      openCondition: urlOpenCondition,
      sortBy: "relevance",
    };
    return runCriteria(
      { ...currentCriteria, ...patch },
      1,
      { markAdjusted: true },
    );
  }

  function removeChip(type, code) {
    if (!criteria) return;
    if (type === "category")
      runCriteria(
        { ...criteria, categoryCode: null, requiredTagCodes: [], preferredTagCodes: [] },
        1,
        { markAdjusted: true },
      );
    if (type === "ward")
      runCriteria({ ...criteria, wardCode: null }, 1, { markAdjusted: true });
    if (type === "required")
      runCriteria(
        { ...criteria, requiredTagCodes: criteria.requiredTagCodes.filter((item) => item !== code) },
        1,
        { markAdjusted: true },
      );
    if (type === "preferred")
      runCriteria(
        { ...criteria, preferredTagCodes: criteria.preferredTagCodes.filter((item) => item !== code) },
        1,
        { markAdjusted: true },
      );
    if (type === "opening")
      runCriteria({ ...criteria, openCondition: null }, 1, { markAdjusted: true });
  }

  function resetCriteria() {
    setCriteria(null);
    setInterpretation(null);
    setNotice("");
    setSearchMode(false);
    setCriteriaAdjusted(false);
    setSearchParams(query ? { q: query } : {});
  }

  const activeFilterCount =
    Number(Boolean(categoryCode)) +
    Number(Boolean(wardCode)) +
    requiredTagCodes.length +
    preferredTagCodes.length;
  const activeCriteriaCount = activeFilterCount + Number(Boolean(criteria?.openCondition));

  return (
    <main className={styles.page}>
      <LocationSearchHero
        key={query}
        query={query}
        loading={loading}
        onSearch={handleSearch}
      />
      <div className={styles.content}>
        <LocationFilters
          open={filterDrawerOpen}
          activeFilterCount={activeCriteriaCount}
          referenceError={referenceError}
          categoryCode={categoryCode}
          wardCode={wardCode}
          requiredTagCodes={requiredTagCodes}
          preferredTagCodes={preferredTagCodes}
          categories={categories}
          wards={wards}
          tagOptions={tagOptions}
          referencesLoading={referencesLoading}
          tagsLoading={tagsLoading}
          onClose={() => setFilterDrawerOpen(false)}
          onReset={resetCriteria}
          onCategoryChange={(value) =>
            changeCriteria({
              categoryCode: value ?? null,
              requiredTagCodes: [],
              preferredTagCodes: [],
            })
          }
          onWardChange={(value) => changeCriteria({ wardCode: value ?? null })}
          onRequiredTagsChange={(value) =>
            changeCriteria({
              requiredTagCodes: value,
              preferredTagCodes: preferredTagCodes.filter(
                (code) => !value.includes(code),
              ),
            })
          }
          onPreferredTagsChange={(value) =>
            changeCriteria({
              preferredTagCodes: value,
              requiredTagCodes: requiredTagCodes.filter(
                (code) => !value.includes(code),
              ),
            })
          }
        />
        <div className={styles.resultColumn}>
          {notice ? (
            <Alert
              className={styles.notice}
              type="warning"
              showIcon
              message={notice}
              closable
              onClose={() => setNotice("")}
            />
          ) : null}
          <SearchInterpretation
            interpretation={interpretation}
            onRemove={removeChip}
          />
          <LocationResults
            query={query}
            locations={locations}
            meta={meta}
            page={meta.page ?? page}
            pageSize={PAGE_SIZE}
            loading={loading}
            errorMessage={errorMessage}
            activeFilterCount={activeCriteriaCount}
            hasCriteria={Boolean(query || activeCriteriaCount)}
            sortBy={sortBy}
            criteriaAdjusted={criteriaAdjusted}
            onSortChange={(value) =>
              criteria
                ? runCriteria({ ...criteria, sortBy: value }, 1, { markAdjusted: true })
                : runCriteria({
                    categoryCode: categoryCode || null,
                    wardCode: wardCode || null,
                    requiredTagCodes,
                    preferredTagCodes: [],
                    keywords: query ? [query.slice(0, 50)] : [],
                    openCondition: null,
                    sortBy: value,
                  }, 1, { markAdjusted: true })
            }
            onOpenFilters={() => setFilterDrawerOpen(true)}
            onRetry={() =>
              criteria
                ? runCriteria(criteria, page)
                : setReloadKey((value) => value + 1)
            }
            onResetCriteria={resetCriteria}
            onPageChange={(nextPage) => {
              if (criteria) runCriteria(criteria, nextPage);
              else
                updateSearchParams({
                  page: nextPage === 1 ? undefined : nextPage,
                });
              document
                .getElementById("location-results-heading")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          />
        </div>
      </div>
    </main>
  );
}
