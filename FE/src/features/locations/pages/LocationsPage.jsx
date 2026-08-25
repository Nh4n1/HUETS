import { Alert } from "antd";
import { useEffect, useMemo, useState } from "react";
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
import { BrowseActiveFilters } from "../components/BrowseActiveFilters";
import { LocationResults } from "../components/LocationResults";
import { LocationSearchHero } from "../components/LocationSearchHero";
import { SearchInterpretation } from "../components/SearchInterpretation";
import {
  buildBrowseFilterItems,
  buildBrowseResetParams,
  parseCodeList,
  removeBrowseFilter,
  replaceTagGroupSelection,
} from "../locationBrowseFilters";
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
  const requestedSort = searchParams.get("sortBy");
  const urlSortBy = ["rating_desc", "newest"].includes(requestedSort)
    ? requestedSort
    : "recommended";
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
    () => parseCodeList(urlTags),
    [urlTags],
  );
  const structuredPreferredTags = useMemo(
    () => structuredUrl ? parseCodeList(urlPreferredTags) : [],
    [structuredUrl, urlPreferredTags],
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
  const filterMode = query || searchMode || structuredUrl ? "search" : "browse";

  const categoryCode = searchMode
    ? (criteria?.categoryCode ?? "")
    : urlCategory;
  const wardCode = searchMode ? (criteria?.wardCode ?? "") : urlWard;
  const requiredTagCodes = searchMode
    ? (criteria?.requiredTagCodes ?? [])
    : browseTags;
  const preferredTagCodes = searchMode
    ? (criteria?.preferredTagCodes ?? [])
    : structuredPreferredTags;
  const sortBy = filterMode === "search"
    ? (criteria?.sortBy ?? (requestedSort === "rating_desc" ? "rating_desc" : "relevance"))
    : urlSortBy;

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
    if (!categoryCode) {
      Promise.resolve().then(() => active && setTagGroups([]));
      return () => {
        active = false;
      };
    }
    Promise.resolve().then(() => {
      if (!active) return;
      setTagGroups([]);
      setTagsLoading(true);
    });
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
    if (searchMode || structuredUrl || query) return undefined;
    let active = true;
    Promise.resolve().then(() => active && setLoading(true));
    searchPublicLocationsApi({
      page,
      pageSize: PAGE_SIZE,
      ...(urlCategory ? { categoryCode: urlCategory } : {}),
      ...(urlWard ? { wardCode: urlWard } : {}),
      ...(urlTags ? { tagCodes: urlTags } : {}),
      sortBy: urlSortBy,
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
  }, [page, query, reloadKey, searchMode, structuredUrl, urlCategory, urlSortBy, urlTags, urlWard]);

  useEffect(() => {
    if (!query || searchMode || structuredUrl) return undefined;
    let active = true;
    Promise.resolve().then(() => active && setLoading(true));
    searchLocationsApi({ query, page, pageSize: PAGE_SIZE })
      .then((payload) => active && applyPayload(payload))
      .catch((error) => {
        if (!active) return;
        setLocations([]);
        setErrorMessage(getErrorMessage(error, "Không thể tìm kiếm địa điểm."));
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [page, query, reloadKey, searchMode, structuredUrl]);

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

  const browseFilterItems = useMemo(() => buildBrowseFilterItems({
    categoryCode: urlCategory,
    wardCode: urlWard,
    tagCodes: browseTags,
    categories,
    wards,
    tagGroups,
  }), [browseTags, categories, tagGroups, urlCategory, urlWard, wards]);

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
        preferredTagCodes: structuredPreferredTags,
        keywords: [],
        openCondition: urlOpenCondition,
        sortBy: requestedSort === "rating_desc" ? "rating_desc" : "relevance",
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
      setErrorMessage(getErrorMessage(error, "Không thể áp dụng tiêu chí tìm kiếm."));
    }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [browseTags, page, requestedSort, searchMode, structuredPreferredTags, structuredUrl, urlCategory, urlOpenCondition, urlSortBy, urlWard]);

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

  function handleSearch(value) {
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
    setCriteriaAdjusted(false);
    setErrorMessage("");
    setCriteria(null);
    setInterpretation(null);
    setSearchMode(false);
    setSearchParams({ q: nextQuery });
  }

  function updateBrowseFilters(patch) {
    updateSearchParams({ ...patch, preferredTagCodes: undefined, page: undefined });
  }

  function updateSearchCriteria(patch) {
    const currentCriteria = criteria ?? {
      categoryCode: urlCategory || null,
      wardCode: urlWard || null,
      requiredTagCodes: browseTags,
      preferredTagCodes: structuredPreferredTags,
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

  function resetSearchCriteria() {
    setCriteria(null);
    setInterpretation(null);
    setNotice("");
    setSearchMode(false);
    setCriteriaAdjusted(false);
    setSearchParams({});
  }

  function resetBrowseFilters() {
    setSearchParams(buildBrowseResetParams(urlSortBy));
  }

  function removeBrowseFilterItem(filter) {
    setSearchParams(removeBrowseFilter(searchParams, filter));
  }

  const searchFilterCount =
    Number(Boolean(categoryCode)) +
    Number(Boolean(wardCode)) +
    requiredTagCodes.length +
    preferredTagCodes.length;
  const activeCriteriaCount = filterMode === "browse"
    ? browseFilterItems.length
    : searchFilterCount + Number(Boolean(criteria?.openCondition));

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
          mode={filterMode}
          open={filterDrawerOpen}
          activeFilterCount={activeCriteriaCount}
          referenceError={referenceError}
          categoryCode={categoryCode}
          wardCode={wardCode}
          requiredTagCodes={requiredTagCodes}
          preferredTagCodes={preferredTagCodes}
          categories={categories}
          wards={wards}
          tagGroups={tagGroups}
          tagOptions={tagOptions}
          referencesLoading={referencesLoading}
          tagsLoading={tagsLoading}
          onClose={() => setFilterDrawerOpen(false)}
          onReset={filterMode === "browse" ? resetBrowseFilters : resetSearchCriteria}
          onCategoryChange={(value) => filterMode === "browse"
            ? updateBrowseFilters({ categoryCode: value, tagCodes: undefined })
            : updateSearchCriteria({ categoryCode: value ?? null, requiredTagCodes: [], preferredTagCodes: [] })}
          onWardChange={(value) => filterMode === "browse"
            ? updateBrowseFilters({ wardCode: value })
            : updateSearchCriteria({ wardCode: value ?? null })}
          onBrowseTagGroupChange={(group, selectedCodes) => updateBrowseFilters({
            tagCodes: replaceTagGroupSelection(browseTags, group, selectedCodes),
          })}
          onRequiredTagsChange={(value) =>
            updateSearchCriteria({
              requiredTagCodes: value,
              preferredTagCodes: preferredTagCodes.filter(
                (code) => !value.includes(code),
              ),
            })
          }
          onPreferredTagsChange={(value) =>
            updateSearchCriteria({
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
              title={notice}
              closable
              onClose={() => setNotice("")}
            />
          ) : null}
          <SearchInterpretation
            interpretation={filterMode === "search" ? interpretation : null}
            onRemove={removeChip}
          />
          {filterMode === "browse" ? (
            <BrowseActiveFilters filters={browseFilterItems} onRemove={removeBrowseFilterItem} onClear={resetBrowseFilters} />
          ) : null}
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
            searchMode={filterMode === "search"}
            onSortChange={(value) =>
              criteria
                ? runCriteria({ ...criteria, sortBy: value }, 1, { markAdjusted: true })
                : updateSearchParams({ sortBy: value === "recommended" ? undefined : value, page: undefined })
            }
            onOpenFilters={() => setFilterDrawerOpen(true)}
            onRetry={() =>
              criteria
                ? runCriteria(criteria, page)
                : setReloadKey((value) => value + 1)
            }
            onResetCriteria={filterMode === "browse" ? resetBrowseFilters : resetSearchCriteria}
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
