import { FormEvent, useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000",
});

interface DbResponse {
  status: string;
  database?: string | null;
  host?: string;
  port?: number;
  detail?: string;
}

interface Listing {
  listingID: number;
  sellerID: number;
  sellerName: string;
  categoryID: number;
  categoryName: string;
  courseID: number | null;
  courseLabel: string | null;
  title: string;
  description: string;
  listingCondition: string;
  isAuction: boolean;
  price: number;
  createdAt: string;
}

interface SellerOption {
  userID: number;
  name: string;
  email: string;
}

interface CategoryOption {
  categoryID: number;
  categoryName: string;
}

interface CourseOption {
  courseID: number;
  subjectPrefix: string;
  courseNumber: string;
  title: string;
  label: string;
}

interface ListingFormOptions {
  sellers: SellerOption[];
  categories: CategoryOption[];
  courses: CourseOption[];
}

interface ListingFormState {
  sellerID: string;
  categoryID: string;
  courseID: string;
  title: string;
  description: string;
  condition: string;
  price: string;
}

const emptyForm: ListingFormState = {
  sellerID: "",
  categoryID: "",
  courseID: "",
  title: "",
  description: "",
  condition: "Good",
  price: "",
};

function formatApiError(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
  }

  return fallback;
}

function App() {
  const [dbInfo, setDbInfo] = useState<DbResponse | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [formOptions, setFormOptions] = useState<ListingFormOptions>({
    sellers: [],
    categories: [],
    courses: [],
  });
  const [formState, setFormState] = useState<ListingFormState>(emptyForm);
  const [editingListingId, setEditingListingId] = useState<number | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageError, setPageError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const loadPageData = async () => {
    setIsBootstrapping(true);
    setPageError("");

    try {
      const [dbResponse, listingsResponse, optionsResponse] = await Promise.all([
        api.get<DbResponse>("/api/test-db"),
        api.get<Listing[]>("/api/listings"),
        api.get<ListingFormOptions>("/api/listing-form-options"),
      ]);

      setDbInfo(dbResponse.data);
      setListings(listingsResponse.data);
      setFormOptions(optionsResponse.data);
    } catch (error) {
      setDbInfo({
        status: "Error",
        detail: formatApiError(
          error,
          "Backend or database is currently unreachable from this machine.",
        ),
      });
      setPageError(
        "Listing data could not be loaded. Connect the backend to a local MySQL instance and try again.",
      );
    } finally {
      setIsBootstrapping(false);
    }
  };

  useEffect(() => {
    void loadPageData();
  }, []);

  const handleFieldChange = (
    field: keyof ListingFormState,
    value: string,
  ) => {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setFormState(emptyForm);
    setEditingListingId(null);
  };

  const beginEdit = (listing: Listing) => {
    setEditingListingId(listing.listingID);
    setActionMessage("");
    setFormState({
      sellerID: String(listing.sellerID),
      categoryID: String(listing.categoryID),
      courseID: listing.courseID ? String(listing.courseID) : "",
      title: listing.title,
      description: listing.description,
      condition: listing.listingCondition,
      price: String(listing.price),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const buildPayload = () => ({
    sellerID: Number(formState.sellerID),
    categoryID: Number(formState.categoryID),
    courseID: formState.courseID ? Number(formState.courseID) : null,
    title: formState.title.trim(),
    description: formState.description.trim(),
    condition: formState.condition.trim(),
    price: Number(formState.price),
    isAuction: false,
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setActionMessage("");

    try {
      const payload = buildPayload();

      if (editingListingId === null) {
        const response = await api.post<Listing>("/api/listings", payload);
        setListings((current) => [response.data, ...current]);
        setActionMessage(`Inserted listing #${response.data.listingID}.`);
      } else {
        const response = await api.put<Listing>(
          `/api/listings/${editingListingId}`,
          payload,
        );
        setListings((current) =>
          current.map((listing) =>
            listing.listingID === editingListingId ? response.data : listing,
          ),
        );
        setActionMessage(`Updated listing #${response.data.listingID}.`);
      }

      resetForm();
    } catch (error) {
      setActionMessage(
        formatApiError(
          error,
          "The save request could not be completed. Check backend logs and local MySQL availability.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (listing: Listing) => {
    const confirmed = window.confirm(
      `Delete listing #${listing.listingID} (${listing.title})?`,
    );

    if (!confirmed) {
      return;
    }

    setActionMessage("");

    try {
      await api.delete(`/api/listings/${listing.listingID}`);
      setListings((current) =>
        current.filter((item) => item.listingID !== listing.listingID),
      );

      if (editingListingId === listing.listingID) {
        resetForm();
      }

      setActionMessage(`Deleted listing #${listing.listingID}.`);
    } catch (error) {
      setActionMessage(
        formatApiError(
          error,
          "Delete failed. The selected listing may still be referenced by related tables.",
        ),
      );
    }
  };

  return (
    <div className="page-shell">
      <header className="hero-panel">
        <div>
          <p className="eyebrow">CS 4604 Phase 5</p>
          <h1>Hokie Market Listing Manager</h1>
          <p className="hero-copy">
            This screen is scoped to one realistic CRUD flow for the{" "}
            <code>listing</code> table using the FastAPI backend and local MySQL.
          </p>
        </div>

        <div className={`status-card ${dbInfo?.status === "Success" ? "ok" : "error"}`}>
          <h2>Database Status</h2>
          <p>
            {dbInfo?.status === "Success"
              ? `Connected to ${dbInfo.database} on ${dbInfo.host}:${dbInfo.port}`
              : "Connection not verified from this machine"}
          </p>
          {dbInfo?.detail ? <p className="status-detail">{dbInfo.detail}</p> : null}
        </div>
      </header>

      <main className="content-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">
                {editingListingId === null ? "Insert Flow" : "Update Flow"}
              </p>
              <h2>{editingListingId === null ? "Create Listing" : `Edit Listing #${editingListingId}`}</h2>
            </div>
            {editingListingId !== null ? (
              <button className="ghost-button" type="button" onClick={resetForm}>
                Cancel Edit
              </button>
            ) : null}
          </div>

          <form className="listing-form" onSubmit={handleSubmit}>
            <label>
              Seller
              <select
                required
                value={formState.sellerID}
                onChange={(event) => handleFieldChange("sellerID", event.target.value)}
              >
                <option value="">Select a seller</option>
                {formOptions.sellers.map((seller) => (
                  <option key={seller.userID} value={seller.userID}>
                    {seller.name} ({seller.email})
                  </option>
                ))}
              </select>
            </label>

            <label>
              Category
              <select
                required
                value={formState.categoryID}
                onChange={(event) => handleFieldChange("categoryID", event.target.value)}
              >
                <option value="">Select a category</option>
                {formOptions.categories.map((category) => (
                  <option key={category.categoryID} value={category.categoryID}>
                    {category.categoryName}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Course
              <select
                value={formState.courseID}
                onChange={(event) => handleFieldChange("courseID", event.target.value)}
              >
                <option value="">No course association</option>
                {formOptions.courses.map((course) => (
                  <option key={course.courseID} value={course.courseID}>
                    {course.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Title
              <input
                required
                value={formState.title}
                onChange={(event) => handleFieldChange("title", event.target.value)}
              />
            </label>

            <label className="full-width">
              Description
              <textarea
                required
                rows={4}
                value={formState.description}
                onChange={(event) => handleFieldChange("description", event.target.value)}
              />
            </label>

            <label>
              Condition
              <input
                required
                value={formState.condition}
                onChange={(event) => handleFieldChange("condition", event.target.value)}
              />
            </label>

            <label>
              Price
              <input
                required
                min="0.01"
                step="0.01"
                type="number"
                value={formState.price}
                onChange={(event) => handleFieldChange("price", event.target.value)}
              />
            </label>

            <div className="full-width form-actions">
              <button disabled={isSubmitting || isBootstrapping} type="submit">
                {isSubmitting
                  ? "Saving..."
                  : editingListingId === null
                    ? "Insert Listing"
                    : "Update Listing"}
              </button>
              <p className="helper-text">
                Auction row management is intentionally out of scope here. This form creates and edits standard listings only.
              </p>
            </div>
          </form>

          {actionMessage ? <p className="action-message">{actionMessage}</p> : null}
          {pageError ? <p className="error-text">{pageError}</p> : null}
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">Delete Flow</p>
              <h2>Existing Listings</h2>
            </div>
            <button className="ghost-button" type="button" onClick={() => void loadPageData()}>
              Refresh
            </button>
          </div>

          <p className="helper-text">
            Seeded listings may be protected by foreign-key references. For the cleanest delete demo, insert a new fixed-price listing and then delete that row.
          </p>

          {isBootstrapping ? (
            <p>Loading listing data...</p>
          ) : listings.length === 0 ? (
            <p>No listings are available to display.</p>
          ) : (
            <div className="listing-table-wrapper">
              <table className="listing-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Seller</th>
                    <th>Category</th>
                    <th>Course</th>
                    <th>Condition</th>
                    <th>Price</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((listing) => (
                    <tr key={listing.listingID}>
                      <td>{listing.listingID}</td>
                      <td>
                        <strong>{listing.title}</strong>
                        <div className="table-subtext">{listing.description}</div>
                      </td>
                      <td>{listing.sellerName}</td>
                      <td>{listing.categoryName}</td>
                      <td>{listing.courseLabel ?? "None"}</td>
                      <td>{listing.listingCondition}</td>
                      <td>${listing.price.toFixed(2)}</td>
                      <td className="table-actions">
                        <button type="button" onClick={() => beginEdit(listing)}>
                          Edit
                        </button>
                        <button
                          className="danger-button"
                          type="button"
                          onClick={() => void handleDelete(listing)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
