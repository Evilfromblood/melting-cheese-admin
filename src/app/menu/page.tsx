'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { POSHeader } from '@/components/POSHeader';
import { MenuItem, DietaryType, FoodBadge } from '@/types';
import { FALLBACK_MENU_ITEMS } from '@/lib/menu-data';
import { primeAudio } from '@/lib/sound';
import { 
  Loader2, 
  Search, 
  Check, 
  X, 
  Camera, 
  UploadCloud, 
  Image as ImageIcon, 
  CheckCircle2, 
  AlertOctagon, 
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  Save,
  DollarSign
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';

const CATEGORY_ORDER = [
  'Pizza',
  'Burgers',
  'Snacks',
  'Chicken Wings & Strips',
  'Mocktails',
];

export default function MenuStockManager() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  const [items, setItems] = useState<MenuItem[]>(FALLBACK_MENU_ITEMS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [updatingStockId, setUpdatingStockId] = useState<string | null>(null);

  // Photo upload states
  const [uploadingPhotoId, setUploadingPhotoId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Inline Price Editing state
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState<string>('');
  const [isSavingPrice, setIsSavingPrice] = useState<boolean>(false);

  // Delete Item state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // "+ Add New Dish" Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newDishName, setNewDishName] = useState<string>('');
  const [newDishCategory, setNewDishCategory] = useState<string>('Pizza');
  const [newDishCustomCategory, setNewDishCustomCategory] = useState<string>('');
  const [newDishDietary, setNewDishDietary] = useState<DietaryType>('veg');
  const [newDishPrice, setNewDishPrice] = useState<string>('');
  const [newDishDescription, setNewDishDescription] = useState<string>('');
  const [newDishCustomizable, setNewDishCustomizable] = useState<boolean>(false);
  const [newDishBadge, setNewDishBadge] = useState<string>('');
  const [newDishFile, setNewDishFile] = useState<File | null>(null);
  const [newDishFilePreview, setNewDishFilePreview] = useState<string | null>(null);
  const [isSubmittingNewDish, setIsSubmittingNewDish] = useState<boolean>(false);

  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // 1. Authenticate user
  useEffect(() => {
    async function verifyAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !session.user) {
          router.replace('/login');
          return;
        }
        setUser(session.user);
      } catch (err) {
        console.warn('Auth check error:', err);
        router.replace('/login');
      } finally {
        setIsAuthChecking(false);
      }
    }

    verifyAuth();
  }, [router, supabase]);

  // 2. Fetch Menu Items from Supabase
  const loadMenuItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('category')
        .order('name');

      if (!error && data && data.length > 0) {
        setItems(data);
      } else {
        console.warn('Using fallback menu items:', error?.message);
      }
    } catch (err) {
      console.warn('Network note fetching menu items:', err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (isAuthChecking || !user) return;
    loadMenuItems();
  }, [loadMenuItems, isAuthChecking, user]);

  // 3. Instant 1-Tap Toggle Stock Status
  const handleToggleStock = async (item: MenuItem) => {
    primeAudio();
    const newStatus = !item.is_available;
    setUpdatingStockId(item.id);

    // Optimistic UI update
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_available: newStatus } : i))
    );

    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_available: newStatus })
        .eq('id', item.id);

      if (error) {
        console.error('Failed to update stock status in Supabase:', error);
        // Rollback on error
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, is_available: !newStatus } : i))
        );
      }
    } catch (err) {
      console.error('Stock toggle failed:', err);
      // Rollback
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_available: !newStatus } : i))
      );
    } finally {
      setUpdatingStockId(null);
    }
  };

  // 4. Handle Real Dish Photo Upload to Supabase Storage 'menu-images'
  const handlePhotoSelect = async (
    item: MenuItem,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';

    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validMimes.includes(file.type)) {
      setFeedbackMessage({
        type: 'error',
        text: 'Please select a valid image file (JPG, PNG, or WEBP).',
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFeedbackMessage({
        type: 'error',
        text: 'Image size exceeds 10MB limit. Please upload a smaller photo.',
      });
      return;
    }

    setUploadingPhotoId(item.id);
    setFeedbackMessage(null);

    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const cleanName = item.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const filePath = `${cleanName}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('menu-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('menu-images').getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('menu_items')
        .update({ image: publicUrl })
        .eq('id', item.id);

      if (dbError) {
        throw new Error(`Database error: ${dbError.message}`);
      }

      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, image: publicUrl } : i))
      );

      setFeedbackMessage({
        type: 'success',
        text: `Photo updated successfully for "${item.name}"!`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Photo upload failed.';
      console.error('Photo upload error:', err);
      setFeedbackMessage({
        type: 'error',
        text: `Upload failed: ${msg} (Ensure 'menu-images' bucket exists in Supabase)`,
      });
    } finally {
      setUploadingPhotoId(null);
    }
  };

  // 5. Delete Item from Menu
  const handleDeleteItem = async (item: MenuItem) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${item.name}" from the menu?\n\nThis will remove it from customer storefronts immediately.`
    );
    if (!confirmed) return;

    setDeletingId(item.id);
    setFeedbackMessage(null);

    // Optimistic UI update
    setItems((prev) => prev.filter((i) => i.id !== item.id));

    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', item.id);

      if (error) {
        throw new Error(error.message);
      }

      setFeedbackMessage({
        type: 'success',
        text: `"${item.name}" permanently removed from the menu.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Deletion failed.';
      console.error('Delete error:', err);
      setFeedbackMessage({
        type: 'error',
        text: `Could not delete "${item.name}": ${msg}`,
      });
      // Restore on failure
      loadMenuItems();
    } finally {
      setDeletingId(null);
    }
  };

  // 6. Inline Price Editing
  const handleStartEditPrice = (item: MenuItem) => {
    setEditingPriceId(item.id);
    setEditingPriceValue(String(item.base_price));
  };

  const handleCancelEditPrice = () => {
    setEditingPriceId(null);
    setEditingPriceValue('');
  };

  const handleSavePrice = async (item: MenuItem) => {
    const newPriceNumber = parseInt(editingPriceValue, 10);
    if (isNaN(newPriceNumber) || newPriceNumber < 0) {
      alert('Please enter a valid price amount.');
      return;
    }

    setIsSavingPrice(true);
    // Optimistic UI update
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, base_price: newPriceNumber } : i))
    );

    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ base_price: newPriceNumber })
        .eq('id', item.id);

      if (error) {
        throw new Error(error.message);
      }

      setFeedbackMessage({
        type: 'success',
        text: `Price for "${item.name}" updated to ₹${newPriceNumber}!`,
      });
      setEditingPriceId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Price update failed.';
      setFeedbackMessage({
        type: 'error',
        text: `Failed to update price: ${msg}`,
      });
      loadMenuItems();
    } finally {
      setIsSavingPrice(false);
    }
  };

  // 7. Add New Dish Modal Submission
  const handleNewDishPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNewDishFile(file);
    const objectUrl = URL.createObjectURL(file);
    setNewDishFilePreview(objectUrl);
  };

  const handleCreateNewDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDishName.trim()) {
      alert('Please enter a dish name.');
      return;
    }

    const priceNum = parseInt(newDishPrice, 10);
    if (isNaN(priceNum) || priceNum < 0) {
      alert('Please enter a valid base price.');
      return;
    }

    const finalCategory = newDishCategory === 'Custom' 
      ? newDishCustomCategory.trim() 
      : newDishCategory;

    if (!finalCategory) {
      alert('Please select or specify a category.');
      return;
    }

    setIsSubmittingNewDish(true);
    setFeedbackMessage(null);

    try {
      let uploadedImageUrl: string | null = null;

      // 1. Upload photo if selected
      if (newDishFile) {
        const fileExt = newDishFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const cleanName = newDishName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
        const filePath = `${cleanName}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('menu-images')
          .upload(filePath, newDishFile, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          console.warn('Image upload note:', uploadError.message);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('menu-images')
            .getPublicUrl(filePath);
          uploadedImageUrl = publicUrl;
        }
      }

      // 2. Insert record into Supabase menu_items
      const { data, error } = await supabase
        .from('menu_items')
        .insert({
          name: newDishName.trim(),
          category: finalCategory,
          dietary: newDishDietary,
          base_price: priceNum,
          description: newDishDescription.trim() || null,
          customizable: newDishCustomizable,
          badge: newDishBadge ? (newDishBadge as FoodBadge) : null,
          image: uploadedImageUrl,
          is_available: true,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      if (data) {
        setItems((prev) => [...prev, data]);
      } else {
        loadMenuItems();
      }

      setFeedbackMessage({
        type: 'success',
        text: `New dish "${newDishName.trim()}" added to the menu!`,
      });

      // Reset form and close modal
      setIsAddModalOpen(false);
      setNewDishName('');
      setNewDishPrice('');
      setNewDishDescription('');
      setNewDishCustomizable(false);
      setNewDishBadge('');
      setNewDishFile(null);
      setNewDishFilePreview(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not add dish.';
      console.error('Add dish error:', err);
      setFeedbackMessage({
        type: 'error',
        text: `Failed to add new dish: ${msg}`,
      });
    } finally {
      setIsSubmittingNewDish(false);
    }
  };

  // Stats
  const inStockCount = items.filter((i) => i.is_available).length;
  const soldOutCount = items.length - inStockCount;

  // Filter items
  const filteredItems = items.filter((item) => {
    if (activeCategory !== 'All' && item.category !== activeCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchCat = item.category.toLowerCase().includes(q);
      return matchName || matchCat;
    }
    return true;
  });

  // Group filtered items by category in predefined order
  const categoriesPresent = Array.from(
    new Set(filteredItems.map((i) => i.category))
  ).sort((a, b) => {
    const idxA = CATEGORY_ORDER.indexOf(a);
    const idxB = CATEGORY_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#0c0d10] flex flex-col items-center justify-center text-stone-400 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
        <span className="text-base font-extrabold text-stone-200">
          Loading Menu Inventory...
        </span>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0c0d10] text-[#f4f4f6] flex flex-col selection:bg-amber-500 selection:text-black">
      {/* 1. Top Navigation */}
      <POSHeader userEmail={user.email} />

      {/* Main Content: Spacious Multi-column Desktop PC + Mobile Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 space-y-6">
        {/* Toast Feedback Notification */}
        {feedbackMessage && (
          <div
            className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-3 shadow-xl transition-all ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                : 'bg-rose-950/80 border-rose-500 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2.5 text-sm sm:text-base font-extrabold">
              {feedbackMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <span>{feedbackMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackMessage(null)}
              className="p-1 rounded-lg hover:bg-white/10 text-stone-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* 2. Stock & Photo Overview Banner with "+ Add New Dish" Button */}
        <div className="bg-[#14151b] border-2 border-stone-800 rounded-3xl p-4 sm:p-6 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                Menu & Inventory Manager
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-black">
                {items.length} Dishes Total
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-400 font-medium max-w-2xl">
              1-Tap toggle <strong className="text-emerald-400">IN STOCK</strong> / <strong className="text-rose-400">SOLD OUT</strong>, edit dish prices, upload high-res kitchen photos, and add or delete items with real-time customer storefront sync.
            </p>
          </div>

          {/* Quick Metrics & "+ Add New Dish" Button */}
          <div className="flex items-center gap-3 flex-wrap w-full lg:w-auto justify-between lg:justify-end">
            <div className="flex items-center gap-2.5">
              <div className="px-3.5 py-2 rounded-2xl bg-emerald-950/60 border-2 border-emerald-500/60 text-emerald-300 font-extrabold text-xs sm:text-sm flex items-center gap-1.5 shadow-inner">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{inStockCount} In Stock</span>
              </div>

              {soldOutCount > 0 && (
                <div className="px-3.5 py-2 rounded-2xl bg-rose-950/60 border-2 border-rose-500/60 text-rose-300 font-extrabold text-xs sm:text-sm flex items-center gap-1.5 animate-pulse shadow-inner">
                  <AlertOctagon className="w-4 h-4 text-rose-400" />
                  <span>{soldOutCount} Sold Out</span>
                </div>
              )}
            </div>

            {/* "+ Add New Dish" Button - Min 48px Tap Target */}
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="min-h-[48px] px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-sm sm:text-base flex items-center gap-2 shadow-xl shadow-amber-500/20 border-2 border-amber-300 transition-all active:scale-95 cursor-pointer uppercase tracking-wide"
            >
              <Plus className="w-5 h-5 stroke-[3]" />
              <span>Add New Dish</span>
            </button>
          </div>
        </div>

        {/* 3. Category Filter Tabs & Search */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Category Pills - Min 48px Tap Target */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <button
                type="button"
                onClick={() => setActiveCategory('All')}
                className={`min-h-[48px] px-4 py-2 rounded-2xl font-black text-sm whitespace-nowrap transition-all active:scale-95 border-2 cursor-pointer ${
                  activeCategory === 'All'
                    ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-md shadow-amber-500/20'
                    : 'bg-[#181920] text-stone-300 hover:text-white border-stone-800'
                }`}
              >
                All ({items.length})
              </button>

              {CATEGORY_ORDER.map((cat) => {
                const count = items.filter((i) => i.category === cat).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`min-h-[48px] px-4 py-2 rounded-2xl font-black text-sm whitespace-nowrap transition-all active:scale-95 border-2 cursor-pointer ${
                      activeCategory === cat
                        ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-md shadow-amber-500/20'
                        : 'bg-[#181920] text-stone-300 hover:text-white border-stone-800'
                    }`}
                  >
                    <span>{cat}</span>
                    <span className="ml-1.5 opacity-70 text-xs">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[260px]">
              <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search dish name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full min-h-[48px] pl-10 pr-4 py-2.5 bg-[#181920] border-2 border-stone-800 focus:border-amber-500 rounded-2xl text-sm text-white placeholder:text-stone-500 focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white text-xs font-bold"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 4. Categorized Items Grid / List: Desktop Multi-column (lg:grid-cols-2 xl:grid-cols-3) */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-stone-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            <span className="font-bold text-sm">Loading menu dishes...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-[#14151b] border-2 border-dashed border-stone-800 rounded-3xl p-12 text-center text-stone-400 space-y-3">
            <p className="text-base font-bold">No menu items found matching &quot;{searchQuery}&quot;.</p>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add This Dish
            </button>
          </div>
        ) : (
          <div className="space-y-10">
            {categoriesPresent.map((category) => {
              const categoryItems = filteredItems.filter((i) => i.category === category);
              return (
                <div key={category} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg sm:text-xl font-black text-amber-400 uppercase tracking-wide">
                      {category}
                    </h3>
                    <div className="h-[2px] flex-1 bg-stone-800/80"></div>
                    <span className="text-xs font-bold text-stone-400 font-mono">
                      {categoryItems.length} items
                    </span>
                  </div>

                  {/* Responsive Grid: 1 col on mobile, 2 cols on tablet/laptop, 3 cols on desktop PC */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                    {categoryItems.map((item) => {
                      const isUpdatingStock = updatingStockId === item.id;
                      const isUploadingPhoto = uploadingPhotoId === item.id;
                      const isDeleting = deletingId === item.id;
                      const isEditingPrice = editingPriceId === item.id;
                      const isAvailable = item.is_available;

                      return (
                        <div
                          key={item.id}
                          className={`rounded-3xl p-4 sm:p-5 border-2 transition-all flex flex-col justify-between gap-4 shadow-lg ${
                            isAvailable
                              ? 'bg-[#181920] border-stone-800 hover:border-stone-700'
                              : 'bg-[#201214] border-rose-900/60 opacity-90'
                          }`}
                        >
                          {/* Hidden File Input for this item photo upload */}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/jpg"
                            ref={(el) => {
                              fileInputRefs.current[item.id] = el;
                            }}
                            onChange={(e) => handlePhotoSelect(item, e)}
                            className="hidden"
                          />

                          {/* Top Section: Photo Thumbnail + Details */}
                          <div className="flex items-start gap-3.5">
                            {/* Food Photo with Overlay Click Target */}
                            <div className="relative group shrink-0">
                              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-stone-900 border-2 border-stone-700/80 shadow-md relative">
                                {item.image ? (
                                  <img
                                    src={item.image}
                                    alt={item.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center text-stone-600 gap-1">
                                    <ImageIcon className="w-8 h-8" />
                                    <span className="text-[10px] font-bold">No Photo</span>
                                  </div>
                                )}

                                {/* Loading Overlay during photo upload */}
                                {isUploadingPhoto && (
                                  <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-amber-400 gap-1">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    <span className="text-[9px] font-black uppercase">Uploading</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Item Details */}
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                {/* Dietary Badge */}
                                <span
                                  className={`inline-flex items-center justify-center w-5 h-5 rounded-md border-2 shrink-0 ${
                                    item.dietary === 'veg'
                                      ? 'border-emerald-500 bg-emerald-950/60'
                                      : 'border-rose-500 bg-rose-950/60'
                                  }`}
                                  title={item.dietary === 'veg' ? 'Vegetarian' : 'Non-Vegetarian'}
                                >
                                  <span
                                    className={`w-2 h-2 rounded-full ${
                                      item.dietary === 'veg' ? 'bg-emerald-400' : 'bg-rose-500'
                                    }`}
                                  />
                                </span>

                                <h4 className="font-black text-base sm:text-lg text-white truncate">
                                  {item.name}
                                </h4>
                              </div>

                              {item.badge && (
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                  {item.badge}
                                </span>
                              )}

                              {/* Price Row with Inline Edit Price */}
                              <div className="flex items-center gap-2 pt-0.5">
                                {isEditingPrice ? (
                                  <div className="flex items-center gap-1.5 bg-black/60 p-1 rounded-xl border border-amber-500/60">
                                    <span className="text-stone-400 text-xs font-bold pl-1.5">₹</span>
                                    <input
                                      type="number"
                                      autoFocus
                                      value={editingPriceValue}
                                      onChange={(e) => setEditingPriceValue(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSavePrice(item);
                                        if (e.key === 'Escape') handleCancelEditPrice();
                                      }}
                                      className="w-16 bg-stone-900 text-amber-400 font-mono font-bold text-sm px-1.5 py-0.5 rounded border border-stone-700 focus:outline-none focus:border-amber-400"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleSavePrice(item)}
                                      disabled={isSavingPrice}
                                      className="p-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                                      title="Save Price"
                                    >
                                      {isSavingPrice ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleCancelEditPrice}
                                      className="p-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white text-xs"
                                      title="Cancel"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-base font-black text-amber-400 font-mono">
                                      ₹{item.base_price}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditPrice(item)}
                                      className="p-1 rounded-md text-stone-400 hover:text-amber-400 hover:bg-stone-800/80 transition-colors cursor-pointer"
                                      title="Edit Price"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    {item.customizable && (
                                      <span className="text-stone-400 font-sans font-medium text-xs">
                                        • Customizable
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed">
                                {item.description}
                              </p>
                            </div>
                          </div>

                          {/* Action Buttons: 1-Tap "IN STOCK / SOLD OUT" + "Change Photo" + "Delete Item" (Min 48px Tap Targets) */}
                          <div className="space-y-2 pt-2 border-t border-stone-800/80">
                            {/* Stock Toggle Button (Large 48px Touch Target) */}
                            <button
                              type="button"
                              onClick={() => handleToggleStock(item)}
                              disabled={isUpdatingStock}
                              title={isAvailable ? 'Click to Mark as SOLD OUT' : 'Click to Mark as IN STOCK'}
                              className={`w-full min-h-[48px] px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg border-2 cursor-pointer ${
                                isAvailable
                                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-emerald-900/40'
                                  : 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 shadow-rose-900/40 animate-pulse'
                              }`}
                            >
                              {isUpdatingStock ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : isAvailable ? (
                                <>
                                  <Check className="w-5 h-5 stroke-[3]" />
                                  <span>IN STOCK (ACTIVE)</span>
                                </>
                              ) : (
                                <>
                                  <X className="w-5 h-5 stroke-[3]" />
                                  <span>SOLD OUT</span>
                                </>
                              )}
                            </button>

                            {/* Secondary Row: Change Photo & Delete Item */}
                            <div className="grid grid-cols-2 gap-2">
                              {/* Change Photo Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  fileInputRefs.current[item.id]?.click();
                                }}
                                disabled={isUploadingPhoto}
                                className="min-h-[44px] px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-200 hover:text-white font-extrabold text-xs flex items-center justify-center gap-1.5 border border-stone-700/80 hover:border-amber-500/50 shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-60"
                              >
                                {isUploadingPhoto ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                                    <span>Uploading...</span>
                                  </>
                                ) : (
                                  <>
                                    <Camera className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Change Photo</span>
                                  </>
                                )}
                              </button>

                              {/* Delete Item Button */}
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(item)}
                                disabled={isDeleting}
                                className="min-h-[44px] px-3 py-2 rounded-xl bg-stone-900 hover:bg-rose-950/80 text-stone-400 hover:text-rose-400 font-extrabold text-xs flex items-center justify-center gap-1.5 border border-stone-800 hover:border-rose-800/80 shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-60"
                                title="Permanently delete item from database"
                              >
                                {isDeleting ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                                ) : (
                                  <>
                                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                                    <span>Delete</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 5. "+ Add New Dish" Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-[#14151b] border-2 border-stone-800 rounded-3xl w-full max-w-xl p-5 sm:p-7 shadow-2xl space-y-5 my-auto max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                  Add New Dish
                </h3>
                <p className="text-xs text-stone-400 font-medium mt-0.5">
                  Insert dish into Supabase menu_items with live storefront availability
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-9 h-9 rounded-xl bg-stone-900 border border-stone-800 text-stone-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateNewDish} className="space-y-4">
              {/* Dish Name */}
              <div>
                <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
                  Dish Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cheese Burst Farmhouse Pizza"
                  value={newDishName}
                  onChange={(e) => setNewDishName(e.target.value)}
                  className="w-full min-h-[48px] px-4 py-2.5 bg-[#1b1c24] border-2 border-stone-800 focus:border-amber-500 rounded-2xl text-sm text-white placeholder:text-stone-500 focus:outline-none"
                />
              </div>

              {/* Category & Dietary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Category Selector */}
                <div>
                  <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
                    Category *
                  </label>
                  <select
                    value={newDishCategory}
                    onChange={(e) => setNewDishCategory(e.target.value)}
                    className="w-full min-h-[48px] px-3.5 py-2.5 bg-[#1b1c24] border-2 border-stone-800 focus:border-amber-500 rounded-2xl text-sm text-white focus:outline-none"
                  >
                    {CATEGORY_ORDER.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="Custom">+ Custom Category</option>
                  </select>

                  {newDishCategory === 'Custom' && (
                    <input
                      type="text"
                      placeholder="Type category name..."
                      value={newDishCustomCategory}
                      onChange={(e) => setNewDishCustomCategory(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 py-2 mt-2 bg-[#1b1c24] border-2 border-stone-800 focus:border-amber-500 rounded-xl text-xs text-white"
                    />
                  )}
                </div>

                {/* Dietary Toggle */}
                <div>
                  <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
                    Dietary Type *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewDishDietary('veg')}
                      className={`min-h-[48px] px-3 py-2 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 border-2 transition-all cursor-pointer ${
                        newDishDietary === 'veg'
                          ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-md'
                          : 'bg-[#1b1c24] border-stone-800 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                      <span>Veg</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewDishDietary('non-veg')}
                      className={`min-h-[48px] px-3 py-2 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 border-2 transition-all cursor-pointer ${
                        newDishDietary === 'non-veg'
                          ? 'bg-rose-950/80 border-rose-500 text-rose-300 shadow-md'
                          : 'bg-[#1b1c24] border-stone-800 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                      <span>Non-Veg</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Base Price & Badge Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Base Price */}
                <div>
                  <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
                    Base Price (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold font-mono">
                      ₹
                    </span>
                    <input
                      type="number"
                      required
                      min="0"
                      placeholder="299"
                      value={newDishPrice}
                      onChange={(e) => setNewDishPrice(e.target.value)}
                      className="w-full min-h-[48px] pl-9 pr-4 py-2.5 bg-[#1b1c24] border-2 border-stone-800 focus:border-amber-500 rounded-2xl text-sm font-mono font-bold text-white placeholder:text-stone-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Badge Tag */}
                <div>
                  <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
                    Highlight Badge (Optional)
                  </label>
                  <select
                    value={newDishBadge}
                    onChange={(e) => setNewDishBadge(e.target.value)}
                    className="w-full min-h-[48px] px-3.5 py-2.5 bg-[#1b1c24] border-2 border-stone-800 focus:border-amber-500 rounded-2xl text-sm text-white focus:outline-none"
                  >
                    <option value="">No Badge</option>
                    <option value="bestseller">Bestseller</option>
                    <option value="chef-special">Chef Special</option>
                    <option value="spicy">Spicy</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Crispy, molten cheese, fresh toppings and herbs..."
                  value={newDishDescription}
                  onChange={(e) => setNewDishDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#1b1c24] border-2 border-stone-800 focus:border-amber-500 rounded-2xl text-xs sm:text-sm text-white placeholder:text-stone-500 focus:outline-none resize-none"
                />
              </div>

              {/* Customizable Checkbox */}
              <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-stone-900/60 border border-stone-800">
                <input
                  type="checkbox"
                  id="customizable"
                  checked={newDishCustomizable}
                  onChange={(e) => setNewDishCustomizable(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-stone-800 border-stone-700"
                />
                <label htmlFor="customizable" className="text-xs font-bold text-stone-200 cursor-pointer">
                  Allow Crust & Extra Cheese Customization (for pizzas or custom snacks)
                </label>
              </div>

              {/* Dish Photo Upload */}
              <div>
                <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1.5">
                  Dish Photo (Upload to Supabase Storage)
                </label>
                <div className="flex items-center gap-3">
                  {newDishFilePreview ? (
                    <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-amber-500 shrink-0 relative">
                      <img
                        src={newDishFilePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-stone-900 border-2 border-dashed border-stone-700 flex items-center justify-center text-stone-500 shrink-0">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}

                  <label className="flex-1 min-h-[48px] px-4 py-2.5 rounded-2xl bg-stone-900 hover:bg-stone-800 border-2 border-stone-700/80 hover:border-amber-500/50 flex items-center justify-center gap-2 text-xs font-bold text-stone-200 cursor-pointer transition-colors">
                    <UploadCloud className="w-4 h-4 text-amber-400" />
                    <span>{newDishFile ? newDishFile.name : 'Choose Image File (JPG/PNG/WEBP)'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      onChange={handleNewDishPhotoChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white font-bold text-sm border border-stone-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingNewDish}
                  className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 border-2 border-amber-300 transition-all active:scale-95 cursor-pointer disabled:opacity-60"
                >
                  {isSubmittingNewDish ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Dish...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>Save Dish</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
