import React, {
  useState,
  useContext,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Navigation from "../components/Navigation";
import { Post, RatingCategory } from "../types";
import { AppContext } from "../App";
import { PostService } from "../services/postService";
import { TMDBService, TMDBSeries } from "../services/tmdbService";
import { UserSeriesService } from "../services/userSeriesService";
import { ProfileService } from "../services/profileService";
import { ClubService, Club } from "../services/clubService";
import CongratsModal from "../components/CongratsModal";
import WelcomeStampModal from "../components/WelcomeStampModal";
import { Stamp } from "../types";
import { useError } from "../context/ErrorContext";
import LazyImage from "../components/LazyImage";

// Dados mockados removidos
const INITIAL_POSTS: Post[] = [];

// Helper Component for Content Rendering
// Helper Component for Content Rendering
const PostContent: React.FC<{
  content: string;
  onSeriesClick: (name: string) => void;
  onUserClick: (handle: string) => void;
}> = ({ content, onSeriesClick, onUserClick }) => {
  if (!content) return null;

  // Regex matches:
  // 1. Mentions: @User.name (includes dots)
  // 2. Series: *Series Name*
  const parts = content.split(/(\*.*?\*|@[\w.]+)/g);

  return (
    <p className="text-slate-700 dark:text-gray-300 text-sm leading-relaxed mb-4">
      {parts.map((part, i) => {
        if (part.startsWith("*") && part.endsWith("*")) {
          const seriesName = part.slice(1, -1);
          return (
            <span
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                onSeriesClick(seriesName);
              }}
              className="bg-primary/20 text-primary px-1.5 py-0.5 rounded mx-0.5 font-bold cursor-pointer hover:bg-primary/30 transition-colors"
            >
              {seriesName}
            </span>
          );
        }
        if (part.startsWith("@")) {
          const handle = part.slice(1);
          return (
            <span
              key={i}
              className="text-blue-500 font-bold hover:underline cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onUserClick(handle);
              }}
            >
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
};

const FeedPage: React.FC = () => {
  const { user } = useContext(AppContext);
  const { showError } = useError();
  const [posts, setPosts] = useState<Post[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]); // Should be User[] but being loose for now
  const [feedType, setFeedType] = useState<"following" | "global">("following"); // Feed padrão: apenas quem você segue
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [trendingSeries, setTrendingSeries] = useState<TMDBSeries[]>([]);
  const [suggestedClubs, setSuggestedClubs] = useState<Club[]>([]);
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostImage, setNewPostImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [spoilerRevealed, setSpoilerRevealed] = useState<
    Record<string, boolean>
  >({});
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<
    string | null
  >(null);
  const [commentsData, setCommentsData] = useState<Record<string, any[]>>({});
  const [newCommentText, setNewCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState<TMDBSeries | null>(null);
  const [mySeriesIds, setMySeriesIds] = useState<Set<number>>(new Set()); // IDs das séries que o usuário já adicionou

  const fileInputRef = useRef<HTMLInputElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Mention System State
  const [mentionType, setMentionType] = useState<"user" | "series" | null>(
    null
  );
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionResults, setMentionResults] = useState<any[]>([]);
  const [showMentionList, setShowMentionList] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dropdownCoords, setDropdownCoords] = useState({ top: 0, left: 0 });
  const [mentionTarget, setMentionTarget] = useState<"post" | "comment">(
    "post"
  ); // Track where we are mentioning
  const [postRelatedSeries, setPostRelatedSeries] = useState<{
    tmdb_id: number;
    series_title: string;
  } | null>(null);
  const [justEarnedBadge, setJustEarnedBadge] = useState<Stamp | null>(null); // For immediate modal
  const [welcomeStamp, setWelcomeStamp] = useState<any | null>(null); // For welcome onboarding modal
  const [isSpoiler, setIsSpoiler] = useState(false); // Estado para spoiler antes de publicar
  const [spoilerTopic, setSpoilerTopic] = useState(""); // Tópico do spoiler (opcional)

  useEffect(() => {
    if (location.state?.welcomeStamp) {
      setWelcomeStamp(location.state.welcomeStamp);
      // Clean state
      window.history.replaceState({}, document.title);
    }
  }, [location]);
  // Calculation for dropdown position
  const getCaretCoordinates = () => {
    const textarea = document.querySelector("textarea");
    if (!textarea) return { top: 0, left: 0 };
    const { selectionStart } = textarea;

    // Canvas hack to measure text width approx
    // This is a rough estimation, for perfect results we need a mirror div
    const div = document.createElement("div");
    const style = window.getComputedStyle(textarea);
    for (const prop of Array.from(style)) {
      div.style[prop as any] = style.getPropertyValue(prop);
    }
    div.style.position = "absolute";
    div.style.visibility = "hidden";
    div.style.whiteSpace = "pre-wrap";
    div.textContent = textarea.value.substring(0, selectionStart);
    const span = document.createElement("span");
    span.textContent = textarea.value.substring(selectionStart) || ".";
    div.appendChild(span);
    document.body.appendChild(div);

    const { offsetLeft, offsetTop } = span;
    // Adjust relative to textarea
    const rect = textarea.getBoundingClientRect();

    document.body.removeChild(div);
    return {
      top:
        div.clientHeight > textarea.clientHeight
          ? textarea.clientHeight
          : div.clientHeight + 20, // simplistic line height
      left: (div.textContent.length * 8) % textarea.clientWidth, // very rough
    };
    // actually, let's just stick to a simpler "bottom left" or "relative to line" if possible without external lib
    // We will just place it under the textarea for safety or fixed top-left of the line?
    // Let's rely on a simpler approach: Just check line count.
  };

  const updateMentionSearch = (text: string, cursor: number) => {
    // Find the last trigger before cursor
    const textBefore = text.slice(0, cursor);
    const atIndex = textBefore.lastIndexOf("@");
    const slashIndex = textBefore.lastIndexOf("/");

    let triggerIndex = -1;
    let type: "user" | "series" | null = null;

    // Choose the closest trigger
    if (atIndex > slashIndex && atIndex !== -1) {
      triggerIndex = atIndex;
      type = "user";
    } else if (slashIndex > atIndex && slashIndex !== -1) {
      triggerIndex = slashIndex;
      type = "series";
    }

    if (triggerIndex !== -1) {
      // If user, valid only if no spaces (usually), but let's allow 1 space for full names?
      // If series, allow spaces.
      const query = textBefore.slice(triggerIndex + 1);

      // Basic heuristic: searching stops if double newline or if too long?
      // Allow dots for user handles (e.g. adriano.ti)
      // The query itself shouldn't contain the trigger symbol
      if (query.length < 30 && !query.includes("\n")) {
        setMentionType(type);
        setMentionQuery(query);
        return;
      }
    }

    setMentionType(null);
    setShowMentionList(false);
  };

  useEffect(() => {
    if (!mentionType) {
      setMentionResults([]);
      setShowMentionList(false);
      return;
    }

    const timer = setTimeout(async () => {
      if (mentionQuery.length < 1) return;

      try {
        if (mentionType === "user") {
          const results = await ProfileService.searchUsers(mentionQuery);
          setMentionResults(results || []);
        } else {
          // Allow spaces, TMDB handles it
          const results = await TMDBService.searchSeries(mentionQuery);
          // Only show top 5 to keep list small
          setMentionResults(results?.slice(0, 5) || []);
        }
        setShowMentionList(true);
        setSelectedIndex(0);
      } catch (e) {
        console.error(e);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [mentionQuery, mentionType]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const pos = e.target.selectionStart;
    setMentionTarget("post"); // Set target
    setNewPostContent(val);
    setCursorPosition(pos);
    updateMentionSearch(val, pos);
  };

  const handleCommentInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const pos = e.target.selectionStart || val.length;
    setMentionTarget("comment"); // Set target
    setNewCommentText(val);
    setCursorPosition(pos);
    updateMentionSearch(val, pos);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showMentionList || mentionResults.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % mentionResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(
        (prev) => (prev - 1 + mentionResults.length) % mentionResults.length
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      insertMention(mentionResults[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowMentionList(false);
    }
  };

  const insertMention = (item: any) => {
    const currentContent =
      mentionTarget === "post" ? newPostContent : newCommentText;
    const setContent =
      mentionTarget === "post" ? setNewPostContent : setNewCommentText;

    const textBefore = currentContent.slice(0, cursorPosition);
    const textAfter = currentContent.slice(cursorPosition);

    // Find start of trigger based on the type we are currently searching for
    // We search backwards from cursor
    let triggerIndex = -1;
    if (mentionType === "user") {
      triggerIndex = textBefore.lastIndexOf("@");
    } else {
      triggerIndex = textBefore.lastIndexOf("/");
    }

    // Safety check
    if (triggerIndex === -1) return;

    const prefix = textBefore.slice(0, triggerIndex);

    // Handle for user might not be present, fallback to name
    // Important: We strip any leading @ from handle if it exists to avoid double @
    let handle = item.handle || item.name;
    if (handle && handle.startsWith("@")) handle = handle.slice(1);

    // Generate text
    let mentionText = "";
    if (mentionType === "user") {
      mentionText = `@${handle} `;
    } else {
      // For series, if it's a post, we don't put text in body (metadata only)
      // If it's a comment, we keep the text because comments don't have metadata/headers for series yet
      mentionText =
        mentionTarget === "post" ? "" : `*${item.name || item.title}* `;
    }

    // START CHANGE: Capture Series Logic
    if (mentionType === "series" && mentionTarget === "post") {
      // Store selected series ID for later usage in createPost
      // We will need a new state for this or pass it?
      // Let's create a temporary state 'postRelatedSeries'
      setPostRelatedSeries({
        tmdb_id: item.id,
        series_title: item.name || item.title,
      });
    }
    // END CHANGE

    setContent(prefix + mentionText + textAfter);
    setMentionType(null);
    setShowMentionList(false);
    setMentionResults([]);

    // Focus hack
    setTimeout(() => {
      const selector =
        mentionTarget === "post" ? "textarea" : 'input[type="text"]'; // simplified selector
      const element = document.querySelector(selector) as HTMLElement; // might need more specific selector for comments
      if (element && (element as any).setSelectionRange) {
        element.focus();
        const newPos = prefix.length + mentionText.length;
        (element as any).setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  useEffect(() => {
    if (user?.id) {
      setPage(1);
      setPosts([]);
      setHasMore(true);
      loadFeed(1, true); // Reset load
      // Carregar séries do usuário para saber quais já foram adicionadas
      loadMySeries();
      loadSuggestions();
    }
    loadTrending();
    loadSuggestedClubs();
  }, [user?.id, feedType]); // Reagir a mudanças no tipo de feed

  const loadSuggestions = async () => {
    if (!user?.id) return;
    try {
      const suggestions = await ProfileService.getSuggestions(user.id);
      setSuggestedUsers(suggestions as any[]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleFollowUser = async (targetId: string) => {
    if (!user?.id) return;
    try {
      await ProfileService.followUser(user.id, targetId);
      // Remove from suggestions list visually
      setSuggestedUsers((prev) => prev.filter((u) => u.id !== targetId));
    } catch (e) {
      alert("Erro ao seguir usuário");
    }
  };

  const loadMySeries = async () => {
    if (!user?.id) return;
    try {
      const mySeries = await UserSeriesService.getUserSeries(user.id);
      setMySeriesIds(new Set(mySeries.map((s) => s.tmdb_id)));
    } catch (error) {
      console.error("Erro ao carregar séries do usuário:", error);
    }
  };

  const loadFeed = async (pageToLoad = 1, reset = false) => {
    try {
      setLoadingPosts(true);
      const limit = 10; // Aumentado para melhor paginação
      const response = await PostService.getFeed(
        pageToLoad,
        limit,
        feedType,
        user?.id
      );
      const newPosts = response?.data || [];

      // Transform and add userHasLiked
      const formattedFeed = newPosts.map((p: any) => ({
        ...p,
        userHasLiked:
          p.post_likes?.some((l: any) => l.user_id === user?.id) || false,
      }));

      if (reset) {
        setPosts(formattedFeed as any);
      } else {
        setPosts((prev) => [...prev, ...(formattedFeed as any)]);
      }

      // Check if we have more
      if (newPosts.length < limit) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
    } catch (error: any) {
      console.error("Erro ao carregar feed:", error);
      showError(
        error?.message || "Erro ao carregar publicações. Tente novamente.",
        "error"
      );
    } finally {
      setLoadingPosts(false);
    }
  };

  // Infinite scroll observer
  useEffect(() => {
    if (!hasMore || loadingPosts) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingPosts) {
          const nextPage = page + 1;
          setPage(nextPage);
          loadFeed(nextPage);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loadingPosts, page]);

  const loadTrending = async () => {
    const trending = await TMDBService.getTrendingSeries();
    setTrendingSeries(trending.slice(0, 5));
  };

  const loadSuggestedClubs = async () => {
    try {
      // Carregar clubes mesmo sem userId para mostrar todos
      const userId = user?.id;
      const clubs = await ClubService.getClubs(undefined, userId);
      console.log('[Feed] Clubes carregados:', clubs);
      
      // Mostrar todos os clubes (limitado a 5) - pode incluir clubes que o usuário já é membro
      // Priorizar clubes que o usuário não é membro, mas se não houver, mostrar todos
      const clubsNotMember = clubs.filter(club => !club.is_member);
      const clubsToShow = clubsNotMember.length > 0 
        ? clubsNotMember.slice(0, 5)
        : clubs.slice(0, 5);
      console.log('[Feed] Clubes sugeridos (mostrando):', clubsToShow);
      setSuggestedClubs(clubsToShow);
    } catch (error: any) {
      console.error('[Feed] Erro ao carregar clubes sugeridos:', error);
      // Não mostrar erro ao usuário, apenas logar
      setSuggestedClubs([]);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewPostImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handlePostSubmit = async () => {
    if (!newPostContent.trim()) {
      showError("Por favor, escreva algo antes de publicar.", "warning");
      return;
    }
    if (!user?.id) {
      showError("Você precisa estar logado para publicar.", "error");
      return;
    }

    setSubmitting(true);

    try {
      await PostService.createPost(
        user.id,
        newPostContent,
        newPostImage,
        postRelatedSeries?.tmdb_id,
        postRelatedSeries?.series_title,
        isSpoiler,
        spoilerTopic || postRelatedSeries?.series_title || undefined
      );

      // Check for immediate badge award
      if (postRelatedSeries?.tmdb_id) {
        try {
          const { BadgeService } = await import("../services/badgeService");
          const badge = await BadgeService.checkPostBadges(
            user.id,
            postRelatedSeries.tmdb_id
          );
          if (badge) {
            setJustEarnedBadge(badge as unknown as Stamp);
          }
        } catch (badgeError) {
          console.error("Erro ao verificar badges:", badgeError);
          // Não mostra erro para o usuário, é apenas um bonus
        }
      }

      setNewPostContent("");
      setNewPostImage(null);
      setImagePreview(null);
      setPostRelatedSeries(null);
      setIsSpoiler(false);
      setSpoilerTopic("");

      showError("Publicação criada com sucesso!", "success", 3000);

      // Reload feed from scratch to show new post
      setPage(1);
      loadFeed(1, true);
    } catch (error: any) {
      console.error("Erro ao criar post:", error);
      showError(
        error?.message || "Erro ao criar publicação. Tente novamente.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSpoiler = (id: number) => {
    setSpoilerRevealed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleLike = async (post: Post) => {
    try {
      // Optimistic Update
      const isLiked = post.userHasLiked; // Need to track this in Post type or separately
      const newLikes = isLiked ? post.likes - 1 : post.likes + 1;

      setPosts(
        posts.map((p) =>
          p.id === post.id
            ? { ...p, likes: newLikes, userHasLiked: !isLiked }
            : p
        )
      );

      if (isLiked) {
        await PostService.unlikePost(String(post.id), user.id as string);
      } else {
        await PostService.likePost(String(post.id), user.id as string);
      }
    } catch (err) {
      console.error(err);
      loadFeed(); // Revert on error
    }
  };

  const toggleComments = async (postId: string) => {
    if (activeCommentsPostId === postId) {
      setActiveCommentsPostId(null);
      return;
    }
    setActiveCommentsPostId(postId);
    if (!commentsData[postId]) {
      setLoadingComments(true);
      try {
        const comments = await PostService.getComments(postId);
        setCommentsData((prev) => ({ ...prev, [postId]: comments }));
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingComments(false);
      }
    }
  };

  const submitComment = async (postId: string) => {
    if (!newCommentText.trim()) return;
    try {
      const comment = await PostService.addComment(
        postId,
        user.id,
        newCommentText
      );
      setCommentsData((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), comment],
      }));
      setPosts(
        posts.map((p) =>
          p.id === postId ? { ...p, comments: p.comments + 1 } : p
        )
      );
      setNewCommentText("");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta publicação?")) return;
    try {
      await PostService.deletePost(postId);
      setPosts(posts.filter((p) => p.id !== postId));
      setActiveMenuId(null);
    } catch (error: any) {
      alert("Erro ao excluir: " + error.message);
    }
  };

  const handleSeriesClick = async (seriesName: string) => {
    try {
      const results = await TMDBService.searchSeries(seriesName);
      if (results && results.length > 0) {
        setSelectedSeries(results[0]);
        setIsModalOpen(true); // Re-using the trending modal
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUserClick = async (handle: string) => {
    try {
      // Try to search for user by handle (fuzzy)
      const results = await ProfileService.searchUsers(handle);
      // Filter for exact handle match if possible, or take first
      const user =
        results?.find(
          (u: any) =>
            u.handle === handle ||
            u.handle === `@${handle}` ||
            u.name === handle
        ) || results?.[0];

      if (user) {
        navigate(`/user/${user.id}`);
      } else {
        alert("Usuário não encontrado");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const [activeTab, setActiveTab] = useState<RatingCategory>("Recomendadas");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newReview, setNewReview] = useState<{
    title: string;
    image: string;
    category: RatingCategory;
    comment: string;
  }>({
    title: "",
    image: "",
    category: "Recomendadas",
    comment: "",
  });
  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark transition-colors duration-300 pb-20 md:pb-0">
      <Navigation page="feed" />

      {welcomeStamp && (
        <WelcomeStampModal
          stamp={welcomeStamp}
          onClose={() => setWelcomeStamp(null)}
        />
      )}

      {justEarnedBadge && (
        <CongratsModal
          stamp={justEarnedBadge}
          onClose={() => setJustEarnedBadge(null)}
          onViewCollection={() => {
            setJustEarnedBadge(null);
            // Navigate to collection or open modal?
            // For now close, maybe navigate to profile?
            navigate(`/user/${user.id}`);
          }}
        />
      )}

      <main className="flex-1 w-full max-w-[1280px] mx-auto px-3 py-4 sm:p-4 lg:px-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8">
          {/* Main Feed Column */}
          <div className="lg:col-span-8 flex flex-col gap-4 sm:gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2">
              <div className="flex items-center gap-4">
                <h1 className="text-slate-900 dark:text-white text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
                  Feed de Séries
                </h1>
                {/* Tabs pequenas para alternar entre Seguindo e Global */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setFeedType("following");
                      setPage(1);
                      setPosts([]);
                      setHasMore(true);
                    }}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors touch-manipulation ${
                      feedType === "following"
                        ? "text-primary font-bold bg-primary/10 dark:bg-primary/20"
                        : "text-slate-500 dark:text-text-secondary hover:text-slate-700 dark:hover:text-white"
                    }`}
                  >
                    Seguindo
                  </button>
                  <button
                    onClick={() => {
                      setFeedType("global");
                      setPage(1);
                      setPosts([]);
                      setHasMore(true);
                    }}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors touch-manipulation ${
                      feedType === "global"
                        ? "text-primary font-bold bg-primary/10 dark:bg-primary/20"
                        : "text-slate-500 dark:text-text-secondary hover:text-slate-700 dark:hover:text-white"
                    }`}
                  >
                    Global
                  </button>
                </div>
              </div>
              <button
                className="md:hidden text-primary p-2 -mr-2 self-end"
                aria-label="Buscar"
              >
                <span className="material-symbols-outlined text-2xl">
                  search
                </span>
              </button>
            </div>

            {/* Composer - Mobile Optimized */}
            <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-surface-border shadow-sm dark:shadow-lg transition-colors duration-300">
              <div className="p-3 sm:p-4 flex gap-3 sm:gap-4">
                <div className="shrink-0">
                  <div
                    className="size-10 sm:size-12 rounded-full bg-cover bg-center"
                    style={{ backgroundImage: `url('${user.avatar}')` }}
                  ></div>
                </div>
                <div className="flex-1 flex flex-col gap-2 sm:gap-3 relative">
                  <textarea
                    className="w-full bg-gray-50 dark:bg-[#1a1122] border border-gray-200 dark:border-surface-border rounded-lg p-3 text-sm sm:text-base text-slate-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-text-secondary focus:border-primary focus:ring-1 focus:ring-primary resize-none min-h-[80px] sm:min-h-[100px] transition-colors"
                    placeholder="O que você está assistindo? Compartilhe sua opinião..."
                    value={newPostContent}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onSelect={(e) =>
                      setCursorPosition(
                        (e.target as HTMLTextAreaElement).selectionStart
                      )
                    }
                  ></textarea>

                  {/* Mention Hints */}
                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-gray-500 mt-1">
                    <div className="flex items-center gap-1">
                      <span className="font-mono font-bold text-primary">
                        /
                      </span>
                      <span>mencionar série</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-mono font-bold text-blue-500">
                        @
                      </span>
                      <span>mencionar usuário</span>
                    </div>
                  </div>

                  {/* Mention List Dropdown - Mobile Optimized */}
                  {showMentionList &&
                    mentionResults.length > 0 &&
                    mentionTarget === "post" && (
                      <div
                        className="absolute bg-white dark:bg-surface-dark border border-gray-200 dark:border-surface-border rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto w-full sm:w-72 left-0 right-0 sm:right-auto"
                        style={{ top: "100%" }}
                      >
                        {mentionResults.map((item: any, index: number) => (
                          <button
                            key={item.id}
                            onClick={() => insertMention(item)}
                            className={`w-full text-left px-3 py-2 flex items-center gap-2 border-b border-gray-100 dark:border-white/5 last:border-0 transition-colors ${
                              index === selectedIndex
                                ? "bg-primary/10 dark:bg-primary/20"
                                : "hover:bg-gray-100 dark:hover:bg-white/10"
                            }`}
                          >
                            {mentionType === "user" ? (
                              <>
                                <div
                                  className="size-6 rounded-full bg-cover bg-center shrink-0"
                                  style={{
                                    backgroundImage: `url('${
                                      item.avatar ||
                                      "https://placeholder.pics/svg/50"
                                    }')`,
                                  }}
                                ></div>
                                <div className="flex flex-col truncate">
                                  <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                    {item.name}
                                  </span>
                                  <span className="text-xs text-slate-500 truncate">
                                    {item.handle}
                                  </span>
                                </div>
                              </>
                            ) : (
                              <>
                                <div
                                  className="w-6 h-8 bg-cover bg-center rounded shrink-0"
                                  style={{
                                    backgroundImage: `url('${TMDBService.getImageUrl(
                                      item.poster_path
                                    )}')`,
                                  }}
                                ></div>
                                <div className="flex flex-col truncate">
                                  <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                    {item.name || item.title}
                                  </span>
                                  <span className="text-xs text-slate-500 truncate">
                                    {item.first_air_date?.split("-")[0]}
                                  </span>
                                </div>
                              </>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  {/* Selected Series Preview */}
                  {postRelatedSeries && (
                    <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg p-2 mb-2">
                      <div
                        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() =>
                          handleSeriesClick(postRelatedSeries.series_title)
                        }
                      >
                        <span className="material-symbols-outlined text-primary">
                          movie
                        </span>
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Série mencionada:
                          </span>
                          <span className="text-sm font-bold text-primary">
                            {postRelatedSeries.series_title}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setPostRelatedSeries(null)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          close
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Spoiler Alert Preview */}
                  {isSpoiler && (
                    <div className="flex items-center justify-between bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg p-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-red-500 text-lg">
                          visibility_off
                        </span>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-red-600 dark:text-red-400">
                            ⚠️ Alerta de Spoiler
                          </span>
                          {spoilerTopic && (
                            <span className="text-xs text-red-500 dark:text-red-400">
                              Sobre: {spoilerTopic}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setIsSpoiler(false);
                          setSpoilerTopic("");
                        }}
                        className="text-red-400 hover:text-red-600 transition-colors p-1"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          close
                        </span>
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className={`p-2.5 sm:p-2 rounded-full transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center ${
                          newPostImage
                            ? "text-green-500 bg-green-50 dark:bg-green-500/10"
                            : "text-primary active:bg-primary/10"
                        }`}
                        title="Adicionar Imagem"
                        aria-label="Adicionar Imagem"
                      >
                        <span className="material-symbols-outlined text-xl sm:text-[22px]">
                          {newPostImage ? "check_circle" : "image"}
                        </span>
                      </button>
                      <button
                        className="p-2.5 sm:p-2 text-primary active:bg-primary/10 rounded-full transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                        title="Marcar Série"
                        aria-label="Marcar Série"
                      >
                        <span className="material-symbols-outlined text-xl sm:text-[22px]">
                          movie
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          setIsSpoiler(!isSpoiler);
                          if (
                            !isSpoiler &&
                            !spoilerTopic &&
                            postRelatedSeries?.series_title
                          ) {
                            setSpoilerTopic(postRelatedSeries.series_title);
                          } else if (!isSpoiler) {
                            setSpoilerTopic("");
                          }
                        }}
                        className={`p-2.5 sm:p-2 rounded-full transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center ${
                          isSpoiler
                            ? "text-red-500 bg-red-50 dark:bg-red-500/10"
                            : "text-primary active:bg-primary/10"
                        }`}
                        title={
                          isSpoiler
                            ? "Remover alerta de spoiler"
                            : "Marcar como spoiler"
                        }
                        aria-label={
                          isSpoiler
                            ? "Remover alerta de spoiler"
                            : "Marcar como spoiler"
                        }
                      >
                        <span
                          className={`material-symbols-outlined text-xl sm:text-[22px] ${
                            isSpoiler ? "filled" : ""
                          }`}
                        >
                          visibility_off
                        </span>
                      </button>
                    </div>
                    <button
                      onClick={handlePostSubmit}
                      className="px-4 sm:px-6 py-2.5 sm:py-2 bg-primary active:bg-primary/90 text-white text-xs sm:text-sm font-bold rounded-lg transition-colors shadow-md touch-manipulation min-h-[44px] whitespace-nowrap"
                      disabled={submitting}
                    >
                      {submitting ? "Publicando..." : "Publicar"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Posts - Mobile Optimized */}
            {loadingPosts && posts.length === 0 ? (
              <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-surface-border p-6 sm:p-8 text-center">
                <p className="text-slate-600 dark:text-text-secondary text-sm sm:text-base">
                  Carregando posts...
                </p>
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-surface-border p-6 sm:p-8 text-center">
                {feedType === "following" ? (
                  <>
                    <span className="material-symbols-outlined text-5xl sm:text-6xl text-slate-400 dark:text-text-secondary mb-3 sm:mb-4">
                      person_add
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-2">
                      Você ainda não está seguindo ninguém
                    </h3>
                    <p className="text-sm sm:text-base text-slate-600 dark:text-text-secondary mb-4 px-2">
                      Comece a seguir pessoas para ver suas publicações aqui!
                    </p>
                    <button
                      onClick={() => navigate("/search")}
                      className="px-5 py-2.5 bg-primary active:bg-primary/90 text-white text-sm font-bold rounded-lg transition-colors touch-manipulation min-h-[44px]"
                    >
                      Buscar Usuários
                    </button>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-5xl sm:text-6xl text-slate-400 dark:text-text-secondary mb-3 sm:mb-4">
                      feed
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-2">
                      Nenhuma publicação ainda
                    </h3>
                    <p className="text-sm sm:text-base text-slate-600 dark:text-text-secondary px-2">
                      Seja o primeiro a compartilhar algo!
                    </p>
                  </>
                )}
              </div>
            ) : (
              posts.map((post) => (
                <article
                  key={post.id}
                  className="bg-white dark:bg-surface-dark rounded-xl overflow-hidden shadow-sm dark:shadow-lg border border-gray-200 dark:border-surface-border/50 hover:border-primary/30 dark:hover:border-surface-border transition-colors p-4 sm:p-5"
                >
                  {/* Header - Mobile Optimized */}
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <Link
                        to={`/user/${post.user.id || post.user_id || ""}`}
                        className="shrink-0 touch-manipulation"
                      >
                        <div
                          className="size-9 sm:size-10 rounded-full bg-cover bg-center"
                          style={{
                            backgroundImage: `url('${post.user.avatar}')`,
                          }}
                        ></div>
                      </Link>
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <Link
                            to={`/user/${post.user.id || post.user_id || ""}`}
                            className="text-slate-900 dark:text-white font-bold text-sm hover:underline active:opacity-70 cursor-pointer truncate touch-manipulation min-h-[44px] flex items-center"
                          >
                            {post.user.name}
                          </Link>
                          {post.tag?.type === "watching" && (
                            <>
                              <span className="text-slate-500 dark:text-text-secondary text-xs sm:text-sm hidden min-[375px]:inline">
                                Mencionou a serie
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSeriesClick(post.tag!.text);
                                }}
                                className="text-primary font-bold text-xs sm:text-sm hover:underline cursor-pointer truncate max-w-[120px] sm:max-w-none"
                              >
                                {post.tag.text}
                              </button>
                            </>
                          )}
                        </div>
                        <span className="text-slate-500 dark:text-text-secondary text-[10px] sm:text-xs truncate">
                          {post.user.handle} • {post.timeAgo}
                        </span>
                      </div>
                    </div>
                    {post.isSpoiler && (
                      <span className="bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 px-2 py-0.5 rounded text-xs font-bold uppercase flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">
                          warning
                        </span>{" "}
                        Spoiler
                      </span>
                    )}
                    <div className="relative shrink-0">
                      {user?.id === post.user_id && (
                        <>
                          <button
                            onClick={() =>
                              setActiveMenuId(
                                activeMenuId === post.id ? null : post.id
                              )
                            }
                            className="text-slate-500 dark:text-text-secondary active:text-slate-900 dark:active:text-white p-2 -mr-2 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                            aria-label="Mais opções"
                          >
                            <span className="material-symbols-outlined text-xl">
                              more_horiz
                            </span>
                          </button>
                          {activeMenuId === post.id && (
                            <div className="absolute right-0 top-10 sm:top-8 bg-white dark:bg-surface-dark border border-gray-200 dark:border-surface-border rounded-lg shadow-xl z-20 min-w-[140px] overflow-hidden">
                              <button
                                onClick={() => handleDeletePost(post.id)}
                                className="w-full text-left px-4 py-3 text-sm text-red-600 active:bg-red-50 dark:active:bg-red-900/20 flex items-center gap-2 touch-manipulation min-h-[44px]"
                              >
                                <span className="material-symbols-outlined text-lg">
                                  delete
                                </span>{" "}
                                Excluir
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  {post.isSpoiler && !spoilerRevealed[post.id] ? (
                    <div
                      onClick={() => toggleSpoiler(post.id)}
                      className="relative bg-gray-50 dark:bg-black/20 rounded-lg p-3 sm:p-4 text-center border border-dashed border-gray-300 dark:border-surface-border cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group mb-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-slate-500 dark:text-text-secondary text-xl sm:text-2xl group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                          visibility_off
                        </span>
                        <p className="text-sm text-slate-600 dark:text-text-secondary font-medium group-hover:text-slate-900 dark:group-hover:text-white">
                          Contém spoilers de{" "}
                          <strong className="text-slate-900 dark:text-white">
                            {post.spoilerTopic || "uma série"}
                          </strong>
                        </p>
                      </div>
                      <button className="text-primary text-xs sm:text-sm font-bold hover:underline bg-primary/10 px-3 py-1 rounded-full">
                        Toque para revelar
                      </button>
                    </div>
                  ) : (
                    <>
                      {post.tag?.type === "review" && (
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 leading-tight">
                          {post.tag.text}
                        </h3>
                      )}

                      <PostContent
                        content={post.content}
                        onSeriesClick={handleSeriesClick}
                        onUserClick={handleUserClick}
                      />

                      {post.image && (
                        <div className="relative w-full rounded-lg overflow-hidden mb-4 group border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-black">
                          <LazyImage
                            src={post.image}
                            alt="Post content"
                            className="w-full h-auto max-h-[600px] object-contain mx-auto"
                          />
                          {post.tag?.type === "review" && (
                            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1 z-10">
                              <span className="material-symbols-outlined text-[14px] text-primary">
                                star
                              </span>{" "}
                              Review
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-white/5 mt-2">
                    <div className="flex gap-3 sm:gap-4">
                      <button
                        onClick={() => handleLike(post)}
                        className={`flex items-center gap-1.5 transition-colors touch-manipulation min-h-[44px] px-2 -ml-2 ${
                          post.userHasLiked
                            ? "text-red-500"
                            : "text-slate-500 dark:text-text-secondary active:text-red-500"
                        }`}
                        aria-label={`${
                          post.userHasLiked ? "Descurtir" : "Curtir"
                        } post`}
                      >
                        <span
                          className={`material-symbols-outlined text-lg sm:text-[20px] ${
                            post.userHasLiked ? "filled" : ""
                          }`}
                        >
                          favorite
                        </span>
                        <span className="text-xs font-bold">{post.likes}</span>
                      </button>
                      <button
                        onClick={() => toggleComments(post.id)}
                        className="flex items-center gap-1.5 text-slate-500 dark:text-text-secondary active:text-slate-900 dark:active:text-white transition-colors touch-manipulation min-h-[44px] px-2"
                        aria-label="Comentar"
                      >
                        <span className="material-symbols-outlined text-lg sm:text-[20px]">
                          chat_bubble
                        </span>
                        <span className="text-xs font-bold">
                          {post.comments}
                        </span>
                      </button>
                      <button
                        className="flex items-center gap-1.5 text-slate-500 dark:text-text-secondary active:text-slate-900 dark:active:text-white transition-colors touch-manipulation min-h-[44px] px-2"
                        aria-label="Compartilhar"
                      >
                        <span className="material-symbols-outlined text-lg sm:text-[20px]">
                          share
                        </span>
                        <span className="text-xs font-bold">{post.shares}</span>
                      </button>
                    </div>
                  </div>

                  {/* Comments Section - Mobile Optimized */}
                  {activeCommentsPostId === post.id && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 -mx-4 sm:-mx-5 -mb-4 sm:-mb-5 p-4 sm:p-5">
                      <div className="flex gap-2 mb-4">
                        <div className="relative flex-1">
                          <input
                            className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 px-3 py-2.5 sm:py-2 text-sm min-h-[44px]"
                            placeholder="Escreva um comentário..."
                            value={newCommentText}
                            onChange={handleCommentInputChange}
                            onKeyDown={(e) => {
                              if (showMentionList) {
                                // Pass verify to main handleKeyDown handler if needed or duplicate logic
                                // For simplicity let's duplicate the key check for now
                                if (e.key === "ArrowDown") {
                                  e.preventDefault();
                                  setSelectedIndex(
                                    (prev) => (prev + 1) % mentionResults.length
                                  );
                                } else if (e.key === "ArrowUp") {
                                  e.preventDefault();
                                  setSelectedIndex(
                                    (prev) =>
                                      (prev - 1 + mentionResults.length) %
                                      mentionResults.length
                                  );
                                } else if (e.key === "Enter") {
                                  e.preventDefault();
                                  insertMention(mentionResults[selectedIndex]);
                                } else if (e.key === "Escape") {
                                  setShowMentionList(false);
                                }
                              } else if (e.key === "Enter") {
                                // Submit comment if not selecting mention
                                // submitComment(post.id); // Optional: submit on enter
                              }
                            }}
                            onSelect={(e) =>
                              setCursorPosition(
                                (e.target as HTMLInputElement).selectionStart ||
                                  0
                              )
                            }
                          />

                          {/* Comment Mention Dropdown - Mobile Optimized */}
                          {showMentionList &&
                            mentionResults.length > 0 &&
                            mentionTarget === "comment" && (
                              <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-surface-dark border border-gray-200 dark:border-surface-border rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto w-full sm:w-72">
                                {mentionResults.map(
                                  (item: any, index: number) => (
                                    <button
                                      key={item.id}
                                      onClick={() => insertMention(item)}
                                      className={`w-full text-left px-3 py-2 flex items-center gap-2 border-b border-gray-100 dark:border-white/5 last:border-0 transition-colors ${
                                        index === selectedIndex
                                          ? "bg-primary/10 dark:bg-primary/20"
                                          : "hover:bg-gray-100 dark:hover:bg-white/10"
                                      }`}
                                    >
                                      {mentionType === "user" ? (
                                        <>
                                          <div
                                            className="size-6 rounded-full bg-cover bg-center shrink-0"
                                            style={{
                                              backgroundImage: `url('${
                                                item.avatar ||
                                                "https://placeholder.pics/svg/50"
                                              }')`,
                                            }}
                                          ></div>
                                          <div className="flex flex-col truncate">
                                            <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                              {item.name}
                                            </span>
                                            <span className="text-xs text-slate-500 truncate">
                                              {item.handle}
                                            </span>
                                          </div>
                                        </>
                                      ) : (
                                        <>
                                          <div
                                            className="w-6 h-8 bg-cover bg-center rounded shrink-0"
                                            style={{
                                              backgroundImage: `url('${TMDBService.getImageUrl(
                                                item.poster_path
                                              )}')`,
                                            }}
                                          ></div>
                                          <div className="flex flex-col truncate">
                                            <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                              {item.name || item.title}
                                            </span>
                                            <span className="text-xs text-slate-500 truncate">
                                              {
                                                item.first_air_date?.split(
                                                  "-"
                                                )[0]
                                              }
                                            </span>
                                          </div>
                                        </>
                                      )}
                                    </button>
                                  )
                                )}
                              </div>
                            )}
                        </div>
                        <button
                          onClick={() => submitComment(post.id)}
                          className="bg-primary active:bg-primary/90 text-white rounded-lg px-4 py-2.5 sm:py-2 text-sm font-bold disabled:opacity-50 touch-manipulation min-h-[44px] whitespace-nowrap"
                          disabled={!newCommentText.trim()}
                        >
                          Enviar
                        </button>
                      </div>
                      <div className="space-y-3">
                        {loadingComments ? (
                          <p className="text-center text-xs text-gray-500">
                            Carregando...
                          </p>
                        ) : commentsData[post.id]?.length > 0 ? (
                          commentsData[post.id].map((comment: any) => (
                            <div key={comment.id} className="flex gap-2">
                              <div
                                className="size-8 rounded-full bg-cover bg-center shrink-0"
                                style={{
                                  backgroundImage: `url('${
                                    comment.author?.avatar ||
                                    "https://placeholder.pics/svg/50"
                                  }')`,
                                }}
                              ></div>
                              <div className="flex flex-col">
                                <div className="bg-white dark:bg-white/10 p-2 rounded-lg rounded-tl-none">
                                  <span className="font-bold text-xs text-slate-900 dark:text-white block">
                                    {comment.author?.name}
                                  </span>
                                  <PostContent
                                    content={comment.content}
                                    onSeriesClick={handleSeriesClick}
                                    onUserClick={handleUserClick}
                                  />
                                </div>
                                <span className="text-[10px] text-gray-500 mt-0.5 ml-1">
                                  {new Date(
                                    comment.created_at
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-center text-xs text-gray-500">
                            Seja o primeiro a comentar!
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              ))
            )}

            {/* Infinite scroll trigger */}
            {hasMore && posts.length > 0 && (
              <div
                ref={observerTarget}
                className="flex justify-center mt-4 mb-4 sm:mb-6 py-4"
              >
                {loadingPosts && (
                  <div className="flex items-center gap-2 text-slate-500 dark:text-text-secondary">
                    <span className="material-symbols-outlined animate-spin">
                      progress_activity
                    </span>
                    <span className="text-sm">
                      Carregando mais publicações...
                    </span>
                  </div>
                )}
              </div>
            )}

            {!hasMore && posts.length > 0 && (
              <div className="flex justify-center mt-4 mb-4 sm:mb-6">
                <p className="text-slate-500 dark:text-text-secondary text-sm">
                  Você chegou ao fim do feed!
                </p>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <aside className="hidden lg:flex flex-col col-span-4 gap-6">
            {/* Trending */}
            <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-surface-border p-5 shadow-sm dark:shadow-lg transition-colors duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-900 dark:text-white font-bold text-lg">
                  Em Alta na Semana
                </h3>
                <a
                  className="text-primary text-xs font-bold hover:underline"
                  href="#"
                >
                  Ver tudo
                </a>
              </div>
              <div className="flex flex-col gap-4">
                {trendingSeries.map((series, index) => (
                  <div
                    key={series.id}
                    className="flex gap-3 items-center group cursor-pointer"
                    onClick={() => setSelectedSeries(series)}
                  >
                    <div
                      className="w-12 h-16 rounded bg-cover bg-center shrink-0"
                      style={{
                        backgroundImage: `url('${TMDBService.getImageUrl(
                          series.poster_path
                        )}')`,
                      }}
                    ></div>
                    <div className="flex flex-col flex-1">
                      <h4 className="text-slate-900 dark:text-white font-bold text-sm group-hover:text-primary transition-colors line-clamp-1">
                        {series.name}
                      </h4>
                      <span className="text-slate-500 dark:text-text-secondary text-xs truncate">
                        {series.first_air_date?.split("-")[0] || "N/A"}
                      </span>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="material-symbols-outlined text-yellow-500 text-[14px] filled">
                          star
                        </span>
                        <span className="text-slate-900 dark:text-white text-xs font-bold">
                          {series.vote_average.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation(); // Prevenir que abra o modal
                        if (mySeriesIds.has(series.id)) {
                          alert("Você já adicionou esta série!");
                          return;
                        }
                        try {
                          await UserSeriesService.addSeries(user.id, series);
                          setMySeriesIds((prev) =>
                            new Set(prev).add(series.id)
                          );
                          // Feedback visual temporário
                          const button = e.currentTarget;
                          const originalHTML = button.innerHTML;
                          button.innerHTML =
                            '<span class="material-symbols-outlined text-green-500">check_circle</span>';
                          button.className =
                            "text-green-500 dark:text-green-400 transition-colors";
                          setTimeout(() => {
                            button.innerHTML = originalHTML;
                            button.className =
                              "text-slate-400 dark:text-slate-500 hover:text-primary transition-colors";
                          }, 2000);
                        } catch (error: any) {
                          alert(error.message || "Erro ao adicionar série");
                        }
                      }}
                      className={`transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center ${
                        mySeriesIds.has(series.id)
                          ? "text-green-500 dark:text-green-400"
                          : "text-slate-400 dark:text-slate-500 hover:text-primary active:text-primary"
                      }`}
                      title={
                        mySeriesIds.has(series.id)
                          ? "Já adicionada"
                          : "Adicionar à minha lista"
                      }
                    >
                      <span className="material-symbols-outlined">
                        {mySeriesIds.has(series.id)
                          ? "check_circle"
                          : "add_circle"}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Suggested Clubs */}
            <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-surface-border p-5 shadow-sm dark:shadow-lg transition-colors duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-900 dark:text-white font-bold text-lg">
                  Clubes Sugeridos
                </h3>
              </div>
              <div className="flex flex-col gap-3">
                {suggestedClubs.length > 0 ? (
                  suggestedClubs.map((club) => (
                    <div
                      key={club.id}
                      className="flex gap-3 items-center group cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                      onClick={() => navigate(`/clubes/${club.id}`)}
                    >
                      <div
                        className="w-12 h-12 rounded-lg bg-cover bg-center shrink-0 border-2"
                        style={{
                          backgroundImage: club.image_url
                            ? `url('${club.image_url}')`
                            : 'none',
                          backgroundColor: club.color || '#6366f1',
                        }}
                      ></div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <h4 className="text-slate-900 dark:text-white font-bold text-sm group-hover:text-primary transition-colors line-clamp-1">
                          {club.name}
                        </h4>
                        <span className="text-slate-500 dark:text-text-secondary text-xs truncate">
                          {club.member_count || 0} {club.member_count === 1 ? 'membro' : 'membros'}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/clubes/${club.id}`);
                        }}
                        className="text-primary text-xs font-bold border border-primary/30 hover:bg-primary hover:text-white px-3 py-1.5 rounded-full transition-all shrink-0"
                      >
                        Ver
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 dark:text-text-secondary text-sm text-center py-4">
                    Nenhum clube disponível no momento.
                  </p>
                )}
              </div>
            </div>

            {/* Suggested Users */}
            <div className="bg-white dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-surface-border p-5 shadow-sm dark:shadow-lg transition-colors duration-300">
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-4">
                Quem Seguir
              </h3>
              <div className="flex flex-col gap-4">
                {suggestedUsers.length > 0 ? (
                  suggestedUsers.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between"
                    >
                      <div
                        className="flex items-center gap-2 cursor-pointer group"
                        onClick={() => navigate(`/user/${u.id}`)}
                      >
                        <div
                          className="size-9 rounded-full bg-cover bg-center"
                          style={{
                            backgroundImage: `url('${
                              u.avatar || "https://placeholder.pics/svg/50"
                            }')`,
                          }}
                        ></div>
                        <div className="flex flex-col">
                          <span className="text-slate-900 dark:text-white text-sm font-bold group-hover:text-primary transition-colors">
                            {u.name}
                          </span>
                          <span className="text-slate-500 dark:text-text-secondary text-[10px] truncate max-w-[100px]">
                            {u.bio || "Novo usuário"}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleFollowUser(u.id)}
                        className="text-primary text-xs font-bold border border-primary/30 hover:bg-primary hover:text-white px-3 py-1 rounded-full transition-all"
                      >
                        Seguir
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 text-sm">
                    Nenhuma sugestão no momento.
                  </p>
                )}
              </div>
              <button className="w-full mt-4 py-2 text-slate-500 dark:text-text-secondary text-sm font-medium hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                Ver mais sugestões
              </button>
            </div>
          </aside>
        </div>

        {/* Simple Modal for Trending Series */}
        {selectedSeries && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedSeries(null)}
          >
            <div
              className="bg-white dark:bg-surface-dark w-full max-w-lg rounded-xl overflow-hidden shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedSeries(null)}
                className="absolute top-2 right-2 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white z-10"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
              <div
                className="h-48 bg-cover bg-center relative"
                style={{
                  backgroundImage: `url('${TMDBService.getImageUrl(
                    selectedSeries.backdrop_path || selectedSeries.poster_path
                  )}')`,
                }}
              >
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                  <h2 className="text-xl font-bold text-white">
                    {selectedSeries.name}
                  </h2>
                  <div className="flex gap-2 text-xs text-gray-300">
                    <span>{selectedSeries.first_air_date?.split("-")[0]}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[10px] text-yellow-500 filled">
                        star
                      </span>{" "}
                      {selectedSeries.vote_average}
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <p className="text-sm text-slate-700 dark:text-gray-300 leading-relaxed max-h-40 overflow-y-auto mb-6">
                  {selectedSeries.overview || "Sinopse não disponível."}
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={async () => {
                      if (mySeriesIds.has(selectedSeries.id)) {
                        alert("Você já adicionou esta série!");
                        return;
                      }
                      try {
                        await UserSeriesService.addSeries(
                          user.id,
                          selectedSeries
                        );
                        setMySeriesIds((prev) =>
                          new Set(prev).add(selectedSeries.id)
                        );
                        // Feedback visual
                        const button = document.querySelector(
                          "[data-add-series-btn]"
                        ) as HTMLButtonElement;
                        if (button) {
                          const originalText = button.textContent;
                          button.textContent = "✓ Adicionada!";
                          button.className =
                            "px-4 py-2 bg-green-500 text-white rounded-lg font-bold text-sm transition-colors";
                          setTimeout(() => {
                            setSelectedSeries(null);
                          }, 1500);
                        } else {
                          setSelectedSeries(null);
                        }
                      } catch (error: any) {
                        alert(error.message || "Erro ao adicionar série");
                      }
                    }}
                    data-add-series-btn
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors touch-manipulation min-h-[44px] ${
                      mySeriesIds.has(selectedSeries.id)
                        ? "bg-green-500 text-white cursor-default"
                        : "bg-primary text-white hover:bg-primary/90 active:bg-primary/80"
                    }`}
                    disabled={mySeriesIds.has(selectedSeries.id)}
                  >
                    {mySeriesIds.has(selectedSeries.id)
                      ? "✓ Já Adicionada"
                      : "Adicionar à Minha Lista"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default FeedPage;
