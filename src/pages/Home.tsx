import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, MapPin, ChevronDown, X, Filter, SlidersHorizontal, Grid, List } from 'lucide-react';
import { collection, query, where, getDocs, limit, orderBy, startAfter, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import PropertyCard from '../components/property/PropertyCard';
import { Property, PropertyType, PropertyCategory, PropertyFilter } from '../types/property';

const Home = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  
  // Get search query from URL parameters
  const initialSearchQuery = searchParams.get('search') || '';
  const initialCategory = (searchParams.get('category') as PropertyCategory) || undefined;
  const initialType = (searchParams.get('type') as PropertyType) || undefined;
  const initialCity = searchParams.get('city') || undefined;

  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalResults, setTotalResults] = useState(0);
  
  const [filters, setFilters] = useState<PropertyFilter>({
    category: initialCategory,
    type: initialType,
    city: initialCity,
    priceMin: undefined,
    priceMax: undefined,
    bedroomsMin: undefined,
    bathroomsMin: undefined,
    areaMin: undefined,
    areaMax: undefined,
  });

  // City options for Saudi Arabia
  const cities = [
    'Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam', 
    'Al Khobar', 'Dhahran', 'Tabuk', 'Abha', 'Taif'
  ];
  
  // Property types
  const propertyTypes: { value: PropertyType; label: string }[] = [
    { value: 'apartment', label: 'Apartment' },
    { value: 'villa', label: 'Villa' },
    { value: 'office', label: 'Office' },
    { value: 'land', label: 'Land' },
    { value: 'commercial', label: 'Commercial' },
  ];

  // Price ranges
  const priceRanges = [
    { label: 'Under 100K', min: 0, max: 100000 },
    { label: '100K - 500K', min: 100000, max: 500000 },
    { label: '500K - 1M', min: 500000, max: 1000000 },
    { label: '1M - 2M', min: 1000000, max: 2000000 },
    { label: 'Above 2M', min: 2000000, max: undefined },
  ];

  useEffect(() => {
    fetchProperties(true);
  }, []);

  const buildQuery = (isNewSearch = false) => {
    let baseQuery = query(
      collection(db, 'properties'),
      where('status', '==', 'approved'),
      orderBy('createdAt', 'desc')
    );

    // Apply filters
    if (filters.category) {
      baseQuery = query(baseQuery, where('category', '==', filters.category));
    }
    
    if (filters.type) {
      baseQuery = query(baseQuery, where('type', '==', filters.type));
    }
    
    if (filters.city) {
      baseQuery = query(baseQuery, where('location.city', '==', filters.city));
    }

    if (filters.priceMin !== undefined) {
      baseQuery = query(baseQuery, where('price', '>=', filters.priceMin));
    }

    if (filters.priceMax !== undefined) {
      baseQuery = query(baseQuery, where('price', '<=', filters.priceMax));
    }

    // Add pagination
    if (!isNewSearch && lastDoc) {
      baseQuery = query(baseQuery, startAfter(lastDoc));
    }

    return query(baseQuery, limit(12));
  };

  const fetchProperties = async (isNewSearch = false) => {
    if (isNewSearch) {
      setLoading(true);
      setProperties([]);
      setLastDoc(null);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }
    
    setError(null);
    
    try {
      const propertiesQuery = buildQuery(isNewSearch);
      const querySnapshot = await getDocs(propertiesQuery);
      
      let propertiesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Property[];

      // Apply client-side filters for complex queries
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        propertiesData = propertiesData.filter(property =>
          property.title.toLowerCase().includes(query) ||
          property.description.toLowerCase().includes(query) ||
          property.location.city.toLowerCase().includes(query) ||
          property.location.address.toLowerCase().includes(query)
        );
      }

      if (filters.bedroomsMin !== undefined) {
        propertiesData = propertiesData.filter(property => 
          property.bedrooms !== undefined && property.bedrooms >= filters.bedroomsMin!
        );
      }

      if (filters.bathroomsMin !== undefined) {
        propertiesData = propertiesData.filter(property => 
          property.bathrooms !== undefined && property.bathrooms >= filters.bathroomsMin!
        );
      }

      if (filters.areaMin !== undefined) {
        propertiesData = propertiesData.filter(property => 
          property.area !== undefined && property.area >= filters.areaMin!
        );
      }

      if (filters.areaMax !== undefined) {
        propertiesData = propertiesData.filter(property => 
          property.area !== undefined && property.area <= filters.areaMax!
        );
      }

      if (isNewSearch) {
        setProperties(propertiesData);
        setTotalResults(propertiesData.length);
      } else {
        setProperties(prev => [...prev, ...propertiesData]);
      }

      // Set pagination state
      if (querySnapshot.docs.length > 0) {
        setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1]);
      }
      
      setHasMore(querySnapshot.docs.length === 12);
      
    } catch (err) {
      console.error('Error fetching properties:', err);
      setError('Failed to load properties. Please try again later.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const applyFilters = () => {
    // Update URL with current filters
    const params = new URLSearchParams();
    
    if (searchQuery) params.set('search', searchQuery);
    if (filters.category) params.set('category', filters.category);
    if (filters.type) params.set('type', filters.type);
    if (filters.city) params.set('city', filters.city);
    if (filters.priceMin) params.set('priceMin', filters.priceMin.toString());
    if (filters.priceMax) params.set('priceMax', filters.priceMax.toString());
    if (filters.bedroomsMin) params.set('bedroomsMin', filters.bedroomsMin.toString());
    if (filters.bathroomsMin) params.set('bathroomsMin', filters.bathroomsMin.toString());
    if (filters.areaMin) params.set('areaMin', filters.areaMin.toString());
    if (filters.areaMax) params.set('areaMax', filters.areaMax.toString());

    navigate(`/?${params.toString()}`, { replace: true });
    
    fetchProperties(true);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setFilters({
      category: undefined,
      type: undefined,
      city: undefined,
      priceMin: undefined,
      priceMax: undefined,
      bedroomsMin: undefined,
      bathroomsMin: undefined,
      areaMin: undefined,
      areaMax: undefined,
    });
    setSearchQuery('');
    navigate('/', { replace: true });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchProperties(false);
    }
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.category) count++;
    if (filters.type) count++;
    if (filters.city) count++;
    if (filters.priceMin !== undefined) count++;
    if (filters.priceMax !== undefined) count++;
    if (filters.bedroomsMin !== undefined) count++;
    if (filters.bathroomsMin !== undefined) count++;
    if (filters.areaMin !== undefined) count++;
    if (filters.areaMax !== undefined) count++;
    if (searchQuery) count++;
    return count;
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white opacity-5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl"></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold mb-6 leading-tight">
              اكتشف منزل أحلامك في
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300">
                المملكة العربية السعودية
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-primary-100 mb-10 leading-relaxed">
              تصفح آلاف العقارات للبيع والإيجار في جميع أنحاء المملكة
            </p>
            
            {/* Enhanced Search Form */}
            <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8">
              <form onSubmit={handleSearch} className="space-y-6">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="ابحث بالموقع، اسم العقار، أو الوصف..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 text-lg rounded-xl border-2 border-gray-200 focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-100 text-gray-900 placeholder-gray-500"
                  />
                  <Search className="absolute left-4 top-4 h-6 w-6 text-gray-400" />
                </div>
                
                {/* Quick Filters */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <select
                    value={filters.category || ''}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value as PropertyCategory || undefined })}
                    className="px-4 py-3 rounded-lg border-2 border-gray-200 focus:outline-none focus:border-primary-500 text-gray-900"
                  >
                    <option value="">نوع العرض</option>
                    <option value="rent">للإيجار</option>
                    <option value="sale">للبيع</option>
                  </select>
                  
                  <select
                    value={filters.type || ''}
                    onChange={(e) => setFilters({ ...filters, type: e.target.value as PropertyType || undefined })}
                    className="px-4 py-3 rounded-lg border-2 border-gray-200 focus:outline-none focus:border-primary-500 text-gray-900"
                  >
                    <option value="">نوع العقار</option>
                    {propertyTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  
                  <select
                    value={filters.city || ''}
                    onChange={(e) => setFilters({ ...filters, city: e.target.value || undefined })}
                    className="px-4 py-3 rounded-lg border-2 border-gray-200 focus:outline-none focus:border-primary-500 text-gray-900"
                  >
                    <option value="">المدينة</option>
                    {cities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                  
                  <button
                    type="button"
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className="relative px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg flex items-center justify-center transition-colors"
                  >
                    <SlidersHorizontal className="h-5 w-5 mr-2" />
                    <span>فلاتر متقدمة</span>
                    {getActiveFiltersCount() > 0 && (
                      <span className="absolute -top-2 -right-2 bg-primary-600 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
                        {getActiveFiltersCount()}
                      </span>
                    )}
                  </button>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    type="submit"
                    className="flex-1 px-8 py-4 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-xl transition-all duration-300 transform hover:scale-105 font-medium text-lg shadow-lg"
                  >
                    <Search className="h-5 w-5 mr-2 inline" />
                    ابحث الآن
                  </button>
                  
                  {getActiveFiltersCount() > 0 && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      مسح الفلاتر
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Advanced Filters Panel */}
      {isFilterOpen && (
        <section className="bg-white border-b border-gray-200 py-6">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">فلاتر متقدمة</h3>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="text-gray-500 hover:text-gray-700 p-2"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {/* Price Range */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    نطاق السعر (ريال سعودي)
                  </label>
                  <div className="space-y-2">
                    {priceRanges.map((range, index) => (
                      <button
                        key={index}
                        onClick={() => setFilters({ 
                          ...filters, 
                          priceMin: range.min, 
                          priceMax: range.max 
                        })}
                        className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                          filters.priceMin === range.min && filters.priceMax === range.max
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      placeholder="الحد الأدنى"
                      value={filters.priceMin || ''}
                      onChange={(e) => setFilters({ ...filters, priceMin: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    <input
                      type="number"
                      placeholder="الحد الأقصى"
                      value={filters.priceMax || ''}
                      onChange={(e) => setFilters({ ...filters, priceMax: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
                
                {/* Bedrooms */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    عدد غرف النوم
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((num) => (
                      <button
                        key={num}
                        onClick={() => setFilters({ ...filters, bedroomsMin: num })}
                        className={`px-3 py-2 rounded-lg border transition-colors ${
                          filters.bedroomsMin === num
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {num}+
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Bathrooms */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    عدد دورات المياه
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        onClick={() => setFilters({ ...filters, bathroomsMin: num })}
                        className={`px-3 py-2 rounded-lg border transition-colors ${
                          filters.bathroomsMin === num
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {num}+
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Area */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    المساحة (متر مربع)
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      placeholder="الحد الأدنى"
                      value={filters.areaMin || ''}
                      onChange={(e) => setFilters({ ...filters, areaMin: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    <input
                      type="number"
                      placeholder="الحد الأقصى"
                      value={filters.areaMax || ''}
                      onChange={(e) => setFilters({ ...filters, areaMax: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end mt-8 space-x-4">
                <button
                  onClick={clearFilters}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  مسح جميع الفلاتر
                </button>
                <button
                  onClick={applyFilters}
                  className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  تطبيق الفلاتر
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
      
      {/* Results Section */}
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          {/* Results Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-heading font-bold text-gray-900">
                {searchQuery || getActiveFiltersCount() > 0 ? 'نتائج البحث' : 'العقارات المميزة'}
              </h2>
              {!loading && (
                <p className="text-gray-600 mt-2">
                  {totalResults > 0 ? `تم العثور على ${totalResults} عقار` : 'لم يتم العثور على عقارات'}
                </p>
              )}
            </div>
            
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <div className="flex items-center space-x-2 bg-white rounded-lg p-1 shadow-sm">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-primary-100 text-primary-600' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Grid className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-primary-100 text-primary-600' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <List className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-600 mx-auto"></div>
                <p className="mt-4 text-lg text-gray-600">جاري تحميل العقارات...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-error-50 border border-error-200 text-error-700 p-6 rounded-xl text-center">
              <p className="text-lg font-medium">{error}</p>
              <button
                onClick={() => fetchProperties(true)}
                className="mt-4 px-6 py-2 bg-error-600 text-white rounded-lg hover:bg-error-700 transition-colors"
              >
                إعادة المحاولة
              </button>
            </div>
          ) : properties.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl shadow-sm">
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">لم يتم العثور على عقارات</h3>
                <p className="text-gray-600 mb-6">
                  جرب تعديل معايير البحث أو الفلاتر للحصول على نتائج أفضل
                </p>
                <button
                  onClick={clearFilters}
                  className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  مسح جميع الفلاتر
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className={`grid gap-6 ${
                viewMode === 'grid' 
                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                  : 'grid-cols-1'
              }`}>
                {properties.map((property) => (
                  <PropertyCard 
                    key={property.id} 
                    property={property} 
                    viewMode={viewMode}
                  />
                ))}
              </div>
              
              {/* Load More Button */}
              {hasMore && (
                <div className="mt-12 text-center">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="px-8 py-4 bg-white text-primary-600 border-2 border-primary-600 rounded-xl hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {loadingMore ? (
                      <span className="flex items-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary-600 mr-2"></div>
                        جاري التحميل...
                      </span>
                    ) : (
                      'عرض المزيد من العقارات'
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
      
      {/* Featured Cities */}
      <section className="py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-gray-900 mb-4">
              استكشف العقارات حسب المدينة
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              اعثر على العقار المثالي في أشهر المدن السعودية
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {cities.slice(0, 6).map((city, index) => (
              <a
                key={city}
                href={`/?city=${city}`}
                className="group relative overflow-hidden rounded-2xl shadow-lg aspect-[4/3] transform hover:scale-105 transition-all duration-500"
              >
                <img
                  src={`https://images.unsplash.com/photo-${1500000000000 + index}?w=800&h=600&fit=crop&crop=center`}
                  alt={`العقارات في ${city}`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-2xl font-heading font-bold text-white mb-2">{city}</h3>
                  <div className="flex items-center text-white/90">
                    <MapPin className="h-5 w-5 mr-2" />
                    <span>120+ عقار متاح</span>
                  </div>
                </div>
                <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
                  <span className="text-white text-sm font-medium">مميز</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
      
      {/* Why Choose Us */}
      <section className="py-16 md:py-20 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-gray-900 mb-6">
              لماذا تختار عقار؟
            </h2>
            <p className="text-xl text-gray-600 leading-relaxed">
              نوفر منصة عقارية شاملة لمساعدتك في العثور على العقار المناسب أو بيعه أو تأجيره بسهولة
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-heading font-semibold text-gray-900 mb-4">عقارات موثقة</h3>
              <p className="text-gray-600 leading-relaxed">
                جميع العقارات المدرجة لدينا تخضع لعملية توثيق شاملة لضمان الدقة والمصداقية
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-secondary-500 to-secondary-600 text-white rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-heading font-semibold text-gray-900 mb-4">مدفوعات آمنة</h3>
              <p className="text-gray-600 leading-relaxed">
                منصتنا توفر خيارات دفع آمنة لضمان حماية معاملاتك المالية
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-accent-500 to-accent-600 text-white rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-heading font-semibold text-gray-900 mb-4">دعم الخبراء</h3>
              <p className="text-gray-600 leading-relaxed">
                فريقنا من خبراء العقارات متاح لتقديم الإرشاد والإجابة على استفساراتك
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Call to Action */}
      <section className="py-16 md:py-20 bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 text-white relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-black opacity-10"></div>
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl"></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6">
              هل أنت مستعد للعثور على عقار أحلامك؟
            </h2>
            <p className="text-xl text-primary-100 mb-10 leading-relaxed">
              انضم إلى آلاف المستخدمين الراضين الذين وجدوا عقارهم المثالي من خلال عقار
            </p>
            <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <a
                href="/register"
                className="px-8 py-4 bg-white text-primary-600 font-semibold rounded-xl hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                سجل الآن
              </a>
              <a
                href="/?category=sale"
                className="px-8 py-4 border-2 border-white text-white font-semibold rounded-xl hover:bg-white hover:text-primary-600 transition-all duration-300 transform hover:scale-105"
              >
                تصفح العقارات
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;