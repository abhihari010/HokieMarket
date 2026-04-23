import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import axios from "axios";
import type { AxiosRequestConfig } from "axios";
import "./HokieMartAppV2.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";
const TOKEN_STORAGE_KEY = "hokie_mart_token";

type UserRole = "member" | "admin";
type AuthScreen = "login" | "signup";
type ActiveTab = "browse" | "sell" | "mine" | "account" | "admin";
type TransactionStatus = "Pending Pickup" | "Completed" | "Cancelled";
type ReportStatus = "Open" | "Under Review" | "Resolved";

interface SessionUser {
  userID: number;
  name: string;
  email: string;
  role: UserRole;
  phoneNo?: string;
  createdAt?: string;
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

interface ListingFormOptionsResponse {
  sellers: SellerOption[];
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

interface ListingImageUploadResponse {
  imageUrls: string[];
}

interface PendingImageFile {
  file: File;
  previewUrl: string;
}

interface LoginFormState {
  email: string;
  password: string;
}

interface SignupFormState {
  name: string;
  email: string;
  phoneNo: string;
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
  sellerID: string;
  categoryID: string;
  courseID: string;
  title: string;
  description: string;
  condition: string;
  price: string;
  isAuction: boolean;
  minimumPrice: string;
  auctionEndTime: string;
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

interface TransactionRecord {
  transactionID: number;
  listingID: number;
  title: string;
  sellerID: number;
  buyerID: number;
  buyerName: string;
  sellerName: string;
  isAuction: boolean;
  finalPrice: number;
  status: TransactionStatus;
  completedAt: string | null;
}

interface ConversationRecord {
  conversationID: number;
  listingID: number;
  listingTitle: string;
  buyerID: number;
  sellerID: number;
  buyerName: string;
  sellerName: string;
  latestMessage: string | null;
}

interface MessageRecord {
  messageID: number;
  conversationID: number;
  senderID: number;
  senderName: string;
  content: string;
  timestamp: string;
}

interface ReviewRecord {
  reviewID: number;
  listingID: number;
  reviewerID: number;
  reviewerName: string;
  rating: number;
  comment: string;
  date: string;
}

interface AdminReportRecord {
  reportID: number;
  listingID: number;
  listingTitle: string;
  reporterID: number;
  reporterName: string;
  adminID: number;
  adminName: string;
  reason: string;
  status: ReportStatus;
}

const emptyLoginForm: LoginFormState = {
  email: "",
  password: "",
};

const emptySignupForm: SignupFormState = {
  name: "",
  email: "",
  phoneNo: "",
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
  role: "member",
  password: "",
};

function displayRole(role: UserRole): string {
  if (role === "admin") {
    return "Admin";
  }

  return "Member";
}

const emptyListingForm: ListingFormState = {
  sellerID: "",
  categoryID: "",
  courseID: "",
  title: "",
  description: "",
  condition: "Good",
  price: "",
  isAuction: false,
  minimumPrice: "",
  auctionEndTime: "",
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
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [token, setToken] = useState<string>(getStoredToken());
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [authScreen, setAuthScreen] = useState<AuthScreen>("login");
  const [activeTab, setActiveTab] = useState<ActiveTab>("browse");

  const [listings, setListings] = useState<Listing[]>([]);
  const [sellers, setSellers] = useState<SellerOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [topCategories, setTopCategories] = useState<TopCategoryReport[]>([]);
  const [sellerPerformance, setSellerPerformance] = useState<
    SellerPerformanceReport[]
  >([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<
    number | null
  >(null);
  const [conversationMessages, setConversationMessages] = useState<
    Record<number, MessageRecord[]>
  >({});
  const [listingReviews, setListingReviews] = useState<
    Record<number, ReviewRecord[]>
  >({});
  const [adminReports, setAdminReports] = useState<AdminReportRecord[]>([]);

  const [listingForm, setListingForm] =
    useState<ListingFormState>(emptyListingForm);
  const [pendingImageFiles, setPendingImageFiles] = useState<PendingImageFile[]>([]);
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

  const [bidInputs, setBidInputs] = useState<Record<number, string>>({});
  const [reportDrafts, setReportDrafts] = useState<Record<number, string>>({});
  const [reviewDrafts, setReviewDrafts] = useState<
    Record<number, { rating: string; comment: string }>
  >({});
  const [messageDraft, setMessageDraft] = useState("");
  const [expandedReviewListingIds, setExpandedReviewListingIds] = useState<
    number[]
  >([]);
  const [expandedReportListingId, setExpandedReportListingId] = useState<
    number | null
  >(null);

  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isListingSaving, setIsListingSaving] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [isAdminSaving, setIsAdminSaving] = useState(false);

  const [pageMessage, setPageMessage] = useState("");
  const [pageError, setPageError] = useState("");

  const canSell = Boolean(sessionUser);
  const isAdmin = sessionUser?.role === "admin";

  const availableCategories = useMemo(() => {
    if (categories.length > 0) {
      return categories;
    }

    const byId = new Map<number, CategoryOption>();

    for (const listing of listings) {
      if (!byId.has(listing.categoryID)) {
        byId.set(listing.categoryID, {
          categoryID: listing.categoryID,
          categoryName: listing.categoryName,
        });
      }
    }

    return Array.from(byId.values()).sort((left, right) =>
      left.categoryName.localeCompare(right.categoryName),
    );
  }, [categories, listings]);

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

  const selectedConversation = useMemo(() => {
    if (selectedConversationId === null) {
      return null;
    }

    return (
      conversations.find(
        (conversation) => conversation.conversationID === selectedConversationId,
      ) ?? null
    );
  }, [conversations, selectedConversationId]);

  const selectedConversationMessages =
    selectedConversationId === null
      ? []
      : conversationMessages[selectedConversationId] ?? [];

  const clearFeedback = () => {
    setPageMessage("");
    setPageError("");
  };

  const clearProtectedState = () => {
    setSessionUser(null);
    setSellers([]);
    setCategories([]);
    setCourses([]);
    setTopCategories([]);
    setSellerPerformance([]);
    setTransactions([]);
    setConversations([]);
    setConversationMessages({});
    setSelectedConversationId(null);
    setAdminReports([]);
  };

  useEffect(() => {
    return () => {
      for (const pendingImage of pendingImageFiles) {
        URL.revokeObjectURL(pendingImage.previewUrl);
      }
    };
  }, [pendingImageFiles]);

  const loadSession = async (authToken: string) => {
    if (!authToken) {
      setSessionUser(null);
      return null;
    }

    const response = await api.get<SessionUser>("/api/me", authConfig(authToken));
    setSessionUser(response.data);
    return response.data;
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
      setSellers([]);
      setCategories([]);
      setCourses([]);
      return;
    }

    const response = await api.get<ListingFormOptionsResponse>(
      "/api/listing-form-options",
      authConfig(authToken),
    );

    setSellers(response.data.sellers ?? []);
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

  const loadTransactions = async (authToken: string) => {
    if (!authToken) {
      setTransactions([]);
      return;
    }

    try {
      const response = await api.get<TransactionRecord[]>(
        "/api/my-transactions",
        authConfig(authToken),
      );
      setTransactions(response.data);
    } catch {
      setTransactions([]);
    }
  };

  const loadConversations = async (authToken: string) => {
    if (!authToken) {
      setConversations([]);
      setSelectedConversationId(null);
      return;
    }

    try {
      const response = await api.get<ConversationRecord[]>(
        "/api/conversations",
        authConfig(authToken),
      );
      setConversations(response.data);
      setSelectedConversationId((current) => {
        if (response.data.length === 0) {
          return null;
        }

        if (
          current !== null &&
          response.data.some((conversation) => conversation.conversationID === current)
        ) {
          return current;
        }

        return response.data[0].conversationID;
      });
    } catch {
      setConversations([]);
      setSelectedConversationId(null);
    }
  };

  const loadConversationMessages = async (
    authToken: string,
    conversationId: number,
  ) => {
    const response = await api.get<MessageRecord[]>(
      `/api/conversations/${conversationId}/messages`,
      authConfig(authToken),
    );

    setConversationMessages((current) => ({
      ...current,
      [conversationId]: response.data,
    }));
  };

  const loadReviews = async (listingId: number) => {
    const response = await api.get<ReviewRecord[]>(`/api/listings/${listingId}/reviews`);
    setListingReviews((current) => ({
      ...current,
      [listingId]: response.data,
    }));
  };

  const loadAdminReports = async (authToken: string) => {
    if (!authToken) {
      setAdminReports([]);
      return;
    }

    try {
      const response = await api.get<AdminReportRecord[]>(
        "/api/admin/reports",
        authConfig(authToken),
      );
      setAdminReports(response.data);
    } catch {
      setAdminReports([]);
    }
  };

  const refreshProtectedData = async (authToken: string) => {
    await Promise.all([
      loadProtectedOptions(authToken),
      loadTopCategories(authToken),
      loadSellerPerformance(authToken),
      loadTransactions(authToken),
      loadConversations(authToken),
      loadAdminReports(authToken),
    ]);
  };

  const bootstrap = async (authToken: string) => {
    setIsPageLoading(true);

    try {
      await loadPublicListings();

      if (authToken) {
        try {
          await loadSession(authToken);
          await refreshProtectedData(authToken);
        } catch {
          clearStoredToken();
          setToken("");
          clearProtectedState();
        }
      } else {
        clearProtectedState();
      }
    } catch (error) {
      setPageError(
        formatApiError(
          error,
          "Could not load Hokie Mart right now. Please try again in a moment.",
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

  useEffect(() => {
    if (!token || selectedConversationId === null) {
      return;
    }

    if (conversationMessages[selectedConversationId]) {
      return;
    }

    void loadConversationMessages(token, selectedConversationId).catch(() => {
      setPageError("Could not load the selected conversation.");
    });
  }, [conversationMessages, selectedConversationId, token]);

  useEffect(() => {
    if (editingListingId !== null || sessionUser?.role !== "admin") {
      return;
    }

    setListingForm((current) =>
      current.sellerID
        ? current
        : {
            ...current,
            sellerID: String(sessionUser.userID),
          },
    );
  }, [editingListingId, sessionUser]);

  const canManageListing = (listing: Listing): boolean => {
    if (!sessionUser) {
      return false;
    }

    return sessionUser.role === "admin" || listing.sellerID === sessionUser.userID;
  };

  const resetListingForm = () => {
    for (const pendingImage of pendingImageFiles) {
      URL.revokeObjectURL(pendingImage.previewUrl);
    }

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
    setPendingImageFiles([]);
    setListingForm({
      ...emptyListingForm,
      sellerID:
        sessionUser?.role === "admin" ? String(sessionUser.userID) : "",
    });
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
    setListingForm({
      ...emptyListingForm,
      sellerID:
        response.user.role === "admin" ? String(response.user.userID) : "",
    });
    await Promise.all([
      refreshProtectedData(response.token),
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
        role: "member",
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
      clearProtectedState();
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
      clearProtectedState();
      setActiveTab("browse");
      setPageMessage("Password updated. Please log in again.");
    } catch (error) {
      setPageError(formatApiError(error, "Could not change password."));
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
      await refreshProtectedData(token);
    } catch (error) {
      setPageError(formatApiError(error, "Could not create the new user."));
    } finally {
      setIsAdminSaving(false);
    }
  };

  const handleImageSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;

    if (!files || files.length === 0) {
      return;
    }

    clearFeedback();
    setPendingImageFiles((current) => [
      ...current,
      ...Array.from(files).map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
  };

  const removeImageUrl = (imageUrl: string) => {
    setListingForm((current) => ({
      ...current,
      imageUrls: current.imageUrls.filter((url) => url !== imageUrl),
    }));
  };

  const removePendingImage = (previewUrl: string) => {
    setPendingImageFiles((current) => {
      const match = current.find((item) => item.previewUrl === previewUrl);
      if (match) {
        URL.revokeObjectURL(match.previewUrl);
      }

      return current.filter((item) => item.previewUrl !== previewUrl);
    });

    const input = imageInputRef.current;
    if (!input?.files) {
      return;
    }

    const dataTransfer = new DataTransfer();
    for (const file of Array.from(input.files)) {
      const previewUrlForFile = pendingImageFiles.find(
        (item) =>
          item.file.name === file.name &&
          item.file.size === file.size &&
          item.file.lastModified === file.lastModified,
      )?.previewUrl;

      if (previewUrlForFile !== previewUrl) {
        dataTransfer.items.add(file);
      }
    }
    input.files = dataTransfer.files;
  };

  const startEditingListing = (listing: Listing) => {
    if (!canManageListing(listing)) {
      return;
    }

    for (const pendingImage of pendingImageFiles) {
      URL.revokeObjectURL(pendingImage.previewUrl);
    }

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
    clearFeedback();
    setActiveTab("sell");
    setEditingListingId(listing.listingID);
    setListingForm({
      sellerID: String(listing.sellerID),
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
      imageUrls: listing.imageUrls ?? [],
    });
    setPendingImageFiles([]);

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

    if (isAdmin && listingForm.sellerID) {
      payload.sellerID = Number(listingForm.sellerID);
    }

    if (listingForm.isAuction) {
      payload.minimumPrice = Number(listingForm.minimumPrice);
      payload.auctionEndTime = new Date(listingForm.auctionEndTime).toISOString();
    }

    return payload;
  };

  const validateListingForm = (): string | null => {
    if (isAdmin && !listingForm.sellerID) {
      return "Select the account that owns this listing.";
    }

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
      setPageError("Please sign in to create or edit listings.");
      return;
    }

    const validationError = validateListingForm();
    if (validationError) {
      setPageError(validationError);
      return;
    }

    setIsListingSaving(true);

    try {
      let uploadedImageUrls: string[] = [];

      const filesToUpload = imageInputRef.current?.files
        ? Array.from(imageInputRef.current.files)
        : [];

      if (filesToUpload.length > 0) {
        setIsImageUploading(true);
        const formData = new FormData();
        for (const file of filesToUpload) {
          formData.append("files", file);
        }

        const uploadResponse = await api.post<ListingImageUploadResponse>(
          "/api/uploads/listing-images",
          formData,
          authConfig(token),
        );
        uploadedImageUrls = uploadResponse.data.imageUrls;
      }

      const payload = {
        ...buildListingPayload(),
        imageUrls: [...listingForm.imageUrls, ...uploadedImageUrls],
      };

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
      setPageError(formatApiError(error, "Could not save the listing."));
    } finally {
      setIsImageUploading(false);
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
      setPageError(formatApiError(error, "Could not delete the listing."));
    }
  };

  const handleBuyListing = async (listing: Listing) => {
    clearFeedback();

    if (!token) {
      setPageError("Sign in to purchase a listing.");
      return;
    }

    try {
      await api.post(
        "/api/transactions",
        { listingID: listing.listingID },
        authConfig(token),
      );
      setPageMessage(`Purchase started for "${listing.title}".`);
      await Promise.all([
        loadPublicListings(),
        loadTransactions(token),
        loadTopCategories(token).catch(() => undefined),
        loadSellerPerformance(token).catch(() => undefined),
      ]);
      setActiveTab("account");
    } catch (error) {
      setPageError(formatApiError(error, "Could not purchase this listing."));
    }
  };

  const handlePlaceBid = async (listing: Listing) => {
    clearFeedback();

    if (!token) {
      setPageError("Sign in to place a bid.");
      return;
    }

    if (!listing.auctionID) {
      setPageError("This listing does not have an auction record.");
      return;
    }

    const amount = Number(bidInputs[listing.listingID] ?? "");
    if (!Number.isFinite(amount) || amount <= 0) {
      setPageError("Enter a valid bid amount.");
      return;
    }

    try {
      await api.post(
        `/api/auctions/${listing.auctionID}/bids`,
        { amount },
        authConfig(token),
      );

      setBidInputs((current) => ({
        ...current,
        [listing.listingID]: "",
      }));
      setPageMessage(`Bid placed on "${listing.title}".`);
      await loadPublicListings();
    } catch (error) {
      setPageError(formatApiError(error, "Could not place your bid."));
    }
  };

  const openConversation = async (conversationId: number) => {
    if (!token) {
      return;
    }

    setSelectedConversationId(conversationId);
    setMessageDraft("");
    setActiveTab("account");

    try {
      await loadConversationMessages(token, conversationId);
    } catch (error) {
      setPageError(formatApiError(error, "Could not load the conversation."));
    }
  };

  const handleStartConversation = async (listing: Listing) => {
    clearFeedback();

    if (!token) {
      setPageError("Sign in to send a message.");
      return;
    }

    try {
      const response = await api.post<ConversationRecord>(
        "/api/conversations",
        { listingID: listing.listingID },
        authConfig(token),
      );
      await loadConversations(token);
      await openConversation(response.data.conversationID);
      setPageMessage(`Conversation opened for "${listing.title}".`);
    } catch (error) {
      setPageError(formatApiError(error, "Could not start a conversation."));
    }
  };

  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearFeedback();

    if (!token || selectedConversationId === null) {
      setPageError("Select a conversation first.");
      return;
    }

    const content = messageDraft.trim();
    if (!content) {
      setPageError("Message content is required.");
      return;
    }

    try {
      await api.post(
        `/api/conversations/${selectedConversationId}/messages`,
        { content },
        authConfig(token),
      );
      setMessageDraft("");
      await Promise.all([
        loadConversationMessages(token, selectedConversationId),
        loadConversations(token),
      ]);
    } catch (error) {
      setPageError(formatApiError(error, "Could not send the message."));
    }
  };

  const toggleListingReviews = async (listingId: number) => {
    const isExpanded = expandedReviewListingIds.includes(listingId);

    if (isExpanded) {
      setExpandedReviewListingIds((current) =>
        current.filter((item) => item !== listingId),
      );
      return;
    }

    try {
      await loadReviews(listingId);
      setExpandedReviewListingIds((current) => [...current, listingId]);
    } catch (error) {
      setPageError(formatApiError(error, "Could not load reviews."));
    }
  };

  const handleSubmitReport = async (listing: Listing) => {
    clearFeedback();

    if (!token) {
      setPageError("Sign in to report a listing.");
      return;
    }

    const reason = (reportDrafts[listing.listingID] ?? "").trim();
    if (!reason) {
      setPageError("Provide a reason for the report.");
      return;
    }

    try {
      await api.post(
        "/api/reports",
        { listingID: listing.listingID, reason },
        authConfig(token),
      );
      setReportDrafts((current) => ({
        ...current,
        [listing.listingID]: "",
      }));
      setExpandedReportListingId(null);
      setPageMessage(`Reported "${listing.title}" for admin review.`);
      await loadAdminReports(token).catch(() => undefined);
    } catch (error) {
      setPageError(formatApiError(error, "Could not submit the report."));
    }
  };

  const handleUpdateTransactionStatus = async (
    transactionId: number,
    status: Exclude<TransactionStatus, "Pending Pickup">,
  ) => {
    clearFeedback();

    if (!token) {
      setPageError("Sign in to update transactions.");
      return;
    }

    try {
      await api.put(
        `/api/transactions/${transactionId}/status`,
        { status },
        authConfig(token),
      );
      setPageMessage(`Transaction marked as ${status}.`);
      await Promise.all([
        loadTransactions(token),
        loadPublicListings(),
        loadTopCategories(token).catch(() => undefined),
        loadSellerPerformance(token).catch(() => undefined),
      ]);
    } catch (error) {
      setPageError(formatApiError(error, "Could not update the transaction."));
    }
  };

  const handleSubmitReview = async (transaction: TransactionRecord) => {
    clearFeedback();

    if (!token) {
      setPageError("Sign in to leave a review.");
      return;
    }

    const draft = reviewDrafts[transaction.listingID];
    const rating = Number(draft?.rating ?? "");
    const comment = draft?.comment?.trim() ?? "";

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      setPageError("Select a rating between 1 and 5.");
      return;
    }

    if (!comment) {
      setPageError("Add a comment before submitting your review.");
      return;
    }

    try {
      await api.post(
        "/api/reviews",
        {
          listingID: transaction.listingID,
          rating,
          comment,
        },
        authConfig(token),
      );
      setReviewDrafts((current) => ({
        ...current,
        [transaction.listingID]: { rating: "", comment: "" },
      }));
      await loadReviews(transaction.listingID);
      if (!expandedReviewListingIds.includes(transaction.listingID)) {
        setExpandedReviewListingIds((current) => [...current, transaction.listingID]);
      }
      setPageMessage(`Review added for "${transaction.title}".`);
    } catch (error) {
      setPageError(formatApiError(error, "Could not submit your review."));
    }
  };

  const handleUpdateReportStatus = async (
    reportId: number,
    status: ReportStatus,
  ) => {
    clearFeedback();

    if (!token || !isAdmin) {
      setPageError("Only admins can manage reports.");
      return;
    }

    try {
      await api.put(
        `/api/admin/reports/${reportId}`,
        { status },
        authConfig(token),
      );
      setPageMessage(`Report status updated to ${status}.`);
      await loadAdminReports(token);
    } catch (error) {
      setPageError(formatApiError(error, "Could not update the report."));
    }
  };

  const renderListingCard = (listing: Listing) => {
    const canManage = canManageListing(listing);
    const isOwner = sessionUser?.userID === listing.sellerID;
    const canInteract = Boolean(sessionUser) && !isOwner;
    const isReviewExpanded = expandedReviewListingIds.includes(listing.listingID);
    const reviews = listingReviews[listing.listingID] ?? [];
    const primaryImage =
      listing.imageUrls && listing.imageUrls.length > 0 ? listing.imageUrls[0] : "";

    return (
      <article className="market-card" key={listing.listingID}>
        <div className="market-card-main">
          <div className="market-image-shell">
            {primaryImage ? (
              <img className="market-image" src={primaryImage} alt={listing.title} />
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

            {!canManage ? (
              <div className="action-stack">
                {listing.status === "active" && canInteract && !listing.isAuction ? (
                  <button type="button" onClick={() => void handleBuyListing(listing)}>
                    Buy Now
                  </button>
                ) : null}

                {listing.status === "active" && canInteract && listing.isAuction ? (
                  <div className="inline-form">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={bidInputs[listing.listingID] ?? ""}
                      onChange={(event) =>
                        setBidInputs((current) => ({
                          ...current,
                          [listing.listingID]: event.target.value,
                        }))
                      }
                      placeholder="Your bid"
                    />
                    <button type="button" onClick={() => void handlePlaceBid(listing)}>
                      Place Bid
                    </button>
                  </div>
                ) : null}

                <div className="card-actions">
                  {canInteract ? (
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => void handleStartConversation(listing)}
                    >
                      Message Seller
                    </button>
                  ) : null}

                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => void toggleListingReviews(listing.listingID)}
                  >
                    {isReviewExpanded ? "Hide Reviews" : "View Reviews"}
                  </button>

                  {canInteract ? (
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() =>
                        setExpandedReportListingId((current) =>
                          current === listing.listingID ? null : listing.listingID,
                        )
                      }
                    >
                      Report
                    </button>
                  ) : null}
                </div>

                {expandedReportListingId === listing.listingID ? (
                  <div className="nested-card">
                    <label>
                      Report Reason
                      <textarea
                        rows={3}
                        value={reportDrafts[listing.listingID] ?? ""}
                        onChange={(event) =>
                          setReportDrafts((current) => ({
                            ...current,
                            [listing.listingID]: event.target.value,
                          }))
                        }
                        placeholder="Describe the issue with this listing"
                      />
                    </label>
                    <button type="button" onClick={() => void handleSubmitReport(listing)}>
                      Submit Report
                    </button>
                  </div>
                ) : null}

                {isReviewExpanded ? (
                  <div className="nested-card">
                    {reviews.length === 0 ? (
                      <p className="helper-text">No reviews have been posted for this listing yet.</p>
                    ) : (
                      <div className="stack-list">
                        {reviews.map((review) => (
                          <div className="sub-card" key={review.reviewID}>
                            <strong>
                              {review.reviewerName} | {review.rating}/5
                            </strong>
                            <p>{review.comment}</p>
                            <span className="status-detail">{prettyDate(review.date)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
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
          ) : sessionUser ? (
            <button type="button" className="ghost-button" disabled>
              Marketplace Actions Above
            </button>
          ) : (
            <button type="button" className="ghost-button" disabled>
              Login to Interact
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
            Buy, bid, message, review, and manage listings with other students
            across campus.
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
              <p className="status-detail">Role: {displayRole(sessionUser.role)}</p>
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
                    {availableCategories.map((category) => (
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
                      <strong>Sign in for insights</strong>
                      <p>See marketplace trends and activity once you are signed in.</p>
                    </div>
                    <div className="report-card">
                      <span>Browse</span>
                      <strong>Public listing feed</strong>
                      <p>You can still search and browse listings without signing in.</p>
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
                  <p>Try changing the filters or create a new listing once you sign in.</p>
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
                <h3>Sign-in required</h3>
                <p>Sign in to post and manage your listings.</p>
              </div>
            ) : (
              <form className="listing-form" onSubmit={handleSaveListing}>
                {isAdmin ? (
                  <label>
                    Listing Owner
                    <select
                      required
                      value={listingForm.sellerID}
                      onChange={(event) =>
                        setListingForm((current) => ({
                          ...current,
                          sellerID: event.target.value,
                        }))
                      }
                    >
                      <option value="">Select an account</option>
                      {sellers.map((seller) => (
                        <option key={seller.userID} value={seller.userID}>
                          {seller.name} ({seller.email})
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

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
                    Listing Images
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/gif,image/webp"
                      multiple
                      onChange={(event) => void handleImageSelection(event)}
                    />
                  </label>

                  <p className="helper-text">
                    Choose JPEG, PNG, GIF, or WebP images up to 5 MB each. Files
                    upload when you save the listing.
                  </p>
                </div>

                {pendingImageFiles.length > 0 ? (
                  <div className="full-width image-chip-list">
                    {pendingImageFiles.map((pendingImage) => (
                      <div className="image-chip" key={pendingImage.previewUrl}>
                        <div className="image-chip-preview">
                          <img src={pendingImage.previewUrl} alt={pendingImage.file.name} />
                          <span>{pendingImage.file.name}</span>
                        </div>
                        <button
                          type="button"
                          className="ghost-button small-button"
                          onClick={() => removePendingImage(pendingImage.previewUrl)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}

                {listingForm.imageUrls.length > 0 ? (
                  <div className="full-width image-chip-list">
                    {listingForm.imageUrls.map((imageUrl) => (
                      <div className="image-chip" key={imageUrl}>
                        <div className="image-chip-preview">
                          <img src={imageUrl} alt="Listing upload preview" />
                          <span>{imageUrl}</span>
                        </div>
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
                  <button type="submit" disabled={isListingSaving || isImageUploading}>
                    {isImageUploading
                      ? "Uploading..."
                      : isListingSaving
                      ? "Saving..."
                      : editingListingId
                        ? "Update Listing"
                        : "Create Listing"}
                  </button>
                  <p className="helper-text">
                    Members manage their own listings. Admins can also assign listing
                    ownership when creating or editing.
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
                    <strong>{displayRole(sessionUser.role)}</strong>
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

            <section className="panel full-span">
              <div className="panel-heading">
                <div>
                  <p className="section-kicker">Transactions</p>
                  <h2>My Purchases and Sales</h2>
                </div>
              </div>

              {!sessionUser ? (
                <div className="empty-state">
                  <h3>Login required</h3>
                  <p>Sign in to manage your transactions.</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="empty-state">
                  <h3>No transactions yet</h3>
                  <p>Purchases and completed auctions will show up here.</p>
                </div>
              ) : (
                <div className="stack-list">
                  {transactions.map((transaction) => {
                    const isBuyer = sessionUser.userID === transaction.buyerID;
                    const reviewDraft = reviewDrafts[transaction.listingID] ?? {
                      rating: "",
                      comment: "",
                    };

                    return (
                      <div className="sub-card" key={transaction.transactionID}>
                        <div className="panel-heading">
                          <div>
                            <strong>{transaction.title}</strong>
                            <p className="helper-text">
                              {transaction.isAuction ? "Auction outcome" : "Fixed-price purchase"}
                            </p>
                          </div>
                          <span className="tag neutral">{transaction.status}</span>
                        </div>

                        <div className="transaction-meta">
                          <span>
                            <strong>Buyer:</strong> {transaction.buyerName}
                          </span>
                          <span>
                            <strong>Seller:</strong> {transaction.sellerName}
                          </span>
                          <span>
                            <strong>Final Price:</strong> {money(transaction.finalPrice)}
                          </span>
                          <span>
                            <strong>Completed:</strong> {prettyDate(transaction.completedAt)}
                          </span>
                        </div>

                        {transaction.status === "Pending Pickup" ? (
                          <div className="card-actions">
                            <button
                              type="button"
                              onClick={() =>
                                void handleUpdateTransactionStatus(
                                  transaction.transactionID,
                                  "Completed",
                                )
                              }
                            >
                              Mark Completed
                            </button>
                            <button
                              type="button"
                              className="ghost-button"
                              onClick={() =>
                                void handleUpdateTransactionStatus(
                                  transaction.transactionID,
                                  "Cancelled",
                                )
                              }
                            >
                              Cancel Transaction
                            </button>
                          </div>
                        ) : null}

                        {transaction.status === "Completed" && isBuyer ? (
                          <div className="nested-card">
                            <p className="section-kicker">Leave Review</p>
                            <div className="inline-form">
                              <select
                                value={reviewDraft.rating}
                                onChange={(event) =>
                                  setReviewDrafts((current) => ({
                                    ...current,
                                    [transaction.listingID]: {
                                      ...reviewDraft,
                                      rating: event.target.value,
                                    },
                                  }))
                                }
                              >
                                <option value="">Rating</option>
                                <option value="5">5</option>
                                <option value="4">4</option>
                                <option value="3">3</option>
                                <option value="2">2</option>
                                <option value="1">1</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => void handleSubmitReview(transaction)}
                              >
                                Submit Review
                              </button>
                            </div>
                            <textarea
                              rows={3}
                              value={reviewDraft.comment}
                              onChange={(event) =>
                                setReviewDrafts((current) => ({
                                  ...current,
                                  [transaction.listingID]: {
                                    ...reviewDraft,
                                    comment: event.target.value,
                                  },
                                }))
                              }
                              placeholder="Share how the transaction went"
                            />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="panel full-span">
              <div className="panel-heading">
                <div>
                  <p className="section-kicker">Messages</p>
                  <h2>Marketplace Conversations</h2>
                </div>
              </div>

              {!sessionUser ? (
                <div className="empty-state">
                  <h3>Login required</h3>
                  <p>Sign in to view and send marketplace messages.</p>
                </div>
              ) : conversations.length === 0 ? (
                <div className="empty-state">
                  <h3>No conversations yet</h3>
                  <p>Start a conversation from any listing to see it here.</p>
                </div>
              ) : (
                <div className="conversation-layout">
                  <div className="stack-list">
                    {conversations.map((conversation) => (
                      <button
                        key={conversation.conversationID}
                        type="button"
                        className={
                          selectedConversationId === conversation.conversationID
                            ? "conversation-button active"
                            : "conversation-button"
                        }
                        onClick={() => void openConversation(conversation.conversationID)}
                      >
                        <strong>{conversation.listingTitle}</strong>
                        <span>
                          {sessionUser.userID === conversation.buyerID
                            ? `Seller: ${conversation.sellerName}`
                            : `Buyer: ${conversation.buyerName}`}
                        </span>
                        <span>{conversation.latestMessage ?? "No messages yet"}</span>
                      </button>
                    ))}
                  </div>

                  <div className="nested-card">
                    {selectedConversation ? (
                      <>
                        <div className="panel-heading">
                          <div>
                            <strong>{selectedConversation.listingTitle}</strong>
                            <p className="helper-text">
                              {sessionUser.userID === selectedConversation.buyerID
                                ? `Talking with ${selectedConversation.sellerName}`
                                : `Talking with ${selectedConversation.buyerName}`}
                            </p>
                          </div>
                        </div>

                        <div className="message-thread">
                          {selectedConversationMessages.length === 0 ? (
                            <p className="helper-text">No messages yet.</p>
                          ) : (
                            selectedConversationMessages.map((message) => (
                              <div
                                key={message.messageID}
                                className={
                                  message.senderID === sessionUser.userID
                                    ? "message-bubble mine"
                                    : "message-bubble"
                                }
                              >
                                <strong>{message.senderName}</strong>
                                <p>{message.content}</p>
                                <span>{prettyDate(message.timestamp)}</span>
                              </div>
                            ))
                          )}
                        </div>

                        <form className="stack-form" onSubmit={handleSendMessage}>
                          <label>
                            New Message
                            <textarea
                              rows={3}
                              value={messageDraft}
                              onChange={(event) => setMessageDraft(event.target.value)}
                              placeholder="Type your message"
                            />
                          </label>
                          <button type="submit">Send Message</button>
                        </form>
                      </>
                    ) : (
                      <div className="empty-state">
                        <h3>Select a conversation</h3>
                        <p>Choose a conversation from the list to read and reply.</p>
                      </div>
                    )}
                  </div>
                </div>
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
                      <option value="member">Member</option>
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
                  <p>Marketplace analytics are available to administrators.</p>
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
                  <p>Marketplace analytics are available to administrators.</p>
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

            <section className="panel full-span">
              <div className="panel-heading">
                <div>
                  <p className="section-kicker">Moderation</p>
                  <h2>Listing Reports</h2>
                </div>
              </div>

              {!isAdmin ? (
                <div className="empty-state">
                  <h3>Admin access required</h3>
                  <p>Only admins can review reports.</p>
                </div>
              ) : adminReports.length === 0 ? (
                <div className="empty-state">
                  <h3>No reports submitted</h3>
                  <p>When users flag a listing it will show up here.</p>
                </div>
              ) : (
                <div className="stack-list">
                  {adminReports.map((report) => (
                    <div className="sub-card" key={report.reportID}>
                      <div className="panel-heading">
                        <div>
                          <strong>{report.listingTitle}</strong>
                          <p className="helper-text">
                            Reporter: {report.reporterName} • Assigned admin: {report.adminName}
                          </p>
                        </div>
                        <span className="tag neutral">{report.status}</span>
                      </div>

                      <p>{report.reason}</p>

                      <div className="card-actions">
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() =>
                            void handleUpdateReportStatus(report.reportID, "Open")
                          }
                        >
                          Mark Open
                        </button>
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() =>
                            void handleUpdateReportStatus(
                              report.reportID,
                              "Under Review",
                            )
                          }
                        >
                          Under Review
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void handleUpdateReportStatus(report.reportID, "Resolved")
                          }
                        >
                          Resolve
                        </button>
                      </div>
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
