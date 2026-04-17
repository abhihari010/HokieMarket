import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import axios from "axios";
import type { AxiosRequestConfig } from "axios";
import "./HokieMartAppV2.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";
const TOKEN_STORAGE_KEY = "hokie_mart_token";

type UserRole = "buyer" | "seller" | "admin";
type AuthScreen = "login" | "signup";
type ActiveTab = "browse" | "sell" | "mine" | "account" | "admin";

interface SessionUser {
  userID: number;
  name: string;
  email: string;
  role: UserRole;
  phoneNo?: string;
  createdAt?: string;
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

interface ListingFormOptionsResponse {
  sellers: Array<{
    userID: number;
    name: string;
    email: string;
  }>;
  categories: CategoryOption[];
  courses: CourseOption[];
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
  status: string;
  createdAt: string;
  auctionID?: number | null;
  auctionEndTime?: string | null;
  minimumPrice?: number | null;
  highestBid?: number | null;
  bidCount?: number;
  currentPrice?: number;
  imageUrls?: string[];
}

interface AuthResponse {
  user: SessionUser;
  token: string;
  expiresAt: string;
}

interface LoginFormState {
  email: string;
  password: string;
}

interface SignupFormState {
  name: string;
  email: string;
  phoneNo: string;
  role: "buyer" | "seller";
  password: string;
  confirmPassword: string;
}

interface PasswordFormState {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

interface AdminCreateUserState {
  name: string;
  email: string;
  phoneNo: string;
  role: UserRole;
  password: string;
}

interface ListingFormState {
  categoryID: string;
  courseID: string;
  title: string;
  description: string;
  condition: string;
  price: string;
  isAuction: boolean;
  minimumPrice: string;
  auctionEndTime: string;
  imageUrlInput: string;
  imageUrls: string[];
}

interface TopCategoryReport {
  categoryID: number;
  categoryName: string;
  listingCount: number;
  soldCount: number;
  averageSalePrice: number;
}

interface SellerPerformanceReport {
  sellerID: number;
  sellerName: string;
  listingCount: number;
  closedListingCount: number;
  averageRating: number;
  grossSales: number;
}

const emptyLoginForm: LoginFormState = {
  email: "",
  password: "",
};

const emptySignupForm: SignupFormState = {
  name: "",
  email: "",
  phoneNo: "",
  role: "buyer",
  password: "",
  confirmPassword: "",
};

const emptyPasswordForm: PasswordFormState = {
  currentPassword: "",
  newPassword: "",
  confirmNewPassword: "",
};

const emptyAdminUserForm: AdminCreateUserState = {
  name: "",
  email: "",
  phoneNo: "",
  role: "buyer",
  password: "",
};

const emptyListingForm: ListingFormState = {
  categoryID: "",
  courseID: "",
  title: "",
  description: "",
  condition: "Good",
  price: "",
  isAuction: false,
  minimumPrice: "",
  auctionEndTime: "",
  imageUrlInput: "",
  imageUrls: [],
};

const api = axios.create({
  baseURL: API_BASE_URL,
});

function getStoredToken(): string {
  return localStorage.getItem(TOKEN_STORAGE_KEY) ?? "";
}

function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

function authConfig(token: string): AxiosRequestConfig {
  if (!token) {
    return {};
  }

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

function formatApiError(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;

    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }

    if (Array.isArray(detail) && detail.length > 0) {
      return detail
        .map((item) => {
          if (typeof item?.msg === "string") {
            return item.msg;
          }
          return "Request validation error";
        })
        .join(", ");
    }
  }

  return fallback;
}

function money(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "$0.00";
  }
  return `$${value.toFixed(2)}`;
}

function prettyDate(value: string | null | undefined): string {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function toLocalDatetimeInputValue(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  const local = new Date(date.getTime() - offsetMs);
  return local.toISOString().slice(0, 16);
}

function HokieMartAppV2() {
  const [token, setToken] = useState<string>(getStoredToken());
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [authScreen, setAuthScreen] = useState<AuthScreen>("login");
  const [activeTab, setActiveTab] = useState<ActiveTab>("browse");

  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [topCategories, setTopCategories] = useState<TopCategoryReport[]>([]);
  const [sellerPerformance, setSellerPerformance] = useState<
    SellerPerformanceReport[]
  >([]);

  const [listingForm, setListingForm] =
    useState<ListingFormState>(emptyListingForm);
  const [editingListingId, setEditingListingId] = useState<number | null>(null);

  const [loginForm, setLoginForm] = useState<LoginFormState>(emptyLoginForm);
  const [signupForm, setSignupForm] = useState<SignupFormState>(emptySignupForm);
  const [passwordForm, setPasswordForm] =
    useState<PasswordFormState>(emptyPasswordForm);
  const [adminUserForm, setAdminUserForm] =
    useState<AdminCreateUserState>(emptyAdminUserForm);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [modeFilter, setModeFilter] = useState<"all" | "fixed" | "auction">(
    "all",
  );
  const [statusFilter, setStatusFilter] = useState("active");

  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isListingSaving, setIsListingSaving] = useState(false);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [isAdminSaving, setIsAdminSaving] = useState(false);

  const [pageMessage, setPageMessage] = useState("");
  const [pageError, setPageError] = useState("");

  const canSell = sessionUser?.role === "seller" || sessionUser?.role === "admin";
  const isAdmin = sessionUser?.role === "admin";

  const clearFeedback = () => {
    setPageMessage("");
    setPageError("");
  };

  const loadSession = async (authToken: string) => {
    if (!authToken) {
      setSessionUser(null);
      return;
    }

    const response = await api.get<SessionUser>("/api/me", authConfig(authToken));
    setSessionUser(response.data);
  };

  const loadPublicListings = async () => {
    const params: Record<string, string | boolean> = {};

    if (searchTerm.trim()) {
      params.search = searchTerm.trim();
    }

    if (categoryFilter) {
      params.categoryID = categoryFilter;
    }

    if (modeFilter === "auction") {
      params.isAuction = true;
    } else if (modeFilter === "fixed") {
      params.isAuction = false;
    }

    if (statusFilter) {
      params.status = statusFilter;
    }

    const response = await api.get<Listing[]>("/api/listings", { params });
    setListings(response.data);
  };

  const loadProtectedOptions = async (authToken: string) => {
    if (!authToken) {
      setCategories([]);
      setCourses([]);
      return;
    }

    const response = await api.get<ListingFormOptionsResponse>(
      "/api/listing-form-options",
      authConfig(authToken),
    );

    setCategories(response.data.categories ?? []);
    setCourses(response.data.courses ?? []);
  };

  const loadTopCategories = async (authToken: string) => {
    if (!authToken) {
      setTopCategories([]);
      return;
    }

    try {
      const response = await api.get<TopCategoryReport[]>(
        "/api/analytics/top-categories",
        authConfig(authToken),
      );
      setTopCategories(response.data);
    } catch {
      setTopCategories([]);
    }
  };

  const loadSellerPerformance = async (authToken: string) => {
    if (!authToken) {
      setSellerPerformance([]);
      return;
    }

    try {
      const response = await api.get<SellerPerformanceReport[]>(
        "/api/analytics/seller-performance",
        authConfig(authToken),
      );
      setSellerPerformance(response.data);
    } catch {
      setSellerPerformance([]);
    }
  };

  const bootstrap = async (authToken: string) => {
    setIsPageLoading(true);

    try {
      await loadPublicListings();

      if (authToken) {
        try {
          await loadSession(authToken);
          await Promise.all([
            loadProtectedOptions(authToken),
            loadTopCategories(authToken),
            loadSellerPerformance(authToken),
          ]);
        } catch {
          clearStoredToken();
          setToken("");
          setSessionUser(null);
          setCategories([]);
          setCourses([]);
          setTopCategories([]);
          setSellerPerformance([]);
        }
      } else {
        setSessionUser(null);
        setCategories([]);
        setCourses([]);
        setTopCategories([]);
        setSellerPerformance([]);
      }
    } catch (error) {
      setPageError(
        formatApiError(
          error,
          "Could not load Hokie Mart. Check your backend and database connection.",
        ),
      );
    } finally {
      setIsPageLoading(false);
    }
  };

  useEffect(() => {
    void bootstrap(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadPublicListings().catch((error) => {
        setPageError(
          formatApiError(error, "Could not refresh listings from the server."),
        );
      });
    }, 250);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, categoryFilter, modeFilter, statusFilter]);

  const marketplaceStats = useMemo(() => {
    const totalListings = listings.length;
    const auctionCount = listings.filter((listing) => listing.isAuction).length;
    const fixedCount = totalListings - auctionCount;

    const averageVisiblePrice =
      totalListings === 0
        ? 0
        : listings.reduce(
            (sum, listing) => sum + (listing.currentPrice ?? listing.price),
            0,
          ) / totalListings;

    return {
      totalListings,
      auctionCount,
      fixedCount,
      averageVisiblePrice,
    };
  }, [listings]);

  const myListings = useMemo(() => {
    if (!sessionUser) {
      return [];
    }

    if (sessionUser.role === "admin") {
      return listings;
    }

    return listings.filter((listing) => listing.sellerID === sessionUser.userID);
  }, [listings, sessionUser]);

  const canManageListing = (listing: Listing): boolean => {
    if (!sessionUser) {
      return false;
    }

    return sessionUser.role === "admin" || listing.sellerID === sessionUser.userID;
  };

  const resetListingForm = () => {
    setListingForm(emptyListingForm);
    setEditingListingId(null);
  };

  const handleAuthSuccess = async (response: AuthResponse, message: string) => {
    setStoredToken(response.token);
    setToken(response.token);
    setSessionUser(response.user);
    setPageMessage(message);
    setPageError("");
    setAuthScreen("login");
    setActiveTab("browse");
      await Promise.all([
        loadProtectedOptions(response.token).catch(() => undefined),
        loadTopCategories(response.token).catch(() => undefined),
        loadSellerPerformance(response.token).catch(() => undefined),
        loadPublicListings(),
      ]);
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearFeedback();
    setIsAuthLoading(true);

    try {
      const response = await api.post<AuthResponse>("/api/auth/login", {
        email: loginForm.email.trim(),
        password: loginForm.password,
      });

      await handleAuthSuccess(response.data, "Signed in successfully.");
      setLoginForm(emptyLoginForm);
    } catch (error) {
      setPageError(
        formatApiError(error, "Login failed. Check your email and password."),
      );
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearFeedback();

    if (signupForm.password !== signupForm.confirmPassword) {
      setPageError("Passwords do not match.");
      return;
    }

    setIsAuthLoading(true);

    try {
      const response = await api.post<AuthResponse>("/api/auth/signup", {
        name: signupForm.name.trim(),
        email: signupForm.email.trim(),
        phoneNo: signupForm.phoneNo.trim(),
        role: signupForm.role,
        password: signupForm.password,
      });

      await handleAuthSuccess(response.data, "Account created and signed in.");
      setSignupForm(emptySignupForm);
    } catch (error) {
      setPageError(
        formatApiError(error, "Signup failed. Please review your information."),
      );
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    clearFeedback();

    const currentToken = token;

    try {
      if (currentToken) {
        await api.post("/api/auth/logout", {}, authConfig(currentToken));
      }
    } catch {
      // Ignore logout errors and still clear client auth.
    } finally {
      clearStoredToken();
      setToken("");
      setSessionUser(null);
      setCategories([]);
      setCourses([]);
      setTopCategories([]);
      setSellerPerformance([]);
      setActiveTab("browse");
      resetListingForm();
      setPageMessage("Signed out.");
      await loadPublicListings().catch(() => undefined);
    }
  };

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearFeedback();

    if (!token) {
      setPageError("You need to be signed in.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      setPageError("New passwords do not match.");
      return;
    }

    setIsPasswordSaving(true);

    try {
      await api.post(
        "/api/auth/change-password",
        {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        },
        authConfig(token),
      );

      setPasswordForm(emptyPasswordForm);
      clearStoredToken();
      setToken("");
      setSessionUser(null);
      setCategories([]);
      setCourses([]);
      setTopCategories([]);
      setSellerPerformance([]);
      setActiveTab("browse");
      setPageMessage("Password updated. Please log in again.");
    } catch (error) {
      setPageError(
        formatApiError(error, "Could not change password."),
      );
    } finally {
      setIsPasswordSaving(false);
    }
  };

  const handleAdminCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearFeedback();

    if (!token || !isAdmin) {
      setPageError("Only admins can create users.");
      return;
    }

    setIsAdminSaving(true);

    try {
      await api.post(
        "/api/admin/users",
        {
          name: adminUserForm.name.trim(),
          email: adminUserForm.email.trim(),
          phoneNo: adminUserForm.phoneNo.trim(),
          role: adminUserForm.role,
          password: adminUserForm.password,
        },
        authConfig(token),
      );

      setAdminUserForm(emptyAdminUserForm);
      setPageMessage("New user created successfully.");
    } catch (error) {
      setPageError(
        formatApiError(error, "Could not create the new user."),
      );
    } finally {
      setIsAdminSaving(false);
    }
  };

  const addImageUrl = () => {
    const trimmed = listingForm.imageUrlInput.trim();

    if (!trimmed) {
      return;
    }

    if (listingForm.imageUrls.includes(trimmed)) {
      setListingForm((current) => ({
        ...current,
        imageUrlInput: "",
      }));
      return;
    }

    setListingForm((current) => ({
      ...current,
      imageUrls: [...current.imageUrls, trimmed],
      imageUrlInput: "",
    }));
  };

  const removeImageUrl = (imageUrl: string) => {
    setListingForm((current) => ({
      ...current,
      imageUrls: current.imageUrls.filter((url) => url !== imageUrl),
    }));
  };

  const startEditingListing = (listing: Listing) => {
    if (!canManageListing(listing)) {
      return;
    }

    clearFeedback();
    setActiveTab("sell");
    setEditingListingId(listing.listingID);
    setListingForm({
      categoryID: String(listing.categoryID),
      courseID: listing.courseID ? String(listing.courseID) : "",
      title: listing.title,
      description: listing.description,
      condition: listing.listingCondition,
      price: String(listing.price),
      isAuction: listing.isAuction,
      minimumPrice:
        listing.minimumPrice !== null && listing.minimumPrice !== undefined
          ? String(listing.minimumPrice)
          : "",
      auctionEndTime: toLocalDatetimeInputValue(listing.auctionEndTime),
      imageUrlInput: "",
      imageUrls: listing.imageUrls ?? [],
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const buildListingPayload = () => {
    const payload: Record<string, unknown> = {
      categoryID: Number(listingForm.categoryID),
      courseID: listingForm.courseID ? Number(listingForm.courseID) : null,
      title: listingForm.title.trim(),
      description: listingForm.description.trim(),
      condition: listingForm.condition.trim(),
      price: Number(listingForm.price),
      isAuction: listingForm.isAuction,
      imageUrls: listingForm.imageUrls,
    };

    if (isAdmin && sessionUser) {
      payload.sellerID = sessionUser.userID;
    }

    if (listingForm.isAuction) {
      payload.minimumPrice = Number(listingForm.minimumPrice);
      payload.auctionEndTime = new Date(listingForm.auctionEndTime).toISOString();
    }

    return payload;
  };

  const validateListingForm = (): string | null => {
    if (!listingForm.categoryID) {
      return "Select a category.";
    }

    if (!listingForm.title.trim()) {
      return "Title is required.";
    }

    if (!listingForm.description.trim()) {
      return "Description is required.";
    }

    if (!listingForm.condition.trim()) {
      return "Condition is required.";
    }

    if (!listingForm.price || Number(listingForm.price) <= 0) {
      return "Enter a valid listing price.";
    }

    if (listingForm.isAuction) {
      if (!listingForm.minimumPrice || Number(listingForm.minimumPrice) <= 0) {
        return "Auction listings need a valid minimum price.";
      }

      if (!listingForm.auctionEndTime) {
        return "Auction listings need an end time.";
      }
    }

    return null;
  };

  const handleSaveListing = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearFeedback();

    if (!token || !canSell) {
      setPageError("You must be logged in as a seller or admin.");
      return;
    }

    const validationError = validateListingForm();
    if (validationError) {
      setPageError(validationError);
      return;
    }

    setIsListingSaving(true);

    try {
      const payload = buildListingPayload();

      if (editingListingId === null) {
        await api.post("/api/listings", payload, authConfig(token));
        setPageMessage("Listing created successfully.");
      } else {
        await api.put(
          `/api/listings/${editingListingId}`,
          payload,
          authConfig(token),
        );
        setPageMessage("Listing updated successfully.");
      }

      resetListingForm();
      setActiveTab("mine");
      await Promise.all([
        loadPublicListings(),
        loadTopCategories(token).catch(() => undefined),
        loadSellerPerformance(token).catch(() => undefined),
      ]);
    } catch (error) {
      setPageError(
        formatApiError(error, "Could not save the listing."),
      );
    } finally {
      setIsListingSaving(false);
    }
  };

  const handleDeleteListing = async (listing: Listing) => {
    clearFeedback();

    if (!token || !canManageListing(listing)) {
      setPageError("You do not have permission to delete this listing.");
      return;
    }

    const confirmed = window.confirm(`Delete "${listing.title}"?`);
    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/api/listings/${listing.listingID}`, authConfig(token));

      if (editingListingId === listing.listingID) {
        resetListingForm();
      }

      setPageMessage(`Deleted "${listing.title}".`);
      await Promise.all([
        loadPublicListings(),
        loadTopCategories(token).catch(() => undefined),
      ]);
    } catch (error) {
      setPageError(
        formatApiError(error, "Could not delete the listing."),
      );
    }
  };

  const renderListingCard = (listing: Listing) => {
    const canManage = canManageListing(listing);
    const primaryImage =
      listing.imageUrls && listing.imageUrls.length > 0
        ? listing.imageUrls[0]
        : "";

    return (
      <article className="market-card" key={listing.listingID}>
        <div className="market-card-main">
          <div className="market-image-shell">
            {primaryImage ? (
              <img
                className="market-image"
                src={primaryImage}
                alt={listing.title}
              />
            ) : (
              <div className="market-image placeholder">No Image</div>
            )}
          </div>

          <div className="market-card-content">
            <div className="market-badges">
              <span className={`tag ${listing.isAuction ? "auction" : "fixed"}`}>
                {listing.isAuction ? "Auction" : "Fixed Price"}
              </span>
              <span className="tag neutral">{listing.categoryName}</span>
              <span className="tag neutral">{listing.status}</span>
              {listing.courseLabel ? (
                <span className="tag neutral">{listing.courseLabel}</span>
              ) : null}
            </div>

            <h3>{listing.title}</h3>
            <p className="card-description">{listing.description}</p>

            <div className="card-meta">
              <span>
                <strong>Seller:</strong> {listing.sellerName}
              </span>
              <span>
                <strong>Condition:</strong> {listing.listingCondition}
              </span>
              <span>
                <strong>Posted:</strong> {prettyDate(listing.createdAt)}
              </span>
              {listing.isAuction ? (
                <>
                  <span>
                    <strong>Minimum:</strong> {money(listing.minimumPrice)}
                  </span>
                  <span>
                    <strong>Current:</strong> {money(listing.currentPrice)}
                  </span>
                  <span>
                    <strong>Bids:</strong> {listing.bidCount ?? 0}
                  </span>
                  <span>
                    <strong>Ends:</strong> {prettyDate(listing.auctionEndTime)}
                  </span>
                </>
              ) : (
                <span>
                  <strong>Price:</strong> {money(listing.price)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="card-actions">
          {canManage ? (
            <>
              <button type="button" onClick={() => startEditingListing(listing)}>
                Edit
              </button>
              <button
                type="button"
                className="danger-button"
                onClick={() => void handleDeleteListing(listing)}
              >
                Delete
              </button>
            </>
          ) : (
            <button type="button" className="ghost-button" disabled>
              View Only
            </button>
          )}
        </div>
      </article>
    );
  };

  return (
    <div className="page-shell">
      <header className="hero-panel">
        <div className="panel">
          <p className="eyebrow">Hokie Mart</p>
          <h1>Student marketplace for Virginia Tech</h1>
          <p className="hero-copy">
            Buy and sell textbooks, dorm supplies, electronics, and course
            materials. This frontend keeps the same simple style but is now built
            around your real backend auth and permission rules.
          </p>

          <div className="hero-stats">
            <div className="mini-stat">
              <span>Visible Listings</span>
              <strong>{marketplaceStats.totalListings}</strong>
            </div>
            <div className="mini-stat">
              <span>Auctions</span>
              <strong>{marketplaceStats.auctionCount}</strong>
            </div>
            <div className="mini-stat">
              <span>Fixed Price</span>
              <strong>{marketplaceStats.fixedCount}</strong>
            </div>
            <div className="mini-stat">
              <span>Average Visible Price</span>
              <strong>{money(marketplaceStats.averageVisiblePrice)}</strong>
            </div>
          </div>
        </div>

        <aside className="status-card">
          {sessionUser ? (
            <>
              <p className="section-kicker">Signed In</p>
              <h2>{sessionUser.name}</h2>
              <p className="status-detail">{sessionUser.email}</p>
              <p className="status-detail">Role: {sessionUser.role}</p>
              <div className="status-actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setActiveTab("account")}
                >
                  Account
                </button>
                <button type="button" onClick={() => void handleLogout()}>
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="section-kicker">Account Access</p>
              <h2>{authScreen === "login" ? "Login" : "Create Account"}</h2>

              {authScreen === "login" ? (
                <form className="stack-form" onSubmit={handleLogin}>
                  <label>
                    Email
                    <input
                      type="email"
                      required
                      value={loginForm.email}
                      onChange={(event) =>
                        setLoginForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label>
                    Password
                    <input
                      type="password"
                      required
                      value={loginForm.password}
                      onChange={(event) =>
                        setLoginForm((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <button disabled={isAuthLoading} type="submit">
                    {isAuthLoading ? "Signing In..." : "Login"}
                  </button>
                </form>
              ) : (
                <form className="stack-form" onSubmit={handleSignup}>
                  <label>
                    Full Name
                    <input
                      required
                      value={signupForm.name}
                      onChange={(event) =>
                        setSignupForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label>
                    Email
                    <input
                      type="email"
                      required
                      value={signupForm.email}
                      onChange={(event) =>
                        setSignupForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label>
                    Phone Number
                    <input
                      required
                      value={signupForm.phoneNo}
                      onChange={(event) =>
                        setSignupForm((current) => ({
                          ...current,
                          phoneNo: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label>
                    Role
                    <select
                      value={signupForm.role}
                      onChange={(event) =>
                        setSignupForm((current) => ({
                          ...current,
                          role: event.target.value as "buyer" | "seller",
                        }))
                      }
                    >
                      <option value="buyer">Buyer</option>
                      <option value="seller">Seller</option>
                    </select>
                  </label>

                  <label>
                    Password
                    <input
                      type="password"
                      required
                      value={signupForm.password}
                      onChange={(event) =>
                        setSignupForm((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label>
                    Confirm Password
                    <input
                      type="password"
                      required
                      value={signupForm.confirmPassword}
                      onChange={(event) =>
                        setSignupForm((current) => ({
                          ...current,
                          confirmPassword: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <button disabled={isAuthLoading} type="submit">
                    {isAuthLoading ? "Creating..." : "Create Account"}
                  </button>
                </form>
              )}

              <button
                type="button"
                className="text-link"
                onClick={() =>
                  setAuthScreen((current) =>
                    current === "login" ? "signup" : "login",
                  )
                }
              >
                {authScreen === "login"
                  ? "Need an account? Sign up"
                  : "Already have an account? Login"}
              </button>
            </>
          )}
        </aside>
      </header>

      <main className="content-grid">
        <section className="panel full-span">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">Navigation</p>
              <h2>Marketplace</h2>
            </div>

            <div className="tab-row">
              <button
                type="button"
                className={activeTab === "browse" ? "tab-button active" : "tab-button"}
                onClick={() => setActiveTab("browse")}
              >
                Browse
              </button>

              {canSell ? (
                <button
                  type="button"
                  className={activeTab === "sell" ? "tab-button active" : "tab-button"}
                  onClick={() => setActiveTab("sell")}
                >
                  Sell
                </button>
              ) : null}

              {sessionUser ? (
                <button
                  type="button"
                  className={activeTab === "mine" ? "tab-button active" : "tab-button"}
                  onClick={() => setActiveTab("mine")}
                >
                  My Listings
                </button>
              ) : null}

              {sessionUser ? (
                <button
                  type="button"
                  className={activeTab === "account" ? "tab-button active" : "tab-button"}
                  onClick={() => setActiveTab("account")}
                >
                  Account
                </button>
              ) : null}

              {isAdmin ? (
                <button
                  type="button"
                  className={activeTab === "admin" ? "tab-button active" : "tab-button"}
                  onClick={() => setActiveTab("admin")}
                >
                  Admin
                </button>
              ) : null}
            </div>
          </div>

          {pageMessage ? <div className="message-banner success">{pageMessage}</div> : null}
          {pageError ? <div className="message-banner error">{pageError}</div> : null}
        </section>

        {activeTab === "browse" ? (
          <>
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="section-kicker">Search</p>
                  <h2>Browse Listings</h2>
                </div>

                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    clearFeedback();
                    void loadPublicListings();
                  }}
                >
                  Refresh
                </button>
              </div>

              <div className="filter-grid">
                <label>
                  Search
                  <input
                    placeholder="Search by title or description"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </label>

                <label>
                  Category
                  <select
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                  >
                    <option value="">All categories</option>
                    {categories.map((category) => (
                      <option key={category.categoryID} value={category.categoryID}>
                        {category.categoryName}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Type
                  <select
                    value={modeFilter}
                    onChange={(event) =>
                      setModeFilter(event.target.value as "all" | "fixed" | "auction")
                    }
                  >
                    <option value="all">All</option>
                    <option value="fixed">Fixed Price</option>
                    <option value="auction">Auction</option>
                  </select>
                </label>

                <label>
                  Status
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                  >
                    <option value="active">Active</option>
                    <option value="sold">Sold</option>
                    <option value="closed">Closed</option>
                    <option value="">All Statuses</option>
                  </select>
                </label>
              </div>

              <div className="report-grid">
                {(topCategories.length > 0 ? topCategories.slice(0, 4) : []).map((item) => (
                  <div className="report-card" key={item.categoryID}>
                    <span>Top Category</span>
                    <strong>{item.categoryName}</strong>
                    <p>
                      {item.listingCount} listing(s), {item.soldCount} sold
                    </p>
                  </div>
                ))}

                {topCategories.length === 0 ? (
                  <>
                    <div className="report-card">
                      <span>Reports</span>
                      <strong>Sign in for analytics</strong>
                      <p>Top category reporting is available for authenticated users.</p>
                    </div>
                    <div className="report-card">
                      <span>Browse</span>
                      <strong>Public listing feed</strong>
                      <p>You can still search and browse listings while logged out.</p>
                    </div>
                  </>
                ) : null}
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="section-kicker">Listings</p>
                  <h2>Marketplace Feed</h2>
                </div>
              </div>

              {isPageLoading ? (
                <p>Loading listings...</p>
              ) : listings.length === 0 ? (
                <div className="empty-state">
                  <h3>No listings found</h3>
                  <p>Try changing the filters or add a new listing as a seller.</p>
                </div>
              ) : (
                <div className="card-list">{listings.map(renderListingCard)}</div>
              )}
            </section>
          </>
        ) : null}

        {activeTab === "sell" ? (
          <section className="panel full-span">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">
                  {editingListingId ? "Update Listing" : "Create Listing"}
                </p>
                <h2>
                  {editingListingId
                    ? `Edit Listing #${editingListingId}`
                    : "Post a New Listing"}
                </h2>
              </div>

              {editingListingId ? (
                <button type="button" className="ghost-button" onClick={resetListingForm}>
                  Cancel Edit
                </button>
              ) : null}
            </div>

            {!canSell ? (
              <div className="empty-state">
                <h3>Seller access required</h3>
                <p>Log in as a seller or admin to create and manage listings.</p>
              </div>
            ) : (
              <form className="listing-form" onSubmit={handleSaveListing}>
                <label>
                  Category
                  <select
                    required
                    value={listingForm.categoryID}
                    onChange={(event) =>
                      setListingForm((current) => ({
                        ...current,
                        categoryID: event.target.value,
                      }))
                    }
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.categoryID} value={category.categoryID}>
                        {category.categoryName}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Course
                  <select
                    value={listingForm.courseID}
                    onChange={(event) =>
                      setListingForm((current) => ({
                        ...current,
                        courseID: event.target.value,
                      }))
                    }
                  >
                    <option value="">No course association</option>
                    {courses.map((course) => (
                      <option key={course.courseID} value={course.courseID}>
                        {course.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="full-width">
                  Title
                  <input
                    required
                    value={listingForm.title}
                    onChange={(event) =>
                      setListingForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="full-width">
                  Description
                  <textarea
                    rows={4}
                    required
                    value={listingForm.description}
                    onChange={(event) =>
                      setListingForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                  />
                </label>

                <label>
                  Condition
                  <input
                    required
                    value={listingForm.condition}
                    onChange={(event) =>
                      setListingForm((current) => ({
                        ...current,
                        condition: event.target.value,
                      }))
                    }
                  />
                </label>

                <label>
                  Listing Price
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={listingForm.price}
                    onChange={(event) =>
                      setListingForm((current) => ({
                        ...current,
                        price: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="checkbox-row full-width">
                  <input
                    type="checkbox"
                    checked={listingForm.isAuction}
                    onChange={(event) =>
                      setListingForm((current) => ({
                        ...current,
                        isAuction: event.target.checked,
                        minimumPrice: event.target.checked
                          ? current.minimumPrice
                          : "",
                        auctionEndTime: event.target.checked
                          ? current.auctionEndTime
                          : "",
                      }))
                    }
                  />
                  Post as auction
                </label>

                {listingForm.isAuction ? (
                  <>
                    <label>
                      Minimum Price
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={listingForm.minimumPrice}
                        onChange={(event) =>
                          setListingForm((current) => ({
                            ...current,
                            minimumPrice: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label>
                      Auction End Time
                      <input
                        type="datetime-local"
                        value={listingForm.auctionEndTime}
                        onChange={(event) =>
                          setListingForm((current) => ({
                            ...current,
                            auctionEndTime: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </>
                ) : null}

                <div className="full-width image-entry-row">
                  <label className="image-url-field">
                    Image URL
                    <input
                      value={listingForm.imageUrlInput}
                      onChange={(event) =>
                        setListingForm((current) => ({
                          ...current,
                          imageUrlInput: event.target.value,
                        }))
                      }
                      placeholder="Paste an image URL"
                    />
                  </label>

                  <button
                    type="button"
                    className="ghost-button"
                    onClick={addImageUrl}
                  >
                    Add Image
                  </button>
                </div>

                {listingForm.imageUrls.length > 0 ? (
                  <div className="full-width image-chip-list">
                    {listingForm.imageUrls.map((imageUrl) => (
                      <div className="image-chip" key={imageUrl}>
                        <span>{imageUrl}</span>
                        <button
                          type="button"
                          className="ghost-button small-button"
                          onClick={() => removeImageUrl(imageUrl)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="full-width form-actions">
                  <button type="submit" disabled={isListingSaving}>
                    {isListingSaving
                      ? "Saving..."
                      : editingListingId
                        ? "Update Listing"
                        : "Create Listing"}
                  </button>
                  <p className="helper-text">
                    Sellers can only manage their own listings. Admins can manage any listing.
                  </p>
                </div>
              </form>
            )}
          </section>
        ) : null}

        {activeTab === "mine" ? (
          <section className="panel full-span">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">Ownership</p>
                <h2>{isAdmin ? "All Listings (Admin View)" : "My Listings"}</h2>
              </div>
            </div>

            {!sessionUser ? (
              <div className="empty-state">
                <h3>Login required</h3>
                <p>Sign in to view listings you are allowed to manage.</p>
              </div>
            ) : myListings.length === 0 ? (
              <div className="empty-state">
                <h3>No listings yet</h3>
                <p>Create a listing to see it here.</p>
              </div>
            ) : (
              <div className="card-list">{myListings.map(renderListingCard)}</div>
            )}
          </section>
        ) : null}

        {activeTab === "account" ? (
          <>
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="section-kicker">Profile</p>
                  <h2>Account Details</h2>
                </div>
              </div>

              {!sessionUser ? (
                <div className="empty-state">
                  <h3>No active session</h3>
                  <p>Log in to view your account details.</p>
                </div>
              ) : (
                <div className="account-box">
                  <div className="account-row">
                    <span>Name</span>
                    <strong>{sessionUser.name}</strong>
                  </div>
                  <div className="account-row">
                    <span>Email</span>
                    <strong>{sessionUser.email}</strong>
                  </div>
                  <div className="account-row">
                    <span>Phone</span>
                    <strong>{sessionUser.phoneNo || "Not available"}</strong>
                  </div>
                  <div className="account-row">
                    <span>Role</span>
                    <strong>{sessionUser.role}</strong>
                  </div>
                </div>
              )}
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="section-kicker">Security</p>
                  <h2>Change Password</h2>
                </div>
              </div>

              {!sessionUser ? (
                <div className="empty-state">
                  <h3>Login required</h3>
                  <p>You must be signed in to change your password.</p>
                </div>
              ) : (
                <form className="stack-form" onSubmit={handleChangePassword}>
                  <label>
                    Current Password
                    <input
                      type="password"
                      required
                      value={passwordForm.currentPassword}
                      onChange={(event) =>
                        setPasswordForm((current) => ({
                          ...current,
                          currentPassword: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label>
                    New Password
                    <input
                      type="password"
                      required
                      value={passwordForm.newPassword}
                      onChange={(event) =>
                        setPasswordForm((current) => ({
                          ...current,
                          newPassword: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label>
                    Confirm New Password
                    <input
                      type="password"
                      required
                      value={passwordForm.confirmNewPassword}
                      onChange={(event) =>
                        setPasswordForm((current) => ({
                          ...current,
                          confirmNewPassword: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <button type="submit" disabled={isPasswordSaving}>
                    {isPasswordSaving ? "Updating..." : "Update Password"}
                  </button>
                </form>
              )}
            </section>
          </>
        ) : null}

        {activeTab === "admin" ? (
          <>
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="section-kicker">Admin Tools</p>
                  <h2>Create User</h2>
                </div>
              </div>

              {!isAdmin ? (
                <div className="empty-state">
                  <h3>Admin access required</h3>
                  <p>Only admins can create new users.</p>
                </div>
              ) : (
                <form className="stack-form" onSubmit={handleAdminCreateUser}>
                  <label>
                    Full Name
                    <input
                      required
                      value={adminUserForm.name}
                      onChange={(event) =>
                        setAdminUserForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label>
                    Email
                    <input
                      type="email"
                      required
                      value={adminUserForm.email}
                      onChange={(event) =>
                        setAdminUserForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label>
                    Phone Number
                    <input
                      required
                      value={adminUserForm.phoneNo}
                      onChange={(event) =>
                        setAdminUserForm((current) => ({
                          ...current,
                          phoneNo: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label>
                    Role
                    <select
                      value={adminUserForm.role}
                      onChange={(event) =>
                        setAdminUserForm((current) => ({
                          ...current,
                          role: event.target.value as UserRole,
                        }))
                      }
                    >
                      <option value="buyer">Buyer</option>
                      <option value="seller">Seller</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>

                  <label>
                    Temporary Password
                    <input
                      type="password"
                      required
                      value={adminUserForm.password}
                      onChange={(event) =>
                        setAdminUserForm((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <button type="submit" disabled={isAdminSaving}>
                    {isAdminSaving ? "Creating..." : "Create User"}
                  </button>
                </form>
              )}
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="section-kicker">Reports</p>
                  <h2>Top Categories</h2>
                </div>
              </div>

              {!isAdmin ? (
                <div className="empty-state">
                  <h3>Admin access required</h3>
                  <p>Only admins should use this reporting area.</p>
                </div>
              ) : topCategories.length === 0 ? (
                <div className="empty-state">
                  <h3>No reporting data</h3>
                  <p>There is not enough data yet to show category analytics.</p>
                </div>
              ) : (
                <div className="report-grid">
                  {topCategories.map((item) => (
                    <div className="report-card" key={item.categoryID}>
                      <span>Category</span>
                      <strong>{item.categoryName}</strong>
                      <p>Listings: {item.listingCount}</p>
                      <p>Sold: {item.soldCount}</p>
                      <p>Avg Sale Price: {money(item.averageSalePrice)}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="section-kicker">Reports</p>
                  <h2>Seller Performance</h2>
                </div>
              </div>

              {!isAdmin ? (
                <div className="empty-state">
                  <h3>Admin access required</h3>
                  <p>Only admins should use this reporting area.</p>
                </div>
              ) : sellerPerformance.length === 0 ? (
                <div className="empty-state">
                  <h3>No seller analytics yet</h3>
                  <p>Seller performance appears here once listing activity exists.</p>
                </div>
              ) : (
                <div className="report-grid">
                  {sellerPerformance.map((item) => (
                    <div className="report-card" key={item.sellerID}>
                      <span>Seller</span>
                      <strong>{item.sellerName}</strong>
                      <p>Listings: {item.listingCount}</p>
                      <p>Closed: {item.closedListingCount}</p>
                      <p>Avg Rating: {item.averageRating.toFixed(2)}</p>
                      <p>Gross Sales: {money(item.grossSales)}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}

export default HokieMartAppV2;
